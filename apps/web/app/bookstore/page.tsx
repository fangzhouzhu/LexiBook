"use client";

import { useEffect, useMemo, useState } from "react";
import { BookPlus, FileText } from "lucide-react";

type StoreBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  category?: string;
  level?: string;
  description?: string;
  totalPages: number;
  inBookshelf: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

function StoreBookCard({
  book,
  onAdd
}: {
  book: StoreBook;
  onAdd: (book: StoreBook) => void;
}) {
  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-white/60 p-3 shadow-[0_8px_16px_rgba(61,39,18,0.04)]">
      <img src={book.coverUrl} alt={book.title} className="aspect-[3/4] w-full rounded-[6px] object-cover" />
      <div className="mt-3 min-h-[132px]">
        <div className="flex items-center gap-2 text-[11px] text-[#87653d]">
          <span>{book.category ?? "英文阅读"}</span>
          <span>{book.level ?? "B1"}</span>
        </div>
        <h2 className="mt-2 text-[16px] font-semibold leading-5 text-[#2f2318]">{book.title}</h2>
        <p className="mt-1 text-[12px] text-[#786755]">{book.author}</p>
        <p className="mt-2 text-[12px] leading-5 text-[#7d6a58]">{book.description}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className={`inline-flex items-center justify-center gap-1 rounded-[6px] px-2 py-2 text-[12px] font-semibold ${
            book.inBookshelf
              ? "cursor-not-allowed border border-[var(--border)] bg-white/70 text-[#8c7763]"
              : "bg-[linear-gradient(135deg,#9c6a2f_0%,#b57a39_100%)] text-white"
          }`}
          disabled={book.inBookshelf}
          onClick={() => onAdd(book)}
        >
          <BookPlus size={14} />
          {book.inBookshelf ? "已加入" : "加入"}
        </button>
        <a
          className="inline-flex items-center justify-center gap-1 rounded-[6px] border border-[var(--border)] bg-white/70 px-2 py-2 text-[12px] font-semibold text-[#6c5645]"
          href={`${API_BASE}/books/${book.id}/markdown/raw`}
          target="_blank"
          rel="noreferrer"
        >
          <FileText size={14} />
          正文
        </a>
      </div>
    </article>
  );
}

export default function BookstorePage() {
  const [books, setBooks] = useState<StoreBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("全部");
  const [keyword, setKeyword] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`${API_BASE}/bookstore`, { cache: "no-store" });
    const payload = await res.json();
    setBooks(payload.books ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const categories = useMemo(
    () => ["全部", ...Array.from(new Set(books.map((book) => book.category).filter((item): item is string => Boolean(item))))],
    [books]
  );

  const visibleBooks = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return books.filter((book) => {
      const matchCategory = category === "全部" || book.category === category;
      const matchKeyword =
        !normalized ||
        book.title.toLowerCase().includes(normalized) ||
        book.author.toLowerCase().includes(normalized);
      return matchCategory && matchKeyword;
    });
  }, [books, category, keyword]);

  async function addToBookshelf(book: StoreBook) {
    await fetch(`${API_BASE}/bookshelf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeBookId: book.id })
    });
    await load();
  }

  return (
    <section className="space-y-6">
      {loading ? <div className="glass-card rounded-[8px] px-5 py-4 text-sm text-[#7b6957]">正在刷新书城...</div> : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[42px] leading-none text-[#2f2318]">书城</h1>
          <p className="mt-2 text-[14px] text-[#7a6654]">发现更多好书，探索无限可能</p>
        </div>
        <input
          placeholder="搜索书名、作者..."
          className="w-[320px] max-w-full rounded-full border border-[var(--border)] bg-white/75 px-4 py-2 text-[14px]"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`rounded-[8px] px-4 py-2 text-[13px] ${
              category === item ? "bg-[rgba(156,106,47,0.14)] text-[#7b5524]" : "text-[#6f5947]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {visibleBooks.map((book) => (
          <StoreBookCard key={book.id} book={book} onAdd={addToBookshelf} />
        ))}
      </div>
    </section>
  );
}
