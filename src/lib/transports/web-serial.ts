import { BaseTransport } from "./base";
import type { TransportInfo, ConnectOptions } from "./types";
import {
  isWebSerialSupported,
  requestSerialPort,
  openSerialPort,
  formatPortLabel,
  portId,
  type SerialPortLike,
} from "@/lib/serial/ports";

/**
 * Web Serial transport (USB CDC, UART adapters, and OS-exposed
 * Bluetooth Classic virtual COM ports such as HC-05).
 */
export class WebSerialTransport extends BaseTransport {
  readonly type = "serial" as const;

  private _port: SerialPortLike | null = null;
  private _reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private _readLoopActive = false;
  private _label = "Serial Port";
  private _portId = "serial:unknown";
  private _baudRate = 115200;

  async connect(options?: ConnectOptions): Promise<void> {
    if (!isWebSerialSupported()) {
      throw new Error(
        "Web Serial is not supported by this browser. Use Chrome or Edge on desktop.",
      );
    }
    if (this.isConnected()) return;

    this.setState("requesting");
    const port = await requestSerialPort();

    this.setState("connecting");
    const baudRate = options?.serialConfig?.baudRate ?? 115200;
    await openSerialPort(port, options?.serialConfig);

    this._port = port;
    this._label = formatPortLabel(port);
    this._portId = portId(port);
    this._baudRate = baudRate;

    this.setState("connected");
    void this._readLoop();
  }

  async disconnect(): Promise<void> {
    this.setState("disconnecting");
    await this._cleanup();
    this.setState("disconnected");
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.isConnected() || !this._port?.writable) {
      throw new Error("Serial port is not connected.");
    }
    const writer = this._port.writable.getWriter();
    try {
      await writer.write(data);
    } catch (error) {
      throw new Error(
        `Serial write failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    } finally {
      writer.releaseLock();
    }
  }

  getInfo(): TransportInfo {
    return {
      id: this._portId,
      name: this._label,
      type: "serial",
      connected: this.isConnected(),
      metadata: { baudRate: this._baudRate },
    };
  }

  destroy(): void {
    void this._cleanup();
    super.destroy();
  }

  // --- Private ---

  private async _readLoop(): Promise<void> {
    if (!this._port?.readable) {
      this.setState("error");
      return;
    }

    this._readLoopActive = true;
    this._reader = this._port.readable.getReader();

    try {
      for (;;) {
        const { value, done } = await this._reader.read();
        if (done) break;
        if (value && value.length > 0) {
          // Copy the underlying buffer may be reused by the stream
          this.emitData(new Uint8Array(value));
        }
        if (!this._readLoopActive) break;
      }
    } catch {
      // Device disconnected unexpectedly (common on USB unplug)
      if (this._readLoopActive) {
        this.setState("error");
        await this._cleanup();
        this.setState("disconnected");
      }
    } finally {
      try {
        this._reader?.releaseLock();
      } catch {
        // Already released
      }
      this._reader = null;
      this._readLoopActive = false;
    }
  }

  private async _cleanup(): Promise<void> {
    this._readLoopActive = false;
    try {
      await this._reader?.cancel();
    } catch {
      // Reader already closed
    }
    this._reader = null;
    if (this._port) {
      try {
        await this._port.close();
      } catch {
        // Port already closed
      }
      this._port = null;
    }
  }
}
