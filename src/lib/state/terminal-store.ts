"use client";

import { create } from "zustand";

export type DisplayMode = "text" | "hex" | "hex+ascii";

export interface TerminalLine {
  id: number;
  timestamp: number;
  direction: "rx" | "tx";
  raw: Uint8Array;
  text: string;
}

interface TerminalStore {
  /** Terminal lines (ring buffer) */
  lines: TerminalLine[];
  /** Max visible lines */
  maxLines: number;
  /** Display mode */
  displayMode: DisplayMode;
  /** Show timestamps */
  showTimestamps: boolean;
  /** Paused */
  paused: boolean;
  /** Auto-scroll */
  autoScroll: boolean;
  /** Command history */
  commandHistory: string[];
  /** Max command history size */
  maxHistorySize: number;
  /** Next line id */
  _nextId: number;

  // Actions
  addLine: (direction: "rx" | "tx", raw: Uint8Array, text: string) => void;
  clear: () => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleTimestamps: () => void;
  togglePause: () => void;
  setAutoScroll: (value: boolean) => void;
  addToHistory: (command: string) => void;
  clearHistory: () => void;
  setMaxLines: (max: number) => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  lines: [],
  maxLines: 5000,
  displayMode: "text",
  showTimestamps: true,
  paused: false,
  autoScroll: true,
  commandHistory: [],
  maxHistorySize: 100,
  _nextId: 0,

  addLine: (direction, raw, text) => {
    const state = get();
    if (state.paused) return;

    const line: TerminalLine = {
      id: state._nextId,
      timestamp: Date.now(),
      direction,
      raw,
      text,
    };

    set((s) => {
      const newLines = [...s.lines, line];
      // Bounded: trim oldest if over limit
      if (newLines.length > s.maxLines) {
        newLines.splice(0, newLines.length - s.maxLines);
      }
      return { lines: newLines, _nextId: s._nextId + 1 };
    });
  },

  clear: () => set({ lines: [], _nextId: 0 }),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  toggleTimestamps: () => set((s) => ({ showTimestamps: !s.showTimestamps })),

  togglePause: () => set((s) => ({ paused: !s.paused })),

  setAutoScroll: (value) => set({ autoScroll: value }),

  addToHistory: (command) =>
    set((s) => {
      const newHistory = [command, ...s.commandHistory.filter((c) => c !== command)];
      if (newHistory.length > s.maxHistorySize) {
        newHistory.length = s.maxHistorySize;
      }
      return { commandHistory: newHistory };
    }),

  clearHistory: () => set({ commandHistory: [] }),

  setMaxLines: (max) => set({ maxLines: max }),
}));
