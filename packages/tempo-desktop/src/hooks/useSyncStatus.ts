import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { api, sse } from "../lib/api";

interface SyncStatus {
  running: boolean;
  lastSync: string | null;
  nextRun: string | null;
  stage?: string;
  pulled?: number;
  total?: number;
  error?: string;
}

interface SyncStore {
  status: SyncStatus | null;
  mfaRequired: boolean;
  ready: boolean;
  setStatus: (s: SyncStatus) => void;
  setMfaRequired: (v: boolean) => void;
  setReady: (v: boolean) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: null,
  mfaRequired: false,
  ready: false,
  setStatus: (s) => set({ status: s }),
  setMfaRequired: (v) => set({ mfaRequired: v }),
  setReady: (v) => set({ ready: v }),
}));

export function useSyncStatus() {
  const store = useSyncStore();
  const ready = useSyncStore((s) => s.ready);
  const setStatus = useSyncStore((s) => s.setStatus);
  const setMfaRequired = useSyncStore((s) => s.setMfaRequired);
  const qc = useQueryClient();
  const wasRunning = useRef(false);

  useEffect(() => {
    if (!ready) return;
    const disconnect = sse("/sync/status", (event, data) => {
      if (event === "status") {
        const s = data as SyncStatus;
        setStatus(s);
        // Invalidate dashboard when sync transitions from running → done
        if (wasRunning.current && !s.running) {
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["load"] });
        }
        wasRunning.current = s.running;
      } else if (event === "mfa_required") {
        setMfaRequired(true);
      }
    });
    return disconnect;
  }, [ready, setStatus, setMfaRequired, qc]);

  const triggerSync = async () => {
    await api("/sync/run", { method: "POST", body: JSON.stringify({ force: false }), headers: { "Content-Type": "application/json" } });
  };

  return { ...store, triggerSync };
}
