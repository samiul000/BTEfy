/** Parsed telemetry point */
export interface TelemetryPoint {
  id: string;
  value: number;
  unit?: string;
  name?: string;
}

/** Parse result */
export interface ParseResult {
  points: TelemetryPoint[];
  raw: string;
  format: "key-value" | "json" | "unknown";
}

/**
 * Parse KEY=VALUE telemetry format.
 * Example: TEMP=25.4,VOLT=11.82,CURR=1.25
 */
function parseKeyValue(line: string): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const pairs = line.split(",");

  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;

    const key = pair.substring(0, eqIndex).trim();
    const valueStr = pair.substring(eqIndex + 1).trim();
    const value = parseFloat(valueStr);

    if (key && !isNaN(value)) {
      points.push({ id: key.toUpperCase(), value });
    }
  }

  return points;
}

/**
 * Parse KEY:VALUE telemetry format.
 * Example: TEMP:25.4,VOLT:11.82
 */
function parseKeyValueColon(line: string): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const pairs = line.split(",");

  for (const pair of pairs) {
    const colonIndex = pair.indexOf(":");
    if (colonIndex === -1) continue;

    const key = pair.substring(0, colonIndex).trim();
    const valueStr = pair.substring(colonIndex + 1).trim();
    const value = parseFloat(valueStr);

    if (key && !isNaN(value)) {
      points.push({ id: key.toUpperCase(), value });
    }
  }

  return points;
}

/**
 * Parse JSON telemetry (flat numeric fields).
 * Example: {"temp":25.4,"voltage":11.82}
 */
function parseJson(line: string): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];

  try {
    const obj = JSON.parse(line);
    if (typeof obj !== "object" || obj === null) return points;

    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === "number" && !isNaN(val)) {
        points.push({ id: key.toUpperCase(), value: val });
      }
    }
  } catch {}

  return points;
}

/**
 * Detect format and parse a single line of telemetry.
 */
export function parseLine(line: string): ParseResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { points: [], raw: trimmed, format: "unknown" };
  }

  // Try JSON first
  if (trimmed.startsWith("{")) {
    const points = parseJson(trimmed);
    if (points.length > 0) {
      return { points, raw: trimmed, format: "json" };
    }
  }

  // Try KEY=VALUE
  if (trimmed.includes("=")) {
    const points = parseKeyValue(trimmed);
    if (points.length > 0) {
      return { points, raw: trimmed, format: "key-value" };
    }
  }

  // Try KEY:VALUE
  if (trimmed.includes(":")) {
    const points = parseKeyValueColon(trimmed);
    if (points.length > 0) {
      return { points, raw: trimmed, format: "key-value" };
    }
  }

  return { points: [], raw: trimmed, format: "unknown" };
}

/**
 * Parse multiple lines (newline-delimited).
 */
export function parseLines(data: string): ParseResult[] {
  return data
    .split("\n")
    .filter((l) => l.trim())
    .map(parseLine);
}
