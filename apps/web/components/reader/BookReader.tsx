"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Pause, Play, Repeat2, RotateCcw, SkipBack, SkipForward, Star, Volume2 } from "lucide-react";
import { getBookMarkdownRaw, getReadingProgress, saveReadingProgress, translateSentencesOffline } from "@/services/bookApi";
import { favoriteWord, getFavoriteWord, getWordExplain, removeFavoriteWord } from "@/services/wordApi";
import { useReaderStore } from "@/stores/readerStore";
import type { ChapterReaderData, Sentence, WordExplain } from "@/types/reader";

type TocItem = {
  id: string;
  label: string;
  title: string;
  order: number;
  sentenceIndex: number;
  chapterId?: string;
};

type Heading = {
  label: string;
  title: string;
  nextIndex: number;
};

const ordinalPattern =
  "(?:[ivxlcdm]+|\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty[- ]one|twenty[- ]two|twenty[- ]three|twenty[- ]four|twenty[- ]five|twenty[- ]six|twenty[- ]seven|twenty[- ]eight|twenty[- ]nine|thirty)";

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
  const normalized = text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/g) ?? [];
  return matches.map((item) => item.trim()).filter(Boolean);
}

function normalizeHeading(text: string): string {
  return normalizeText(text).replace(/^chapter\s+\d+\s*/, "");
}

function cleanMarkdownLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(">") || trimmed.startsWith("```")) return "";
  return trimmed.replace(/^#{1,6}\s+/, "").trim();
}

function titleCaseWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function normalizeOrdinal(value: string): string {
  return /^[ivxlcdm]+$/i.test(value) ? value.toUpperCase() : value;
}

