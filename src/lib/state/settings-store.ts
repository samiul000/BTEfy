"use client";

import { create } from "zustand";
import type { LineEnding } from "@/lib/transports/types";

export type Theme = "dark" | "light" | "system";

export interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  maxVisibleLines: number;
  showTimestamps: boolean;
  updateInterval: number;
}

export interface ConnectionSettings {
  reconnectEnabled: boolean;
  maxReconnectAttempts: number;
  retryDelay: number;
  defaultTransport: "ble" | "serial" | "mock";
}

export interface SerialSettings {
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 2;
  parity: "none" | "even" | "odd";
  flowControl: "none" | "hardware";
  lineEnding: LineEnding;
}

export interface TelemetrySettings {
  updateInterval: number;
  historyLength: number;
  autoParsing: boolean;
}

export interface StorageSettings {
  maxSessions: number;
  autoDeleteOldSessions: boolean;
}

interface SettingsStore {
  theme: Theme;
  startupPage: string;
  terminal: TerminalSettings;
  connection: ConnectionSettings;
  serial: SerialSettings;
  telemetry: TelemetrySettings;
  storage: StorageSettings;

  // Actions
  setTheme: (theme: Theme) => void;
  setStartupPage: (page: string) => void;
  updateTerminal: (settings: Partial<TerminalSettings>) => void;
  updateConnection: (settings: Partial<ConnectionSettings>) => void;
  updateSerial: (settings: Partial<SerialSettings>) => void;
  updateTelemetry: (settings: Partial<TelemetrySettings>) => void;
  updateStorage: (settings: Partial<StorageSettings>) => void;
  resetAll: () => void;
}

const DEFAULT_SETTINGS = {
  theme: "dark" as Theme,
  startupPage: "/",
  terminal: {
    fontFamily: "var(--font-geist-mono)",
    fontSize: 14,
    lineHeight: 1.5,
    maxVisibleLines: 5000,
    showTimestamps: true,
    updateInterval: 50,
  },
  connection: {
    reconnectEnabled: true,
    maxReconnectAttempts: 5,
    retryDelay: 1000,
    defaultTransport: "mock" as const,
  },
  serial: {
    baudRate: 115200,
    dataBits: 8 as const,
    stopBits: 1 as const,
    parity: "none" as const,
    flowControl: "none" as const,
    lineEnding: "lf" as LineEnding,
  },
  telemetry: {
    updateInterval: 100,
    historyLength: 1000,
    autoParsing: true,
  },
  storage: {
    maxSessions: 50,
    autoDeleteOldSessions: true,
  },
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  setTheme: (theme) => set({ theme }),
  setStartupPage: (page) => set({ startupPage: page }),
  updateTerminal: (settings) =>
    set((s) => ({ terminal: { ...s.terminal, ...settings } })),
  updateConnection: (settings) =>
    set((s) => ({ connection: { ...s.connection, ...settings } })),
  updateSerial: (settings) =>
    set((s) => ({ serial: { ...s.serial, ...settings } })),
  updateTelemetry: (settings) =>
    set((s) => ({ telemetry: { ...s.telemetry, ...settings } })),
  updateStorage: (settings) =>
    set((s) => ({ storage: { ...s.storage, ...settings } })),
  resetAll: () => set(DEFAULT_SETTINGS),
}));
