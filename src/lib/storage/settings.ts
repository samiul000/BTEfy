"use client";

/**
 * Settings persistence (localStorage; SSR-safe).
 * Small settings blob; IndexedDB is reserved for high-volume
 * sessions/logs.
 */

const SETTINGS_KEY = "btefy.settings.v1";

/** Load persisted settings patch, or null */
export function loadSettings<T>(defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

/** Persist settings patch (debounce at call site for high-frequency updates) */
export function saveSettings<T>(settings: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Quota exceeded or private mode settings simply won't persist
  }
}

/** Command history persistence (localStorage, bounded) */
const HISTORY_KEY = "btefy.txHistory.v1";

export function loadCommandHistory(maxSize: number): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(-maxSize) : [];
  } catch {
    return [];
  }
}

export function saveCommandHistory(history: string[], maxSize: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(-maxSize)),
    );
  } catch {
    // Ignore persistence failures
  }
}
