import { useSyncExternalStore } from "react";

/** Browser capability detection */
export interface BrowserCapabilities {
  webBluetooth: boolean;
  webSerial: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  webUsb: boolean;
}

/**
 * Detect browser capabilities at runtime.
 * Safe to call during SSR (returns false for all).
 */
export function detectCapabilities(): BrowserCapabilities {
  if (typeof window === "undefined") {
    return {
      webBluetooth: false,
      webSerial: false,
      indexedDB: false,
      serviceWorker: false,
      webUsb: false,
    };
  }

  return {
    webBluetooth: "bluetooth" in navigator,
    webSerial: "serial" in navigator,
    indexedDB: "indexedDB" in window,
    serviceWorker: "serviceWorker" in navigator,
    webUsb: "usb" in navigator,
  };
}

/**
 * Get user agent info.
 */
export function getBrowserInfo(): string {
  if (typeof navigator === "undefined") return "Unknown";
  return navigator.userAgent;
}

/**
 * Get OS info.
 */
export function getOsInfo(): string {
  if (typeof navigator === "undefined") return "Unknown";
  return navigator.platform || "Unknown";
}

let capabilitiesCache: BrowserCapabilities | null = null;

/** Cached client snapshot (stable reference required by useSyncExternalStore) */
function getCapabilitiesSnapshot(): BrowserCapabilities {
  if (!capabilitiesCache) {
    capabilitiesCache = detectCapabilities();
  }
  return capabilitiesCache;
}

function subscribeCapabilities(): () => void {
  return () => {};
}

/**
 * Hydration-safe capabilities hook.
 * Returns null during SSR/prerender (render a loading state), real values on
 * the client. Never call detectCapabilities() directly during render
 * server (all false) and client (real values) disagree and React throws a
 * hydration mismatch.
 */
export function useBrowserCapabilities(): BrowserCapabilities | null {
  return useSyncExternalStore(
    subscribeCapabilities,
    getCapabilitiesSnapshot,
    () => null,
  );
}
