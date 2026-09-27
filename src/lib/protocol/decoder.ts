import { bytesToText, bytesToHex, bytesToHexAscii } from "@/lib/utils/bytes";

/* Terminal display modes */
export type DisplayMode = "text" | "hex" | "hex-ascii";

/* Decoded message (raw bytes always preserved) */
export interface DecodedMessage {
  raw: Uint8Array;
  text: string;
  display: string;
  timestamp: number;
}

/**
 * Decode raw bytes to a displayable message.
 * Malformed UTF-8 never crashes, replacement chars are used.
 */
export function decodeMessage(
  raw: Uint8Array,
  mode: DisplayMode = "text",
): DecodedMessage {
  const text = bytesToText(raw);
  let display: string;
  switch (mode) {
    case "hex":
      display = bytesToHex(raw);
      break;
    case "hex-ascii":
      display = bytesToHexAscii(raw);
      break;
    case "text":
    default:
      display = text;
      break;
  }
  return { raw, text, display, timestamp: Date.now() };
}

/** Format a log timestamp: [HH:MM:SS.mmm] */
export function formatLogTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}]`;
}
