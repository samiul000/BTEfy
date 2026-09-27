/** Transport type discriminator */
export type TransportType = "ble" | "serial" | "mock";

/** Connection state machine */
export type ConnectionState =
  | "disconnected"
  | "requesting"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "reconnecting"
  | "error";

/** Transport metadata */
export interface TransportInfo {
  readonly id: string;
  readonly name: string;
  readonly type: TransportType;
  readonly address?: string;
  readonly rssi?: number;
  readonly manufacturer?: string;
  readonly connected: boolean;
  readonly metadata?: Record<string, unknown>;
}

/** Data callback */
export type DataCallback = (data: Uint8Array) => void;

/** State change callback */
export type StateCallback = (state: ConnectionState) => void;

/** Unsubscribe function */
export type Unsubscribe = () => void;

/** Connect options */
export interface ConnectOptions {
  /** BLE service UUID override */
  serviceUuid?: string;
  /** BLE write characteristic UUID */
  writeCharacteristicUuid?: string;
  /** BLE notify characteristic UUID */
  notifyCharacteristicUuid?: string;
  /** Serial port configuration */
  serialConfig?: SerialConfig;
  /** Line ending for TX */
  lineEnding?: LineEnding;
  /** Write mode for BLE */
  writeMode?: "write" | "writeWithoutResponse";
}

/** Serial port configuration */
export interface SerialConfig {
  baudRate: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  bufferSize?: number;
  flowControl?: "none" | "hardware";
}

/** Line ending type */
export type LineEnding = "none" | "lf" | "cr" | "crlf";

/** Common baud rates */
export const COMMON_BAUD_RATES = [
  9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600,
] as const;

/** Transport interface */
export interface Transport {
  readonly type: TransportType;

  /** Connect to device */
  connect(options?: ConnectOptions): Promise<void>;

  /** Disconnect from device */
  disconnect(): Promise<void>;

  /** Send data */
  send(data: Uint8Array): Promise<void>;

  /** Check if connected */
  isConnected(): boolean;

  /** Get transport info */
  getInfo(): TransportInfo;

  /** Subscribe to incoming data */
  onData(callback: DataCallback): Unsubscribe;

  /** Subscribe to connection state changes */
  onStateChange(callback: StateCallback): Unsubscribe;

  /** Cleanup resources */
  destroy(): void;
}
