import { describe, it, expect } from "vitest";
import { LineFramer } from "@/lib/protocol/framing";
import { textToBytes } from "@/lib/utils/bytes";

function enc(s: string): Uint8Array {
  return textToBytes(s);
}

describe("LineFramer", () => {
  it("emits complete newline-delimited lines", () => {
    const framer = new LineFramer();
    expect(framer.push(enc("TEMP=25.4\nVOLT=11.8\n"))).toEqual([
      "TEMP=25.4",
      "VOLT=11.8",
    ]);
  });

  it("holds incomplete lines across chunks", () => {
    const framer = new LineFramer();
    expect(framer.push(enc("TEMP=25"))).toEqual([]);
    expect(framer.push(enc(".4\n"))).toEqual(["TEMP=25.4"]);
  });

  it("strips CR from CRLF endings", () => {
    const framer = new LineFramer();
    expect(framer.push(enc("A=1\r\nB=2\r\n"))).toEqual(["A=1", "B=2"]);
  });

  it("flushes unterminated tail on disconnect", () => {
    const framer = new LineFramer();
    framer.push(enc("PARTIAL"));
    expect(framer.flush()).toEqual(["PARTIAL"]);
    expect(framer.flush()).toEqual([]);
  });

  it("never splits multi-byte UTF-8 across chunks", () => {
    const framer = new LineFramer();
    const bytes = textToBytes("TEMP=25°C\n");
    // Split inside the 2-byte ° character
    const cut = bytes.length - 3;
    expect(framer.push(bytes.slice(0, cut))).toEqual([]);
    expect(framer.push(bytes.slice(cut))).toEqual(["TEMP=25°C"]);
  });

  it("bounds the queue and counts dropped lines", () => {
    const framer = new LineFramer({ maxQueuedLines: 2 });
    const many = Array.from({ length: 5 }, (_, i) => `L${i}`).join("\n") + "\n";
    // Backpressure: oldest lines are dropped, drops are counted
    expect(framer.push(enc(many))).toEqual(["L3", "L4"]);
    expect(framer.droppedLines).toBe(3);
  });
});
