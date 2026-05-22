export type Sentence = {
  id: string;
  order: number;
  english: string;
  chinese: string;
};

export type ChapterReaderData = {
  chapterId: string;
  chapterTitle: string;
  bookTitle: string;
  chapters: Array<{
    id: string;
    title: string;
    order: number;
  }>;
  sentences: Sentence[];
};

export type WordExplain = {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  chinese: string;
  english: string;
  example?: string;
};
