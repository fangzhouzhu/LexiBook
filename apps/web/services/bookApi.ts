import type { ChapterReaderData } from "@/types/reader";
import { getToken } from "./authApi";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export async function getChapterReaderData(chapterId: string): Promise<ChapterReaderData> {
  const res = await fetch(`${API_BASE}/chapters/${chapterId}/reader-data`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch chapter data");
  }
  return res.json();
}

export async function saveReadingProgress(payload: {
  chapterId: string;
  sentenceId: string;
  percent: number;
}): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/progress/reading`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error("保存阅读进度失败");
  }
}

export async function getReadingProgress(chapterId: string): Promise<{ sentenceId: string | null; percent: number }> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/progress/reading/${chapterId}`, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) {
    return { sentenceId: null, percent: 0 };
  }
  return res.json();
}

export async function getBookMarkdownRaw(bookId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/books/${bookId}/markdown/raw`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch markdown content");
  }
  return res.text();
}

export async function translateSentencesOffline(texts: string[]): Promise<string[]> {
  if (!texts.length) return [];
  const res = await fetch(`${API_BASE}/chapters/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts })
  });
  if (!res.ok) {
    throw new Error("Failed to translate sentences");
  }
  const data = (await res.json()) as { translations?: string[] };
  return data.translations ?? [];
}
