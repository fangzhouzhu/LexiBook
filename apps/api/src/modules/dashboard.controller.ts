import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
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
      this.prisma.book.findMany({ where: { userId }, orderBy: { lastReadAt: "desc" } }),
      this.prisma.vocabularyWord.findMany({ where: { userId } }),
      this.prisma.note.findMany({ where: { userId }, orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }] }),
      this.prisma.readingSession.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 7 })
    ]);

    const currentBook = books.find((b) => b.status === "reading") ?? books[0];
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
      continueReading: currentBook,
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
    const books = await this.prisma.book.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
    return { books };
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

