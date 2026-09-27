import type { SessionRecord, SessionLogRecord } from "@/lib/storage/database";
import { decodeBytes } from "@/lib/storage/sessions";
import { bytesToText } from "@/lib/utils/bytes";

/**
 * Local file export via Blob + object URL.
 * Nothing is uploaded anywhere.
 */

/** Trigger a browser download of text content */
export function downloadTextFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Professional session filename: mcu-bridge_<device>_<YYYY-MM-DD_HH-mm-ss>.<ext> */
export function sessionFilename(
  deviceName: string | null,
  startTime: number,
  ext: "txt" | "csv" | "json",
): string {
  const safe =
    (deviceName ?? "device")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "device";
  const d = new Date(startTime);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `mcu-bridge_${safe}_${stamp}.${ext}`;
}

export interface ExportableLog {
  timestamp: number;
  direction: "rx" | "tx";
  text: string;
}

export function toExportableLogs(logs: SessionLogRecord[]): ExportableLog[] {
  return logs.map((l) => {
    let text = l.text;
    try {
      if (!text) text = bytesToText(decodeBytes(l.data));
    } catch {
      text = "";
    }
    return { timestamp: l.timestamp, direction: l.direction, text };
  });
}

/** TXT export */
export function logsToTxt(
  session: SessionRecord,
  logs: ExportableLog[],
): string {
  const header = [
    `# BTEfy session export`,
    `# Device: ${session.deviceName ?? "unknown"} (${session.deviceId ?? "?"})`,
    `# Transport: ${session.transport}`,
    `# Start: ${new Date(session.startTime).toISOString()}`,
    `# RX: ${session.rxBytes} bytes / ${session.rxMessages} msgs, TX: ${session.txBytes} bytes / ${session.txMessages} msgs`,
    "",
  ].join("\n");
  const body = logs
    .map(
      (l) =>
        `[${new Date(l.timestamp).toISOString()}] ${l.direction.toUpperCase()} ${l.text}`,
    )
    .join("\n");
  return header + body + "\n";
}

/** CSV export */
export function logsToCsv(logs: ExportableLog[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = logs.map((l) =>
    [new Date(l.timestamp).toISOString(), l.direction, l.text]
      .map(esc)
      .join(","),
  );
  return `timestamp,direction,text\n${rows.join("\n")}\n`;
}

/** JSON export */
export function sessionToJson(
  session: SessionRecord,
  logs: ExportableLog[],
): string {
  return JSON.stringify({ session, logs }, null, 2);
}
