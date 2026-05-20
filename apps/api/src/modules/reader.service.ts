import { Injectable } from "@nestjs/common";

type Sentence = { id: string; order: number; english: string; chinese: string };

@Injectable()
export class ReaderService {
  private readonly chapter = {
    chapterId: "ch1",
    chapterTitle: "The First Morning",
    bookTitle: "LexiBook Demo Reader",
    sentences: [
      { id: "s1", order: 1, english: "I woke up before sunrise and opened the old window.", chinese: "我在日出前醒来，打开了那扇旧窗。" },
      { id: "s2", order: 2, english: "The city was quiet, and the street lights were still on.", chinese: "城市很安静，街灯依然亮着。" },
      { id: "s3", order: 3, english: "A cold wind moved across the room and touched my face.", chinese: "一阵冷风穿过房间，拂过我的脸。" },
      { id: "s4", order: 4, english: "I made a cup of tea and started reading a short story.", chinese: "我泡了一杯茶，开始读一个短篇故事。" },
      { id: "s5", order: 5, english: "Every unfamiliar word felt like a small locked door.", chinese: "每个生词都像一扇上锁的小门。" }
    ] satisfies Sentence[]
  };

  private readonly dictionary: Record<string, { chinese: string; english: string; phonetic?: string; example?: string }> = {
    sunrise: { chinese: "日出", english: "the time when the sun first appears", phonetic: "/ˈsʌn.raɪz/" },
    unfamiliar: { chinese: "不熟悉的", english: "not known well", phonetic: "/ˌʌn.fəˈmɪl.jɚ/" },
    locked: { chinese: "上锁的", english: "closed with a lock", phonetic: "/lɑːkt/" },
    story: { chinese: "故事", english: "a description of events", phonetic: "/ˈstɔːr.i/" }
  };

  private readonly progress = new Map<string, { sentenceId: string; percent: number }>();

  getReaderData(chapterId: string) {
    return { ...this.chapter, chapterId };
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

  saveProgress(chapterId: string, sentenceId: string, percent: number) {
    this.progress.set(chapterId, { sentenceId, percent });
    return { ok: true };
  }

  getProgress(chapterId: string) {
    return this.progress.get(chapterId) ?? { sentenceId: null, percent: 0 };
  }
}
