import { describe, it, expect } from "vitest";
import {
  BUILTIN_BLE_PROFILES,
  getBleProfile,
  validateBleProfile,
  normalizeUuid,
} from "@/lib/bluetooth/profiles";
import {
  resolveSerialConfig,
  validateSerialConfig,
  DEFAULT_SERIAL_CONFIG,
} from "@/lib/serial/configuration";

describe("BLE profiles", () => {
  it("ships Nordic UART + ESP32 + HM-10 profiles", () => {
    expect(BUILTIN_BLE_PROFILES.length).toBeGreaterThanOrEqual(3);
    expect(getBleProfile("nordic-uart")?.serviceUuid).toBe(
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    );
  });

  it("validates UUIDs", () => {
    const profile = { ...BUILTIN_BLE_PROFILES[0] };
    expect(validateBleProfile(profile)).toBeNull();
    expect(validateBleProfile({ ...profile, serviceUuid: "nope" })).toMatch(
      /Invalid service UUID/,
    );
    expect(validateBleProfile({ ...profile, chunkSize: 0 })).toMatch(
      /Chunk size/,
    );
  });

  it("normalizes UUID case", () => {
    expect(normalizeUuid("6E400001-B5A3-F393-E0A9-E50E24DCCA9E")).toBe(
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    );
  });
});

describe("serial configuration", () => {
  it("resolves defaults", () => {
    expect(resolveSerialConfig({ baudRate: 9600 }).baudRate).toBe(9600);
    expect(resolveSerialConfig({ baudRate: 9600 }).dataBits).toBe(
      DEFAULT_SERIAL_CONFIG.dataBits,
    );
  });

  it("rejects invalid configs", () => {
    expect(validateSerialConfig({ baudRate: -1 })).toMatch(/Baud rate/);
    expect(validateSerialConfig({ baudRate: 115200, dataBits: 9 as never })).toMatch(
      /Data bits/,
    );
    expect(
      validateSerialConfig({ baudRate: 115200, parity: "odd" }),
    ).toBeNull();
  });
});
