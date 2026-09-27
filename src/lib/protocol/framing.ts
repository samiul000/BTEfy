/**
 * Newline-delimited framer .
 * Accumulates raw chunks and emits complete lines; incomplete
 * trailing data is held until terminated. Bounded to avoid
 * unbounded memory growth.
 */

export interface FramerOptions {
  /** Max buffered bytes for an unterminated line (default 64 KB) */
  maxLineBytes?: number;
  /** Max queued complete lines (default 10k; oldest dropped + counted) */
  maxQueuedLines?: number;
}

export class LineFramer {
  private _buffer = "";
  private _queue: string[] = [];
  private _droppedLines = 0;
  private readonly _maxLineBytes: number;
  private readonly _maxQueuedLines: number;
  private readonly _decoder = new TextDecoder("utf-8", { fatal: false });

  constructor(options?: FramerOptions) {
    this._maxLineBytes = options?.maxLineBytes ?? 64 * 1024;
    this._maxQueuedLines = options?.maxQueuedLines ?? 10_000;
  }

  /** Push raw bytes; returns newly completed lines */
  push(chunk: Uint8Array): string[] {
    // ASCII fast path check: TextDecoder handles all cases safely
    this._buffer += this._decoder.decode(chunk, { stream: true });

    // Bound the unterminated buffer (malformed stream protection)
    if (this._buffer.length > this._maxLineBytes) {
      this._buffer = this._buffer.slice(-this._maxLineBytes);
    }

    const lines: string[] = [];
    let nl: number;
    while ((nl = this._buffer.indexOf("\n")) !== -1) {
      const line = this._buffer.slice(0, nl).replace(/\r$/, "");
      this._buffer = this._buffer.slice(nl + 1);
      if (this._queue.length >= this._maxQueuedLines) {
        this._queue.shift();
        this._droppedLines++;
      }
      this._queue.push(line);
    }

    while (this._queue.length > 0) {
      lines.push(this._queue.shift() as string);
    }
    return lines;
  }

  /** Flush any remaining unterminated data (e.g. on disconnect) */
  flush(): string[] {
    // Flush the streaming decoder state
    const tail = this._decoder.decode();
    if (tail) this._buffer += tail;
    if (!this._buffer) return [];
    const rest = this._buffer;
    this._buffer = "";
    return [rest];
  }

  /** Number of lines dropped due to backpressure */
  get droppedLines(): number {
    return this._droppedLines;
  }
}
