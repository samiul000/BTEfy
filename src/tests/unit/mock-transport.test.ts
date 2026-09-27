import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockTransport } from "@/lib/transports/mock";

describe("MockTransport", () => {
  let transport: MockTransport;

  beforeEach(() => {
    transport = new MockTransport();
  });

  afterEach(() => {
    transport.destroy();
  });

  it("starts disconnected", () => {
    expect(transport.isConnected()).toBe(false);
    expect(transport.getState()).toBe("disconnected");
  });

  it("connects successfully", async () => {
    await transport.connect();
    expect(transport.isConnected()).toBe(true);
    expect(transport.getState()).toBe("connected");
  });

  it("disconnects successfully", async () => {
    await transport.connect();
    await transport.disconnect();
    expect(transport.isConnected()).toBe(false);
    expect(transport.getState()).toBe("disconnected");
  });

  it("emits data after connection", async () => {
    const dataListener = vi.fn();
    transport.onData(dataListener);

    await transport.connect();

    // Wait for data generation (normal mode is 1000ms)
    await new Promise((r) => setTimeout(r, 1100));

    expect(dataListener).toHaveBeenCalled();
    const lastCall = dataListener.mock.calls[dataListener.mock.calls.length - 1];
    expect(lastCall[0]).toBeDefined();
    expect(lastCall[0].length).toBeGreaterThan(0);
  });

  it("echoes sent data", async () => {
    const dataListener = vi.fn();
    transport.onData(dataListener);
    await transport.connect();

    const sent = new TextEncoder().encode("PING\n");
    await transport.send(sent);

    // Wait a tick for the echo
    await new Promise((r) => setTimeout(r, 50));

    expect(dataListener).toHaveBeenCalled();
    const lastCall = dataListener.mock.calls[dataListener.mock.calls.length - 1];
    const response = new TextDecoder().decode(lastCall[0]);
    expect(response).toContain("PONG");
  });

  it("throws on send when disconnected", async () => {
    const sent = new TextEncoder().encode("test");
    await expect(transport.send(sent)).rejects.toThrow("not connected");
  });

  it("returns correct info", () => {
    const info = transport.getInfo();
    expect(info.type).toBe("mock");
    expect(info.name).toBe("Mock MCU Device");
    expect(info.id).toBe("mock-device-001");
  });

  it("simulates disconnect", async () => {
    await transport.connect();
    expect(transport.isConnected()).toBe(true);

    transport.simulateDisconnect();

    // Should transition to error then disconnected
    await new Promise((r) => setTimeout(r, 1500));
    expect(transport.getState()).toBe("disconnected");
  });

  it("cleans up listeners on destroy", async () => {
    const listener = vi.fn();
    transport.onData(listener);
    transport.onStateChange(listener);

    transport.destroy();

    // Should not throw after destroy
    expect(transport.isConnected()).toBe(false);
  });
});
