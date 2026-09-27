"use client";

/**
 * Central connection manager.
 * Single source of truth for connection state all UI observes the
 * Zustand connection store fed by this manager.
 *
 * Pipeline: Transport → raw chunks → LineFramer → terminal store
 * (+ telemetry engine + session logging), with stats flushed to the
 * store at UI cadence instead of per byte.
 */

import {
  TransportManager,
  type ReconnectConfig,
} from "@/lib/transports/manager";
import type {
  TransportType,
  ConnectOptions,
  LineEnding,
} from "@/lib/transports/types";
import { LineFramer } from "@/lib/protocol/framing";
import { bytesToText, textToBytes, applyLineEnding } from "@/lib/utils/bytes";
import { useConnectionStore } from "@/lib/state/connection-store";
import { useTerminalStore } from "@/lib/state/terminal-store";
import { useSettingsStore } from "@/lib/state/settings-store";
import { telemetryManager } from "./telemetry-manager";
import { sessionManager } from "./session-manager";
import { loggingManager } from "./logging-manager";
import { touchFavorite } from "@/lib/storage/profiles";

/** UI flush cadence (stats + telemetry mirror) */
const FLUSH_INTERVAL_MS = 100;

function lineEndingFor(override?: LineEnding): LineEnding {
  return override ?? useSettingsStore.getState().serial.lineEnding ?? "lf";
}

class ConnectionManager {
  private _transports = new TransportManager();
  private _framer = new LineFramer();
  private _flushTimer: ReturnType<typeof setInterval> | null = null;

  // Pending deltas flushed at UI cadence
  private _pendingRxBytes = 0;
  private _pendingTxBytes = 0;
  private _pendingRxMessages = 0;
  private _pendingTxMessages = 0;

  private _activeType: TransportType | null = null;
  private _profileId: string | null = null;

  get state() {
    return this._transports.state;
  }

  get activeType(): TransportType | null {
    return this._activeType;
  }

  /** Active transport instance (e.g. to configure MockTransport in tests/UI) */
  get transport() {
    return this._transports.transport;
  }

  /** Sync reconnect settings from the settings store */
  syncReconnectConfig(): void {
    const c = useSettingsStore.getState().connection;
    const cfg: Partial<ReconnectConfig> = {
      enabled: c.reconnectEnabled,
      maxAttempts: c.maxReconnectAttempts,
      retryDelay: c.retryDelay,
    };
    this._transports.setReconnectConfig(cfg);
  }

  /** Connect with any transport type (BLE/Serial prompt the user) */
  async connect(
    type: TransportType,
    options?: ConnectOptions & { profileId?: string },
  ): Promise<void> {
    const connection = useConnectionStore.getState();
    if (connection.isConnected) return;

    this.syncReconnectConfig();
    this._activeType = type;
    this._profileId = options?.profileId ?? null;
    this._framer = new LineFramer();

    const transport = this._transports.createTransport(type);

    transport.onStateChange((state) => {
      const store = useConnectionStore.getState();
      store.setState(state);
      if (state === "reconnecting") store.incrementReconnect();
      if (state === "connected") {
        const info = transport.getInfo();
        store.setDevice(info.name, info.id);
        void this._onConnected(info.name, info.id);
      }
      if (state === "disconnected" || state === "error") {
        void this._onDisconnected();
      }
    });

    this._transports.onData((data) => this._onData(data));

    connection.setTransportType(type);
    await this._transports.connect(options);
    this._startFlushLoop();
  }

  /** Disconnect and flush session/logging */
  async disconnect(): Promise<void> {
    await this._transports.disconnect();
    // _onDisconnected runs via state callback; ensure flush loop stops
    this._stopFlushLoop();
    this._flushStats();
    this._activeType = null;
  }

  /** Send raw bytes */
  async send(data: Uint8Array): Promise<void> {
    await this._transports.send(data);
    this._pendingTxBytes += data.length;
    this._pendingTxMessages += 1;
    loggingManager.append("tx", data);
    useTerminalStore.getState().addLine("tx", data, bytesToText(data));
  }

  /** Send text with the configured line ending */
  async sendText(text: string, lineEnding?: LineEnding): Promise<void> {
    const withEnding = applyLineEnding(text, lineEndingFor(lineEnding));
    const data = textToBytes(withEnding);
    await this.send(data);
    useTerminalStore.getState().addToHistory(text);
  }

  // --- Private ---

  private async _onConnected(name: string, id: string): Promise<void> {
    const store = useConnectionStore.getState();
    store.resetStats();
    this._pendingRxBytes = 0;
    this._pendingTxBytes = 0;
    this._pendingRxMessages = 0;
    this._pendingTxMessages = 0;
    telemetryManager.clear();
    try {
      const sessionId = await sessionManager.start({
        deviceName: name,
        deviceId: id,
        transport: this._activeType ?? "unknown",
        profileId: this._profileId,
      });
      loggingManager.start(sessionId);
      // Remember device (never keyed by display name alone)
      await touchFavorite({
        id,
        displayName: name,
        transport: this._activeType ?? "mock",
        profileId: this._profileId,
      });
    } catch {
      // Storage unavailable, live session continues without recording
    }
  }

  private async _onDisconnected(): Promise<void> {
    this._stopFlushLoop();
    this._flushStats();
    try {
      const storage = useSettingsStore.getState().storage;
      await loggingManager.stop();
      await sessionManager.stop(
        storage.maxSessions,
        storage.autoDeleteOldSessions,
      );
    } catch {
      // Disconnect flow must not fail on storage errors
    }
    this._activeType = null;
  }

  private _onData(data: Uint8Array): void {
    this._pendingRxBytes += data.length;
    loggingManager.append("rx", data);

    const terminal = useTerminalStore.getState();
    const lines = this._framer.push(data);
    this._pendingRxMessages += lines.length;

    const settings = useSettingsStore.getState();
    for (const line of lines) {
      terminal.addLine("rx", textToBytes(line), line);
      if (settings.telemetry.autoParsing) {
        telemetryManager.ingest(line);
      }
    }
  }

  private _startFlushLoop(): void {
    this._stopFlushLoop();
    this._flushTimer = setInterval(() => {
      this._flushStats();
      telemetryManager.syncToStore();
    }, FLUSH_INTERVAL_MS);
  }

  private _stopFlushLoop(): void {
    if (this._flushTimer !== null) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
  }

  private _flushStats(): void {
    if (
      this._pendingRxBytes === 0 &&
      this._pendingTxBytes === 0 &&
      this._pendingRxMessages === 0 &&
      this._pendingTxMessages === 0
    ) {
      return;
    }
    const store = useConnectionStore.getState();
    store.addRxBytes(this._pendingRxBytes);
    store.addTxBytes(this._pendingTxBytes);
    for (let i = 0; i < this._pendingRxMessages; i++)
      store.incrementRxMessages();
    for (let i = 0; i < this._pendingTxMessages; i++)
      store.incrementTxMessages();
    sessionManager.tally(
      this._pendingRxBytes,
      this._pendingTxBytes,
      this._pendingRxMessages,
      this._pendingTxMessages,
    );
    this._pendingRxBytes = 0;
    this._pendingTxBytes = 0;
    this._pendingRxMessages = 0;
    this._pendingTxMessages = 0;
  }
}

/** Singleton import and use directly from UI */
export const connectionManager = new ConnectionManager();
