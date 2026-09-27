import { BaseTransport } from "./base";
import type {
  TransportInfo,
  ConnectOptions,
} from "./types";

/** Mock transport modes */
export type MockMode = "normal" | "highrate" | "fault" | "disconnect";

/** Mock transport configuration */
export interface MockConfig {
  /** Data generation interval in ms */
  interval: number;
  /** Mode */
  mode: MockMode;
  /** Simulated latency in ms */
  latency: number;
}

const DEFAULT_CONFIG: MockConfig = {
  interval: 1000,
  mode: "normal",
  latency: 0,
};

const MOCK_DEVICE_ID = "mock-device-001";
const MOCK_DEVICE_NAME = "Mock MCU Device";

/** Mock transport for development and testing */
export class MockTransport extends BaseTransport {
  readonly type = "mock" as const;

  private _interval: ReturnType<typeof setInterval> | null = null;
  private _config: MockConfig = { ...DEFAULT_CONFIG };
  private _sequence = 0;

  async connect(_options?: ConnectOptions): Promise<void> {
    this.setState("connecting");

    // Simulate connection delay
    await this._delay(500);

    if (this._config.latency > 0) {
      await this._delay(this._config.latency);
    }

    this.setState("connected");
    this._startDataGeneration();
  }

  async disconnect(): Promise<void> {
    this.setState("disconnecting");
    this._stopDataGeneration();

    await this._delay(200);
    this.setState("disconnected");
  }

  async send(data: Uint8Array): Promise<void> {
    if (!this.isConnected()) {
      throw new Error("Mock transport not connected");
    }

    // Echo back what was sent (simulating device response)
    const text = new TextDecoder().decode(data);
    const response = this._generateEcho(text);
    const encoded = new TextEncoder().encode(response);

    if (this._config.latency > 0) {
      await this._delay(this._config.latency);
    }

    this.emitData(encoded);
  }

  getInfo(): TransportInfo {
    return {
      id: MOCK_DEVICE_ID,
      name: MOCK_DEVICE_NAME,
      type: "mock",
      address: "00:00:00:00:00:00",
      manufacturer: "BTEfy Mock",
      connected: this.isConnected(),
      metadata: {
        mode: this._config.mode,
        interval: this._config.interval,
      },
    };
  }

  /** Configure mock behavior */
  configure(config: Partial<MockConfig>): void {
    this._config = { ...this._config, ...config };
    if (this.isConnected()) {
      this._stopDataGeneration();
      this._startDataGeneration();
    }
  }

  /** Get current config */
  getConfig(): MockConfig {
    return { ...this._config };
  }

  /** Force a disconnect event (for testing) */
  simulateDisconnect(): void {
    if (this.isConnected()) {
      this._stopDataGeneration();
      this.setState("error");
      setTimeout(() => {
        this.setState("disconnected");
      }, 1000);
    }
  }

  /** Force a reconnect event (for testing) */
  async simulateReconnect(): Promise<void> {
    if (!this.isConnected()) {
      this.setState("reconnecting");
      await this._delay(1000);
      this.setState("connected");
      this._startDataGeneration();
    }
  }

  destroy(): void {
    this._stopDataGeneration();
    super.destroy();
  }

  // --- Private ---

  private _startDataGeneration(): void {
    this._stopDataGeneration();

    if (this._config.mode === "highrate") {
      // High rate: 100Hz
      this._interval = setInterval(() => {
        this._emitTelemetry();
      }, 10);
    } else if (this._config.mode === "fault") {
      // Fault mode: mix of valid and malformed data
      this._interval = setInterval(() => {
        this._emitFaultData();
      }, this._config.interval);
    } else {
      // Normal mode
      this._interval = setInterval(() => {
        this._emitTelemetry();
      }, this._config.interval);
    }
  }

  private _stopDataGeneration(): void {
    if (this._interval !== null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  private _emitTelemetry(): void {
    this._sequence++;
    const temp = (25 + Math.sin(this._sequence * 0.1) * 5).toFixed(1);
    const volt = (11.8 + Math.sin(this._sequence * 0.05) * 0.5).toFixed(2);
    const curr = (1.2 + Math.sin(this._sequence * 0.08) * 0.3).toFixed(2);
    const rpm = Math.floor(1400 + Math.sin(this._sequence * 0.15) * 200);

    const line = `TEMP=${temp},VOLT=${volt},CURR=${curr},RPM=${rpm}\n`;
    const encoded = new TextEncoder().encode(line);
    this.emitData(encoded);
  }

  private _emitFaultData(): void {
    const faults = [
      // Malformed UTF-8
      () => new Uint8Array([0xff, 0xfe, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x0a]),
      // Incomplete line (no newline)
      () => new TextEncoder().encode("TEMP=25.0,VOLT=11.8"),
      // Invalid JSON
      () => new TextEncoder().encode('{"temp":25.0,"voltage":}\n'),
      // Missing values
      () => new TextEncoder().encode("TEMP=,VOLT=,CURR=1.2\n"),
      // Large message
      () => new TextEncoder().encode("DATA=" + "A".repeat(1000) + "\n"),
      // Normal data
      () => {
        this._sequence++;
        const temp = (25 + Math.random() * 5).toFixed(1);
        return new TextEncoder().encode(`TEMP=${temp}\n`);
      },
    ];

    const faultFn = faults[Math.floor(Math.random() * faults.length)];
    const data = faultFn();
    this.emitData(data);
  }

  private _generateEcho(input: string): string {
    const trimmed = input.trim();
    if (trimmed === "PING") return "PONG\n";
    if (trimmed === "STATUS") return "STATUS=OK,UPTIME=" + this._sequence + "\n";
    if (trimmed === "VERSION") return "VERSION=1.0.0-mock\n";
    return "ECHO:" + trimmed + "\n";
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
