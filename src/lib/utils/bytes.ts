/**
 * Convert Uint8Array to hex string.
 * Example: [0x48, 0x65] -> "48 65"
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

/**
 * Convert Uint8Array to hex+ASCII string.
 * Example: [0x48, 0x65, 0x0A] -> "48 65 0A    He."
 */
export function bytesToHexAscii(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

  const ascii = Array.from(bytes)
    .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
    .join("");

  return `${hex}    ${ascii}`;
}

/**
 * Convert Uint8Array to UTF-8 string with error handling.
 * Malformed sequences use replacement character.
 */
export function bytesToText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("latin1").decode(bytes);
  }
}

/**
 * Convert string to Uint8Array.
 */
export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Apply line ending to a string.
 */
export function applyLineEnding(text: string, ending: "none" | "lf" | "cr" | "crlf"): string {
  switch (ending) {
    case "lf":
      return text + "\n";
    case "cr":
      return text + "\r";
    case "crlf":
      return text + "\r\n";
    case "none":
    default:
      return text;
  }
}

/**
 * Format byte count to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format bytes per second to human-readable string.
 */
export function formatRate(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + "/s";
}

/**
 * Format duration in milliseconds to HH:MM:SS.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

/**
 * Validate UUID format (case-insensitive).
 */
export function isValidUuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Detect if data contains mostly printable ASCII.
 */
export function isPrintableAscii(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return true;
  let printable = 0;
  for (const b of bytes) {
    if (b >= 0x20 && b <= 0x7e) printable++;
  }
  return printable / bytes.length > 0.8;
}
