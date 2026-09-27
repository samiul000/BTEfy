import {
  appendSessionLogs,
  encodeBytes,
  type SessionLogRecord,
} from "@/lib/storage/sessions";
import { bytesToText } from "@/lib/utils/bytes";

/**
 * Session logging manager.
 * Bounded in-memory queue flushed to IndexedDB on a timer so
 * logging never blocks hardware communication.
 */

const MAX_QUEUE = 2000;
const FLUSH_INTERVAL_MS = 2000;

class LoggingManager {
  private _recording = true;
  private _sessionId: string | null = null;
  private _queue: Omit<SessionLogRecord, "id">[] = [];
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _dropped = 0;

  get recording(): boolean {
    return this._recording;
  }

  get dropped(): number {
    return this._dropped;
  }

  setRecording(enabled: boolean): void {
    this._recording = enabled;
  }

  /** Begin logging for a session */
  start(sessionId: string): void {
    this._sessionId = sessionId;
    this._queue = [];
    this._dropped = 0;
    this._stopTimer();
    this._timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  /** Append one entry (drops oldest past bound, counts them) */
  append(direction: "rx" | "tx", data: Uint8Array): void {
    if (!this._recording || !this._sessionId) return;
    if (this._queue.length >= MAX_QUEUE) {
      this._queue.shift();
      this._dropped++;
    }
    this._queue.push({
      sessionId: this._sessionId,
      timestamp: Date.now(),
      direction,
      data: encodeBytes(data),
      text: bytesToText(data),
    });
  }

  /** Flush queue to IndexedDB now */
  async flush(): Promise<void> {
    if (this._queue.length === 0) return;
    const batch = this._queue;
    this._queue = [];
    try {
      await appendSessionLogs(batch);
    } catch {
      // Storage failure must not break the live session; re-drop
      this._dropped += batch.length;
    }
  }

  /** End logging for the current session (flushes remainder) */
  async stop(): Promise<void> {
    this._stopTimer();
    await this.flush();
    this._sessionId = null;
  }

  private _stopTimer(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

/** Singleton */
export const loggingManager = new LoggingManager();
