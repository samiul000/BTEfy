import type {
  Transport,
  TransportType,
  TransportInfo,
  ConnectionState,
  ConnectOptions,
  DataCallback,
  StateCallback,
  Unsubscribe,
} from "./types";

/** Base transport with event management */
export abstract class BaseTransport implements Transport {
  abstract readonly type: TransportType;

  protected _connected = false;
  protected _state: ConnectionState = "disconnected";
  private _dataListeners = new Set<DataCallback>();
  private _stateListeners = new Set<StateCallback>();

  abstract connect(options?: ConnectOptions): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(data: Uint8Array): Promise<void>;
  abstract getInfo(): TransportInfo;

  isConnected(): boolean {
    return this._connected;
  }

  onData(callback: DataCallback): Unsubscribe {
    this._dataListeners.add(callback);
    return () => {
      this._dataListeners.delete(callback);
    };
  }

  onStateChange(callback: StateCallback): Unsubscribe {
    this._stateListeners.add(callback);
    return () => {
      this._stateListeners.delete(callback);
    };
  }

  destroy(): void {
    this._dataListeners.clear();
    this._stateListeners.clear();
  }

  /** Emit data to all listeners */
  protected emitData(data: Uint8Array): void {
    for (const listener of this._dataListeners) {
      try {
        listener(data);
      } catch {
        // Swallow listener errors to protect transport loop
      }
    }
  }

  /** Update state and notify listeners */
  protected setState(state: ConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    this._connected = state === "connected";
    for (const listener of this._stateListeners) {
      try {
        listener(state);
      } catch {
        // Swallow listener errors
      }
    }
  }

  /** Get current state */
  getState(): ConnectionState {
    return this._state;
  }
}
