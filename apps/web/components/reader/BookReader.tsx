"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2
} from "lucide-react";
import { getBookMarkdownRaw, saveReadingProgress, translateSentencesOffline } from "@/services/bookApi";
import { getWordExplain } from "@/services/wordApi";
import { useReaderStore } from "@/stores/readerStore";
import type { ChapterReaderData, Sentence, WordExplain } from "@/types/reader";

function tokenize(sentence: string): string[] {
  return sentence.split(/(\s+|[,.!?;:()"])/g).filter(Boolean);
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_*`~[\]()"',;:!?./\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSentences(text: string): string[] {
  const normalized = text
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];

  const matches = normalized.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/g) ?? [];
  return matches.map((item) => item.trim()).filter(Boolean);
}

function markdownToSentences(markdown: string, fallback: Sentence[]): Sentence[] {
  const paragraphs = markdown
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("```"))
    .map((line) => line.replace(/^\d+[.)]\s+/, ""));

  const chunks = splitIntoSentences(paragraphs.join(" "))
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => /[a-zA-Z]/.test(item));

  if (!chunks.length) return fallback;

  const firstFallback = fallback[0]?.english ? normalizeText(fallback[0].english) : "";
  let startIndex = 0;
  if (firstFallback) {
    const found = chunks.findIndex((chunk) => {
      const normalized = normalizeText(chunk);
      return normalized.includes(firstFallback) || firstFallback.includes(normalized);
    });
    if (found >= 0) startIndex = found;
  }

  const aligned = chunks.slice(startIndex);
  return aligned.map((english, index) => ({
    id: `md-${index + 1}`,
    order: index + 1,
    english,
    chinese: fallback[index]?.chinese ?? ""
  }));
}

export function BookReader({ data, bookId }: { data: ChapterReaderData; bookId: string }) {
  const PAGE_SIZE = 8;
  const { hoveredSentenceId, setHoveredSentence, activeSentenceId, setActiveSentence } = useReaderStore();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDetail, setWordDetail] = useState<WordExplain | null>(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [sentenceLoop, setSentenceLoop] = useState(false);
  const [volume, setVolume] = useState(0.46);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [wordAnchor, setWordAnchor] = useState<{ x: number; y: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [markdownSentences, setMarkdownSentences] = useState<Sentence[] | null>(null);
  const [runtimeTranslations, setRuntimeTranslations] = useState<Record<string, string>>({});
  const requestedTranslationsRef = useRef<Set<string>>(new Set());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentences = markdownSentences ?? data.sentences;
  const pageCount = Math.max(1, Math.ceil(sentences.length / PAGE_SIZE));
  const pageStart = currentPage * PAGE_SIZE;
  const visibleSentences = sentences.slice(pageStart, pageStart + PAGE_SIZE);

  function closeWordDetail() {
    setSelectedWord(null);
    setWordAnchor(null);
    setWordDetail(null);
    setWordLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    async function loadMarkdown() {
      try {
        const markdown = await getBookMarkdownRaw(bookId);
        if (!mounted) return;
        setMarkdownSentences(markdownToSentences(markdown, data.sentences));
      } catch {
        if (!mounted) return;
        setMarkdownSentences(null);
      }
    }
    void loadMarkdown();
    return () => {
      mounted = false;
    };
  }, [bookId, data.sentences]);

  useEffect(() => {
    let mounted = true;
    async function fillVisibleTranslations() {
      const translationWindow = sentences.slice(pageStart, pageStart + PAGE_SIZE * 3);
      const pending = translationWindow.filter((item) => {
        const hasBase = Boolean(item.chinese && item.chinese.trim());
        const hasRuntime = Boolean(runtimeTranslations[item.id]?.trim());
        const requested = requestedTranslationsRef.current.has(item.id);
        return !hasBase && !hasRuntime && !requested;
      });
      if (!pending.length) return;
      pending.forEach((item) => requestedTranslationsRef.current.add(item.id));
      const translations = await translateSentencesOffline(pending.map((item) => item.english));
      if (!mounted) return;
      setRuntimeTranslations((prev) => {
        const next = { ...prev };
        pending.forEach((item, idx) => {
          const value = translations[idx]?.trim();
          if (value) next[item.id] = value;
          if (!value) requestedTranslationsRef.current.delete(item.id);
        });
        return next;
      });
    }
    void fillVisibleTranslations();
    return () => {
      mounted = false;
    };
  }, [pageStart, runtimeTranslations, sentences]);

  useEffect(() => {
    const key = `progress:${data.chapterId}`;
    const saved = window.localStorage.getItem(key);
    if (!saved) return;
    setActiveSentence(saved);
  }, [data.chapterId, setActiveSentence]);

  async function onWordClick(word: string) {
    const normalized = word.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
    if (!normalized) return;
    setSelectedWord(normalized);
    setWordLoading(true);
    try {
      const explain = await getWordExplain(normalized);
      setWordDetail(explain);
    } finally {
      setWordLoading(false);
    }
  }

  async function onSentenceClick(sentence: Sentence, index: number) {
    setActiveSentence(sentence.id);
    const percent = Math.round(((index + 1) / sentences.length) * 100);
    window.localStorage.setItem(`progress:${data.chapterId}`, sentence.id);
    await saveReadingProgress({ chapterId: data.chapterId, sentenceId: sentence.id, percent });
    playText(sentence.english, index);
  }

  const activeIndex = useMemo(() => {
    if (!activeSentenceId) return 0;
    const idx = sentences.findIndex((item) => item.id === activeSentenceId);
    return idx < 0 ? 0 : idx;
  }, [activeSentenceId, sentences]);

  useEffect(() => {
    const targetPage = Math.floor(activeIndex / PAGE_SIZE);
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
  }, [activeIndex, currentPage]);

  const progressPercent = useMemo(() => {
    if (sentences.length <= 1) return 0;
    return Math.round((activeIndex / (sentences.length - 1)) * 100);
  }, [activeIndex, sentences.length]);

  function stopPlayback() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }

  function playText(text: string, index?: number) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.volume = volume;
    utter.rate = playbackRate;
    utter.onend = () => {
      utteranceRef.current = null;
      if (!isPlaying || !autoplay) return;
      if (sentenceLoop && index !== undefined) {
        const sentence = sentences[index];
        if (!sentence) return;
        playText(sentence.english, index);
        return;
      }
      if (index === undefined) return;
      const nextIndex = index + 1;
      if (nextIndex >= sentences.length) {
        setIsPlaying(false);
        return;
      }
      jumpToSentence(nextIndex);
    };
    utteranceRef.current = utter;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function jumpToSentence(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), sentences.length - 1);
    const nextSentence = sentences[nextIndex];
    if (!nextSentence) return;
    void onSentenceClick(nextSentence, nextIndex);
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-word-card]")) return;
      if (target.closest("[data-word-trigger]")) return;
      closeWordDetail();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function onPlayToggle() {
    if (isPlaying) {
      stopPlayback();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    jumpToSentence(activeIndex);
  }

  function onProgressChange(value: number) {
    const nextIndex = Math.round((value / 100) * Math.max(sentences.length - 1, 1));
    jumpToSentence(nextIndex);
  }

  function onPrevSentence() {
    jumpToSentence(activeIndex - 1);
  }

  function onNextSentence() {
    jumpToSentence(activeIndex + 1);
  }

  function flipToPage(nextPage: number) {
    const target = Math.min(Math.max(nextPage, 0), pageCount - 1);
    if (target === currentPage) return;
    setIsFlipping(true);
    setCurrentPage(target);
    window.setTimeout(() => setIsFlipping(false), 280);
    const nextSentence = sentences[target * PAGE_SIZE];
    if (nextSentence) {
      setActiveSentence(nextSentence.id);
    }
  }

  function onRateToggle() {
    setPlaybackRate((rate) => {
      if (rate >= 1.25) return 0.8;
      if (rate < 1) return 1;
      return 1.25;
    });
  }

  return (
    <section
      className="h-[calc(100vh-96px)] overflow-hidden text-[#2c2118]"
      style={{
        background: "linear-gradient(180deg, rgba(245,239,228,0.92) 0%, rgba(239,230,214,0.92) 100%)"
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex h-[76px] items-center px-7">
          <div className="flex min-w-0 items-center gap-4 text-[#3c2c20]">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#483324] transition hover:bg-[rgba(160,124,84,0.08)] hover:text-[#7b5524]"
              onClick={() => window.history.back()}
              aria-label="返回"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="h-5 w-px bg-[#dfd3c2]" />
            <h2 className="truncate text-[18px] font-medium tracking-[0.01em] text-[#3f3024]">
              {data.bookTitle}
            </h2>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden pb-28 pt-5">
          <div className="mx-auto flex h-full w-full items-center justify-center pr-[92px]">
            <div
              className="relative"
              style={{ width: "min(1540px, calc(100% - 28px))" }}
            >
              <div className="pointer-events-none absolute inset-x-[6.2%] bottom-[8.5%] top-[12%] rounded-[40px] bg-[rgba(122,84,44,0.08)] blur-[22px]" />
              <div className="relative aspect-[1562/1007]">
                <img
                  src="/reader/open-book-final.png"
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  draggable={false}
                />

                <div className="absolute left-[11.2%] top-[13.8%] w-[77.8%]">
                  <p className="mb-[1.2%] text-[clamp(13px,0.9vw,15px)] text-[#57473a]">Chapter 1</p>
                  <div className="mb-[3.6%] flex items-center gap-3">
                    <h3 className="text-[clamp(26px,2.05vw,42px)] font-medium leading-none tracking-[-0.02em] text-[#2f2419] [font-family:Georgia,'Times_New_Roman',serif]">{data.chapterTitle}</h3>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#b59773] text-[12px] text-[#a48563]">◔</span>
                  </div>
                  <div className="grid h-[57.5%] grid-cols-[1fr_1fr] gap-x-[5.8%]">
                    <div
                      className={`grid text-[#2f2419] [font-family:Georgia,'Times_New_Roman',serif] transition-all duration-300 ${isFlipping ? "opacity-40 -translate-x-1" : "opacity-100 translate-x-0"}`}
                      style={{ gridTemplateRows: `repeat(${Math.max(visibleSentences.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {visibleSentences.map((sentence, localIndex) => {
                        const index = pageStart + localIndex;
                        const isHover = hoveredSentenceId === sentence.id;
                        const isActive = activeSentenceId === sentence.id;
                        return (
                          <div
                            key={sentence.id}
                            className={`group flex min-h-0 items-start rounded-[8px] px-[8px] py-[4px] ${isHover || isActive ? "bg-[#f0dea7]" : ""}`}
                            onMouseEnter={() => setHoveredSentence(sentence.id)}
                            onMouseLeave={() => setHoveredSentence(undefined)}
                          >
                            <div className="flex w-full items-start gap-3">
                              <span
                                data-sentence-text
                                className="flex-1 cursor-pointer leading-[1.55]"
                                style={{ fontSize: `clamp(14px, ${0.88 * fontScale}vw, 17px)` }}
                                onClick={() => void onSentenceClick(sentence, index)}
                              >
                                {tokenize(sentence.english).map((piece, i) => {
                                  const word = piece.trim();
                                  const isWord = /^[a-zA-Z'-]+$/.test(word);
                                  if (!isWord) return <span key={`${sentence.id}-${i}`}>{piece}</span>;
                                  return (
                                    <button
                                      key={`${sentence.id}-${i}`}
                                      data-word-trigger
                                      className="inline border-0 border-b border-dashed border-[#8e785f] bg-transparent p-0 text-left"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWordAnchor({ x: e.clientX, y: e.clientY });
                                        void onWordClick(word);
                                      }}
                                    >
                                      {piece}
                                    </button>
                                  );
                                })}
                              </span>
                              <button
                                className="mt-[2px] text-[#8b775e] opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-[#6d5a49]"
                                onClick={() => playText(sentence.english, index)}
                                aria-label="播放句子发音"
                              >
                                <Volume2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className={`grid pt-[0.1%] text-[#2f2419] transition-all duration-300 ${isFlipping ? "opacity-40 translate-x-1" : "opacity-100 translate-x-0"}`}
                      style={{ gridTemplateRows: `repeat(${Math.max(visibleSentences.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {visibleSentences.map((sentence) => {
                        const isHover = hoveredSentenceId === sentence.id;
                        const isActive = activeSentenceId === sentence.id;
                        return (
                          <div
                            key={sentence.id}
                            className={`flex min-h-0 items-start rounded-[8px] px-[8px] py-[4px] leading-[1.55] ${isHover || isActive ? "bg-[#f0dea7]" : ""}`}
                            style={{ fontSize: `clamp(14px, ${0.84 * fontScale}vw, 16px)` }}
                          >
                            {sentence.chinese || runtimeTranslations[sentence.id] || "翻译中..."}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <p className="absolute bottom-[2.05%] left-[12.5%] text-[13px] text-[#f0dfc6]">Page {currentPage + 1} / {pageCount}</p>

              <button
                className="absolute left-[6.9%] top-1/2 -translate-y-1/2 rounded-full bg-[rgba(66,44,24,0.12)] px-3 py-2 text-[12px] text-[#6d5947] transition hover:bg-[rgba(66,44,24,0.20)]"
                onClick={() => flipToPage(currentPage - 1)}
                aria-label="上一页"
              >
                ‹
              </button>
              <button
                className="absolute right-[6.9%] top-1/2 -translate-y-1/2 rounded-full bg-[rgba(66,44,24,0.12)] px-3 py-2 text-[12px] text-[#6d5947] transition hover:bg-[rgba(66,44,24,0.20)]"
                onClick={() => flipToPage(currentPage + 1)}
                aria-label="下一页"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer
        className="fixed bottom-[18px] z-20 rounded-[28px] border border-[rgba(143,113,78,0.16)] bg-[rgba(255,250,244,0.8)] px-5 py-[10px] text-[#6c5645] shadow-[0_14px_28px_rgba(61,39,18,0.08)] backdrop-blur-md"
        style={{ left: "max(266px, 2.25rem)", right: "2.25rem", maxWidth: "calc(100vw - 360px)", margin: "0 auto" }}
      >
        <div className="flex items-center gap-3">
          <button
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(143,113,78,0.18)] text-[#6d5947]"
            onClick={onPrevSentence}
            aria-label="上一句"
          >
            <SkipBack size={18} />
          </button>
          <button
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#9c6a2f_0%,#b57a39_100%)] text-white"
            onClick={onPlayToggle}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(143,113,78,0.18)] text-[#6d5947]"
            onClick={onNextSentence}
            aria-label="下一句"
          >
            <SkipForward size={18} />
          </button>
          <input
            type="range"
            className="reader-slider flex-1"
            min={0}
            max={100}
            value={progressPercent}
            onChange={(e) => onProgressChange(Number(e.target.value))}
          />
          <span className="min-w-[84px] text-[12px]">{`00:${String(activeIndex + 1).padStart(2, "0")} / 02:15`}</span>
          <div className="h-5 w-px bg-[rgba(143,113,78,0.16)]" />
          <button className="text-[12px]" onClick={onRateToggle}>{playbackRate.toFixed(2).replace(/\.00$/, "")}x</button>
          <Volume2 size={15} />
          <input
            type="range"
            className="reader-slider w-20"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
          />
          <button
            className={`rounded px-2 py-1 text-[12px] ${sentenceLoop ? "bg-[rgba(160,124,84,0.12)]" : ""}`}
            onClick={() => setSentenceLoop((v) => !v)}
          >
            句子循环
          </button>
          <button className="text-[15px] text-[#6d5947]" onClick={() => jumpToSentence(0)} aria-label="回到开头">
            <RotateCcw size={16} />
          </button>
          <button
            className="text-[12px]"
            onClick={() => setAutoplay((v) => !v)}
          >
            自动滚动
          </button>
          <button className="text-[15px] text-[#6d5947]" onClick={() => setSentenceLoop((v) => !v)} aria-label="切换循环">
            <Repeat2 size={16} />
          </button>
          <button
            className={`h-7 w-12 rounded-full border border-[rgba(143,113,78,0.16)] p-[2px] ${autoplay ? "bg-[rgba(156,106,47,0.18)]" : "bg-[rgba(143,113,78,0.08)]"}`}
            onClick={() => setAutoplay((v) => !v)}
            aria-label="切换自动滚动"
          >
            <div className={`h-full w-1/2 rounded-full ${autoplay ? "ml-auto bg-white" : "bg-[rgba(255,255,255,0.88)]"}`} />
          </button>
        </div>
      </footer>

      {selectedWord && wordAnchor && (
        <aside
          data-word-card
          className="fixed z-30 w-[242px] rounded-[10px] border border-[#d8cab6] bg-[#fffdf9] p-4 shadow-[0_16px_34px_rgba(54,33,20,0.18)]"
          style={{ left: Math.max(300, wordAnchor.x - 18), top: Math.max(120, wordAnchor.y + 26) }}
        >
          <div className="absolute left-8 top-[-10px] h-0 w-0 border-x-[10px] border-b-[10px] border-x-transparent border-b-[#fffdf9]" />
          {wordLoading ? (
            <p>加载中...</p>
          ) : wordDetail ? (
            <>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <strong className="text-[18px]">{wordDetail.word}</strong>
                </div>
                <button className="text-[#6d5a49]" onClick={() => speak(wordDetail.word)}>
                  <Volume2 size={16} />
                </button>
              </div>
              <div className="mb-3 flex items-center gap-2 text-[12px] text-neutral-500">
                <span>{wordDetail.phonetic ?? "/N/A/"}</span>
                <button className="text-[#6d5a49]" onClick={() => speak(wordDetail.word)}>
                  <Volume2 size={14} />
                </button>
              </div>
              <p className="mb-1 text-[13px]">adj.</p>
              <p className="text-[13px] leading-6">{wordDetail.chinese}</p>
              <p className="mt-3 text-[12px] font-medium text-[#2c2118]">例句</p>
              <p className="mt-1 text-[12px] leading-5 text-neutral-700">{wordDetail.example ?? wordDetail.english}</p>
              <p className="mt-1 text-[12px] leading-5 text-neutral-500">{wordDetail.english}</p>
              <div className="mt-4 border-t border-[#efe6d8] pt-3 text-right text-[12px] text-[#5f4a39]">
                查看更多释义
              </div>
            </>
          ) : (
            <p>暂无释义</p>
          )}
        </aside>
      )}
    </section>
  );
}
