import { Body, Controller, Delete, Get, Header, Param, Patch, Post } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { CATALOG_BOOKS } from "./catalog.data";
import { LexiService } from "./lexi.service";
import { PrismaService } from "./prisma.service";

@Controller()
export class DashboardController {
  constructor(
    private readonly lexiService: LexiService,
    private readonly prisma: PrismaService
  ) {}

  @Get("home")
  async home() {
    const userId = await this.lexiService.getDemoUserId();
    const [user, books, words, notes, sessions] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.book.findMany({
        where: { userId, status: { not: "removed" } },
        include: { chapters: { orderBy: { order: "asc" }, take: 1 } },
        orderBy: { lastReadAt: "desc" }
      }),
      this.prisma.vocabularyWord.findMany({ where: { userId } }),
      this.prisma.note.findMany({ where: { userId }, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }] }),
      this.prisma.readingSession.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 7 })
    ]);

    const currentBook = books.find((b) => b.status === "reading") ?? books[0] ?? null;
    const weeklyMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
    const totalSentences = sessions.reduce((sum, s) => sum + s.sentencesRead, 0);

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
            firstChapterId: currentBook.chapters[0]?.id ?? null
          }
        : null,
      recommendations: books.slice(0, 5),
      stats: {
        weeklyMinutes,
        readingDays: sessions.length,
        sentenceCount: totalSentences,
        vocabularyCount: words.length,
        streakDays: 16
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
        firstChapterId: book.chapters[0]?.id ?? null
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
    const book = await this.prisma.book.update({
      where: { id },
      data: {
        currentPage: body.currentPage,
        status: body.currentPage > 0 ? "reading" : "wishlist",
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

  @Post("vocabulary")
  async addWord(@Body() body: { word: string; meaning: string; phonetic?: string }) {
    const userId = await this.lexiService.getDemoUserId();
    const word = await this.prisma.vocabularyWord.create({
      data: {
        userId,
        word: body.word.toLowerCase(),
        meaning: body.meaning,
        phonetic: body.phonetic,
        familiarity: 1,
        reviewCount: 0,
        mastered: false
      }
    });
    return { word };
  }

  @Patch("vocabulary/:id/mastered")
  async setMastered(@Param("id") id: string, @Body() body: { mastered: boolean }) {
    const word = await this.prisma.vocabularyWord.update({
      where: { id },
      data: { mastered: body.mastered, reviewCount: { increment: 1 } }
    });
    return { word };
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
    const sessions = await this.prisma.readingSession.findMany({ where: { userId }, orderBy: { date: "asc" }, take: 14 });
    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
    const totalSentences = sessions.reduce((sum, s) => sum + s.sentencesRead, 0);
    const totalWords = sessions.reduce((sum, s) => sum + s.wordsLearned, 0);
    return {
      totalMinutes,
      totalSentences,
      totalWords,
      sessions
    };
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
}
