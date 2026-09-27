import Dexie, { type Table } from "dexie";

/** Persisted communication session metadata */
export interface SessionRecord {
  id: string;
  startTime: number;
  endTime: number | null;
  deviceName: string | null;
  deviceId: string | null;
  transport: string;
  profileId: string | null;
  rxBytes: number;
  txBytes: number;
  rxMessages: number;
  txMessages: number;
}

/** Single persisted log entry (raw bytes preserved) */
export interface SessionLogRecord {
  id?: number;
  sessionId: string;
  timestamp: number;
  direction: "rx" | "tx";
  /** Base64-encoded raw bytes */
  data: string;
  /** Decoded text (replacement chars on malformed input) */
  text: string;
}

/** Device / connection profile */
export interface ProfileRecord {
  id: string;
  name: string;
  transport: "ble" | "serial" | "mock";
  serviceUuid?: string;
  writeCharacteristicUuid?: string;
  notifyCharacteristicUuid?: string;
  writeMode?: "write" | "writeWithoutResponse";
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  flowControl?: "none" | "hardware";
  lineEnding?: "none" | "lf" | "cr" | "crlf";
  parser?: "auto" | "key-value" | "json";
  createdAt: number;
}

/** Favorite / recent device */
export interface FavoriteRecord {
  id: string; // device identifier (never display name alone)
  displayName: string;
  transport: "ble" | "serial" | "mock";
  profileId: string | null;
  lastConnected: number;
  connectCount: number;
}

/** Command preset */
export interface CommandPresetRecord {
  id: string;
  label: string;
  command: string;
  lineEnding: "none" | "lf" | "cr" | "crlf";
  profileId: string | null;
  createdAt: number;
}

class BtefyDatabase extends Dexie {
  sessions!: Table<SessionRecord, string>;
  sessionLogs!: Table<SessionLogRecord, number>;
  profiles!: Table<ProfileRecord, string>;
  favorites!: Table<FavoriteRecord, string>;
  commandPresets!: Table<CommandPresetRecord, string>;

  constructor() {
    super("btefy");
    this.version(1).stores({
      sessions: "id, startTime, transport",
      sessionLogs: "++id, sessionId, timestamp",
      profiles: "id, transport",
      favorites: "id, lastConnected",
      commandPresets: "id, profileId",
    });
  }
}

let _db: BtefyDatabase | null = null;

/** Singleton Dexie instance (client-side only) */
export function getDatabase(): BtefyDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }
  if (!_db) {
    _db = new BtefyDatabase();
  }
  return _db;
}

/** Estimate storage usage (Settings → Storage) */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
