"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  sessionManager,
  type SessionExportFormat,
} from "@/lib/services/session-manager";
import type { SessionRecord } from "@/lib/storage/database";
import { getStorageEstimate } from "@/lib/storage/database";
import { formatBytes, formatDuration } from "@/lib/utils/bytes";
import { useEffect, useState, useCallback } from "react";
import { Clock, Download, Trash2, HardDrive } from "lucide-react";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [storage, setStorage] = useState<{ usage: number; quota: number }>({
    usage: 0,
    quota: 0,
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSessions(await sessionManager.list());
      setStorage(await getStorageEstimate());
    } catch {
      setError("Session storage is unavailable in this browser.");
    }
  }, []);

  useEffect(() => {
    let live = true;
    sessionManager
      .list()
      .then((s) => {
        if (live) setSessions(s);
      })
      .catch(() => {
        if (live) setError("Session storage is unavailable in this browser.");
      });
    getStorageEstimate()
      .then((st) => {
        if (live) setStorage(st);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const handleExport = async (id: string, format: SessionExportFormat) => {
    try {
      await sessionManager.exportSession(id, format);
    } catch {
      setError("Export failed.");
    }
  };

  const handleDelete = async (id: string) => {
    await sessionManager.remove(id);
    setConfirmDelete(null);
    await refresh();
  };

  const handleDeleteAll = async () => {
    await sessionManager.removeAll();
    setConfirmDeleteAll(false);
    await refresh();
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sessions
            </h1>
            <p className="text-sm text-white/90">
              Communication session history
            </p>
          </div>
          {sessions.length > 0 && (
            confirmDeleteAll ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white">Delete all sessions?</span>
                <button
                  onClick={handleDeleteAll}
                  className="glass-btn-destructive rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  className="glass-btn rounded-xl px-4 py-2 text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="glass-btn-destructive rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Delete All
              </button>
            )
          )}
        </div>

        {/* Storage usage */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <HardDrive size={18} className="text-sky-400" />
          <p className="text-xs text-white">
            Storage used:{" "}
            <span className="font-mono font-semibold">
              {formatBytes(storage.usage)}
            </span>
            {storage.quota > 0 && (
              <> of <span className="font-mono">{formatBytes(storage.quota)}</span></>
            )}{" "}
            · {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {sessions.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <Clock size={36} className="mx-auto text-white/90 mb-3" />
            <p className="text-sm text-white">
              No sessions recorded yet. Start a connection to begin recording.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {s.deviceName ?? "Unknown device"}
                    </p>
                    <p className="text-[11px] text-white/90 font-mono">
                      {new Date(s.startTime).toLocaleString()} ·{" "}
                      {s.transport.toUpperCase()} ·{" "}
                      {s.endTime
                        ? formatDuration(s.endTime - s.startTime)
                        : "recording…"}{" "}
                      · {formatBytes(s.rxBytes + s.txBytes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(["txt", "csv", "json"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => void handleExport(s.id, fmt)}
                        title={`Export as ${fmt.toUpperCase()}`}
                        className="glass-btn rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase flex items-center gap-1"
                      >
                        <Download size={12} />
                        {fmt}
                      </button>
                    ))}
                    {confirmDelete === s.id ? (
                      <>
                        <button
                          onClick={() => void handleDelete(s.id)}
                          className="glass-btn-destructive rounded-xl px-3 py-1.5 text-[11px] font-semibold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="glass-btn rounded-xl px-3 py-1.5 text-[11px]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        title="Delete session"
                        className="glass-btn-destructive rounded-xl px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
