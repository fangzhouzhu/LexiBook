import { Body, Controller, Delete, Get, Header, Param, Patch, Post } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { CATALOG_BOOKS } from "./catalog.data";
import { LexiService } from "./lexi.service";
import { PrismaService } from "./prisma.service";

type ReadingSessionSummary = {
  date: Date;
  durationMin: number;
  sentencesRead: number;
  wordsLearned: number;
};

type FavoriteWordBody = {
  word: string;
  meaning: string;
  phonetic?: string;
  english?: string;
  sentence?: string;
  chapterTitle?: string;
};

@Controller()
export class DashboardController {
  constructor(
    private readonly lexiService: LexiService,
    private readonly prisma: PrismaService
  ) {}

  @Get("home")
  async home() {
    const userId = await this.lexiService.getDemoUserId();
    const [user, books, words, notes, sessions, checkIns] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.book.findMany({
        where: { userId, status: { not: "removed" } },
        include: { chapters: { orderBy: { order: "asc" }, take: 1 } },
        orderBy: { lastReadAt: "desc" }
      }),
      this.prisma.vocabularyWord.findMany({ where: { userId } }),
      this.prisma.note.findMany({ where: { userId }, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }] }),
      this.prisma.readingSession.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      this.prisma.readingCheckIn.findMany({ where: { userId }, orderBy: { checkedAt: "desc" }, take: 60 })
    ]);

    const currentBook = books.find((b) => b.status === "reading") ?? books[0] ?? null;
    const weeklyDaily = this.buildDailyStats(sessions, 7);
    const weeklyMinutes = weeklyDaily.reduce((sum, item) => sum + item.minutes, 0);
    const totalSentences = sessions.reduce((sum, s) => sum + s.sentencesRead, 0);
    const checkInKeys = checkIns.map((item) => item.dateKey);
    const readingDays = new Set(sessions.filter((item) => item.durationMin > 0 || item.sentencesRead > 0).map((item) => this.toDateKey(item.date))).size;

    return {
      user: { displayName: user.displayName, avatarUrl: user.avatarUrl },
      hero: {
        title: `Good morning, ${user.displayName}`,
        subtitle: "",
        quote: "语言是思想的外衣。",
        author: "Samuel Johnson",
        backgroundImage: "/reader/home-bg.png"
      },
      continueReading: currentBook
        ? {
            ...currentBook,
            firstChapterId: currentBook.currentChapterId ?? currentBook.chapters[0]?.id ?? null
          }
        : null,
      recommendations: books.slice(0, 5),
      stats: {
        weeklyMinutes,
        weeklyMinutesLabel: this.formatDuration(weeklyMinutes),
        readingDays,
        sentenceCount: totalSentences,
        vocabularyCount: words.length,
        streakDays: this.calculateStreak(checkInKeys),
        todayCheckedIn: checkInKeys.includes(this.toDateKey(new Date())),
        weeklyDaily
      },
      notesPreview: notes.slice(0, 3)
    };
  }

  @Get("bookshelf")
  async bookshelf() {
    const userId = await this.lexiService.getDemoUserId();
    const books = await this.prisma.book.findMany({
      where: { userId, status: { not: "removed" } },
      include: { chapters: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { updatedAt: "desc" }
    });
    return {
      books: books.map((book) => ({
        ...book,
        firstChapterId: book.currentChapterId ?? book.chapters[0]?.id ?? null
      }))
    };
  }

  @Get("bookstore")
  async bookstore() {
    const userId = await this.lexiService.getDemoUserId();
    const books = await this.prisma.book.findMany({
      where: { userId, status: { not: "removed" } },
      select: { title: true, author: true }
    });
    const ownedKeys = new Set(books.map((item) => `${item.title}::${item.author}`.toLowerCase()));
    return {
      books: CATALOG_BOOKS.map((book) => ({
        ...book,
        inBookshelf: ownedKeys.has(`${book.title}::${book.author}`.toLowerCase())
      }))
    };
  }

  @Post("bookshelf")
  async addBookToBookshelf(@Body() body: { storeBookId: string }) {
    const userId = await this.lexiService.getDemoUserId();
    const selected = CATALOG_BOOKS.find((book) => book.id === body.storeBookId);
    if (!selected) {
      return { ok: false, message: "book_not_found" };
    }

    const existing = await this.prisma.book.findFirst({
      where: { userId, title: selected.title, author: selected.author }
    });
    if (existing) {
      if (existing.status === "removed") {
        const revived = await this.prisma.book.update({
          where: { id: existing.id },
          data: { status: "wishlist", currentPage: 0 }
        });
        return { ok: true, duplicated: false, book: revived };
      }
      return { ok: true, duplicated: true, book: existing };
    }

    const book = await this.prisma.book.create({
      data: {
        userId,
        title: selected.title,
        author: selected.author,
        coverUrl: selected.coverUrl,
        category: selected.category,
        level: selected.level,
        description: selected.description,
        totalPages: selected.totalPages,
        currentPage: 0,
        progressPercent: 0,
        status: "wishlist"
      }
    });

    if (selected.chapters.length > 0) {
      for (const chapter of selected.chapters) {
        await this.prisma.chapter.create({
          data: {
            bookId: book.id,
            title: chapter.title,
            order: chapter.order,
            sentences: {
              create: chapter.sentences.map((sentence) => ({
                order: sentence.order,
                english: sentence.english,
                chinese: sentence.chinese
              }))
            }
          }
        });
      }
    }

    return { ok: true, duplicated: false, book };
  }

  @Patch("bookshelf/:id/progress")
  async updateBookProgress(@Param("id") id: string, @Body() body: { currentPage: number }) {
    const existing = await this.prisma.book.findUniqueOrThrow({ where: { id } });
    const currentPage = Math.min(existing.totalPages, Math.max(0, body.currentPage));
    const book = await this.prisma.book.update({
      where: { id },
      data: {
        currentPage,
        progressPercent: Math.round((currentPage / Math.max(1, existing.totalPages)) * 100),
        status: currentPage > 0 ? "reading" : "wishlist",
        lastReadAt: new Date()
      }
    });
    return { book };
  }

  @Delete("bookshelf/:id")
  async removeBookFromBookshelf(@Param("id") id: string) {
    const userId = await this.lexiService.getDemoUserId();
    const book = await this.prisma.book.findFirst({ where: { id, userId }, select: { id: true } });
    if (!book) {
      return { ok: false, message: "book_not_found" };
    }

    await this.prisma.book.update({
      where: { id: book.id },
      data: { status: "removed" }
    });
    return { ok: true };
  }

  @Get("books/:id/markdown")
  async getBookMarkdown(@Param("id") id: string) {
    const result = await this.readBookMarkdown(id);
    if (!result.ok) return result;
    return result;
  }

  @Get("books/:id/markdown/raw")
  @Header("Content-Type", "text/markdown; charset=utf-8")
  async getBookMarkdownRaw(@Param("id") id: string) {
    const result = await this.readBookMarkdown(id);
    return result.ok ? result.markdown : `# Not Found\n\n${result.message}`;
  }

  private async readBookMarkdown(id: string) {
    let source = CATALOG_BOOKS.find((book) => book.id === id);
    if (!source) {
      const userId = await this.lexiService.getDemoUserId();
      const stored = await this.prisma.book.findFirst({ where: { id, userId } });
      source = stored ? CATALOG_BOOKS.find((book) => book.title === stored.title && book.author === stored.author) : undefined;
    }
    if (!source) {
      return { ok: false, message: "book_not_found" };
    }

    const fileName = `${source.id}.md`;
    const candidates = [
      path.join(process.cwd(), "content", "books", fileName),
      path.join(process.cwd(), "apps", "api", "content", "books", fileName)
    ];

    for (const filePath of candidates) {
      try {
        const markdown = await readFile(filePath, "utf-8");
        return {
          ok: true,
          bookId: source.id,
          title: source.title,
          author: source.author,
          markdown
        };
      } catch {}
    }

    return {
      ok: false,
      message: "markdown_not_found",
      bookId: source.id
    };
  }

  @Get("vocabulary")
  async vocabulary() {
    const userId = await this.lexiService.getDemoUserId();
    const words = await this.prisma.vocabularyWord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return { words };
  }

  @Get("vocabulary/favorite/:word")
  async getFavoriteWord(@Param("word") word: string) {
    const userId = await this.lexiService.getDemoUserId();
    const normalizedWord = word.trim().toLowerCase();
    const favorite = normalizedWord
      ? await this.prisma.vocabularyWord.findUnique({
          where: { userId_word: { userId, word: normalizedWord } }
        })
      : null;
    return { favorite };
  }

  @Post("vocabulary/favorite")
  async favoriteWord(@Body() body: FavoriteWordBody) {
    const userId = await this.lexiService.getDemoUserId();
    const normalizedWord = body.word.trim().toLowerCase();
    if (!normalizedWord) {
      return { ok: false, message: "word_required" };
    }

    const word = await this.prisma.vocabularyWord.upsert({
      where: { userId_word: { userId, word: normalizedWord } },
      update: {
        meaning: body.meaning,
        phonetic: body.phonetic,
        sentence: body.sentence ?? body.english,
        chapterTitle: body.chapterTitle
      },
      create: {
        userId,
        word: normalizedWord,
        meaning: body.meaning,
        phonetic: body.phonetic,
        sentence: body.sentence ?? body.english,
        chapterTitle: body.chapterTitle,
        familiarity: 1,
        reviewCount: 0,
        mastered: false
      }
    });
    return { ok: true, word };
  }

  @Patch("vocabulary/:id/mastered")
  async setMastered(@Param("id") id: string, @Body() body: { mastered: boolean }) {
    const word = await this.prisma.vocabularyWord.update({
      where: { id },
      data: { mastered: body.mastered, reviewCount: { increment: 1 } }
    });
    return { word };
  }

  @Delete("vocabulary/:id")
  async removeFavoriteWord(@Param("id") id: string) {
    await this.prisma.vocabularyWord.delete({ where: { id } });
    return { ok: true };
  }

  @Get("notes")
  async notes() {
    const userId = await this.lexiService.getDemoUserId();
    const notes = await this.prisma.note.findMany({
      where: { userId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }]
    });
    return { notes };
  }

  @Post("notes")
  async addNote(@Body() body: { title: string; content: string; tags?: string[] }) {
    const userId = await this.lexiService.getDemoUserId();
    const note = await this.prisma.note.create({
      data: {
        userId,
        title: body.title,
        content: body.content,
        tags: body.tags ?? []
      }
    });
    return { note };
  }

  @Patch("notes/:id/pin")
  async pinNote(@Param("id") id: string, @Body() body: { pinned: boolean }) {
    const note = await this.prisma.note.update({ where: { id }, data: { pinned: body.pinned } });
    return { note };
  }

  @Get("statistics")
  async statistics() {
    const userId = await this.lexiService.getDemoUserId();
    const [sessions, books, checkIns, words] = await Promise.all([
      this.prisma.readingSession.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      this.prisma.book.findMany({
        where: { userId, status: { not: "removed" } },
        select: { id: true, title: true, author: true, coverUrl: true, currentPage: true, totalPages: true, progressPercent: true, status: true, lastReadAt: true },
        orderBy: { lastReadAt: "desc" },
        take: 8
      }),
      this.prisma.readingCheckIn.findMany({ where: { userId }, orderBy: { checkedAt: "desc" }, take: 60 }),
      this.prisma.vocabularyWord.findMany({ where: { userId } })
    ]);
    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
    const totalSentences = sessions.reduce((sum, s) => sum + s.sentencesRead, 0);
    const totalWords = sessions.reduce((sum, s) => sum + s.wordsLearned, 0);
    const checkInKeys = checkIns.map((item) => item.dateKey);
    const daily = this.buildDailyStats(sessions, 14);
    const activeDays = new Set(sessions.filter((item) => item.durationMin > 0 || item.sentencesRead > 0).map((item) => this.toDateKey(item.date))).size;
    const masteredWords = words.filter((word) => word.mastered).length;
    return {
      totalMinutes,
      totalMinutesLabel: this.formatDuration(totalMinutes),
      totalSentences,
      totalWords,
      masteredWords,
      activeDays,
      averageMinutes: activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0,
      sessions,
      daily,
      books,
      checkIns,
      streakDays: this.calculateStreak(checkInKeys),
      todayCheckedIn: checkInKeys.includes(this.toDateKey(new Date()))
    };
  }

  @Post("checkins/today")
  async checkInToday(@Body() body: { note?: string }) {
    const userId = await this.lexiService.getDemoUserId();
    const dateKey = this.toDateKey(new Date());
    const checkIn = await this.prisma.readingCheckIn.upsert({
      where: { userId_dateKey: { userId, dateKey } },
      update: { note: body.note },
      create: { userId, dateKey, note: body.note }
    });
    return { ok: true, checkIn };
  }

  @Get("settings")
  async settings() {
    const userId = await this.lexiService.getDemoUserId();
    const settings = await this.prisma.userSetting.findUniqueOrThrow({ where: { userId } });
    return { settings };
  }

  @Patch("settings")
  async updateSettings(
    @Body()
    body: {
      dailyGoalMinutes?: number;
      weeklyGoalDays?: number;
      preferredFontSize?: number;
      preferredTheme?: string;
      reminderEnabled?: boolean;
      reminderTime?: string;
      language?: string;
    }
  ) {
    const userId = await this.lexiService.getDemoUserId();
    const settings = await this.prisma.userSetting.update({
      where: { userId },
      data: body
    });
    return { settings };
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins} 分钟`;
    if (mins <= 0) return `${hours} 小时`;
    return `${hours} 小时 ${mins} 分钟`;
  }

  private buildDailyStats(sessions: ReadingSessionSummary[], days: number) {
    const today = new Date();
    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      const key = this.toDateKey(date);
      return {
        key,
        label: days <= 7 ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()] : `${date.getMonth() + 1}/${date.getDate()}`,
        minutes: 0,
        sentences: 0,
        words: 0
      };
    });
    const byKey = new Map(buckets.map((item) => [item.key, item]));
    for (const session of sessions) {
      const bucket = byKey.get(this.toDateKey(session.date));
      if (!bucket) continue;
      bucket.minutes += session.durationMin;
      bucket.sentences += session.sentencesRead;
      bucket.words += session.wordsLearned;
    }
    const maxMinutes = Math.max(1, ...buckets.map((item) => item.minutes));
    return buckets.map((item) => ({
      ...item,
      heightPercent: Math.max(item.minutes > 0 ? 12 : 4, Math.round((item.minutes / maxMinutes) * 100))
    }));
  }

  private calculateStreak(dateKeys: string[]) {
    const keySet = new Set(dateKeys);
    let streak = 0;
    const cursor = new Date();
    while (keySet.has(this.toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
}
