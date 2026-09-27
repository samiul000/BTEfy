import { describe, it, expect } from "vitest";
import {
  sessionFilename,
  logsToTxt,
  logsToCsv,
  sessionToJson,
} from "@/lib/utils/export";
import type { SessionRecord } from "@/lib/storage/database";

const SESSION: SessionRecord = {
  id: "s1",
  startTime: new Date(2026, 8, 22, 10, 20, 30).getTime(),
  endTime: null,
  deviceName: "ESP32 Robot!",
  deviceId: "ble:abc",
  transport: "ble",
  profileId: null,
  rxBytes: 10,
  txBytes: 2,
  rxMessages: 1,
  txMessages: 1,
};

describe("session export", () => {
  it("builds safe filenames", () => {
    const name = sessionFilename(SESSION.deviceName, SESSION.startTime, "csv");
    expect(name).toMatch(/^mcu-bridge_esp32-robot_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
    expect(name).not.toMatch(/[! ]/);
  });

  it("renders TXT with header + lines", () => {
    const txt = logsToTxt(SESSION, [
      { timestamp: 1, direction: "rx", text: "TEMP=25.4" },
    ]);
    expect(txt).toContain("# BTEfy session export");
    expect(txt).toContain("RX TEMP=25.4");
  });

  it("renders CSV with header + escaped rows", () => {
    const csv = logsToCsv([
      { timestamp: 1, direction: "tx", text: 'SAY "HI"' },
    ]);
    expect(csv.startsWith("timestamp,direction,text\n")).toBe(true);
    expect(csv).toContain('"SAY ""HI"""');
  });

  it("renders JSON with session + logs", () => {
    const json = sessionToJson(SESSION, []);
    const parsed = JSON.parse(json) as { session: SessionRecord };
    expect(parsed.session.id).toBe("s1");
  });
});
