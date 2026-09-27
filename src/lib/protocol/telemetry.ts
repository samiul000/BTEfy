/**
 * Framework-agnostic telemetry channel engine.
 * The Zustand store wraps this for React; services/tests use it directly.
 */

import { parseLine, type TelemetryPoint } from "./parser";

export interface ChannelSample {
  t: number;
  v: number;
}

export interface ChannelStats {
  id: string;
  name: string;
  unit: string | null;
  latest: number;
  min: number;
  max: number;
  avg: number;
  sampleCount: number;
}

export interface TelemetryEngineOptions {
  /** Max samples retained per channel (ring buffer) */
  maxSamples?: number;
  /** Auto-create channels on first sight */
  autoDiscovery?: boolean;
}

/**
 * Ring-buffered telemetry store. Never grows unbounded.
 */
export class TelemetryEngine {
  private _channels = new Map<
    string,
    {
      name: string;
      unit: string | null;
      samples: ChannelSample[];
      min: number;
      max: number;
      sum: number;
      count: number;
    }
  >();
  private readonly _maxSamples: number;
  autoDiscovery: boolean;

  constructor(options?: TelemetryEngineOptions) {
    this._maxSamples = options?.maxSamples ?? 1000;
    this.autoDiscovery = options?.autoDiscovery ?? true;
  }

  /** Ingest one decoded line; returns points extracted */
  ingestLine(line: string, timestamp = Date.now()): TelemetryPoint[] {
    const { points } = parseLine(line);
    for (const p of points) {
      this.ingestPoint(p.id, p.value, timestamp, p.unit, p.name);
    }
    return points;
  }

  /** Ingest a single numeric sample */
  ingestPoint(
    id: string,
    value: number,
    timestamp = Date.now(),
    unit?: string,
    name?: string,
  ): void {
    if (!Number.isFinite(value)) return; // Ignore invalid values
    let ch = this._channels.get(id);
    if (!ch) {
      if (!this.autoDiscovery) return;
      ch = {
        name: name ?? id,
        unit: unit ?? null,
        samples: [],
        min: value,
        max: value,
        sum: 0,
        count: 0,
      };
      this._channels.set(id, ch);
    }
    ch.samples.push({ t: timestamp, v: value });
    if (ch.samples.length > this._maxSamples) {
      ch.samples.splice(0, ch.samples.length - this._maxSamples);
    }
    if (value < ch.min) ch.min = value;
    if (value > ch.max) ch.max = value;
    ch.sum += value;
    ch.count++;
    if (unit !== undefined) ch.unit = unit;
    if (name !== undefined) ch.name = name;
  }

  /** Channel ids */
  ids(): string[] {
    return [...this._channels.keys()];
  }

  /** Raw samples for plotting */
  samples(id: string): readonly ChannelSample[] {
    return this._channels.get(id)?.samples ?? [];
  }

  /** Stats for dashboard cards */
  stats(id: string): ChannelStats | undefined {
    const ch = this._channels.get(id);
    if (!ch || ch.samples.length === 0) return undefined;
    const latest = ch.samples[ch.samples.length - 1].v;
    return {
      id,
      name: ch.name,
      unit: ch.unit,
      latest,
      min: ch.min,
      max: ch.max,
      avg: ch.sum / ch.count,
      sampleCount: ch.count,
    };
  }

  clear(id?: string): void {
    if (id) this._channels.delete(id);
    else this._channels.clear();
  }

  get size(): number {
    return this._channels.size;
  }
}
