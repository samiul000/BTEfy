import type {
  Transport,
  TransportType,
  ConnectionState,
  ConnectOptions,
  DataCallback,
  StateCallback,
  Unsubscribe,
} from "./types";
import { MockTransport } from "./mock";
import { WebSerialTransport } from "./web-serial";
import { WebBluetoothTransport } from "./web-bluetooth";

/** Reconnection configuration */
export interface ReconnectConfig {
  enabled: boolean;
  maxAttempts: number;
  retryDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RECONNECT: ReconnectConfig = {
  enabled: true,
  maxAttempts: 5,
  retryDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/** Central transport manager single source of truth for connection state */
export class TransportManager {
  private _transport: Transport | null = null;
  private _state: ConnectionState = "disconnected";
  private _reconnectConfig: ReconnectConfig = { ...DEFAULT_RECONNECT };
  private _reconnectAttempts = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastOptions: ConnectOptions | undefined;
  private _listeners = new Set<StateCallback>();
  private _dataForwarders = new Set<DataCallback>();

  /** Currently active transport */
  get transport(): Transport | null {
    return this._transport;
  }

  /** Current connection state */
  get state(): ConnectionState {
    return this._state;
  }

  /** Whether currently connected */
  get isConnected(): boolean {
    return this._state === "connected";
  }

  /** Reconnect configuration */
  get reconnectConfig(): ReconnectConfig {
    return { ...this._reconnectConfig };
  }

  /** Create a transport by type */
  createTransport(type: TransportType): Transport {
    // Destroy existing transport if any
    if (this._transport) {
      this._transport.destroy();
    }

    switch (type) {
      case "mock":
        this._transport = new MockTransport();
        break;
      case "ble":
        this._transport = new WebBluetoothTransport();
        break;
      case "serial":
        this._transport = new WebSerialTransport();
        break;
      default:
        throw new Error(`Unknown transport type: ${type}`);
    }

    // Wire up state forwarding
    this._transport.onStateChange((state) => {
      this._setState(state);
    });

    // Wire up data forwarding
    this._transport.onData((data) => {
      for (const forwarder of this._dataForwarders) {
        try {
          forwarder(data);
        } catch {
          // Protect transport loop
        }
      }
    });

    return this._transport;
  }

  /** Connect using current transport */
  async connect(options?: ConnectOptions): Promise<void> {
    if (!this._transport) {
      throw new Error("No transport created. Call createTransport first.");
    }

    if (this._transport.isConnected()) {
      return;
    }

    this._lastOptions = options;
    this._reconnectAttempts = 0;

    try {
      await this._transport.connect(options);
    } catch (error) {
      // User-cancelled device pickers must not trigger reconnect loops
      const message = error instanceof Error ? error.message : "";
      if (
        /no .* selected|permission was denied|not supported by this browser/i.test(
          message,
        )
      ) {
        this._setState("disconnected");
        throw error;
      }
      this._setState("error");
      this._attemptReconnect();
      throw error;
    }
  }

  /** Disconnect from current transport */
  async disconnect(): Promise<void> {
    this._cancelReconnect();

    if (!this._transport) {
      return;
    }

    try {
      await this._transport.disconnect();
    } catch {
      // Force state to disconnected even if transport errors
      this._setState("disconnected");
    }
  }

  /** Send data through current transport */
  async send(data: Uint8Array): Promise<void> {
    if (!this._transport || !this._transport.isConnected()) {
      throw new Error("Not connected");
    }
    await this._transport.send(data);
  }

  /** Subscribe to state changes */
  onStateChange(callback: StateCallback): Unsubscribe {
    this._listeners.add(callback);
    return () => {
      this._listeners.delete(callback);
    };
  }

  /** Subscribe to data */
  onData(callback: DataCallback): Unsubscribe {
    this._dataForwarders.add(callback);
    return () => {
      this._dataForwarders.delete(callback);
    };
  }

  /** Update reconnect configuration */
  setReconnectConfig(config: Partial<ReconnectConfig>): void {
    this._reconnectConfig = { ...this._reconnectConfig, ...config };
  }

  /** Cleanup */
  destroy(): void {
    this._cancelReconnect();
    this._transport?.destroy();
    this._transport = null;
    this._listeners.clear();
    this._dataForwarders.clear();
  }

  // --- Private ---

  private _setState(state: ConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    for (const listener of this._listeners) {
      try {
        listener(state);
      } catch {
        // Protect manager
      }
    }
  }

  private _attemptReconnect(): void {
    if (!this._reconnectConfig.enabled) return;
    if (this._reconnectAttempts >= this._reconnectConfig.maxAttempts) return;

    this._reconnectAttempts++;
    const delay = Math.min(
      this._reconnectConfig.retryDelay *
        Math.pow(
          this._reconnectConfig.backoffMultiplier,
          this._reconnectAttempts - 1,
        ),
      this._reconnectConfig.maxDelay,
    );

    this._setState("reconnecting");

    this._reconnectTimer = setTimeout(async () => {
      if (!this._transport || !this._lastOptions) return;

      try {
        await this._transport.connect(this._lastOptions);
        this._reconnectAttempts = 0;
      } catch {
        this._attemptReconnect();
      }
    }, delay);
  }

  private _cancelReconnect(): void {
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectAttempts = 0;
  }
}
