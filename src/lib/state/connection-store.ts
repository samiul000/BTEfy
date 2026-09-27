"use client";

import { create } from "zustand";
import type { TransportType, ConnectionState } from "@/lib/transports/types";

interface ConnectionStateStore {
  /** Current connection state */
  state: ConnectionState;
  /** Active transport type */
  transportType: TransportType | null;
  /** Device name */
  deviceName: string | null;
  /** Device id */
  deviceId: string | null;
  /** RX byte count */
  rxBytes: number;
  /** TX byte count */
  txBytes: number;
  /** RX message count */
  rxMessages: number;
  /** TX message count */
  txMessages: number;
  /** Session start time */
  sessionStart: number | null;
  /** Reconnect count */
  reconnectCount: number;
  /** Convenience: is currently connected */
  isConnected: boolean;

  // Actions
  setState: (state: ConnectionState) => void;
  setTransportType: (type: TransportType | null) => void;
  setDevice: (name: string | null, id: string | null) => void;
  addRxBytes: (bytes: number) => void;
  addTxBytes: (bytes: number) => void;
  incrementRxMessages: () => void;
  incrementTxMessages: () => void;
  incrementReconnect: () => void;
  resetStats: () => void;
}

export const useConnectionStore = create<ConnectionStateStore>((set) => ({
  state: "disconnected",
  transportType: null,
  deviceName: null,
  deviceId: null,
  rxBytes: 0,
  txBytes: 0,
  rxMessages: 0,
  txMessages: 0,
  sessionStart: null,
  reconnectCount: 0,
  isConnected: false,

  setState: (state) =>
    set({
      state,
      isConnected: state === "connected",
      sessionStart: state === "connected" ? Date.now() : null,
    }),

  setTransportType: (type) => set({ transportType: type }),

  setDevice: (name, id) => set({ deviceName: name, deviceId: id }),

  addRxBytes: (bytes) => set((s) => ({ rxBytes: s.rxBytes + bytes })),

  addTxBytes: (bytes) => set((s) => ({ txBytes: s.txBytes + bytes })),

  incrementRxMessages: () =>
    set((s) => ({ rxMessages: s.rxMessages + 1 })),

  incrementTxMessages: () =>
    set((s) => ({ txMessages: s.txMessages + 1 })),

  incrementReconnect: () =>
    set((s) => ({ reconnectCount: s.reconnectCount + 1 })),

  resetStats: () =>
    set({
      rxBytes: 0,
      txBytes: 0,
      rxMessages: 0,
      txMessages: 0,
      sessionStart: null,
      reconnectCount: 0,
    }),
}));
