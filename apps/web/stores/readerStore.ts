"use client";

import { create } from "zustand";

type ReaderState = {
  activeSentenceId?: string;
  hoveredSentenceId?: string;
  setActiveSentence: (id?: string) => void;
  setHoveredSentence: (id?: string) => void;
};

export const useReaderStore = create<ReaderState>((set) => ({
  activeSentenceId: undefined,
  hoveredSentenceId: undefined,
  setActiveSentence: (id) => set({ activeSentenceId: id }),
  setHoveredSentence: (id) => set({ hoveredSentenceId: id })
}));
