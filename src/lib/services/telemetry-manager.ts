"use client";

/**
 * Telemetry manager: framework-agnostic engine + batched Zustand sync.
 * Data flows: Transport → LineFramer → ingest() → syncToStore() at UI cadence.
 */

import { TelemetryEngine } from "@/lib/protocol/telemetry";
import { useTelemetryStore } from "@/lib/state/telemetry-store";

class TelemetryManager {
  private _engine = new TelemetryEngine({
    maxSamples: 1000,
    autoDiscovery: true,
  });
  /** Channel id → cumulative sampleCount already mirrored into the store */
  private _synced = new Map<string, number>();

  get engine(): TelemetryEngine {
    return this._engine;
  }

  /** Ingest one decoded line */
  ingest(line: string): void {
    this._engine.ingestLine(line);
  }

  /** Mirror new samples into the Zustand store (call at UI cadence) */
  syncToStore(): void {
    const store = useTelemetryStore.getState();
    if (store.paused) return;
    if (!store.autoDiscovery && this._engine.size === 0) return;

    for (const id of this._engine.ids()) {
      const stats = this._engine.stats(id);
      if (!stats) continue;
      const lastSynced = this._synced.get(id) ?? 0;
      const fresh = stats.sampleCount - lastSynced;
      if (fresh <= 0) continue;
      const samples = this._engine.samples(id);
      const tail = samples.slice(-fresh);
      for (const s of tail) {
        store.updateChannel(id, s.v, stats.unit ?? undefined, stats.name);
      }
      this._synced.set(id, stats.sampleCount);
    }
  }

  /** Reconfigure engine bounds (applies on next clear) */
  configure(options: { maxSamples?: number; autoDiscovery?: boolean }): void {
    if (options.autoDiscovery !== undefined) {
      this._engine.autoDiscovery = options.autoDiscovery;
      useTelemetryStore.getState().setAutoDiscovery(options.autoDiscovery);
    }
    if (options.maxSamples !== undefined) {
      useTelemetryStore.getState().setMaxSamples(options.maxSamples);
      // Rebuild engine with new bound (old samples beyond bound are dropped)
      const next = new TelemetryEngine({
        maxSamples: options.maxSamples,
        autoDiscovery: this._engine.autoDiscovery,
      });
      for (const id of this._engine.ids()) {
        for (const s of this._engine.samples(id).slice(-options.maxSamples)) {
          const stats = this._engine.stats(id);
          next.ingestPoint(id, s.v, s.t, stats?.unit ?? undefined, stats?.name);
        }
      }
      this._engine = next;
      this._synced.clear();
    }
  }

  clear(): void {
    this._engine.clear();
    this._synced.clear();
    useTelemetryStore.getState().clearChannels();
  }
}

/** Singleton */
export const telemetryManager = new TelemetryManager();
