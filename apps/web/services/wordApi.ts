import type { WordExplain } from "@/types/reader";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export type FavoriteWord = {
  id: string;
  word: string;
  meaning: string;
  phonetic?: string | null;
  sentence?: string | null;
  chapterTitle?: string | null;
  mastered: boolean;
};

export async function getWordExplain(word: string): Promise<WordExplain> {
  const res = await fetch(`${API_BASE}/words/${encodeURIComponent(word)}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch word explain");
  }
  return res.json();
}

export async function favoriteWord(payload: WordExplain & { sentence?: string; chapterTitle?: string }) {
  const res = await fetch(`${API_BASE}/vocabulary/favorite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: payload.word,
      meaning: payload.chinese,
      phonetic: payload.phonetic,
      english: payload.english,
      sentence: payload.sentence,
      chapterTitle: payload.chapterTitle
    })
  });

  if (!res.ok) {
    throw new Error("Failed to favorite word");
  }

  return res.json();
}

export async function getFavoriteWord(word: string): Promise<FavoriteWord | null> {
  const res = await fetch(`${API_BASE}/vocabulary/favorite/${encodeURIComponent(word)}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch favorite word");
  }
  const payload = (await res.json()) as { favorite: FavoriteWord | null };
  return payload.favorite;
}

export async function removeFavoriteWord(id: string) {
  const res = await fetch(`${API_BASE}/vocabulary/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("Failed to remove favorite word");
  }
  return res.json();
}
