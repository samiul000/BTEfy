import type { SerialConfig } from "@/lib/transports/types";
import { COMMON_BAUD_RATES } from "@/lib/transports/types";

/** Default serial port configuration */
export const DEFAULT_SERIAL_CONFIG: Required<SerialConfig> = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 255,
  flowControl: "none",
};

/** Merge user config over defaults */
export function resolveSerialConfig(
  config?: SerialConfig,
): Required<SerialConfig> {
  return { ...DEFAULT_SERIAL_CONFIG, ...config };
}

/** Validate a serial configuration; returns error message or null if valid */
export function validateSerialConfig(config: SerialConfig): string | null {
  if (!Number.isInteger(config.baudRate) || config.baudRate <= 0) {
    return "Baud rate must be a positive integer.";
  }
  if (
    config.dataBits !== undefined &&
    ![5, 6, 7, 8].includes(config.dataBits)
  ) {
    return "Data bits must be 5, 6, 7, or 8.";
  }
  if (config.stopBits !== undefined && ![1, 2].includes(config.stopBits)) {
    return "Stop bits must be 1 or 2.";
  }
  if (
    config.parity !== undefined &&
    !["none", "even", "odd"].includes(config.parity)
  ) {
    return "Parity must be none, even, or odd.";
  }
  if (
    config.flowControl !== undefined &&
    !["none", "hardware"].includes(config.flowControl)
  ) {
    return "Flow control must be none or hardware.";
  }
  return null;
}

/** Check if a baud rate is in the common list */
export function isCommonBaudRate(baudRate: number): boolean {
  return (COMMON_BAUD_RATES as readonly number[]).includes(baudRate);
}
