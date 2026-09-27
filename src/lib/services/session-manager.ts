"use client";

/**
 * Session lifecycle manager.
 * Wraps storage/sessions + export helpers for UI consumption.
 */

import {
  createSession,
  finishSession,
  listSessions,
  getSessionLogs,
  deleteSession,
  deleteAllSessions,
  enforceSessionRetention,
  type SessionRecord,
} from "@/lib/storage/sessions";
import {
  downloadTextFile,
  sessionFilename,
  toExportableLogs,
  logsToTxt,
  logsToCsv,
  sessionToJson,
} from "@/lib/utils/export";

export type SessionExportFormat = "txt" | "csv" | "json";

class SessionManager {
  private _activeId: string | null = null;
  private _rxBytes = 0;
  private _txBytes = 0;
  private _rxMessages = 0;
  private _txMessages = 0;

  get activeId(): string | null {
    return this._activeId;
  }

  /** Start recording a new session; returns session id */
  async start(meta: {
    deviceName: string | null;
    deviceId: string | null;
    transport: string;
    profileId: string | null;
  }): Promise<string> {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}`;
    this._activeId = id;
    this._rxBytes = 0;
    this._txBytes = 0;
    this._rxMessages = 0;
    this._txMessages = 0;
    await createSession({
      id,
      startTime: Date.now(),
      deviceName: meta.deviceName,
      deviceId: meta.deviceId,
      transport: meta.transport,
      profileId: meta.profileId,
    });
    return id;
  }

  /** Tally traffic (called by connection manager at flush cadence) */
  tally(
    rxBytes: number,
    txBytes: number,
    rxMessages: number,
    txMessages: number,
  ): void {
    this._rxBytes += rxBytes;
    this._txBytes += txBytes;
    this._rxMessages += rxMessages;
    this._txMessages += txMessages;
  }

  /** End the active session, persist stats, enforce retention */
  async stop(maxSessions = 50, autoDelete = true): Promise<void> {
    if (!this._activeId) return;
    const id = this._activeId;
    this._activeId = null;
    try {
      await finishSession(id, {
        rxBytes: this._rxBytes,
        txBytes: this._txBytes,
        rxMessages: this._rxMessages,
        txMessages: this._txMessages,
      });
      if (autoDelete) {
        await enforceSessionRetention(maxSessions);
      }
    } catch {
      // Storage failure must not break disconnect flow
    }
  }

  list(limit = 100): Promise<SessionRecord[]> {
    return listSessions(limit);
  }

  remove(id: string): Promise<void> {
    return deleteSession(id);
  }

  removeAll(): Promise<void> {
    return deleteAllSessions();
  }

  /** Export a session to a local file download */
  async exportSession(id: string, format: SessionExportFormat): Promise<void> {
    const sessions = await listSessions(1000);
    const session = sessions.find((s) => s.id === id);
    if (!session) throw new Error("Session not found.");
    const raw = await getSessionLogs(id);
    const logs = toExportableLogs(raw);
    const filename = sessionFilename(
      session.deviceName,
      session.startTime,
      format,
    );
    if (format === "txt") {
      downloadTextFile(filename, logsToTxt(session, logs), "text/plain");
    } else if (format === "csv") {
      downloadTextFile(filename, logsToCsv(logs), "text/csv");
    } else {
      downloadTextFile(
        filename,
        sessionToJson(session, logs),
        "application/json",
      );
    }
  }
}

/** Singleton */
export const sessionManager = new SessionManager();
