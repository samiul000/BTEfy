"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useConnectionStore } from "@/lib/state/connection-store";
import { useTelemetryStore } from "@/lib/state/telemetry-store";
import { formatBytes, formatDuration, formatRate } from "@/lib/utils/bytes";
import { useState, useEffect } from "react";
import {
  Bluetooth,
  Usb,
  Wifi,
  Activity,
  ArrowDown,
  ArrowUp,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const connection = useConnectionStore();
  const telemetry = useTelemetryStore();
  const channels = telemetry.getChannelArray();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!connection.sessionStart) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [connection.sessionStart]);

  const sessionDuration = connection.sessionStart
    ? now - connection.sessionStart
    : 0;

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Dashboard
            </h1>
            <p className="text-sm text-white/90">
              MCU Bridge : Bluetooth &amp; Serial Debug Console
            </p>
          </div>
          <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connection.isConnected
                  ? "bg-status-connected shadow-lg shadow-green-500/40"
                  : connection.state === "error"
                    ? "bg-status-error"
                    : connection.state === "reconnecting"
                      ? "bg-status-reconnecting animate-pulse"
                      : "bg-status-disconnected"
              }`}
            />
            <span className="text-sm font-medium capitalize text-white">
              {connection.state}
            </span>
          </div>
        </div>

        {/* Connection Card */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-4">
            Connection
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                {connection.transportType === "ble" ? (
                  <Bluetooth size={20} className="text-sky-400" />
                ) : connection.transportType === "serial" ? (
                  <Usb size={20} className="text-sky-400" />
                ) : (
                  <Wifi size={20} className="text-white" />
                )}
              </div>
              <div>
                <p className="text-[11px] text-white/90">Transport</p>
                <p className="text-sm font-semibold uppercase text-white">
                  {connection.transportType ?? "None"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-white/90">Device</p>
              <p className="text-sm font-medium text-white">
                {connection.deviceName ?? "Not connected"}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-white/90">Session</p>
              <p className="text-sm font-medium font-mono text-white">
                {connection.sessionStart
                  ? formatDuration(sessionDuration)
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-white/90">Reconnects</p>
              <p className="text-sm font-medium text-white">
                {connection.reconnectCount}
              </p>
            </div>
          </div>
        </div>

        {/* Traffic Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="RX"
            value={formatBytes(connection.rxBytes)}
            icon={<ArrowDown size={16} className="text-green-400" />}
          />
          <StatCard
            label="TX"
            value={formatBytes(connection.txBytes)}
            icon={<ArrowUp size={16} className="text-blue-400" />}
          />
          <StatCard
            label="RX Rate"
            value={
              connection.sessionStart
                ? formatRate(
                    connection.rxBytes /
                      ((now - connection.sessionStart) / 1000),
                  )
                : "0 B/s"
            }
            icon={<Activity size={16} className="text-sky-400" />}
          />
          <StatCard
            label="Messages"
            value={`${connection.rxMessages + connection.txMessages}`}
            icon={<Zap size={16} className="text-purple-400" />}
          />
        </div>

        {/* Telemetry Preview */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-4">
            Telemetry Channels
          </h2>
          {channels.length === 0 ? (
            <p className="text-sm text-white">
              No telemetry channels active. Connect a device to start receiving
              data.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {channels.map((ch) => (
                <div key={ch.id} className="glass-subtle rounded-xl p-3">
                  <p className="text-[11px] text-white/90">{ch.name}</p>
                  <p className="text-lg font-mono font-bold text-white">
                    {ch.latest.toFixed(1)}
                    {ch.unit && (
                      <span className="text-xs font-normal ml-1 text-white/90">
                        {ch.unit}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-white">
                    {ch.sampleCount} samples
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/terminal"
              className="glass-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
            >
              Open Terminal
            </a>
            <a
              href="/devices"
              className="glass-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
            >
              <Bluetooth size={16} />
              Scan Devices
            </a>
            <a
              href="/settings"
              className="glass-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all"
            >
              Settings
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4 transition-all hover:bg-white/[0.08]">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[11px] text-white/90">{label}</p>
      </div>
      <p className="text-lg font-mono font-bold text-white">{value}</p>
    </div>
  );
}
