/*
 * Fixed-capacity ring buffers for real-time plotting.
 * O(1) amortized append; old samples are discarded past capacity.
 */

export interface PlotSample {
  t: number;
  v: number;
}

export class RingBuffer {
  private _times: number[];
  private _values: number[];
  private _head = 0;
  private _size = 0;
  private readonly _capacity: number;

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("RingBuffer capacity must be a positive integer.");
    }
    this._capacity = capacity;
    this._times = new Array<number>(capacity);
    this._values = new Array<number>(capacity);
  }

  get capacity(): number {
    return this._capacity;
  }

  get length(): number {
    return this._size;
  }

  push(t: number, v: number): void {
    this._times[this._head] = t;
    this._values[this._head] = v;
    this._head = (this._head + 1) % this._capacity;
    if (this._size < this._capacity) this._size++;
  }

  clear(): void {
    this._head = 0;
    this._size = 0;
  }

  /* Ordered oldest→newest samples (allocates; call at render cadence, not per byte) */
  toArray(): PlotSample[] {
    const out: PlotSample[] = new Array(this._size);
    const start = (this._head - this._size + this._capacity) % this._capacity;
    for (let i = 0; i < this._size; i++) {
      const idx = (start + i) % this._capacity;
      out[i] = { t: this._times[idx], v: this._values[idx] };
    }
    return out;
  }

  /* Min/max over retained window (for auto-scale) */
  minMax(): { min: number; max: number } | null {
    if (this._size === 0) return null;
    const start = (this._head - this._size + this._capacity) % this._capacity;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this._size; i++) {
      const v = this._values[(start + i) % this._capacity];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { min, max };
  }
}

/* History window presets */
export const HISTORY_WINDOWS = [
  { label: "10 seconds", samples: 1000 },
  { label: "30 seconds", samples: 3000 },
  { label: "60 seconds", samples: 6000 },
  { label: "5 minutes", samples: 30000 },
] as const;
