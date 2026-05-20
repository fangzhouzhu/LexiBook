import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

const DEMO_USERNAME = "alex";

@Injectable()
export class LexiService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureSeedData() {
    const existing = await this.prisma.user.findUnique({ where: { username: DEMO_USERNAME } });
    if (existing) {
      return existing;
    }

    const user = await this.prisma.user.create({
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
        },
        books: {
          create: [
            {
              title: "The First Morning",
              author: "Virginia Woolf",
              coverUrl: "/generated/cover-first-morning.svg",
              category: "经典文学",
              level: "B2",
              description: "在日常晨光里感受语言与意识流的细腻变化。",
              totalPages: 220,
              currentPage: 55,
              status: "reading",
              startedAt: new Date("2026-05-01T08:10:00.000Z"),
              lastReadAt: new Date("2026-05-20T01:32:00.000Z")
            },
            {
              title: "Pride and Prejudice",
              author: "Jane Austen",
              coverUrl: "/generated/cover-pride.svg",
              category: "经典名著",
              level: "B1",
              description: "机智对白与社会观察并存的经典长篇。",
              totalPages: 390,
              currentPage: 390,
              status: "finished",
              rating: 5,
              startedAt: new Date("2026-02-02T02:10:00.000Z"),
              finishedAt: new Date("2026-04-10T11:00:00.000Z"),
              lastReadAt: new Date("2026-04-10T11:00:00.000Z")
            },
            {
              title: "The Secret Garden",
              author: "Frances Hodgson Burnett",
              coverUrl: "/generated/cover-garden.svg",
              category: "儿童文学",
              level: "A2",
              description: "温柔治愈的成长故事，词汇友好。",
              totalPages: 280,
              currentPage: 132,
              status: "reading",
              startedAt: new Date("2026-05-07T09:30:00.000Z"),
              lastReadAt: new Date("2026-05-19T13:22:00.000Z")
            },
            {
              title: "The Little Prince",
              author: "Antoine de Saint-Exupery",
              coverUrl: "/generated/cover-prince.svg",
              category: "童话寓言",
              level: "A2",
              description: "短句清晰，适合精读与表达练习。",
              totalPages: 180,
              currentPage: 20,
              status: "reading",
              startedAt: new Date("2026-05-18T06:00:00.000Z"),
              lastReadAt: new Date("2026-05-18T06:35:00.000Z")
            }
          ]
        },
        words: {
          create: [
            { word: "serene", meaning: "平静的；安宁的", phonetic: "/s??ri?n/", familiarity: 3, reviewCount: 4, mastered: false },
            { word: "flicker", meaning: "闪烁；摇曳", phonetic: "/?fl?k?r/", familiarity: 2, reviewCount: 2, mastered: false },
            { word: "meadow", meaning: "草地；牧场", phonetic: "/?medo?/", familiarity: 4, reviewCount: 6, mastered: true },
            { word: "persist", meaning: "坚持；持续存在", phonetic: "/p?r?s?st/", familiarity: 3, reviewCount: 5, mastered: false }
          ]
        },
        notes: {
          create: [
            {
              title: "The First Morning Chapter 1",
              content: "第一段通过清晨意象建立叙事节奏，建议积累时间与天气表达。",
              tags: ["精读", "意象"],
              pinned: true
            },
            {
              title: "Austen 对话句式",
              content: "关注让步结构与反问句，适合口语复述。",
              tags: ["句式", "口语"],
              pinned: false
            }
          ]
        },
        sessions: {
          create: [
            { date: new Date("2026-05-14T11:30:00.000Z"), durationMin: 65, sentencesRead: 132, wordsLearned: 12 },
            { date: new Date("2026-05-15T11:30:00.000Z"), durationMin: 42, sentencesRead: 96, wordsLearned: 9 },
            { date: new Date("2026-05-16T11:30:00.000Z"), durationMin: 38, sentencesRead: 81, wordsLearned: 6 },
            { date: new Date("2026-05-17T11:30:00.000Z"), durationMin: 76, sentencesRead: 153, wordsLearned: 14 },
            { date: new Date("2026-05-18T11:30:00.000Z"), durationMin: 35, sentencesRead: 72, wordsLearned: 5 },
            { date: new Date("2026-05-19T11:30:00.000Z"), durationMin: 50, sentencesRead: 113, wordsLearned: 10 },
            { date: new Date("2026-05-20T11:30:00.000Z"), durationMin: 44, sentencesRead: 99, wordsLearned: 8 }
          ]
        }
      }
    });

    return user;
  }

  async getDemoUserId() {
    const user = await this.ensureSeedData();
    return user.id;
  }
}
