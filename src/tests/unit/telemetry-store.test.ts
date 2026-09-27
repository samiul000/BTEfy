import { describe, it, expect } from "vitest";
import { useTelemetryStore } from "@/lib/state/telemetry-store";

/*
 * TelemetryChart subscribes to `s.channels` and derives its array with
 * useMemo. That only terminates if the store replaces the Map instead of
 * mutating it — an in-place mutation would freeze the memo and silently
 * stop the chart updating.
 */
describe("telemetry store channels snapshot", () => {
  it("returns the same Map until a write happens", () => {
    const before = useTelemetryStore.getState().channels;
    expect(useTelemetryStore.getState().channels).toBe(before);
  });

  it("replaces the Map on every write", () => {
    const before = useTelemetryStore.getState().channels;
    useTelemetryStore.getState().updateChannel("RPM", 1400, "rpm", "RPM");
    const after = useTelemetryStore.getState().channels;

    expect(after).not.toBe(before);
    expect(after.size).toBe(before.size + 1);
    expect(after.get("RPM")?.latest).toBe(1400);
    // Old snapshot is untouched (copy-on-write, no aliasing)
    expect(before.has("RPM")).toBe(false);
  });
});
