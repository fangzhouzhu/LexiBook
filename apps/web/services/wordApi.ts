import type { WordExplain } from "@/types/reader";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export async function getWordExplain(word: string): Promise<WordExplain> {
  const res = await fetch(`${API_BASE}/words/${encodeURIComponent(word)}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch word explain");
  }
  return res.json();
}
