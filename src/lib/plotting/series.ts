/*
 * uPlot data adapters.
 * Converts ring-buffer samples to uPlot's columnar AlignedData format:
 * [xs, ...series]. Rendering stays at UI cadence (20–100 ms batches).
 */

import type { RingBuffer } from "./buffers";

export interface PlotSeries {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  buffer: RingBuffer;
}

/* Default palette */
export const SERIES_COLORS = [
  "#38bdf8",
  "#f97316",
  "#22c55e",
  "#eab308",
  "#a78bfa",
  "#f472b6",
  "#2dd4bf",
  "#f87171",
];

/* Build uPlot AlignedData for visible series (x in seconds) */
export function toUPlotData(series: PlotSeries[]): [number[], ...number[][]] {
  const visible = series.filter((s) => s.visible);
  if (visible.length === 0)
    return [[], []] as unknown as [number[], ...number[][]];

  // Union timestamps across series (series share engine cadence in practice)
  const primary = visible[0].buffer.toArray();
  const xs = primary.map((s) => s.t / 1000);
  const columns: number[][] = visible.map((s) =>
    s.buffer.toArray().map((p) => p.v),
  );
  return [xs, ...columns] as [number[], ...number[][]];
}

/* Minimal uPlot options for a dark glass telemetry chart */
export function baseChartOptions(width: number, height: number) {
  return {
    width,
    height,
    padding: [8, 8, 8, 8] as [number, number, number, number],
    scales: { x: { time: true } },
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
    series: [{}, { stroke: SERIES_COLORS[0], width: 2 }],
  };
}
