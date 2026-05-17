import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { relativeTime } from "../lib/time";
import { Icon } from "./Icon";

interface TopBarProps {
  crumbs?: string[];
  right?: ReactNode;
}

export function TopBar({ crumbs = [], right }: TopBarProps) {
  const { status, triggerSync, triggerQuickSync } = useSyncStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const pillBase =
    "inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-fg-1 border border-line-soft transition-colors hover:border-line hover:text-fg-0";
  const pillStyle = { background: "var(--bg-2)" };

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
        <div ref={menuRef} className="relative inline-flex" style={{ opacity: status.running ? 0.7 : 1 }}>
          {/* Main pill: quick sync */}
          <button
            type="button"
            onClick={() => { triggerQuickSync(); setMenuOpen(false); }}
            disabled={status.running}
            className={`${pillBase} rounded-l-full`}
            style={{ ...pillStyle, cursor: status.running ? "default" : "pointer", borderRight: "none" }}
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

          {/* Chevron: open dropdown */}
          {!status.running && (
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={`${pillBase} rounded-r-full px-2`}
              style={{ ...pillStyle, cursor: "pointer", borderLeft: "1px solid var(--line-soft)" }}
              aria-label="More sync options"
            >
              <Icon name="arrow-down" size={10} color="var(--fg-2)" />
            </button>
          )}

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 rounded-lg border border-line-soft text-[12px] text-fg-1 z-50 overflow-hidden"
              style={{ background: "var(--bg-1)", minWidth: 170, boxShadow: "0 4px 16px rgba(0,0,0,.18)" }}
            >
              <button
                type="button"
                onClick={() => { triggerQuickSync(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-2)] transition-colors"
              >
                <Icon name="sync" size={13} color="var(--accent)" />
                <span>Quick sync <span className="text-fg-3">(7 days)</span></span>
              </button>
              <div className="h-px mx-2" style={{ background: "var(--line-soft)" }} />
              <button
                type="button"
                onClick={() => { triggerSync(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-2)] transition-colors"
              >
                <Icon name="sync" size={13} color="var(--fg-2)" />
                <span>Full sync <span className="text-fg-3">(12 months)</span></span>
              </button>
            </div>
          )}
        </div>
      )}
      {right}
    </div>
  );
}
