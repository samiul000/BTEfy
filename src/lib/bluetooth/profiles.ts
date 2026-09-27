import { isValidUuid } from "@/lib/utils/bytes";

/* BLE UART profile (service + TX/RX characteristics) */
export interface BleProfile {
  readonly id: string;
  readonly name: string;
  readonly serviceUuid: string;
  readonly writeCharacteristicUuid: string;
  readonly notifyCharacteristicUuid: string;
  readonly writeMode: "write" | "writeWithoutResponse";
  /* Max payload bytes per write (conservative default) */
  readonly chunkSize: number;
}

/* Nordic UART Service (nRF52, ESP32 BLE UART examples) */
export const NORDIC_UART: BleProfile = {
  id: "nordic-uart",
  name: "Nordic UART (nRF / ESP32)",
  serviceUuid: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  writeCharacteristicUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  notifyCharacteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  writeMode: "writeWithoutResponse",
  chunkSize: 20,
};

/* HM-10 / CC2541 BLE UART module */
export const HM10_UART: BleProfile = {
  id: "hm10-uart",
  name: "HM-10 / CC2541 UART",
  serviceUuid: "0000ffe0-0000-1000-8000-00805f9b34fb",
  writeCharacteristicUuid: "0000ffe1-0000-1000-8000-00805f9b34fb",
  notifyCharacteristicUuid: "0000ffe1-0000-1000-8000-00805f9b34fb",
  writeMode: "writeWithoutResponse",
  chunkSize: 20,
};

/* ESP32 custom UART (same transport as Nordic on most firmwares) */
export const ESP32_UART: BleProfile = {
  id: "esp32-uart",
  name: "ESP32 BLE UART",
  serviceUuid: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  writeCharacteristicUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  notifyCharacteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  writeMode: "writeWithoutResponse",
  chunkSize: 20,
};

/* Built-in profiles; can add custom ones without code changes */
export const BUILTIN_BLE_PROFILES: readonly BleProfile[] = [
  NORDIC_UART,
  ESP32_UART,
  HM10_UART,
];

/* Normalize UUID for case-insensitive comparison */
export function normalizeUuid(uuid: string): string {
  return uuid.toLowerCase();
}

/* Validate a BLE profile; returns error message or null if valid */
export function validateBleProfile(profile: BleProfile): string | null {
  if (!profile.name.trim()) return "Profile name is required.";
  for (const [label, uuid] of [
    ["service UUID", profile.serviceUuid],
    ["write characteristic UUID", profile.writeCharacteristicUuid],
    ["notify characteristic UUID", profile.notifyCharacteristicUuid],
  ] as const) {
    if (!isValidUuid(uuid)) return `Invalid ${label}: ${uuid}`;
  }
  if (profile.chunkSize < 1 || profile.chunkSize > 512) {
    return "Chunk size must be between 1 and 512 bytes.";
  }
  return null;
}

/* Find a built-in profile by id */
export function getBleProfile(id: string): BleProfile | undefined {
  return BUILTIN_BLE_PROFILES.find((p) => p.id === id);
}
