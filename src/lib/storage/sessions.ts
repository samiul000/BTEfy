import {
  getDatabase,
  type SessionRecord,
  type SessionLogRecord,
} from "./database";

export type { SessionRecord, SessionLogRecord };

/** Base64 encode raw bytes for IndexedDB persistence */
export function encodeBytes(data: Uint8Array): string {
  let binary = "";
  for (const b of data) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Decode persisted base64 back to bytes */
export function decodeBytes(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Create a new session record */
export async function createSession(
  session: Omit<
    SessionRecord,
    "endTime" | "rxBytes" | "txBytes" | "rxMessages" | "txMessages"
  >,
): Promise<string> {
  const db = getDatabase();
  const record: SessionRecord = {
    ...session,
    endTime: null,
    rxBytes: 0,
    txBytes: 0,
    rxMessages: 0,
    txMessages: 0,
  };
  await db.sessions.add(record);
  return record.id;
}

/** Append log entries in bulk (never blocks the transport loop, call async) */
export async function appendSessionLogs(
  logs: Omit<SessionLogRecord, "id">[],
): Promise<void> {
  if (logs.length === 0) return;
  const db = getDatabase();
  await db.sessionLogs.bulkAdd(logs as SessionLogRecord[]);
}

/** Finish a session with end time + stats */
export async function finishSession(
  id: string,
  stats: Pick<
    SessionRecord,
    "rxBytes" | "txBytes" | "rxMessages" | "txMessages"
  >,
): Promise<void> {
  const db = getDatabase();
  await db.sessions.update(id, { ...stats, endTime: Date.now() });
}

/** List sessions newest-first */
export async function listSessions(limit = 100): Promise<SessionRecord[]> {
  const db = getDatabase();
  return db.sessions.orderBy("startTime").reverse().limit(limit).toArray();
}

/** Load all logs for a session (ordered) */
export async function getSessionLogs(
  sessionId: string,
): Promise<SessionLogRecord[]> {
  const db = getDatabase();
  return db.sessionLogs
    .where("sessionId")
    .equals(sessionId)
    .sortBy("timestamp");
}

/** Delete a session and its logs */
export async function deleteSession(id: string): Promise<void> {
  const db = getDatabase();
  await db.transaction("rw", db.sessions, db.sessionLogs, async () => {
    await db.sessions.delete(id);
    await db.sessionLogs.where("sessionId").equals(id).delete();
  });
}

/** Delete everything (requires UI confirmation) */
export async function deleteAllSessions(): Promise<void> {
  const db = getDatabase();
  await db.transaction("rw", db.sessions, db.sessionLogs, async () => {
    await db.sessions.clear();
    await db.sessionLogs.clear();
  });
}

/**
 * Enforce retention: keep at most `maxSessions`, deleting oldest first
 * when auto-delete is enabled.
 */
export async function enforceSessionRetention(
  maxSessions: number,
): Promise<number> {
  const db = getDatabase();
  const count = await db.sessions.count();
  if (count <= maxSessions) return 0;
  const excess = await db.sessions
    .orderBy("startTime")
    .limit(count - maxSessions)
    .primaryKeys();
  let deleted = 0;
  await db.transaction("rw", db.sessions, db.sessionLogs, async () => {
    for (const id of excess) {
      await db.sessions.delete(id);
      await db.sessionLogs.where("sessionId").equals(id).delete();
      deleted++;
    }
  });
  return deleted;
}
