import { describe, it, expect } from "vitest";
import { parseLine, parseLines } from "@/lib/protocol/parser";

describe("parseLine", () => {
  it("parses KEY=VALUE format", () => {
    const result = parseLine("TEMP=25.4,VOLT=11.82,CURR=1.25");
    expect(result.format).toBe("key-value");
    expect(result.points).toHaveLength(3);
    expect(result.points[0]).toEqual({ id: "TEMP", value: 25.4 });
    expect(result.points[1]).toEqual({ id: "VOLT", value: 11.82 });
    expect(result.points[2]).toEqual({ id: "CURR", value: 1.25 });
  });

  it("parses KEY:VALUE format", () => {
    const result = parseLine("TEMP:25.4,VOLT:11.82");
    expect(result.format).toBe("key-value");
    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({ id: "TEMP", value: 25.4 });
  });

  it("parses JSON format", () => {
    const result = parseLine('{"temp":25.4,"voltage":11.82}');
    expect(result.format).toBe("json");
    expect(result.points).toHaveLength(2);
    expect(result.points[0]).toEqual({ id: "TEMP", value: 25.4 });
    expect(result.points[1]).toEqual({ id: "VOLTAGE", value: 11.82 });
  });

  it("handles empty input", () => {
    const result = parseLine("");
    expect(result.format).toBe("unknown");
    expect(result.points).toHaveLength(0);
  });

  it("handles malformed JSON", () => {
    const result = parseLine("{invalid json}");
    expect(result.format).toBe("unknown");
    expect(result.points).toHaveLength(0);
  });

  it("handles missing values in KEY=VALUE", () => {
    const result = parseLine("TEMP=,VOLT=11.8");
    expect(result.points).toHaveLength(1);
    expect(result.points[0]).toEqual({ id: "VOLT", value: 11.8 });
  });

  it("ignores non-numeric values", () => {
    const result = parseLine("STATUS=ok,TEMP=25.4");
    expect(result.points).toHaveLength(1);
    expect(result.points[0]).toEqual({ id: "TEMP", value: 25.4 });
  });
});

describe("parseLines", () => {
  it("parses multiple lines", () => {
    const results = parseLines("TEMP=25.4\nVOLT=11.8\nCURR=1.2");
    expect(results).toHaveLength(3);
    expect(results[0].points[0].id).toBe("TEMP");
    expect(results[1].points[0].id).toBe("VOLT");
    expect(results[2].points[0].id).toBe("CURR");
  });

  it("filters empty lines", () => {
    const results = parseLines("TEMP=25.4\n\n\nVOLT=11.8");
    expect(results).toHaveLength(2);
  });
});
