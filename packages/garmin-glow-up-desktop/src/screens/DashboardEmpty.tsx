import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "../components/TopBar";
import { api } from "../lib/api";
import { relativeTime } from "../lib/time";

interface Props {
  syncStatus: { lastSync: string | null; running: boolean; nextRun: string | null } | null;
}

export function DashboardEmpty({ syncStatus }: Props) {
  const qc = useQueryClient();

  async function handleSync() {
    await api("/sync/run", {
      method: "POST",
      body: JSON.stringify({ force: false, scope: ["activities", "health", "load", "progress"] }),
      headers: { "Content-Type": "application/json" },
    });
    setTimeout(() => qc.invalidateQueries({ queryKey: ["dashboard"] }), 3000);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Today"]} />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
        <div
          className="w-16 h-16 rounded-[16px] grid place-items-center"
          style={{ background: "var(--bg-2)" }}
        >
          <span style={{ fontSize: 32 }}>🏃</span>
        </div>
        <div>
          <h2 className="text-[22px] font-[550] tracking-[-0.02em] text-fg-0 m-0 mb-2">
            No activity yet
          </h2>
          <p className="text-[14px] text-fg-1 m-0 max-w-sm">
            Connect your Garmin account and sync to see your training data here.
          </p>
          {syncStatus?.lastSync && (
            <p className="text-[12px] text-fg-3 font-mono mt-2">
              Last sync · {relativeTime(syncStatus.lastSync)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSync}
          className="px-4 py-2 rounded-md text-[13px] font-medium"
          style={{
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            cursor: "pointer",
          }}
        >
          Sync now
        </button>
      </div>
    </div>
  );
}
