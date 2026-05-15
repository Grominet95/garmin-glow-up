import type { ReactNode } from "react";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { relativeTime } from "../lib/time";
import { Icon } from "./Icon";

interface TopBarProps {
  crumbs?: string[];
  right?: ReactNode;
}

export function TopBar({ crumbs = [], right }: TopBarProps) {
  const { status, triggerSync } = useSyncStatus();

  return (
    <div
      className="flex items-center px-5 gap-4 border-b border-line-soft"
      style={{ height: 52, minHeight: 52 }}
    >
      <div className="flex items-center gap-2 text-[13px] text-fg-1">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            {i > 0 && <span className="text-fg-3">/</span>}
            <span
              style={
                i === crumbs.length - 1 ? { color: "var(--fg-0)", fontWeight: 500 } : undefined
              }
            >
              {c}
            </span>
          </span>
        ))}
      </div>
      <div className="flex-1" />
      {status && (
        <button
          type="button"
          onClick={triggerSync}
          disabled={status.running}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] text-fg-1 border border-line-soft transition-colors hover:border-line hover:text-fg-0"
          style={{
            background: "var(--bg-2)",
            cursor: status.running ? "default" : "pointer",
            opacity: status.running ? 0.7 : 1,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow:
                "0 0 0 3px color-mix(in oklch, var(--accent) 30%, transparent), 0 0 8px color-mix(in oklch, var(--accent) 60%, transparent)",
              animation: status.running ? "tempo-pulse 1.8s ease-in-out infinite" : undefined,
            }}
          />
          {status.running
            ? "Syncing…"
            : status.lastSync
              ? `Synced ${relativeTime(status.lastSync)}`
              : "Sync now"}
        </button>
      )}
      {right}
    </div>
  );
}
