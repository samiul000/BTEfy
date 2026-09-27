import { describe, it, expect } from "vitest";
import { RingBuffer } from "@/lib/plotting/buffers";

describe("RingBuffer", () => {
  it("appends and reads back in order", () => {
    const buf = new RingBuffer(4);
    buf.push(1, 10);
    buf.push(2, 20);
    expect(buf.toArray()).toEqual([
      { t: 1, v: 10 },
      { t: 2, v: 20 },
    ]);
  });

  it("discards oldest past capacity", () => {
    const buf = new RingBuffer(3);
    for (let i = 0; i < 5; i++) buf.push(i, i * 10);
    expect(buf.toArray().map((s) => s.v)).toEqual([20, 30, 40]);
    expect(buf.length).toBe(3);
  });

  it("computes min/max over the retained window", () => {
    const buf = new RingBuffer(3);
    buf.push(1, 5);
    buf.push(2, -2);
    buf.push(3, 9);
    expect(buf.minMax()).toEqual({ min: -2, max: 9 });
  });

  it("returns null min/max when empty", () => {
    expect(new RingBuffer(4).minMax()).toBeNull();
  });

  it("rejects invalid capacity", () => {
    expect(() => new RingBuffer(0)).toThrow();
  });

  it("clears", () => {
    const buf = new RingBuffer(4);
    buf.push(1, 1);
    buf.clear();
    expect(buf.length).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });
});
