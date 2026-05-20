"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Clock3, Flame } from "lucide-react";
import type { ReactNode } from "react";
import { getStoredUser } from "@/services/authApi";

type MenuKey = "home" | "bookshelf" | "vocabulary" | "notes" | "statistics" | "settings";

type HomePayload = {
  user: { displayName: string; avatarUrl: string };
  hero: {
    title: string;
    subtitle: string;
    quote: string;
    author: string;
    backgroundImage: string;
  };
  continueReading: {
    id: string;
    title: string;
    author: string;
    coverUrl: string;
    currentPage: number;
    totalPages: number;
  };
  recommendations?: Array<{
    id: string;
    title: string;
    author: string;
    coverUrl: string;
    category?: string;
  }>;
  stats: {
    weeklyMinutes: number;
    readingDays: number;
    sentenceCount: number;
    vocabularyCount: number;
    streakDays: number;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
const validTabs: MenuKey[] = ["home", "bookshelf", "vocabulary", "notes", "statistics", "settings"];

function formatMonthDayUTC(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function SectionShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-card rounded-[12px] p-7">
      <div className="mb-6">
        <h2 className="font-display text-[34px] leading-none text-[#2f2318]">{title}</h2>
        {subtitle ? <p className="mt-3 text-[15px] leading-7 text-[#7b6957]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [active, setActive] = useState<MenuKey>("home");
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [wordForm, setWordForm] = useState({ word: "", meaning: "", phonetic: "" });
  const [noteForm, setNoteForm] = useState({ title: "", content: "", tags: "" });
  const [viewerName, setViewerName] = useState<string | null>(null);

  async function load(section: MenuKey) {
    setLoading(true);
    const endpoint = section === "home" ? "home" : section;
    const res = await fetch(`${API_BASE}/${endpoint}`, { cache: "no-store" });
    const payload = await res.json();
    setData((prev) => ({ ...prev, [section]: payload }));
    setLoading(false);
  }

  useEffect(() => {
    const tab = searchParams.get("tab") as MenuKey | null;
    setActive(tab && validTabs.includes(tab) ? tab : "home");
  }, [searchParams]);

  useEffect(() => {
    void load(active);
  }, [active]);

  useEffect(() => {
    const stored = getStoredUser();
    setViewerName(stored?.username ?? null);
  }, []);

  const home = data.home as HomePayload | undefined;
  const books = data.bookshelf?.books ?? [];
  const words = data.vocabulary?.words ?? [];
  const notes = data.notes?.notes ?? [];
  const stats = data.statistics;
  const settings = data.settings?.settings;

  const completion = useMemo(() => {
    const reading = books.filter((book: any) => book.status === "reading");
    if (!reading.length) return 0;
    return Math.round(
      reading.reduce((sum: number, book: any) => sum + (book.currentPage / Math.max(1, book.totalPages)) * 100, 0) / reading.length
    );
  }, [books]);

  const chartBars = home ? [74, 118, 48, 75, 39, 94, 46] : [];

  async function patch(url: string, body: any) {
    await fetch(`${API_BASE}${url}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await load(active);
  }

  async function post(url: string, body: any) {
    await fetch(`${API_BASE}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await load(active);
  }

  return (
    <div className="space-y-5">
      {loading ? <div className="glass-card rounded-[24px] px-5 py-4 text-sm text-[#7b6957]">正在刷新你的阅读空间...</div> : null}

      {active === "home" && home ? (
        <>
          <section
            className="glass-card relative overflow-hidden rounded-[22px] border-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${home.hero.backgroundImage})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "100%",
              backgroundPosition: "72% center",
              border: "0"
            }}
          >
            <div className="absolute inset-y-0 left-0 w-[62%] " />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,241,232,0.90)_0%,rgba(247,241,232,0.72)_34%,rgba(247,241,232,0.16)_66%,rgba(247,241,232,0.04)_100%)]" />
            <div className="relative min-h-[290px] px-11 py-10 lg:px-12 lg:py-11">
              <div className="max-w-[560px]">
                <h1 className="font-display text-[38px] leading-[1.08] tracking-[-0.04em] text-[#2f2318] lg:text-[54px]">
                  欢迎回来，{viewerName ?? home.user.displayName}
                </h1>
                <div className="mt-10 max-w-[340px]">
                  <p className="text-[15px] leading-8 text-[#8d7863]">“{home.hero.quote}”</p>
                  <p className="text-[15px] text-[#8d7863]">— {home.hero.author}</p>
                </div>
                <div className="mt-9 flex flex-wrap gap-4">
                  <Link
                    href={`/books/${home.continueReading.id}/chapters/ch1`}
                    className="inline-flex items-center rounded-[12px] bg-[linear-gradient(135deg,#9c6a2f_0%,#b57a39_100%)] px-6 py-4 text-[15px] font-semibold text-white shadow-[0_10px_22px_rgba(156,106,47,0.16)]"
                  >
                    继续阅读
                  </Link>
                  <button className="rounded-[12px] border border-[var(--border-strong)] bg-white/60 px-6 py-4 text-[15px] font-medium text-[#8c6742]">
                    今日计划
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.65fr_0.95fr]">
            <div className="space-y-5">
              <section className="glass-card rounded-[12px] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen size={18} className="text-[#9c6a2f]" />
                    <h2 className="text-[16px] font-semibold text-[#4d3a28]">继续阅读</h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-[128px_1fr]">
                  <img
                    src={home.continueReading.coverUrl}
                    alt={home.continueReading.title}
                    className="h-44 w-32 rounded-[10px] object-cover shadow-[0_10px_22px_rgba(56,39,22,0.10)]"
                  />
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="font-display text-[34px] leading-tight text-[#2f2318]">{home.continueReading.title}</h3>
                      <p className="mt-1 text-[16px] text-[#766452]">{home.continueReading.author}</p>
                      <p className="mt-5 text-[15px] text-[#6e5c4a]">Chapter 1</p>
                      <div className="mt-4 h-[5px] rounded-full bg-[rgba(168,131,90,0.14)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#8f5f2b_0%,#b8813c_100%)]"
                          style={{
                            width: `${Math.round((home.continueReading.currentPage / Math.max(home.continueReading.totalPages, 1)) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[14px] text-[#8a7764]">
                        <span>阅读进度 {home.continueReading.currentPage} / {home.continueReading.totalPages} 页</span>
                        <span>{Math.round((home.continueReading.currentPage / Math.max(home.continueReading.totalPages, 1)) * 100)}%</span>
                      </div>
                    </div>

                    <div className="min-w-[154px] text-right">
                      <Link
                        href={`/books/${home.continueReading.id}/chapters/ch1`}
                        className="inline-flex items-center rounded-[10px] bg-[linear-gradient(135deg,#9c6a2f_0%,#b57a39_100%)] px-5 py-3 text-[14px] font-semibold text-white"
                      >
                        继续阅读
                      </Link>
                      <p className="mt-4 text-[14px] text-[#8b7763]">上次阅读: 今天 09:32</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="glass-card rounded-[12px] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen size={18} className="text-[#9c6a2f]" />
                    <h2 className="text-[16px] font-semibold text-[#4d3a28]">推荐书籍</h2>
                  </div>
                  <button className="inline-flex items-center gap-1 text-[14px] text-[#8c7763]">
                    查看全部
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                  <button className="hidden xl:flex h-12 w-12 items-center justify-center self-center rounded-full border border-[var(--border)] bg-white/58 text-[#9f805d] shadow-[0_6px_14px_rgba(61,39,18,0.04)]">
                    <ChevronLeft size={18} />
                  </button>
                  {(home.recommendations ?? []).map((book) => (
                    <article key={book.id}>
                      <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-white/58 p-2 shadow-[0_8px_16px_rgba(61,39,18,0.04)]">
                        <img src={book.coverUrl} alt={book.title} className="h-48 w-full rounded-[10px] object-cover" />
                      </div>
                      <h3 className="mt-4 text-[16px] font-semibold leading-6 text-[#2f2318]">{book.title}</h3>
                      <p className="mt-1 text-[14px] text-[#786755]">{book.author}</p>
                      <span className="mt-3 inline-flex rounded-full bg-[rgba(160,109,49,0.10)] px-3 py-1 text-[12px] text-[#8d6434]">
                        {book.category ?? "推荐阅读"}
                      </span>
                    </article>
                  ))}
                  <button className="hidden xl:flex h-12 w-12 items-center justify-center self-center rounded-full border border-[var(--border)] bg-white/58 text-[#9f805d] shadow-[0_6px_14px_rgba(61,39,18,0.04)]">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </section>
            </div>

            <section className="glass-card rounded-[12px] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock3 size={18} className="text-[#9c6a2f]" />
                  <h2 className="text-[16px] font-semibold text-[#4d3a28]">学习统计</h2>
                </div>
                <button className="inline-flex items-center gap-1 text-[14px] text-[#8c7763]">
                  查看全部
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-[10px] border border-[var(--border)] bg-white/58 p-4">
                  <p className="text-[13px] text-[#8b7764]">阅读时长</p>
                  <p className="mt-3 text-[36px] font-semibold text-[#2f2318]">{Math.floor(home.stats.weeklyMinutes / 60)} h</p>
                  <p className="text-[13px] text-[#8b7764]">本周阅读</p>
                </div>
                <div className="rounded-[10px] border border-[var(--border)] bg-white/58 p-4">
                  <p className="text-[13px] text-[#8b7764]">阅读天数</p>
                  <p className="mt-3 text-[36px] font-semibold text-[#2f2318]">{home.stats.readingDays} 天</p>
                  <p className="text-[13px] text-[#8b7764]">累计坚持</p>
                </div>
                <div className="rounded-[10px] border border-[var(--border)] bg-white/58 p-4">
                  <p className="text-[13px] text-[#8b7764]">阅读句子</p>
                  <p className="mt-3 text-[36px] font-semibold text-[#2f2318]">{home.stats.sentenceCount}</p>
                  <p className="text-[13px] text-[#8b7764]">累计阅读</p>
                </div>
                <div className="rounded-[10px] border border-[var(--border)] bg-white/58 p-4">
                  <p className="text-[13px] text-[#8b7764]">掌握单词</p>
                  <p className="mt-3 text-[36px] font-semibold text-[#2f2318]">{home.stats.vocabularyCount}</p>
                  <p className="text-[13px] text-[#8b7764]">累计掌握</p>
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[15px] font-semibold text-[#4d3a28]">本周阅读时长</p>
                  <p className="text-[14px] text-[#8c7763]">5 小时 50 分钟</p>
                </div>
                <div className="flex h-44 items-end gap-4 rounded-[12px] border border-[var(--border)] bg-white/52 px-4 pb-4 pt-6">
                  {chartBars.map((value, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-[14px] bg-[linear-gradient(180deg,#d4b38a_0%,#b57a39_100%)]" style={{ height: `${value}px` }} />
                      <span className="text-[12px] text-[#8c7763]">{["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between rounded-[12px] border border-[rgba(160,109,49,0.14)] bg-[rgba(255,250,243,0.72)] px-5 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(160,109,49,0.12)] text-[#9c6a2f]">
                    <Flame size={18} />
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-[#4d3a28]">连续学习</p>
                    <p className="mt-1 text-[14px] text-[#8b7764]">保持热爱，持续进步。</p>
                  </div>
                </div>
                <div className="text-[30px] font-semibold text-[#9c6a2f]">{home.stats.streakDays} 天</div>
              </div>
            </section>
          </section>
        </>
      ) : null}

      {active === "bookshelf" ? (
        <SectionShell title="我的书架" subtitle={`在读平均进度 ${completion}%`}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {books.map((book: any) => (
              <article key={book.id} className="rounded-[22px] border border-[var(--border)] bg-white/58 p-4 shadow-[0_8px_16px_rgba(61,39,18,0.04)]">
                <img src={book.coverUrl} alt={book.title} className="h-56 w-full rounded-[12px] object-cover" />
                <h3 className="font-display mt-5 text-[30px] leading-tight text-[#2f2318]">{book.title}</h3>
                <p className="mt-1 text-[15px] text-[#786755]">{book.author}</p>
                <input
                  type="range"
                  min={0}
                  max={book.totalPages || 1}
                  value={book.currentPage}
                  onChange={(e) => void patch(`/bookshelf/${book.id}/progress`, { currentPage: Number(e.target.value) })}
                  className="mt-5 w-full"
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[14px] text-[#8b7764]">{book.currentPage}/{book.totalPages} 页</p>
                  <Link href={`/books/${book.id}/chapters/ch1`} className="rounded-[10px] bg-[linear-gradient(135deg,#9c6a2f_0%,#b57a39_100%)] px-4 py-2 text-sm font-semibold text-white">
                    阅读
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </SectionShell>
      ) : null}

      {active === "vocabulary" ? (
        <SectionShell title="生词本" subtitle="把值得复习的词语沉淀下来，慢慢变成你自己的表达。">
          <div className="flex flex-wrap gap-3">
            <input placeholder="单词" className="rounded-[10px] border border-[var(--border)] bg-white/70 px-4 py-3" value={wordForm.word} onChange={(e) => setWordForm({ ...wordForm, word: e.target.value })} />
            <input placeholder="释义" className="rounded-[10px] border border-[var(--border)] bg-white/70 px-4 py-3" value={wordForm.meaning} onChange={(e) => setWordForm({ ...wordForm, meaning: e.target.value })} />
            <input placeholder="音标" className="rounded-[10px] border border-[var(--border)] bg-white/70 px-4 py-3" value={wordForm.phonetic} onChange={(e) => setWordForm({ ...wordForm, phonetic: e.target.value })} />
            <button onClick={() => void post("/vocabulary", wordForm)} className="rounded-[10px] bg-[linear-gradient(135deg,#9c6a2f_0%,#b57a39_100%)] px-5 py-3 font-semibold text-white">
              添加
            </button>
          </div>
          <div className="mt-6 space-y-3">
            {words.map((word: any) => (
              <div key={word.id} className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-[28px] text-[#2f2318]">
                      {word.word}
                      <span className="ml-2 font-sans text-sm text-[#8b7764]">{word.phonetic}</span>
                    </p>
                    <p className="mt-1 text-[15px] text-[#665647]">{word.meaning}</p>
                  </div>
                  <button onClick={() => void patch(`/vocabulary/${word.id}/mastered`, { mastered: !word.mastered })} className="rounded-[10px] border border-[var(--border-strong)] px-4 py-2 text-sm text-[#7a4d24]">
                    {word.mastered ? "已掌握" : "标记掌握"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionShell>
      ) : null}

      {active === "notes" ? (
        <SectionShell title="笔记" subtitle="记录句式、意象、结构和你的理解，让阅读真正留下痕迹。">
          <div className="grid gap-3 md:grid-cols-3">
            <input placeholder="标题" className="rounded-[10px] border border-[var(--border)] bg-white/70 px-4 py-3" value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} />
            <input placeholder="标签(逗号分隔)" className="rounded-[10px] border border-[var(--border)] bg-white/70 px-4 py-3" value={noteForm.tags} onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })} />
            <button
              onClick={() =>
                void post("/notes", {
                  title: noteForm.title,
                  content: noteForm.content,
                  tags: noteForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
                })
              }
              className="rounded-[10px] bg-[linear-gradient(135deg,#9c6a2f_0%,#b57a39_100%)] px-5 py-3 font-semibold text-white"
            >
              保存笔记
            </button>
          </div>
          <textarea placeholder="笔记内容" className="mt-4 min-h-32 w-full rounded-[12px] border border-[var(--border)] bg-white/70 p-4" value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} />
          <div className="mt-6 space-y-3">
            {notes.map((note: any) => (
              <article key={note.id} className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-[28px] text-[#2f2318]">{note.title}</p>
                  <button onClick={() => void patch(`/notes/${note.id}/pin`, { pinned: !note.pinned })} className="text-sm text-[#8d6434]">
                    {note.pinned ? "取消置顶" : "置顶"}
                  </button>
                </div>
                <p className="mt-3 text-[15px] leading-7 text-[#5f5042]">{note.content}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#9a846b]">{note.tags.join(" 路 ")}</p>
              </article>
            ))}
          </div>
        </SectionShell>
      ) : null}

      {active === "statistics" && stats ? (
        <SectionShell title="统计" subtitle="用更长期的视角看你的阅读节奏，而不是只看某一天的努力。">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5">
              <p className="text-[13px] text-[#8b7764]">总阅读时长</p>
              <p className="mt-3 text-[40px] font-semibold text-[#2f2318]">{stats.totalMinutes}m</p>
            </div>
            <div className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5">
              <p className="text-[13px] text-[#8b7764]">阅读句子</p>
              <p className="mt-3 text-[40px] font-semibold text-[#2f2318]">{stats.totalSentences}</p>
            </div>
            <div className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5">
              <p className="text-[13px] text-[#8b7764]">学习生词</p>
              <p className="mt-3 text-[40px] font-semibold text-[#2f2318]">{stats.totalWords}</p>
            </div>
          </div>
          <div className="mt-6 flex h-56 items-end gap-4 rounded-[22px] border border-[var(--border)] bg-white/55 p-5">
            {stats.sessions.map((session: any) => (
              <div key={session.id} className="flex flex-1 flex-col items-center gap-3">
                <div className="w-full rounded-full bg-[linear-gradient(180deg,#d4b38a_0%,#b57a39_100%)]" style={{ height: `${Math.max(24, session.durationMin)}px` }} />
                <span className="text-xs text-[#7e6c59]">
                  {formatMonthDayUTC(session.date)}
                </span>
              </div>
            ))}
          </div>
        </SectionShell>
      ) : null}

      {active === "settings" && settings ? (
        <SectionShell title="设置" subtitle="目标、提醒与阅读偏好，决定这个空间如何更贴合你。">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5 text-[15px] text-[#5f4d3c]">
              每日目标(分钟)
              <input type="number" defaultValue={settings.dailyGoalMinutes} className="mt-3 w-full rounded-[10px] border border-[var(--border)] bg-white/80 px-4 py-3" onBlur={(e) => void patch("/settings", { dailyGoalMinutes: Number(e.target.value) })} />
            </label>
            <label className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5 text-[15px] text-[#5f4d3c]">
              每周目标(天)
              <input type="number" defaultValue={settings.weeklyGoalDays} className="mt-3 w-full rounded-[10px] border border-[var(--border)] bg-white/80 px-4 py-3" onBlur={(e) => void patch("/settings", { weeklyGoalDays: Number(e.target.value) })} />
            </label>
            <label className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5 text-[15px] text-[#5f4d3c]">
              字号
              <input type="number" defaultValue={settings.preferredFontSize} className="mt-3 w-full rounded-[10px] border border-[var(--border)] bg-white/80 px-4 py-3" onBlur={(e) => void patch("/settings", { preferredFontSize: Number(e.target.value) })} />
            </label>
            <label className="rounded-[12px] border border-[var(--border)] bg-white/58 p-5 text-[15px] text-[#5f4d3c]">
              提醒时间
              <input type="time" defaultValue={settings.reminderTime} className="mt-3 w-full rounded-[10px] border border-[var(--border)] bg-white/80 px-4 py-3" onBlur={(e) => void patch("/settings", { reminderTime: e.target.value })} />
            </label>
          </div>
        </SectionShell>
      ) : null}
    </div>
  );
}