function cleanTocTitle(title: string): string {
  return title
    .replace(/(?:\s*\.){2,}\s*\d+\s*$/g, "")
    .replace(/(?:\s*\.){2,}\s*$/g, "")
    .replace(/\s+\d+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseChapterHeading(lines: string[], index: number): Heading | null {
  const line = lines[index]?.trim();
  if (!line) return null;

  if (/^(introduction|preface|prologue|epilogue)$/i.test(line)) {
    const title = titleCaseWord(line.replace(/\s+/g, " ").trim());
    return { label: title, title, nextIndex: index + 1 };
  }

  const combined = line.match(new RegExp(`^(chapter|book|part)\\s+(${ordinalPattern})(?:(?:[.:])|\\s*[-–—]{1,2})?\\s+(.+)$`, "i"));
  if (combined && /[a-zA-Z]/.test(combined[3])) {
    const kind = titleCaseWord(combined[1]);
    const ordinal = normalizeOrdinal(combined[2]);
    const title = cleanTocTitle(combined[3]);
    return { label: `${kind} ${ordinal}. ${title}`, title, nextIndex: index + 1 };
  }

  const chapterOnly = line.match(new RegExp(`^(chapter|book|part)\\s+(${ordinalPattern})\\.?$`, "i"));
  if (!chapterOnly) return null;

  let titleIndex = index + 1;
  while (titleIndex < lines.length && !lines[titleIndex]?.trim()) titleIndex += 1;
  const title = cleanTocTitle(lines[titleIndex]?.trim() ?? "");
  if (!title || /^(chapter|book|part)\s+/i.test(title)) return null;

  const kind = titleCaseWord(chapterOnly[1]);
  const ordinal = normalizeOrdinal(chapterOnly[2]);
  return { label: `${kind} ${ordinal}. ${title}`, title, nextIndex: titleIndex + 1 };
}

function parseContentsEntry(lines: string[], index: number): Heading | null {
  const chapterHeading = parseChapterHeading(lines, index);
  if (chapterHeading) return chapterHeading;

  const line = lines[index]?.trim();
  if (!line) return null;

  const numberedCombined = line.match(/^([ivxlcdm]+|\d+)\.?\s+(.+)$/i);
  if (numberedCombined && /[a-zA-Z]/.test(numberedCombined[2])) {
    const ordinal = normalizeOrdinal(numberedCombined[1]);
    const title = cleanTocTitle(numberedCombined[2]);
    return { label: `${ordinal}. ${title}`, title, nextIndex: index + 1 };
  }

  return null;
}

function parseBodyHeading(lines: string[], index: number): Heading | null {
  const chapterHeading = parseChapterHeading(lines, index);
  if (chapterHeading) return chapterHeading;

  const line = lines[index]?.trim();
  const numberedOnly = line?.match(/^([ivxlcdm]+|\d+)\.?$/i);
  if (!numberedOnly) return null;

  let titleIndex = index + 1;
  while (titleIndex < lines.length && !lines[titleIndex]?.trim()) titleIndex += 1;
  const title = lines[titleIndex]?.trim();
  if (!title || /^(chapter|book)\s+/i.test(title)) return null;

  const ordinal = normalizeOrdinal(numberedOnly[1]);
  return { label: `${ordinal}. ${title}`, title, nextIndex: titleIndex + 1 };
}

function tocKey(item: { label: string; title: string }): string {
  return `${normalizeText(item.label)}|${normalizeText(item.title)}`;
}

function extractContents(lines: string[]): { entries: Array<{ label: string; title: string }>; startIndex: number } {
  const contentsIndex = lines.findIndex((line) => /^contents$/i.test(line.trim()));
  if (contentsIndex < 0) return { entries: [], startIndex: 0 };

  const entries: Array<{ label: string; title: string }> = [];
  const seen = new Set<string>();
  let started = false;
  let startIndex = contentsIndex + 1;

  for (let index = contentsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    const entry = parseContentsEntry(lines, index);
    if (!entry) {
      if (started) {
        startIndex = index;
        break;
      }
      continue;
    }

    started = true;
    const key = tocKey(entry);
    if (seen.has(key)) {
      startIndex = index;
      break;
    }
    entries.push({ label: entry.label, title: entry.title });
    seen.add(key);
    index = entry.nextIndex - 1;
  }

  return { entries, startIndex };
}

function findBookContentStart(lines: string[], entries: Array<{ label: string; title: string }>, fallbackStart: number): number {
  if (!entries.length) return fallbackStart;

  const entryKeys = new Set(entries.map(tocKey));
  const seen = new Set<string>();

  for (let index = fallbackStart; index < lines.length; index += 1) {
    const heading = parseBodyHeading(lines, index);
    if (!heading) continue;

    const key = tocKey(heading);
    if (!entryKeys.has(key)) continue;
    if (seen.has(key)) return index;
    seen.add(key);
    index = heading.nextIndex - 1;
  }

  for (let index = fallbackStart; index < lines.length; index += 1) {
    const heading = parseBodyHeading(lines, index);
    if (heading && entryKeys.has(tocKey(heading))) return index;
  }

  return fallbackStart;
}

function buildSectionsFromTocEntries(lines: string[], entries: Array<{ label: string; title: string }>) {
  if (!entries.length) return [];

  const markers = entries
    .map((entry, entryIndex) => {
      const title = normalizeText(entry.title);
      const label = normalizeText(entry.label);
      const foundIndex = lines.findIndex((line, lineIndex) => {
        if (entryIndex > 0 && lineIndex === 0) return false;
        const normalized = normalizeText(line);
        if (!normalized) return false;
        return normalized === title || normalized === label || normalized.includes(title) || label.includes(normalized);
      });
      return foundIndex >= 0 ? { entry, lineIndex: foundIndex } : null;
    })
    .filter((item): item is { entry: { label: string; title: string }; lineIndex: number } => Boolean(item))
    .sort((a, b) => a.lineIndex - b.lineIndex);

  return markers.map((marker, index) => ({
    label: marker.entry.label,
    title: marker.entry.title,
    body: lines.slice(marker.lineIndex + 1, markers[index + 1]?.lineIndex)
  }));
}

function parseMarkdownBook(markdown: string, fallback: Sentence[], bookId: string, chapters: ChapterReaderData["chapters"]) {
  const rawLines = markdown.split(/\r?\n/g).map(cleanMarkdownLine);
  const contents = extractContents(rawLines);
  const contentStart = findBookContentStart(rawLines, contents.entries, contents.startIndex);
  const lines = rawLines.slice(contentStart).filter(Boolean);
  const sections: Array<{ label: string; title: string; body: string[] }> = [];
  let current: { label: string; title: string; body: string[] } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const heading = parseBodyHeading(lines, index);
    if (heading) {
      if (current) sections.push(current);
      current = { label: heading.label, title: heading.title, body: [] };
      index = heading.nextIndex - 1;
      continue;
    }
    current?.body.push(lines[index]);
  }
  if (current) sections.push(current);

  if (contents.entries.length && sections.length < Math.ceil(contents.entries.length * 0.5)) {
    const tocSections = buildSectionsFromTocEntries(lines, contents.entries);
    if (tocSections.length > sections.length) {
      sections.splice(0, sections.length, ...tocSections);
    }
  }

  if (!sections.length) {
    return { sentences: fallback, toc: [] as TocItem[] };
  }

  const sentences: Sentence[] = [];
  const toc: TocItem[] = [];

  sections.forEach((section, sectionIndex) => {
    const sentenceIndex = sentences.length;
    const chapter = chapters.find((item) => normalizeHeading(item.title) === normalizeHeading(section.title));
    toc.push({
      id: `${bookId}:toc-${sectionIndex + 1}`,
      label: section.label,
      title: section.title,
      order: sectionIndex + 1,
      sentenceIndex,
      chapterId: chapter?.id
    });

    splitIntoSentences(section.body.join(" "))
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter((item) => /[a-zA-Z]/.test(item))
      .forEach((english) => {
        sentences.push({
          id: `${bookId}:md-${sentences.length + 1}`,
          order: sentences.length + 1,
          english,
          chinese: ""
        });
      });
  });

  return { sentences: sentences.length ? sentences : fallback, toc };
}

function estimateSentenceUnits(sentence: Sentence): number {
  const englishUnits = Math.ceil(sentence.english.length / 36);
  const chineseUnits = Math.ceil((sentence.chinese || "").length / 22);
  const paragraphBreathingRoom = sentence.english.length > 120 || (sentence.chinese || "").length > 70 ? 1 : 0;
  return Math.max(1, englishUnits, chineseUnits) + paragraphBreathingRoom;
}

function paginateSentences(sentences: Sentence[]): Sentence[][] {
  const pages: Sentence[][] = [];
  let current: Sentence[] = [];
  let usedUnits = 0;
  const maxUnitsPerPage = 18;
  const maxSentencesPerPage = 8;

  for (const sentence of sentences) {
    const units = estimateSentenceUnits(sentence);
    if (current.length > 0 && (usedUnits + units > maxUnitsPerPage || current.length >= maxSentencesPerPage)) {
      pages.push(current);
      current = [];
      usedUnits = 0;
    }
    current.push(sentence);
    usedUnits += units;
  }

  if (current.length > 0) pages.push(current);
  return pages.length ? pages : [[]];
}

export function BookReader({ data, bookId }: { data: ChapterReaderData; bookId: string }) {
  const { hoveredSentenceId, setHoveredSentence, activeSentenceId, setActiveSentence } = useReaderStore();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordDetail, setWordDetail] = useState<WordExplain | null>(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordSaving, setWordSaving] = useState(false);
  const [wordSaved, setWordSaved] = useState(false);
  const [wordFavoriteId, setWordFavoriteId] = useState<string | null>(null);
  const [wordContext, setWordContext] = useState("");
  const [fontScale] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [sentenceLoop, setSentenceLoop] = useState(false);
  const [volume, setVolume] = useState(0.46);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [wordAnchor, setWordAnchor] = useState<{ x: number; y: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [markdownSentences, setMarkdownSentences] = useState<Sentence[] | null>(null);
  const [markdownToc, setMarkdownToc] = useState<TocItem[]>([]);
  const [runtimeTranslations, setRuntimeTranslations] = useState<Record<string, string>>({});
  const requestedTranslationsRef = useRef<Set<string>>(new Set());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const sentences = markdownSentences ?? data.sentences;
  const pagedSentences = useMemo(() => paginateSentences(sentences), [sentences]);
  const pageStarts = useMemo(() => {
    const starts: number[] = [];
    let cursor = 0;
    for (const page of pagedSentences) {
      starts.push(cursor);
      cursor += page.length;
    }
    return starts;
  }, [pagedSentences]);
  const pageCount = pagedSentences.length;
  const visibleSentences = pagedSentences[currentPage] ?? [];
  const pageStart = pageStarts[currentPage] ?? 0;
  const chapterList: TocItem[] = markdownToc.length
    ? markdownToc
    : (data.chapters.length ? data.chapters : [{ id: data.chapterId, title: data.chapterTitle, order: 1 }]).map((chapter, index) => ({
        id: chapter.id,
        label: `Chapter ${chapter.order}. ${chapter.title}`,
        title: chapter.title,
        order: chapter.order,
        sentenceIndex: index === 0 ? 0 : pageStarts[index] ?? 0,
        chapterId: chapter.id
      }));

  const activeIndex = useMemo(() => {
    if (!activeSentenceId) return 0;
    const idx = sentences.findIndex((item) => item.id === activeSentenceId);
    return idx < 0 ? 0 : idx;
  }, [activeSentenceId, sentences]);
  const activeTocId = useMemo(() => {
    let current = chapterList[0]?.id;
    for (const item of chapterList) {
      if (activeIndex >= item.sentenceIndex) current = item.id;
    }
    return current;
  }, [activeIndex, chapterList]);
  const currentChapter = chapterList.find((chapter) => chapter.id === activeTocId) ?? chapterList.find((chapter) => chapter.chapterId === data.chapterId);

  function closeWordDetail() {
    setSelectedWord(null);
    setWordAnchor(null);
    setWordDetail(null);
    setWordLoading(false);
    setWordSaving(false);
    setWordSaved(false);
    setWordFavoriteId(null);
    setWordContext("");
  }

  useEffect(() => {
    let mounted = true;
    async function loadMarkdown() {
      try {
        const markdown = await getBookMarkdownRaw(bookId);
        if (!mounted) return;
        const parsed = parseMarkdownBook(markdown, data.sentences, bookId, data.chapters);
        setMarkdownSentences(parsed.sentences);
        setMarkdownToc(parsed.toc);
      } catch {
        if (!mounted) return;
        setMarkdownSentences(null);
        setMarkdownToc([]);
      }
    }
    void loadMarkdown();
    return () => {
      mounted = false;
    };
  }, [bookId, data.chapters, data.sentences]);

  useEffect(() => {
    let mounted = true;
    async function fillVisibleTranslations() {
      const nextPage = pagedSentences[currentPage + 1] ?? [];
      const afterNextPage = pagedSentences[currentPage + 2] ?? [];
      const pending = [...visibleSentences, ...nextPage, ...afterNextPage].filter((item) => {
        const hasBase = Boolean(item.chinese && item.chinese.trim());
        const hasRuntime = Boolean(runtimeTranslations[item.id]?.trim());
        return !hasBase && !hasRuntime && !requestedTranslationsRef.current.has(item.id);
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
  }, [currentPage, pagedSentences, runtimeTranslations, visibleSentences]);

  useEffect(() => {
    let mounted = true;
    async function restoreProgress() {
      setActiveSentence(undefined);
      setHoveredSentence(undefined);
      const key = `progress:${bookId}:${data.chapterId}`;
      const legacyKey = `progress:${data.chapterId}`;
      const localSaved = window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyKey);
      try {
        const remote = await getReadingProgress(data.chapterId);
        if (!mounted) return;
        const normalizedRemoteId = remote.sentenceId && remote.sentenceId.startsWith("md-") ? `${bookId}:${remote.sentenceId}` : remote.sentenceId;
        const remoteSentenceId = normalizedRemoteId && sentences.some((item) => item.id === normalizedRemoteId) ? normalizedRemoteId : null;
        if (remoteSentenceId) {
          setActiveSentence(remoteSentenceId);
          window.localStorage.setItem(key, remoteSentenceId);
          return;
        }
        const fallbackEnglish = data.sentences[0]?.english ? normalizeText(data.sentences[0].english) : "";
        const markdownAligned = fallbackEnglish
          ? sentences.find((item) => {
              const normalized = normalizeText(item.english);
              return normalized.includes(fallbackEnglish) || fallbackEnglish.includes(normalized);
            })
          : null;
        if (markdownAligned) {
          setActiveSentence(markdownAligned.id);
          window.localStorage.setItem(key, markdownAligned.id);
          return;
        }
      } catch {}
      const normalizedLocalId = localSaved && localSaved.startsWith("md-") ? `${bookId}:${localSaved}` : localSaved;
      if (mounted && normalizedLocalId && sentences.some((item) => item.id === normalizedLocalId)) {
        setActiveSentence(normalizedLocalId);
      }
    }
    void restoreProgress();
    return () => {
      mounted = false;
    };
  }, [bookId, data.chapterId, data.sentences, sentences, setActiveSentence, setHoveredSentence]);

  useEffect(() => {
    const targetPage = pageStarts.findIndex((start, index) => {
      const end = start + (pagedSentences[index]?.length ?? 0);
      return activeIndex >= start && activeIndex < end;
    });
    const normalizedPage = targetPage < 0 ? 0 : targetPage;
    if (normalizedPage !== currentPage) setCurrentPage(normalizedPage);
  }, [activeIndex, currentPage, pageStarts, pagedSentences]);

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

  async function persistProgress(sentence: Sentence, index: number) {
    const percent = Math.round(((index + 1) / Math.max(sentences.length, 1)) * 100);
    window.localStorage.setItem(`progress:${bookId}:${data.chapterId}`, sentence.id);
    try {
      await saveReadingProgress({ chapterId: data.chapterId, sentenceId: sentence.id, percent });
    } catch {}
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
        if (sentence) playText(sentence.english, index);
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

  async function onWordClick(word: string, sentence: Sentence) {
    const normalized = word.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
    if (!normalized) return;
    setSelectedWord(normalized);
    setWordContext(sentence.english);
    setWordSaved(false);
    setWordFavoriteId(null);
    setWordLoading(true);
    try {
      const [explain, favorite] = await Promise.all([getWordExplain(normalized), getFavoriteWord(normalized)]);
      setWordDetail(explain);
      setWordSaved(Boolean(favorite));
      setWordFavoriteId(favorite?.id ?? null);
    } finally {
      setWordLoading(false);
    }
  }

  async function onFavoriteWord() {
    if (!wordDetail || wordSaving) return;
    setWordSaving(true);
    try {
      if (wordSaved && wordFavoriteId) {
        await removeFavoriteWord(wordFavoriteId);
        setWordSaved(false);
        setWordFavoriteId(null);
      } else {
        const payload = await favoriteWord({
          ...wordDetail,
          sentence: wordContext || wordDetail.example,
          chapterTitle: currentChapter?.title ?? data.chapterTitle
        });
        setWordSaved(true);
        setWordFavoriteId(payload?.word?.id ?? null);
      }
    } finally {
      setWordSaving(false);
    }
  }

  async function onSentenceClick(sentence: Sentence, index: number) {
    setActiveSentence(sentence.id);
    await persistProgress(sentence, index);
    playText(sentence.english, index);
  }

  function jumpToSentence(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), sentences.length - 1);
    const nextSentence = sentences[nextIndex];
    if (!nextSentence) return;
    void onSentenceClick(nextSentence, nextIndex);
  }

  function navigateToSentence(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), sentences.length - 1);
    const nextSentence = sentences[nextIndex];
    if (!nextSentence) return;
    const targetPage = pageStarts.findIndex((start, pageIndex) => {
      const end = start + (pagedSentences[pageIndex]?.length ?? 0);
      return nextIndex >= start && nextIndex < end;
    });
    if (targetPage >= 0) setCurrentPage(targetPage);
    setActiveSentence(nextSentence.id);
    void persistProgress(nextSentence, nextIndex);
  }

  function stopPlayback() {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }

  function onPlayToggle() {
    if (isPlaying) {
      stopPlayback();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    jumpToSentence(activeIndex);
  }

  function flipToPage(nextPage: number) {
    const target = Math.min(Math.max(nextPage, 0), pageCount - 1);
    if (target === currentPage) return;
    setIsFlipping(true);
    setCurrentPage(target);
    window.setTimeout(() => setIsFlipping(false), 280);
    const nextSentence = pagedSentences[target]?.[0];
    if (nextSentence) {
      setActiveSentence(nextSentence.id);
      void persistProgress(nextSentence, pageStarts[target] ?? 0);
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
    <section className="h-[calc(100vh-96px)] overflow-hidden text-[#2c2118]">
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
            <h2 className="truncate text-[18px] font-medium tracking-[0.01em] text-[#3f3024]">{data.bookTitle}</h2>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden pb-28 pt-5">
          <aside className={`absolute bottom-[116px] left-7 top-[94px] z-10 hidden transition-all duration-200 xl:block ${tocCollapsed ? "w-[58px]" : "w-[250px]"}`}>
            <div className="flex h-full min-h-0 flex-col rounded-[14px] border border-[rgba(143,113,78,0.14)] bg-[rgba(255,250,244,0.58)] px-3 py-4 shadow-[0_14px_28px_rgba(61,39,18,0.05)] backdrop-blur-sm">
              <div className={`mb-3 flex items-start gap-2 border-b border-[rgba(143,113,78,0.14)] pb-3 ${tocCollapsed ? "justify-center" : "justify-between"}`}>
                {tocCollapsed ? null : (
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9a7a58]">Contents</p>
                    <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-5 text-[#3f3024]">{data.bookTitle}</h3>
                  </div>
                )}
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(143,113,78,0.16)] bg-white/50 text-[#7b624b] transition hover:bg-[rgba(156,106,47,0.10)]"
                  onClick={() => setTocCollapsed((value) => !value)}
                  aria-label={tocCollapsed ? "展开目录" : "收起目录"}
                >
                  <ChevronLeft size={16} className={`transition-transform ${tocCollapsed ? "rotate-180" : ""}`} />
                </button>
              </div>
              {tocCollapsed ? null : (
                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
                  {chapterList.map((chapter) => {
                    const isCurrent = chapter.id === activeTocId;
                    return (
                      <button
                        key={chapter.id}
                        className={`block w-full rounded-[8px] px-3 py-2 text-left text-[13px] leading-5 transition ${
                          isCurrent ? "bg-[rgba(156,106,47,0.14)] font-semibold text-[#7a4d24]" : "text-[#6f5947] hover:bg-[rgba(156,106,47,0.08)] hover:text-[#4b3828]"
                        }`}
                        onClick={() => navigateToSentence(chapter.sentenceIndex)}
                      >
                        <span className="line-clamp-2">{chapter.label}</span>
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          </aside>

          <div className={`mx-auto flex h-full w-full items-center justify-center pl-0 pr-[92px] transition-[padding] duration-200 ${tocCollapsed ? "xl:pl-[96px]" : "xl:pl-[290px]"}`}>
            <div className="relative" style={{ width: "min(1540px, calc(100% - 28px))" }}>
              <div className="pointer-events-none absolute inset-x-[6.2%] bottom-[8.5%] top-[12%] rounded-[40px] bg-[rgba(122,84,44,0.08)] blur-[22px]" />
              <div className="relative aspect-[1562/1007]">
                <img src="/reader/open-book-final.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" draggable={false} />
                <div className="absolute left-[11.2%] top-[12.6%] w-[77.8%]">
                  <p className="mb-[1.2%] text-[clamp(13px,0.9vw,15px)] text-[#57473a]">{currentChapter?.label ?? "Chapter 1"}</p>
                  <div className="mb-[3.6%] flex items-center gap-3">
                    <h3 className="text-[clamp(26px,2.05vw,42px)] font-medium leading-none tracking-[-0.02em] text-[#2f2419] [font-family:Georgia,'Times_New_Roman',serif]">
                      {currentChapter?.title ?? data.chapterTitle}
                    </h3>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#b59773] text-[12px] text-[#a48563]">◔</span>
                  </div>
                  <div className="grid h-[clamp(340px,25.5vw,470px)] grid-cols-[1fr_1fr] gap-x-[5.8%] overflow-hidden pb-[2%]">
                    <div className={`space-y-[clamp(7px,0.72vw,14px)] overflow-hidden text-[#2f2419] [font-family:Georgia,'Times_New_Roman',serif] transition-all duration-300 ${isFlipping ? "opacity-40 -translate-x-1" : "opacity-100 translate-x-0"}`}>
                      {visibleSentences.map((sentence, localIndex) => {
                        const index = pageStart + localIndex;
                        const isHover = hoveredSentenceId === sentence.id;
                        const isActive = activeSentenceId === sentence.id;
                        return (
                          <div
                            key={sentence.id}
                            className={`group flex items-start rounded-[8px] px-[8px] py-[4px] ${isHover || isActive ? "bg-[#f0dea7]" : ""}`}
                            onMouseEnter={() => setHoveredSentence(sentence.id)}
                            onMouseLeave={() => setHoveredSentence(undefined)}
                          >
                            <div className="flex w-full items-start gap-3">
                              <span
                                data-sentence-text
                                className="flex-1 cursor-pointer leading-[1.48]"
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
                                        void onWordClick(word, sentence);
                                      }}
                                    >
                                      {piece}
                                    </button>
                                  );
                                })}
                              </span>
                              <button className="mt-[2px] text-[#8b775e] opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-[#6d5a49]" onClick={() => playText(sentence.english, index)} aria-label="播放句子发音">
                                <Volume2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`space-y-[clamp(7px,0.72vw,14px)] overflow-hidden pt-[0.1%] text-[#2f2419] transition-all duration-300 ${isFlipping ? "opacity-40 translate-x-1" : "opacity-100 translate-x-0"}`}>
                      {visibleSentences.map((sentence) => {
                        const isHover = hoveredSentenceId === sentence.id;
                        const isActive = activeSentenceId === sentence.id;
                        return (
                          <div key={sentence.id} className={`flex items-start rounded-[8px] px-[8px] py-[4px] leading-[1.48] ${isHover || isActive ? "bg-[#f0dea7]" : ""}`} style={{ fontSize: `clamp(14px, ${0.84 * fontScale}vw, 16px)` }}>
                            {sentence.chinese || runtimeTranslations[sentence.id] || ""}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <p className="absolute bottom-[2.05%] left-[12.5%] text-[13px] text-[#f0dfc6]">Page {currentPage + 1} / {pageCount}</p>
              <button className="absolute left-[6.9%] top-1/2 -translate-y-1/2 rounded-full bg-[rgba(66,44,24,0.12)] px-3 py-2 text-[12px] text-[#6d5947] transition hover:bg-[rgba(66,44,24,0.20)]" onClick={() => flipToPage(currentPage - 1)} aria-label="上一页">
                ‹
              </button>
              <button className="absolute right-[6.9%] top-1/2 -translate-y-1/2 rounded-full bg-[rgba(66,44,24,0.12)] px-3 py-2 text-[12px] text-[#6d5947] transition hover:bg-[rgba(66,44,24,0.20)]" onClick={() => flipToPage(currentPage + 1)} aria-label="下一页">
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
        <div className="flex items-center justify-center gap-3">
          <button className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(143,113,78,0.18)] text-[#6d5947]" onClick={() => navigateToSentence(activeIndex - 1)} aria-label="上一句">
            <SkipBack size={18} />
          </button>
          <button className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#9c6a2f_0%,#b57a39_100%)] text-white" onClick={onPlayToggle}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(143,113,78,0.18)] text-[#6d5947]" onClick={() => navigateToSentence(activeIndex + 1)} aria-label="下一句">
            <SkipForward size={18} />
          </button>
          <div className="h-5 w-px bg-[rgba(143,113,78,0.16)]" />
          <button className="text-[12px]" onClick={onRateToggle}>
            {playbackRate.toFixed(2).replace(/\.00$/, "")}x
          </button>
          <Volume2 size={15} />
          <input type="range" className="reader-slider w-20" min={0} max={100} value={Math.round(volume * 100)} onChange={(e) => setVolume(Number(e.target.value) / 100)} />
          <button className={`rounded px-2 py-1 text-[12px] ${sentenceLoop ? "bg-[rgba(160,124,84,0.12)]" : ""}`} onClick={() => setSentenceLoop((v) => !v)}>
            句子循环
          </button>
          <button className="text-[15px] text-[#6d5947]" onClick={() => navigateToSentence(0)} aria-label="回到开头">
            <RotateCcw size={16} />
          </button>
          <button className="text-[12px]" onClick={() => setAutoplay((v) => !v)}>
            自动滚动
          </button>
          <button className="text-[15px] text-[#6d5947]" onClick={() => setSentenceLoop((v) => !v)} aria-label="切换循环">
            <Repeat2 size={16} />
          </button>
          <button className={`h-7 w-12 rounded-full border border-[rgba(143,113,78,0.16)] p-[2px] ${autoplay ? "bg-[rgba(156,106,47,0.18)]" : "bg-[rgba(143,113,78,0.08)]"}`} onClick={() => setAutoplay((v) => !v)} aria-label="切换自动滚动">
            <div className={`h-full w-1/2 rounded-full ${autoplay ? "ml-auto bg-white" : "bg-[rgba(255,255,255,0.88)]"}`} />
          </button>
        </div>
      </footer>

      {selectedWord && wordAnchor && (
        <aside data-word-card className="fixed z-30 w-[320px] rounded-[10px] border border-[#d8cab6] bg-[#fffdf9] p-4 shadow-[0_16px_34px_rgba(54,33,20,0.18)]" style={{ left: Math.max(300, wordAnchor.x - 18), top: Math.max(120, wordAnchor.y + 26) }}>
          <div className="absolute left-8 top-[-10px] h-0 w-0 border-x-[10px] border-b-[10px] border-x-transparent border-b-[#fffdf9]" />
          {wordDetail ? (
            <>
              <div className="mb-2 flex items-start justify-between gap-3">
                <strong className="text-[22px] leading-none text-[#2f2318]">{wordDetail.word}</strong>
                <button
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                    wordSaved
                      ? "border-[#7b3f13] bg-[rgba(181,122,57,0.24)] text-[#6f3d12] shadow-[0_6px_14px_rgba(111,61,18,0.16)]"
                      : "border-[#e1d4c4] bg-white/70 text-[#7b624b] hover:border-[#8f5f2b] hover:text-[#6f3d12]"
                  }`}
                  onClick={() => void onFavoriteWord()}
                  disabled={wordSaving}
                  aria-label={wordSaved ? "取消收藏" : "收藏单词"}
                  title={wordSaved ? "取消收藏" : "收藏"}
                >
                  <Star size={17} strokeWidth={wordSaved ? 2.7 : 1.8} />
                </button>
              </div>
              <div className="mb-3 flex items-center gap-2 text-[12px] text-neutral-500">
                <span>{wordDetail.phonetic ?? "/N/A/"}</span>
                <button className="text-[#6d5a49]" onClick={() => speak(wordDetail.word)}>
                  <Volume2 size={14} />
                </button>
              </div>
              <div className="mb-3 inline-flex rounded-full bg-[rgba(160,109,49,0.10)] px-2.5 py-1 text-[11px] font-semibold text-[#8f5f2b]">
                {wordDetail.partOfSpeech ?? "word"}
              </div>
              <p className="mb-1 text-[12px] font-semibold text-[#7b624b]">中文释义</p>
              <p className="text-[13px] leading-6">{wordDetail.chinese}</p>
              <p className="mt-3 text-[12px] font-medium text-[#2c2118]">例句</p>
              <p className="mt-1 text-[12px] leading-5 text-neutral-700">{wordContext || wordDetail.example || wordDetail.english}</p>
              <p className="mt-3 text-[12px] font-medium text-[#2c2118]">英文解释</p>
              <p className="mt-1 text-[12px] leading-5 text-neutral-500">{wordDetail.english}</p>
              <div className="mt-4 border-t border-[#efe6d8] pt-3 text-right text-[12px] text-[#7a4d24]">
                {wordSaved ? "已加入收藏" : "点击五角星收藏"}
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-start justify-between gap-3">
                <strong className="text-[22px] leading-none text-[#2f2318]">{selectedWord}</strong>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e1d4c4] bg-white/70 text-[#7b624b]"
                  disabled
                  aria-label="收藏单词"
                  title="收藏"
                >
                  <Star size={17} strokeWidth={1.8} />
                </button>
              </div>
              <div className="mb-3 h-4 w-20 rounded bg-[rgba(160,109,49,0.10)]" />
              <div className="space-y-3">
                <div className="h-3 w-16 rounded bg-[rgba(143,113,78,0.12)]" />
                <div className="h-10 rounded bg-[rgba(143,113,78,0.08)]" />
                <div className="h-3 w-12 rounded bg-[rgba(143,113,78,0.12)]" />
                <div className="h-8 rounded bg-[rgba(143,113,78,0.08)]" />
              </div>
            </>
          )}
        </aside>
      )}
    </section>
  );
}
