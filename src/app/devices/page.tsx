"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useConnectionStore } from "@/lib/state/connection-store";
import { useSettingsStore } from "@/lib/state/settings-store";
import { connectionManager } from "@/lib/services/connection-manager";
import { MockTransport } from "@/lib/transports/mock";
import { useBrowserCapabilities } from "@/lib/utils/browser-support";
import { NORDIC_UART } from "@/lib/bluetooth/profiles";
import { useState } from "react";
import { Bluetooth, Usb, Zap } from "lucide-react";

export default function DevicesPage() {
  const connection = useConnectionStore();
  const settings = useSettingsStore();
  const [mockMode, setMockMode] = useState<"normal" | "highrate" | "fault">(
    "normal",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capabilities = useBrowserCapabilities();
  const bleSupported = capabilities?.webBluetooth ?? false;
  const serialSupported = capabilities?.webSerial ?? false;

  const runConnect = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleConnectMock = () =>
    runConnect(async () => {
      await connectionManager.connect("mock");
      const transport = connectionManager.transport;
      if (transport instanceof MockTransport) {
        transport.configure({
          mode:
            mockMode === "highrate"
              ? "highrate"
              : mockMode === "fault"
                ? "fault"
                : "normal",
          interval: mockMode === "highrate" ? 10 : 1000,
        });
      }
    });

  const handleConnectBle = () =>
    runConnect(async () => {
      // Nordic UART by default; custom profiles via connection profiles
      await connectionManager.connect("ble", {
        serviceUuid: NORDIC_UART.serviceUuid,
        writeCharacteristicUuid: NORDIC_UART.writeCharacteristicUuid,
        notifyCharacteristicUuid: NORDIC_UART.notifyCharacteristicUuid,
        writeMode: NORDIC_UART.writeMode,
      });
    });

  const handleConnectSerial = () =>
    runConnect(async () => {
      const s = settings.serial;
      await connectionManager.connect("serial", {
        serialConfig: {
          baudRate: s.baudRate,
          dataBits: s.dataBits,
          stopBits: s.stopBits,
          parity: s.parity,
          flowControl: s.flowControl,
        },
        lineEnding: s.lineEnding,
      });
    });

  const handleDisconnect = () =>
    runConnect(() => connectionManager.disconnect());

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Devices
          </h1>
          <p className="text-sm text-white/90">
            Connect to hardware devices or mock simulator
          </p>
        </div>

        {/* Connection Status */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${
                  connection.isConnected
                    ? "bg-status-connected shadow-lg shadow-green-500/40"
                    : connection.state === "error"
                      ? "bg-status-error"
                      : connection.state === "reconnecting" ||
                          connection.state === "connecting" ||
                          connection.state === "requesting"
                        ? "bg-status-reconnecting animate-pulse"
                        : "bg-status-disconnected"
                }`}
              />
              <div>
                <p className="text-sm font-semibold capitalize text-white">
                  {connection.state}
                </p>
                {connection.deviceName && (
                  <p className="text-xs text-white/90">
                    {connection.deviceName} · {connection.transportType}
                  </p>
                )}
              </div>
            </div>
            {connection.isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={busy}
                className="glass-btn-destructive rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
              >
                Disconnect
              </button>
            )}
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Mock Device */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-3 flex items-center gap-2">
            <Zap size={16} className="text-sky-400" />
            Mock Simulator
          </h2>
          <p className="text-sm text-white/90 mb-4">
            Test the application without hardware. The mock device generates
            simulated telemetry data.
          </p>
          <div className="flex items-center gap-3">
            <select
              value={mockMode}
              onChange={(e) =>
                setMockMode(e.target.value as "normal" | "highrate" | "fault")
              }
              className="glass-input rounded-xl px-4 py-2.5 text-sm"
              disabled={connection.isConnected || busy}
            >
              <option value="normal">Normal (1 Hz)</option>
              <option value="highrate">High Rate (100 Hz)</option>
              <option value="fault">Fault Injection</option>
            </select>
            <button
              onClick={handleConnectMock}
              disabled={connection.isConnected || busy}
              className="glass-btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
            >
              Connect Mock
            </button>
          </div>
        </div>

        {/* Hardware Transports */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-4">
            Hardware Transports
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="glass-subtle rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-sky-400 mt-0.5">
                  <Bluetooth size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    Web Bluetooth
                  </p>
                  <p className="text-xs text-white/90 mt-0.5">
                    BLE UART devices (ESP32, Nordic).
                  </p>
                  <button
                    onClick={handleConnectBle}
                    disabled={connection.isConnected || busy || !bleSupported}
                    className="glass-btn-primary mt-3 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    {bleSupported ? "Select BLE Device" : "Not Supported Here"}
                  </button>
                </div>
              </div>
            </div>
            <div className="glass-subtle rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-sky-400 mt-0.5">
                  <Usb size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Web Serial</p>
                  <p className="text-xs text-white/90 mt-0.5">
                    USB serial (Arduino, STM32, RP2040) or Bluetooth Classic
                    virtual COM ports such as HC-05, at{" "}
                    {settings.serial.baudRate} baud.
                  </p>
                  <button
                    onClick={handleConnectSerial}
                    disabled={
                      connection.isConnected || busy || !serialSupported
                    }
                    className="glass-btn-primary mt-3 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    {serialSupported
                      ? "Select Serial Device"
                      : "Not Supported Here"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
