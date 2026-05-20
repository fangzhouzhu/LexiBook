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
    throw new Error("保存进度失败，请先登录");
  }
}
