/**
 * Web Serial port helpers.
 * All browser access is feature-detected; never throws on unsupported browsers.
 * UI must call requestPort() from a user gesture (button click).
 */

import type { SerialConfig } from "@/lib/transports/types";
import { resolveSerialConfig } from "./configuration";

/** Minimal structural type for a serial port (avoids depending on TS DOM extras) */
export interface SerialPortLike {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptionsLike): Promise<void>;
  close(): Promise<void>;
  forget?(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

export interface SerialOptionsLike {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
  bufferSize?: number;
  flowControl?: string;
}

interface NavigatorWithSerial {
  serial?: {
    requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPortLike>;
    getPorts(): Promise<SerialPortLike[]>;
  };
}

function navigatorSerial(): NavigatorWithSerial["serial"] | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as unknown as NavigatorWithSerial).serial;
}

/** Whether Web Serial is available in this browser */
export function isWebSerialSupported(): boolean {
  return navigatorSerial() !== undefined;
}

/**
 * Prompt the user to select a serial port.
 * MUST be called from a user gesture. Rejects if the user cancels.
 */
export async function requestSerialPort(): Promise<SerialPortLike> {
  const serial = navigatorSerial();
  if (!serial) {
    throw new Error("Web Serial is not supported by this browser. Use Chrome or Edge on desktop.");
  }
  try {
    return await serial.requestPort();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      throw new Error("No serial port selected.");
    }
    throw error;
  }
}

/** List previously authorized ports (no prompt; may be empty) */
export async function listAuthorizedPorts(): Promise<SerialPortLike[]> {
  const serial = navigatorSerial();
  if (!serial) return [];
  try {
    return await serial.getPorts();
  } catch {
    return [];
  }
}

/** Open a port with the given configuration */
export async function openSerialPort(
  port: SerialPortLike,
  config?: SerialConfig,
): Promise<void> {
  const resolved = resolveSerialConfig(config);
  try {
    await port.open({
      baudRate: resolved.baudRate,
      dataBits: resolved.dataBits,
      stopBits: resolved.stopBits,
      parity: resolved.parity,
      bufferSize: resolved.bufferSize,
      flowControl: resolved.flowControl,
    });
  } catch (error) {
    throw new Error(
      `Unable to open serial port: ${error instanceof Error ? error.message : "port is already in use or unavailable."}`,
    );
  }
}

/** Human-readable label for a port (e.g. for favorites/recent lists) */
export function formatPortLabel(port: SerialPortLike): string {
  const info = port.getInfo();
  if (info.usbVendorId !== undefined) {
    const vid = info.usbVendorId.toString(16).padStart(4, "0");
    const pid = (info.usbProductId ?? 0).toString(16).padStart(4, "0");
    return `USB Serial (VID:${vid} PID:${pid})`;
  }
  return "Serial Port";
}

/** Stable id for a port for favorites/recent lists */
export function portId(port: SerialPortLike): string {
  const info = port.getInfo();
  return `serial:${info.usbVendorId ?? 0}:${info.usbProductId ?? 0}`;
}
