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
  sentences: Sentence[];
};

export type WordExplain = {
  word: string;
  phonetic?: string;
  chinese: string;
  english: string;
  example?: string;
};
