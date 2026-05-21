import { Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { CATALOG_BOOKS } from "./catalog.data";

const DEMO_USERNAME = "alex";

@Injectable()
export class LexiService {
  private seedPromise?: Promise<User>;

  constructor(private readonly prisma: PrismaService) {}

  async ensureSeedData() {
    this.seedPromise ??= this.ensureSeedDataOnce().finally(() => {
      this.seedPromise = undefined;
    });
    return this.seedPromise;
  }

  private async ensureSeedDataOnce() {
    let user = await this.prisma.user.findUnique({ where: { username: DEMO_USERNAME } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          username: DEMO_USERNAME,
          passwordHash: "demo-password-hash",
          displayName: "Alex",
          avatarUrl: "/generated/avatar-alex.svg",
          settings: {
            create: {
              dailyGoalMinutes: 45,
              weeklyGoalDays: 6,
              preferredFontSize: 19,
              preferredTheme: "sepia",
              reminderEnabled: true,
              reminderTime: "21:00",
              language: "zh-CN"
            }
          }
        }
      });
    }

    await this.ensureBooks(user.id);
    await this.ensureWords(user.id);
    await this.ensureNotes(user.id);
    await this.ensureSessions(user.id);
    await this.ensureCheckIns(user.id);
    return user;
  }

  private async ensureBooks(userId: string) {
    for (const item of CATALOG_BOOKS) {
      const existing = await this.prisma.book.findFirst({
        where: { userId, title: item.title, author: item.author },
        include: { chapters: true }
      });

      const book =
        existing ??
        (await this.prisma.book.create({
          data: {
            userId,
            title: item.title,
            author: item.author,
            coverUrl: item.coverUrl,
            category: item.category,
            level: item.level,
            description: item.description,
            totalPages: item.totalPages,
            currentPage: item.initialCurrentPage,
            progressPercent: item.totalPages > 0 ? Math.round((item.initialCurrentPage / item.totalPages) * 100) : 0,
            status: item.initialStatus
          }
        }));

      if (existing) {
        await this.prisma.book.update({
          where: { id: existing.id },
          data: {
            coverUrl: item.coverUrl,
            category: item.category,
            level: item.level,
            description: item.description,
            totalPages: item.totalPages,
            progressPercent: item.totalPages > 0 ? Math.round((existing.currentPage / item.totalPages) * 100) : 0
          }
        });
      }

      if (item.chapters.length === 0) continue;

      for (const chapter of item.chapters) {
        const storedChapter = await this.prisma.chapter.upsert({
          where: {
            bookId_order: {
              bookId: book.id,
              order: chapter.order
            }
          },
          update: {
            title: chapter.title
          },
          create: {
            bookId: book.id,
            title: chapter.title,
            order: chapter.order
          }
        });

        const sentenceOrders = chapter.sentences.map((sentence) => sentence.order);
        await this.prisma.sentence.deleteMany({
          where: {
            chapterId: storedChapter.id,
            order: { notIn: sentenceOrders }
          }
        });

        for (const sentence of chapter.sentences) {
          await this.prisma.sentence.upsert({
            where: {
              chapterId_order: {
                chapterId: storedChapter.id,
                order: sentence.order
              }
            },
            update: {
              english: sentence.english,
              chinese: sentence.chinese
            },
            create: {
              chapterId: storedChapter.id,
              order: sentence.order,
              english: sentence.english,
              chinese: sentence.chinese
            }
          });
        }
      }
    }
  }

  private async ensureWords(userId: string) {
    const existingCount = await this.prisma.vocabularyWord.count({ where: { userId } });
    if (existingCount > 0) return;
    await this.prisma.vocabularyWord.createMany({
      data: [
        { userId, word: "serene", meaning: "平静的，安宁的", phonetic: "/səˈriːn/", familiarity: 3, reviewCount: 4, mastered: false },
        { userId, word: "flicker", meaning: "闪烁，摇曳", phonetic: "/ˈflɪkər/", familiarity: 2, reviewCount: 2, mastered: false },
        { userId, word: "meadow", meaning: "草地，牧场", phonetic: "/ˈmedoʊ/", familiarity: 4, reviewCount: 6, mastered: true },
        { userId, word: "persist", meaning: "坚持，持续存在", phonetic: "/pərˈsɪst/", familiarity: 3, reviewCount: 5, mastered: false }
      ]
    });
  }

  private async ensureNotes(userId: string) {
    const existingCount = await this.prisma.note.count({ where: { userId } });
    if (existingCount > 0) return;
    await this.prisma.note.createMany({
      data: [
        {
          userId,
          title: "Secret Garden Chapter 1",
          content: "关注人物外貌描写中的形容词组合，适合做口语复述。",
          tags: ["精读", "人物描写"],
          pinned: true
        },
        {
          userId,
          title: "Austen 对话句式",
          content: "记录礼貌表达与反问句结构，便于迁移到写作。",
          tags: ["句式", "写作"],
          pinned: false
        }
      ]
    });
  }

  private async ensureSessions(userId: string) {
    const existingCount = await this.prisma.readingSession.count({ where: { userId } });
    if (existingCount > 0) return;
    await this.prisma.readingSession.createMany({
      data: [
        { userId, date: new Date("2026-05-14T11:30:00.000Z"), durationMin: 65, sentencesRead: 132, wordsLearned: 12 },
        { userId, date: new Date("2026-05-15T11:30:00.000Z"), durationMin: 42, sentencesRead: 96, wordsLearned: 9 },
        { userId, date: new Date("2026-05-16T11:30:00.000Z"), durationMin: 38, sentencesRead: 81, wordsLearned: 6 },
        { userId, date: new Date("2026-05-17T11:30:00.000Z"), durationMin: 76, sentencesRead: 153, wordsLearned: 14 },
        { userId, date: new Date("2026-05-18T11:30:00.000Z"), durationMin: 35, sentencesRead: 72, wordsLearned: 5 },
        { userId, date: new Date("2026-05-19T11:30:00.000Z"), durationMin: 50, sentencesRead: 113, wordsLearned: 10 },
        { userId, date: new Date("2026-05-20T11:30:00.000Z"), durationMin: 44, sentencesRead: 99, wordsLearned: 8 }
      ]
    });
  }

  private async ensureCheckIns(userId: string) {
    const existingCount = await this.prisma.readingCheckIn.count({ where: { userId } });
    if (existingCount > 0) return;
    const today = new Date();
    const data = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (5 - index));
      return {
        userId,
        dateKey: this.toDateKey(date),
        checkedAt: date
      };
    });
    await this.prisma.readingCheckIn.createMany({ data });
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async getDemoUserId() {
    const user = await this.ensureSeedData();
    return user.id;
  }
}
