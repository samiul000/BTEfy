"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useTerminalStore } from "@/lib/state/terminal-store";
import { useConnectionStore } from "@/lib/state/connection-store";
import { connectionManager } from "@/lib/services/connection-manager";
import { bytesToHex, bytesToHexAscii } from "@/lib/utils/bytes";
import { formatTimestamp } from "@/lib/utils/timestamps";
import { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause, Trash2, Search, Clock } from "lucide-react";

export default function TerminalPage() {
  const terminal = useTerminalStore();
  const connection = useConnectionStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [txInput, setTxInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (terminal.autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminal.lines, terminal.autoScroll]);

  // Filter lines by search
  const filteredLines = searchQuery
    ? terminal.lines.filter((l) =>
        l.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : terminal.lines;

  const formatLine = useCallback(
    (line: (typeof terminal.lines)[0]) => {
      switch (terminal.displayMode) {
        case "hex":
          return bytesToHex(line.raw);
        case "hex+ascii":
          return bytesToHexAscii(line.raw);
        default:
          return line.text;
      }
    },
    [terminal]
  );

  const handleSend = useCallback(() => {
    if (!txInput.trim() || !connection.isConnected) return;
    const text = txInput;
    setTxInput("");
    setHistoryIndex(-1);
    // Routes through the active transport (applies line ending, logs TX)
    void connectionManager.sendText(text).catch((e: unknown) => {
      terminal.addLine(
        "rx",
        new TextEncoder().encode("Send failed"),
        `Send failed: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    });
  }, [txInput, connection.isConnected, terminal]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = Math.min(
          historyIndex + 1,
          terminal.commandHistory.length - 1
        );
        setHistoryIndex(newIndex);
        setTxInput(terminal.commandHistory[newIndex] ?? "");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = Math.max(historyIndex - 1, -1);
        setHistoryIndex(newIndex);
        setTxInput(
          newIndex === -1 ? "" : terminal.commandHistory[newIndex] ?? ""
        );
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        terminal.clear();
      } else if (e.key === "f" && e.ctrlKey) {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
    },
    [handleSend, historyIndex, terminal]
  );

  return (
    <AppShell>
      <div className="flex flex-col h-screen">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 glass-strong border-b border-white/10">
          <h1 className="text-sm font-bold mr-4 text-white">Terminal</h1>

          <button
            onClick={() => terminal.togglePause()}
            className="glass-btn flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium"
            title={terminal.paused ? "Resume" : "Pause"}
          >
            {terminal.paused ? <Play size={14} /> : <Pause size={14} />}
            {terminal.paused ? "Resume" : "Pause"}
          </button>

          <button
            onClick={() => terminal.clear()}
            className="glass-btn flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium"
            title="Clear terminal"
          >
            <Trash2 size={14} />
            Clear
          </button>

          <button
            onClick={() => setShowSearch((s) => !s)}
            className="glass-btn flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium"
            title="Search (Ctrl+F)"
          >
            <Search size={14} />
            Search
          </button>

          <div className="flex-1" />

          {/* Display mode */}
          <select
            value={terminal.displayMode}
            onChange={(e) =>
              terminal.setDisplayMode(
                e.target.value as "text" | "hex" | "hex+ascii"
              )
            }
            className="glass-input rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="text">Text</option>
            <option value="hex">HEX</option>
            <option value="hex+ascii">HEX + ASCII</option>
          </select>

          <button
            onClick={() => terminal.toggleTimestamps()}
            className={`glass-btn flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
              terminal.showTimestamps ? "!bg-sky-400/20 !border-sky-400/30" : ""
            }`}
            title="Toggle timestamps"
          >
            <Clock size={14} />
            TS
          </button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-4 py-2 glass-strong border-b border-white/10">
            <Search size={14} className="text-white" />
            <input
              type="text"
              placeholder="Search terminal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-white text-white"
              autoFocus
            />
            <span className="text-xs text-white">
              {filteredLines.length} matches
            </span>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="text-xs text-white hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Terminal output */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm"
          style={{ background: "var(--terminal-bg)" }}
        >
          {filteredLines.length === 0 ? (
            <div className="text-white/90 text-center py-8">
              {connection.isConnected
                ? "Waiting for data..."
                : "Connect a device to start receiving data."}
            </div>
          ) : (
            filteredLines.map((line) => (
              <div key={line.id} className="flex gap-2 leading-6">
                {terminal.showTimestamps && (
                  <span className="text-white/90 select-none shrink-0">
                    [{formatTimestamp(new Date(line.timestamp))}]
                  </span>
                )}
                <span
                  className={
                    line.direction === "rx"
                      ? "text-green-400"
                      : "text-sky-400"
                  }
                >
                  {line.direction.toUpperCase()}&gt;
                </span>
                <span className="text-terminal-fg whitespace-pre-wrap break-all">
                  {formatLine(line)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* TX Input */}
        <div className="flex items-center gap-3 px-4 py-3 glass-strong border-t border-white/10">
          <input
            ref={inputRef}
            type="text"
            value={txInput}
            onChange={(e) => setTxInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              connection.isConnected
                ? "Type command and press Enter..."
                : "Connect a device first"
            }
            disabled={!connection.isConnected}
            className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm font-mono disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!connection.isConnected || !txInput.trim()}
            className="glass-btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 px-4 py-1.5 glass-subtle border-t border-white/5 text-[11px] text-white">
          <span>RX: {connection.rxMessages} msgs</span>
          <span>TX: {connection.txMessages} msgs</span>
          <span>Lines: {terminal.lines.length}</span>
          {terminal.paused && (
            <span className="text-sky-400 font-medium">PAUSED</span>
          )}
        </div>
      </div>
    </AppShell>
  );
}
