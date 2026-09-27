import { describe, it, expect } from "vitest";
import { decodeMessage } from "@/lib/protocol/decoder";
import { textToBytes } from "@/lib/utils/bytes";

describe("decodeMessage", () => {
  it("decodes text mode", () => {
    const msg = decodeMessage(textToBytes("TEMP=25.4\n"), "text");
    expect(msg.text).toBe("TEMP=25.4\n");
    expect(msg.display).toBe("TEMP=25.4\n");
  });

  it("decodes hex mode", () => {
    const msg = decodeMessage(new Uint8Array([0x48, 0x65]), "hex");
    expect(msg.display).toBe("48 65");
  });

  it("decodes hex+ascii mode", () => {
    const msg = decodeMessage(new Uint8Array([0x48, 0x65]), "hex-ascii");
    expect(msg.display).toContain("48 65");
    expect(msg.display).toContain("He");
  });

  it("never crashes on malformed UTF-8", () => {
    const msg = decodeMessage(new Uint8Array([0xff, 0xfe, 0x0a]), "text");
    expect(typeof msg.text).toBe("string");
    const hex = decodeMessage(new Uint8Array([0xff, 0xfe]), "hex");
    expect(hex.display).toBe("FF FE");
  });
});
