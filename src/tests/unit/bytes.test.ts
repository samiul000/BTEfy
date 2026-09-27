import { describe, it, expect } from "vitest";
import {
  bytesToHex,
  bytesToHexAscii,
  bytesToText,
  textToBytes,
  applyLineEnding,
  formatBytes,
  formatDuration,
  isValidUuid,
  isPrintableAscii,
} from "@/lib/utils/bytes";

describe("bytes utils", () => {
  it("bytesToHex converts correctly", () => {
    expect(bytesToHex(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]))).toBe(
      "48 65 6C 6C 6F"
    );
  });

  it("bytesToHexAscii includes ASCII representation", () => {
    const result = bytesToHexAscii(new Uint8Array([0x48, 0x65, 0x0a]));
    expect(result).toContain("48 65 0A");
    expect(result).toContain("He.");
  });

  it("bytesToText handles valid UTF-8", () => {
    const bytes = new TextEncoder().encode("Hello");
    expect(bytesToText(bytes)).toBe("Hello");
  });

  it("bytesToText handles malformed UTF-8", () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x48]);
    expect(() => bytesToText(bytes)).not.toThrow();
  });

  it("textToBytes converts correctly", () => {
    const bytes = textToBytes("Hi");
    expect(Array.from(bytes)).toEqual([0x48, 0x69]);
  });

  it("applyLineEnding adds correct ending", () => {
    expect(applyLineEnding("test", "lf")).toBe("test\n");
    expect(applyLineEnding("test", "cr")).toBe("test\r");
    expect(applyLineEnding("test", "crlf")).toBe("test\r\n");
    expect(applyLineEnding("test", "none")).toBe("test");
  });
});

describe("format utils", () => {
  it("formatBytes formats correctly", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("formatDuration formats correctly", () => {
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(61000)).toBe("00:01:01");
    expect(formatDuration(3661000)).toBe("01:01:01");
  });
});

describe("UUID validation", () => {
  it("validates correct UUIDs", () => {
    expect(
      isValidUuid("6e400001-b5a3-f393-e0a9-e50e24dcca9e")
    ).toBe(true);
    expect(
      isValidUuid("6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
    ).toBe(true);
  });

  it("rejects invalid UUIDs", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("6e400001-b5a3-f393-e0a9")).toBe(false);
  });
});

describe("isPrintableAscii", () => {
  it("detects printable ASCII", () => {
    expect(isPrintableAscii(new TextEncoder().encode("Hello World"))).toBe(true);
  });

  it("detects non-printable data", () => {
    expect(
      isPrintableAscii(new Uint8Array([0x00, 0x01, 0x02, 0x03]))
    ).toBe(false);
  });

  it("handles empty input", () => {
    expect(isPrintableAscii(new Uint8Array([]))).toBe(true);
  });
});
