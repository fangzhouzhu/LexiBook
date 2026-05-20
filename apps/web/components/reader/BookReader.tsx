"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  ChevronLeft,
  Bookmark,
  NotebookPen,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  Volume2
} from "lucide-react";
import { saveReadingProgress } from "@/services/bookApi";
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

export function BookReader({ data }: { data: ChapterReaderData }) {
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
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  function closeWordDetail() {
    setSelectedWord(null);
    setWordAnchor(null);
    setWordDetail(null);
    setWordLoading(false);
  }

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
    const percent = Math.round(((index + 1) / data.sentences.length) * 100);
    window.localStorage.setItem(`progress:${data.chapterId}`, sentence.id);
    await saveReadingProgress({ chapterId: data.chapterId, sentenceId: sentence.id, percent });
    playText(sentence.english);
  }

  const activeIndex = useMemo(() => {
    if (!activeSentenceId) return 0;
    const idx = data.sentences.findIndex((item) => item.id === activeSentenceId);
    return idx < 0 ? 0 : idx;
  }, [activeSentenceId, data.sentences]);

  const progressPercent = useMemo(() => {
    if (data.sentences.length <= 1) return 0;
    return Math.round((activeIndex / (data.sentences.length - 1)) * 100);
  }, [activeIndex, data.sentences.length]);

  function stopPlayback() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }

  function playText(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.volume = volume;
    utter.rate = playbackRate;
    utter.onend = () => {
      utteranceRef.current = null;
    };
    utteranceRef.current = utter;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function jumpToSentence(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), data.sentences.length - 1);
    const nextSentence = data.sentences[nextIndex];
    if (!nextSentence) return;
    void onSentenceClick(nextSentence, nextIndex);
  }

  useEffect(() => {
    if (!isPlaying || !autoplay) return;
    const timer = window.setTimeout(() => {
      if (sentenceLoop) {
        playText(data.sentences[activeIndex].english);
        return;
      }
      if (activeIndex + 1 >= data.sentences.length) {
        setIsPlaying(false);
        return;
      }
      jumpToSentence(activeIndex + 1);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [activeIndex, autoplay, data.sentences, isPlaying, sentenceLoop, playbackRate, volume]);

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
    jumpToSentence(activeIndex);
    setIsPlaying(true);
  }

  function onProgressChange(value: number) {
    const nextIndex = Math.round((value / 100) * Math.max(data.sentences.length - 1, 1));
    jumpToSentence(nextIndex);
  }

  function onPrevSentence() {
    jumpToSentence(activeIndex - 1);
  }

  function onNextSentence() {
    jumpToSentence(activeIndex + 1);
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
      className="min-h-[calc(100vh-96px)] text-[#2c2118]"
      style={{
        background: "linear-gradient(180deg, rgba(245,239,228,0.92) 0%, rgba(239,230,214,0.92) 100%)"
      }}
    >
      <div className="flex min-h-[calc(100vh-96px)] flex-col">
        <header className="glass-card flex h-[76px] items-center rounded-[16px] px-7">
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
          <div className="mx-auto flex h-full min-h-[calc(100vh-256px)] w-full items-center justify-center pr-[92px]">
            <div
              className="relative"
              style={{ width: "min(1540px, calc(100vw - 316px))" }}
            >
              <div className="pointer-events-none absolute inset-x-[6.2%] bottom-[8.5%] top-[12%] rounded-[40px] bg-[rgba(122,84,44,0.08)] blur-[22px]" />
              <div className="relative aspect-[1562/1007]">
                <img
                  src="/reader/open-book-final.png"
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                  draggable={false}
                />

                <div className="absolute left-[11.8%] top-[14.8%] w-[76.6%]">
                  <p className="mb-[1.8%] text-[clamp(14px,1vw,16px)] text-[#57473a]">Chapter 1</p>
                  <div className="mb-[6.2%] flex items-center gap-3">
                    <h3 className="text-[clamp(30px,2.25vw,46px)] font-medium leading-none tracking-[-0.02em] text-[#2f2419] [font-family:Georgia,'Times_New_Roman',serif]">{data.chapterTitle}</h3>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#b59773] text-[12px] text-[#a48563]">◔</span>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr] gap-x-[6.6%]">
                    <div className="text-[#2f2419] [font-family:Georgia,'Times_New_Roman',serif]">
                      {data.sentences.map((sentence, index) => {
                        const isHover = hoveredSentenceId === sentence.id;
                        const isActive = activeSentenceId === sentence.id;
                        return (
                          <div
                            key={sentence.id}
                            className={`group mb-[4.25%] rounded-[10px] px-[10px] py-[10px] ${isHover || isActive ? "bg-[#f0dea7]" : ""}`}
                            onMouseEnter={() => setHoveredSentence(sentence.id)}
                            onMouseLeave={() => setHoveredSentence(undefined)}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                data-sentence-text
                                className="flex-1 cursor-pointer leading-[2.02]"
                                style={{ fontSize: `clamp(15px, ${1.0 * fontScale}vw, 19px)` }}
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
                                onClick={() => playText(sentence.english)}
                                aria-label="播放句子发音"
                              >
                                <Volume2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="relative pt-[0.1%] text-[#2f2419]">
                      <button className="absolute right-[1.5%] top-[-1.2%] rounded p-2 text-[#8b775e] hover:bg-black/5">
                      <Bookmark size={20} />
                      </button>
                      {data.sentences.map((sentence) => {
                        const isHover = hoveredSentenceId === sentence.id;
                        const isActive = activeSentenceId === sentence.id;
                        return (
                          <div
                            key={sentence.id}
                            className={`mb-[4.25%] rounded-[10px] px-[10px] py-[10px] leading-[2.02] ${isHover || isActive ? "bg-[#f0dea7]" : ""}`}
                            style={{ fontSize: `clamp(15px, ${0.98 * fontScale}vw, 18px)` }}
                          >
                            {sentence.chinese}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <p className="absolute bottom-[2.05%] left-1/2 -translate-x-1/2 text-[13px] text-[#f0dfc6]">{activeIndex + 1} / 20</p>
            </div>
          </div>
        </div>
      </div>

      <aside className="fixed right-[18px] top-1/2 z-20 -translate-y-1/2 rounded-[16px] border border-[rgba(143,113,78,0.18)] bg-[rgba(255,251,245,0.82)] p-[2px] text-[#6c5645] shadow-[0_14px_28px_rgba(61,39,18,0.08)] backdrop-blur-md">
        <div className="flex flex-col gap-2">
          <button className="flex min-w-[86px] flex-col items-center gap-3 rounded-t-[22px] border-b border-[rgba(143,113,78,0.12)] px-3 py-6 text-[13px] hover:bg-[rgba(160,124,84,0.06)]"><Sparkles size={19} /><span>长难分析</span></button>
          <button className="flex flex-col items-center gap-3 border-b border-[rgba(143,113,78,0.12)] px-3 py-6 text-[13px] hover:bg-[rgba(160,124,84,0.06)]"><NotebookPen size={19} /><span>笔记</span></button>
          <button className="flex flex-col items-center gap-3 border-b border-[rgba(143,113,78,0.12)] px-3 py-6 text-[13px] hover:bg-[rgba(160,124,84,0.06)]"><AudioLines size={19} /><span>跟读</span></button>
          <button className="flex flex-col items-center gap-3 rounded-b-[22px] px-3 py-6 text-[13px] hover:bg-[rgba(160,124,84,0.06)]"><Star size={19} /><span>收藏</span></button>
        </div>
      </aside>

      <footer className="fixed bottom-[18px] left-[258px] right-[30px] z-20 rounded-[28px] border border-[rgba(143,113,78,0.16)] bg-[rgba(255,250,244,0.8)] px-5 py-[10px] text-[#6c5645] shadow-[0_14px_28px_rgba(61,39,18,0.08)] backdrop-blur-md">
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
