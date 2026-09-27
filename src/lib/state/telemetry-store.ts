"use client";

import { create } from "zustand";

/** Telemetry channel */
export interface TelemetryChannel {
  id: string;
  name: string;
  unit: string | null;
  timestamps: number[];
  values: number[];
  min: number;
  max: number;
  latest: number;
  sampleCount: number;
}

interface TelemetryStore {
  /** Active channels */
  channels: Map<string, TelemetryChannel>;
  /** Auto-discovery enabled */
  autoDiscovery: boolean;
  /** Max samples per channel */
  maxSamples: number;
  /** Update interval ms */
  updateInterval: number;
  /** Paused */
  paused: boolean;

  // Actions
  updateChannel: (id: string, value: number, unit?: string, name?: string) => void;
  removeChannel: (id: string) => void;
  clearChannels: () => void;
  setAutoDiscovery: (enabled: boolean) => void;
  setMaxSamples: (max: number) => void;
  setUpdateInterval: (interval: number) => void;
  togglePause: () => void;
  getChannelArray: () => TelemetryChannel[];
}

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  channels: new Map(),
  autoDiscovery: true,
  maxSamples: 1000,
  updateInterval: 100,
  paused: false,

  updateChannel: (id, value, unit, name) => {
    if (get().paused) return;

    set((state) => {
      const newChannels = new Map(state.channels);
      const existing = newChannels.get(id);

      if (existing) {
        const timestamps = [...existing.timestamps, Date.now()];
        const values = [...existing.values, value];

        // Bounded ring buffer
        if (timestamps.length > state.maxSamples) {
          timestamps.splice(0, timestamps.length - state.maxSamples);
          values.splice(0, values.length - state.maxSamples);
        }

        newChannels.set(id, {
          ...existing,
          timestamps,
          values,
          min: Math.min(existing.min, value),
          max: Math.max(existing.max, value),
          latest: value,
          sampleCount: existing.sampleCount + 1,
          unit: unit ?? existing.unit,
          name: name ?? existing.name,
        });
      } else {
        newChannels.set(id, {
          id,
          name: name ?? id,
          unit: unit ?? null,
          timestamps: [Date.now()],
          values: [value],
          min: value,
          max: value,
          latest: value,
          sampleCount: 1,
        });
      }

      return { channels: newChannels };
    });
  },

  removeChannel: (id) =>
    set((state) => {
      const newChannels = new Map(state.channels);
      newChannels.delete(id);
      return { channels: newChannels };
    }),

  clearChannels: () => set({ channels: new Map() }),

  setAutoDiscovery: (enabled) => set({ autoDiscovery: enabled }),

  setMaxSamples: (max) => set({ maxSamples: max }),

  setUpdateInterval: (interval) => set({ updateInterval: interval }),

  togglePause: () => set((s) => ({ paused: !s.paused })),

  getChannelArray: () => Array.from(get().channels.values()),
}));
