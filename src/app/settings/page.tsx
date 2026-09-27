"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useSettingsStore } from "@/lib/state/settings-store";
import { useConnectionStore } from "@/lib/state/connection-store";
import { telemetryManager } from "@/lib/services/telemetry-manager";
import { loggingManager } from "@/lib/services/logging-manager";
import { getStorageEstimate } from "@/lib/storage/database";
import {
  useBrowserCapabilities,
  getBrowserInfo,
  getOsInfo,
  type BrowserCapabilities,
} from "@/lib/utils/browser-support";
import { formatBytes } from "@/lib/utils/bytes";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const settings = useSettingsStore();
  const capabilities: BrowserCapabilities | null = useBrowserCapabilities();

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Settings
          </h1>
          <p className="text-sm text-white/90">
            Configure BTEfy to your preferences
          </p>
        </div>

        {/* General */}
        <Section title="General">
          <Setting label="Theme">
            <select
              value={settings.theme}
              onChange={(e) =>
                settings.setTheme(
                  e.target.value as "dark" | "light" | "system"
                )
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </Setting>
          <Setting label="Startup Page">
            <select
              value={settings.startupPage}
              onChange={(e) => settings.setStartupPage(e.target.value)}
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="/">Dashboard</option>
              <option value="/terminal">Terminal</option>
              <option value="/devices">Devices</option>
              <option value="/telemetry">Telemetry</option>
            </select>
          </Setting>
        </Section>

        {/* Connection */}
        <Section title="Connection">
          <Setting label="Default Transport">
            <select
              value={settings.connection.defaultTransport}
              onChange={(e) =>
                settings.updateConnection({
                  defaultTransport: e.target.value as
                    | "ble"
                    | "serial"
                    | "mock",
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="mock">Mock</option>
              <option value="ble">BLE</option>
              <option value="serial">Serial</option>
            </select>
          </Setting>
          <Setting label="Auto Reconnect">
            <input
              type="checkbox"
              checked={settings.connection.reconnectEnabled}
              onChange={(e) =>
                settings.updateConnection({
                  reconnectEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded accent-sky-400"
            />
          </Setting>
          <Setting label="Max Reconnect Attempts">
            <input
              type="number"
              value={settings.connection.maxReconnectAttempts}
              onChange={(e) =>
                settings.updateConnection({
                  maxReconnectAttempts: parseInt(e.target.value) || 5,
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm w-20"
            />
          </Setting>
        </Section>

        {/* Terminal */}
        <Section title="Terminal">
          <Setting label="Font Size">
            <input
              type="number"
              value={settings.terminal.fontSize}
              onChange={(e) =>
                settings.updateTerminal({
                  fontSize: parseInt(e.target.value) || 14,
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm w-20"
            />
          </Setting>
          <Setting label="Max Visible Lines">
            <input
              type="number"
              value={settings.terminal.maxVisibleLines}
              onChange={(e) =>
                settings.updateTerminal({
                  maxVisibleLines: parseInt(e.target.value) || 5000,
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm w-20"
            />
          </Setting>
          <Setting label="Show Timestamps">
            <input
              type="checkbox"
              checked={settings.terminal.showTimestamps}
              onChange={(e) =>
                settings.updateTerminal({ showTimestamps: e.target.checked })
              }
              className="h-4 w-4 rounded accent-sky-400"
            />
          </Setting>
        </Section>

        {/* Serial */}
        <Section title="Serial">
          <Setting label="Baud Rate">
            <select
              value={settings.serial.baudRate}
              onChange={(e) =>
                settings.updateSerial({ baudRate: parseInt(e.target.value) })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
            >
              {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(
                (rate) => (
                  <option key={rate} value={rate}>
                    {rate}
                  </option>
                )
              )}
            </select>
          </Setting>
          <Setting label="Data Bits">
            <select
              value={settings.serial.dataBits}
              onChange={(e) =>
                settings.updateSerial({
                  dataBits: parseInt(e.target.value) as 5 | 6 | 7 | 8,
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
            >
              {[5, 6, 7, 8].map((bits) => (
                <option key={bits} value={bits}>
                  {bits}
                </option>
              ))}
            </select>
          </Setting>
          <Setting label="Stop Bits">
            <select
              value={settings.serial.stopBits}
              onChange={(e) =>
                settings.updateSerial({
                  stopBits: parseInt(e.target.value) as 1 | 2,
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </Setting>
          <Setting label="Parity">
            <select
              value={settings.serial.parity}
              onChange={(e) =>
                settings.updateSerial({
                  parity: e.target.value as "none" | "even" | "odd",
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="none">None</option>
              <option value="even">Even</option>
              <option value="odd">Odd</option>
            </select>
          </Setting>
          <Setting label="Line Ending">
            <select
              value={settings.serial.lineEnding}
              onChange={(e) =>
                settings.updateSerial({
                  lineEnding: e.target.value as
                    | "none"
                    | "lf"
                    | "cr"
                    | "crlf",
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="none">None</option>
              <option value="lf">LF (\n)</option>
              <option value="cr">CR (\r)</option>
              <option value="crlf">CRLF (\r\n)</option>
            </select>
          </Setting>
        </Section>

        {/* Telemetry */}
        <Section title="Telemetry">
          <Setting label="Auto Parsing">
            <input
              type="checkbox"
              checked={settings.telemetry.autoParsing}
              onChange={(e) =>
                settings.updateTelemetry({ autoParsing: e.target.checked })
              }
              className="h-4 w-4 rounded accent-sky-400"
            />
          </Setting>
          <Setting label="History Length">
            <input
              type="number"
              value={settings.telemetry.historyLength}
              onChange={(e) =>
                settings.updateTelemetry({
                  historyLength: parseInt(e.target.value) || 1000,
                })
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm w-20"
            />
          </Setting>
        </Section>

        {/* Browser Capabilities */}
        <Section title="Browser Capabilities">
          {capabilities ? (
            <div className="space-y-2.5">
              <CapabilityRow
                name="Web Bluetooth"
                supported={capabilities.webBluetooth}
              />
              <CapabilityRow
                name="Web Serial"
                supported={capabilities.webSerial}
              />
              <CapabilityRow
                name="IndexedDB"
                supported={capabilities.indexedDB}
              />
              <CapabilityRow
                name="Service Worker"
                supported={capabilities.serviceWorker}
              />
              <div className="pt-3 border-t border-white/10 mt-3">
                <p className="text-[11px] text-white">
                  Browser: {getBrowserInfo()}
                </p>
                <p className="text-[11px] text-white">
                  Platform: {getOsInfo()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white">Loading...</p>
          )}
        </Section>

        {/* Diagnostics */}
        <Section title="Diagnostics">
          <DiagnosticsPanel />
        </Section>

        {/* About */}
        <Section title="About">
          <div className="text-sm text-white space-y-1">
            <p>
              <strong className="text-white">BTEfy</strong> v0.1.0
            </p>
            <p>Bluetooth &amp; Serial Debug Console</p>
            <p>
              Browser-based microcontroller communication, debugging,
              telemetry, and serial-monitoring platform.
            </p>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-4">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Setting({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-white/90">{label}</label>
      {children}
    </div>
  );
}

/** Developer diagnostics panel (§77): transport, queue, parser, storage */
function DiagnosticsPanel() {
  const connection = useConnectionStore();
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [channels, setChannels] = useState(() => telemetryManager.engine.size);

  useEffect(() => {
    let live = true;
    void getStorageEstimate()
      .then((s) => {
        if (live) setStorage(s);
      })
      .catch(() => undefined);
    const id = setInterval(() => {
      if (live) setChannels(telemetryManager.engine.size);
    }, 1000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const rows: Array<[string, string]> = [
    ["Transport", connection.transportType ?? "none"],
    ["Connection state", connection.state],
    ["Device", connection.deviceName ?? "—"],
    ["RX", `${formatBytes(connection.rxBytes)} / ${connection.rxMessages} msgs`],
    ["TX", `${formatBytes(connection.txBytes)} / ${connection.txMessages} msgs`],
    ["Reconnects", `${connection.reconnectCount}`],
    ["Telemetry channels", `${channels}`],
    ["Dropped log entries", `${loggingManager.dropped}`],
    ["Session recording", loggingManager.recording ? "on" : "off"],
    ["Storage used", formatBytes(storage.usage)],
  ];

  return (
    <div className="space-y-2.5">
      {rows.map(([name, value]) => (
        <div key={name} className="flex items-center justify-between">
          <span className="text-sm text-white/90">{name}</span>
          <span className="text-xs font-mono text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

function CapabilityRow({  name,
  supported,
}: {
  name: string;
  supported: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/90">{name}</span>
      <span
        className={`text-[11px] font-semibold ${
          supported ? "text-green-400" : "text-red-400"
        }`}
      >
        {supported ? "Supported" : "Not Available"}
      </span>
    </div>
  );
}
