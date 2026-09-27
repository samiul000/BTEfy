import { describe, it, expect } from "vitest";
import { TelemetryEngine } from "@/lib/protocol/telemetry";

describe("TelemetryEngine", () => {
  it("creates channels automatically on ingest", () => {
    const engine = new TelemetryEngine();
    engine.ingestLine("TEMP=25.4,VOLT=11.82");
    expect(engine.ids().sort()).toEqual(["TEMP", "VOLT"]);
    expect(engine.stats("TEMP")?.latest).toBe(25.4);
  });

  it("tracks min/max/avg/count", () => {
    const engine = new TelemetryEngine();
    engine.ingestPoint("T", 10);
    engine.ingestPoint("T", 20);
    engine.ingestPoint("T", 30);
    const stats = engine.stats("T");
    expect(stats?.min).toBe(10);
    expect(stats?.max).toBe(30);
    expect(stats?.avg).toBe(20);
    expect(stats?.sampleCount).toBe(3);
  });

  it("bounds history with a ring buffer", () => {
    const engine = new TelemetryEngine({ maxSamples: 5 });
    for (let i = 0; i < 10; i++) engine.ingestPoint("T", i);
    expect(engine.samples("T")).toHaveLength(5);
    expect(engine.samples("T")[0].v).toBe(5);
    // Cumulative count is preserved for sync cursors
    expect(engine.stats("T")?.sampleCount).toBe(10);
  });

  it("ignores non-finite values", () => {
    const engine = new TelemetryEngine();
    engine.ingestPoint("T", NaN);
    engine.ingestPoint("T", Infinity);
    expect(engine.size).toBe(0);
  });

  it("respects disabled auto-discovery", () => {
    const engine = new TelemetryEngine({ autoDiscovery: false });
    engine.ingestLine("TEMP=25.4");
    expect(engine.size).toBe(0);
  });

  it("parses JSON lines", () => {
    const engine = new TelemetryEngine();
    const points = engine.ingestLine('{"temp":25.4,"voltage":11.8}');
    expect(points).toHaveLength(2);
    expect(engine.stats("VOLTAGE")?.latest).toBe(11.8);
  });
});
