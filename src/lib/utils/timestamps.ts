/**
 * Format a timestamp to HH:MM:SS.mmm
 */
export function formatTimestamp(date: Date): string {
  return [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
    date.getSeconds().toString().padStart(2, "0"),
  ].join(":") + "." + date.getMilliseconds().toString().padStart(3, "0");
}

/**
 * Format a timestamp to ISO date string for filenames.
 */
export function formatFileTimestamp(date: Date): string {
  return [
    date.getFullYear(),
    (date.getMonth() + 1).toString().padStart(2, "0"),
    date.getDate().toString().padStart(2, "0"),
  ].join("-") + "_" + [
    date.getHours().toString().padStart(2, "0"),
    date.getMinutes().toString().padStart(2, "0"),
    date.getSeconds().toString().padStart(2, "0"),
  ].join("-");
}

/**
 * Get monotonic timestamp for performance measurement.
 */
export function monotonicNow(): number {
  return performance.now();
}
