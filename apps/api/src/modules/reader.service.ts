import { Injectable } from "@nestjs/common";
import { LexiService } from "./lexi.service";
import { OfflineTranslateService } from "./offline-translate.service";
import { PrismaService } from "./prisma.service";

@Injectable()
export class ReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lexiService: LexiService,
    private readonly offlineTranslateService: OfflineTranslateService
  ) {}

  private readonly dictionary: Record<string, { chinese: string; english: string; phonetic?: string; example?: string }> = {
    sunrise: { chinese: "日出", english: "the time when the sun first appears", phonetic: "/ˈsʌn.raɪz/" },
    unfamiliar: { chinese: "不熟悉的", english: "not known well", phonetic: "/ˌʌn.fəˈmɪl.jɚ/" },
    locked: { chinese: "上锁的", english: "closed with a lock", phonetic: "/lɒkt/" },
    story: { chinese: "故事", english: "a description of events", phonetic: "/ˈstɔːr.i/" }
  };

  private readonly progress = new Map<string, { sentenceId: string; percent: number }>();
  private readonly warmingChapters = new Set<string>();

  async getReaderData(chapterId: string) {
    await this.lexiService.ensureSeedData();
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true, sentences: { orderBy: { order: "asc" } } }
    });

    if (!chapter) {
      return {
        chapterId,
        chapterTitle: "Chapter",
        bookTitle: "LexiBook",
        sentences: []
      };
    }

    await this.fillMissingChinese(chapter.id, chapter.sentences, 48);
    const freshSentences = await this.prisma.sentence.findMany({
      where: { chapterId: chapter.id },
      orderBy: { order: "asc" }
    });

    void this.warmChapterTranslations(chapter.id);

    return {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      bookTitle: chapter.book.title,
      sentences: freshSentences.map((item) => ({
        id: item.id,
        order: item.order,
        english: item.english,
        chinese: item.chinese
      }))
    };
  }

  getWord(word: string) {
    const normalized = word.toLowerCase();
    const hit = this.dictionary[normalized];
    if (hit) {
      return { word: normalized, ...hit };
    }
    return {
      word: normalized,
      chinese: "暂无词典释义（MVP mock）",
      english: "No dictionary entry found in MVP mock",
      example: `Example: ${normalized} appears in context.`
    };
  }

  async saveProgress(chapterId: string, sentenceId: string, percent: number) {
    await this.lexiService.ensureSeedData();
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true }
    });
    if (!chapter) {
      this.progress.set(chapterId, { sentenceId, percent });
      return { ok: true };
    }

    const normalizedPercent = Math.min(100, Math.max(0, Math.round(percent)));
    const currentPage = Math.min(
      chapter.book.totalPages,
      Math.max(0, Math.round((chapter.book.totalPages * normalizedPercent) / 100))
    );
    await this.prisma.book.update({
      where: { id: chapter.bookId },
      data: {
        currentPage,
        currentChapterId: chapterId,
        currentSentenceId: sentenceId,
        progressPercent: normalizedPercent,
        status: normalizedPercent >= 100 ? "finished" : "reading",
        lastReadAt: new Date(),
        startedAt: chapter.book.startedAt ?? new Date(),
        finishedAt: normalizedPercent >= 100 ? new Date() : chapter.book.finishedAt
      }
    });
    await this.recordReadingTouch(chapter.book.userId, chapter.bookId);
    this.progress.set(chapterId, { sentenceId, percent: normalizedPercent });
    return { ok: true };
  }

  async getProgress(chapterId: string) {
    await this.lexiService.ensureSeedData();
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true }
    });
    if (!chapter) {
      return this.progress.get(chapterId) ?? { sentenceId: null, percent: 0 };
    }
    return {
      sentenceId: chapter.book.currentSentenceId,
      chapterId: chapter.book.currentChapterId ?? chapterId,
      percent: chapter.book.progressPercent
    };
  }

  async translateBatch(texts: string[]) {
    const translations = await this.offlineTranslateService.translateEnToZhBatch(texts);
    return { translations };
  }

  private async fillMissingChinese(
    chapterId: string,
    sentences: Array<{ id: string; english: string; chinese: string }>,
    limit = 80
  ) {
    const missing = sentences.filter((item) => !item.chinese || !item.chinese.trim()).slice(0, limit);
    if (!missing.length) return;

    const translations = await this.offlineTranslateService.translateEnToZhBatch(missing.map((item) => item.english));
    for (const [index, sentence] of missing.entries()) {
      const translated = translations[index]?.trim();
      if (!translated) continue;
      await this.prisma.sentence.update({
        where: { id: sentence.id },
        data: { chinese: translated }
      });
    }
  }

  private async warmChapterTranslations(chapterId: string) {
    if (this.warmingChapters.has(chapterId)) return;
    this.warmingChapters.add(chapterId);

    try {
      const sentences = await this.prisma.sentence.findMany({
        where: { chapterId },
        orderBy: { order: "asc" },
        take: 120
      });
      await this.fillMissingChinese(chapterId, sentences, 120);
    } finally {
      this.warmingChapters.delete(chapterId);
    }
  }

  private getLocalDayRange(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private async recordReadingTouch(userId: string, bookId: string) {
    const { start, end } = this.getLocalDayRange();
    const session = await this.prisma.readingSession.findFirst({
      where: { userId, bookId, date: { gte: start, lt: end } },
      orderBy: { date: "desc" }
    });
    if (session) {
      await this.prisma.readingSession.update({
        where: { id: session.id },
        data: { sentencesRead: { increment: 1 }, durationMin: { increment: 1 } }
      });
      return;
    }
    await this.prisma.readingSession.create({
      data: {
        userId,
        bookId,
        date: new Date(),
        durationMin: 1,
        sentencesRead: 1,
        wordsLearned: 0
      }
    });
  }
}
