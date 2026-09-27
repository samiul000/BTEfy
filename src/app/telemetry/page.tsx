"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TelemetryChart } from "@/components/plotting/TelemetryChart";
import { useTelemetryStore } from "@/lib/state/telemetry-store";
import { useConnectionStore } from "@/lib/state/connection-store";
import { Activity, Pause, Play, Trash2 } from "lucide-react";

export default function TelemetryPage() {
  const telemetry = useTelemetryStore();
  const connection = useConnectionStore();
  const channels = telemetry.getChannelArray();

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Telemetry
            </h1>
            <p className="text-sm text-white/90">
              Real-time data channels and visualization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => telemetry.togglePause()}
              className="glass-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium"
            >
              {telemetry.paused ? <Play size={14} /> : <Pause size={14} />}
              {telemetry.paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={() => telemetry.clearChannels()}
              className="glass-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
        </div>

        {channels.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <Activity
              size={36}
              className="mx-auto text-white/90 mb-3"
            />
            <p className="text-sm text-white">
              {connection.isConnected
                ? "Waiting for telemetry data..."
                : "Connect a device to start receiving telemetry."}
            </p>
          </div>
        ) : (
          <>
            <TelemetryChart />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="glass rounded-2xl p-5 transition-all hover:bg-white/[0.08]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">{ch.name}</h3>
                  <span className="text-[11px] text-white">
                    {ch.sampleCount} samples
                  </span>
                </div>
                <p className="text-3xl font-mono font-bold text-white mb-3">
                  {ch.latest.toFixed(2)}
                  {ch.unit && (
                    <span className="text-sm font-normal ml-1 text-white/90">
                      {ch.unit}
                    </span>
                  )}
                </p>
                <div className="flex justify-between text-[11px] text-white">
                  <span>Min: {ch.min.toFixed(2)}</span>
                  <span>Max: {ch.max.toFixed(2)}</span>
                </div>
                {/* Live mini bar (full chart above) */}
                <div className="mt-3 h-2 glass-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400/70 rounded-full transition-all"
                    style={{
                      width: `${
                        ch.max === ch.min
                          ? 100
                          : ((ch.latest - ch.min) / (ch.max - ch.min)) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
