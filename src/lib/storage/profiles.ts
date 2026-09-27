import {
  getDatabase,
  type ProfileRecord,
  type FavoriteRecord,
  type CommandPresetRecord,
} from "./database";

/* --- Profiles --- */

export async function listProfiles(): Promise<ProfileRecord[]> {
  return getDatabase().profiles.orderBy("createdAt").toArray();
}

export async function saveProfile(profile: ProfileRecord): Promise<void> {
  await getDatabase().profiles.put(profile);
}

export async function deleteProfile(id: string): Promise<void> {
  await getDatabase().profiles.delete(id);
}

/* --- Favorites + recent devices --- */

/** Upsert a favorite on connect (keyed by stable device id, not name) */
export async function touchFavorite(
  fav: Omit<FavoriteRecord, "connectCount" | "lastConnected">,
): Promise<void> {
  const db = getDatabase();
  const existing = await db.favorites.get(fav.id);
  await db.favorites.put({
    ...fav,
    lastConnected: Date.now(),
    connectCount: (existing?.connectCount ?? 0) + 1,
  });
}

export async function listFavorites(): Promise<FavoriteRecord[]> {
  return getDatabase().favorites.orderBy("lastConnected").reverse().toArray();
}

export async function deleteFavorite(id: string): Promise<void> {
  await getDatabase().favorites.delete(id);
}

/* --- Command presets --- */

export async function listCommandPresets(
  profileId?: string,
): Promise<CommandPresetRecord[]> {
  const db = getDatabase();
  if (profileId) {
    return db.commandPresets.where("profileId").equals(profileId).toArray();
  }
  return db.commandPresets.orderBy("createdAt").toArray();
}

export async function saveCommandPreset(
  preset: CommandPresetRecord,
): Promise<void> {
  await getDatabase().commandPresets.put(preset);
}

export async function deleteCommandPreset(id: string): Promise<void> {
  await getDatabase().commandPresets.delete(id);
}

/* --- Built-in default profiles (ESP32 / Generic UART / HC-05) --- */

const BUILTIN_PROFILES: ProfileRecord[] = [
  {
    id: "builtin-esp32-ble",
    name: "ESP32 BLE UART",
    transport: "ble",
    serviceUuid: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    writeCharacteristicUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    notifyCharacteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    writeMode: "writeWithoutResponse",
    lineEnding: "lf",
    parser: "auto",
    createdAt: 0,
  },
  {
    id: "builtin-generic-uart",
    name: "Generic UART",
    transport: "serial",
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    flowControl: "none",
    lineEnding: "lf",
    parser: "auto",
    createdAt: 0,
  },
  {
    id: "builtin-hc05-uart",
    name: "HC-05 UART (virtual COM)",
    transport: "serial",
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    flowControl: "none",
    lineEnding: "crlf",
    parser: "auto",
    createdAt: 0,
  },
];

/** Seed built-in profiles on first run; returns all profiles */
export async function ensureBuiltinProfiles(): Promise<ProfileRecord[]> {
  const db = getDatabase();
  for (const profile of BUILTIN_PROFILES) {
    const existing = await db.profiles.get(profile.id);
    if (!existing) {
      await db.profiles.add(profile);
    }
  }
  return listProfiles();
}
