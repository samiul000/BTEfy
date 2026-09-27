"use client";

import { useTelemetryStore } from "@/lib/state/telemetry-store";
import { SERIES_COLORS } from "@/lib/plotting/series";
import { useEffect, useMemo, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

/* Time window presets (samples) */
const WINDOWS = [
  { label: "250 pts", value: 250 },
  { label: "500 pts", value: 500 },
  { label: "1000 pts", value: 1000 },
];

/*
 * Real-time multi-series telemetry chart.
 * Data updates arrive via the Zustand store at UI cadence;
 * uPlot redraws without React re-rendering per sample.
 */
export function TelemetryChart() {
  // Select the Map (stable ref), not a derived array; a fresh array per call
  // makes useSyncExternalStore loop forever.
  const channelMap = useTelemetryStore((s) => s.channels);
  const channels = useMemo(() => Array.from(channelMap.values()), [channelMap]);
  const paused = useTelemetryStore((s) => s.paused);
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [windowSize, setWindowSize] = useState(500);

  const visible = useMemo(
    () => channels.filter((c) => !hidden.has(c.id)),
    [channels, hidden],
  );

  // Create plot once
  useEffect(() => {
    if (!containerRef.current || plotRef.current) return;
    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth || 600,
      height: 260,
      padding: [8, 8, 8, 8],
      scales: { x: { time: false } },
      axes: [
        {
          stroke: "rgba(255,255,255,0.85)",
          grid: { stroke: "rgba(255,255,255,0.12)" },
        },
        {
          stroke: "rgba(255,255,255,0.85)",
          grid: { stroke: "rgba(255,255,255,0.12)" },
        },
      ],
      legend: { show: true },
      series: [{ label: "samples" }],
    };
    plotRef.current = new uPlot(opts, [[], []], containerRef.current);

    const ro = new ResizeObserver(() => {
      const w = containerRef.current?.clientWidth;
      if (w && plotRef.current) {
        plotRef.current.setSize({ width: w, height: 260 });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, []);

  // Push data on store updates
  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    if (visible.length === 0) {
      plot.setData([[], []]);
      return;
    }
    // Channel set changed → rebuild series (keeps uPlot consistent)
    if (plot.series.length - 1 !== visible.length) {
      while (plot.series.length > 1) plot.delSeries(plot.series.length - 1);
      visible.forEach((c, i) => {
        plot.addSeries({
          label: c.name,
          stroke: SERIES_COLORS[i % SERIES_COLORS.length],
          width: 2,
        });
      });
    }
    const n = Math.min(windowSize, ...visible.map((c) => c.values.length));
    if (n === 0) return;
    const xs = visible[0].timestamps.slice(-n);
    // Relative seconds from first sample (stable axis during streaming)
    const t0 = xs[0] ?? Date.now();
    const data: uPlot.AlignedData = [
      xs.map((t) => (t - t0) / 1000),
      ...visible.map((c) => c.values.slice(-n)),
    ];
    plot.setData(data);
  }, [visible, windowSize]);

  const toggle = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (channels.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90">
          Real-time Plot{" "}
          {paused && <span className="text-sky-400">(paused)</span>}
        </h2>
        <div className="flex items-center gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindowSize(w.value)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium glass-btn ${
                windowSize === w.value
                  ? "!bg-sky-400/20 !border-sky-400/30"
                  : ""
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {channels.map((c, i) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
              hidden.has(c.id)
                ? "border-white/10 text-white/50"
                : "border-white/20 text-white"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: SERIES_COLORS[i % SERIES_COLORS.length],
                opacity: hidden.has(c.id) ? 0.3 : 1,
              }}
            />
            {c.name}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="w-full overflow-hidden" />
    </div>
  );
}
