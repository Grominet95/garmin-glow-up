import { useState } from "react";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { useCalendar } from "../hooks/useCalendar";
import { fmtDurationHuman } from "../lib/format";
import { currentYear } from "../lib/time";

const SPORT_COLOR: Record<string, string> = {
  run: "var(--run)",
  bike: "var(--bike)",
  swim: "var(--swim)",
  trail: "var(--trail)",
  lift: "var(--lift)",
  walk: "var(--walk)",
  other: "var(--fg-3)",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CalendarView() {
  const [year, setYear] = useState(currentYear());
  const { data, isLoading } = useCalendar(year);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar
        crumbs={["Calendar"]}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="text-fg-2 px-2 py-1 rounded hover:bg-bg-2 transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
            >
              ‹
            </button>
            <span className="font-mono text-[13px] text-fg-0">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="text-fg-2 px-2 py-1 rounded hover:bg-bg-2 transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
            >
              ›
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && <SkeletonCard className="h-64" />}
        {data && (
          <>
            {/* Totals */}
            <div className="flex gap-6 mb-4 text-[13px]">
              <span>
                <b className="text-fg-0 font-[550]">{data.totals.sessions}</b>{" "}
                <span className="text-fg-2">sessions</span>
              </span>
              <span>
                <b className="text-fg-0 font-[550]">{data.totals.distanceKm.toFixed(0)}</b>{" "}
                <span className="text-fg-2">km</span>
              </span>
              <span>
                <b className="text-fg-0 font-[550]">{fmtDurationHuman(data.totals.durationS)}</b>
              </span>
            </div>

            {/* Year heatmap — 12 mini month grids */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {MONTHS.map((monthName, monthIdx) => {
                const firstDay = new Date(year, monthIdx, 1);
                const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
                const startDow = (firstDay.getDay() + 6) % 7; // Mon=0

                const cellMap: Record<string, { sport: string; intensity: string }> = {};
                for (const cell of data.cells) {
                  const d = new Date(cell.dateLocal);
                  if (d.getFullYear() === year && d.getMonth() === monthIdx) {
                    cellMap[cell.dateLocal] = { sport: cell.sport, intensity: cell.intensity };
                  }
                }

                return (
                  <div key={monthName} className="card p-3">
                    <h3 className="mb-2">{monthName}</h3>
                    <div className="grid gap-px" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: day-of-week header cells, position is the identity
                        <div key={i} className="text-center text-[8px] font-mono text-fg-3 mb-0.5">
                          {d}
                        </div>
                      ))}
                      {Array.from({ length: startDow }).map((_, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: empty leading cells, position is the identity
                        <div key={`e${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                        const d = new Date(year, monthIdx, dayIdx + 1);
                        const iso = d.toISOString().split("T")[0];
                        const cell = cellMap[iso];
                        const isToday = iso === today;
                        return (
                          <div
                            key={iso}
                            className="rounded-[2px]"
                            style={{
                              height: 8,
                              background: cell
                                ? (SPORT_COLOR[cell.sport] ?? "var(--fg-3)")
                                : "var(--bg-3)",
                              opacity: cell
                                ? cell.intensity === "v-high"
                                  ? 1
                                  : cell.intensity === "high"
                                    ? 0.85
                                    : cell.intensity === "med"
                                      ? 0.65
                                      : 0.45
                                : 0.3,
                              outline: isToday ? "1px solid var(--rose)" : undefined,
                            }}
                            title={iso}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent */}
            {data.recent.length > 0 && (
              <div className="mt-4 card">
                <h3>Recent</h3>
                <div className="space-y-1.5">
                  {data.recent.slice(0, 10).map((r) => (
                    <div
                      key={`${r.dateLocal}-${r.sport}`}
                      className="flex items-center gap-3 text-[12px]"
                    >
                      <span className="font-mono text-fg-3">{r.dateLocal}</span>
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: SPORT_COLOR[r.sport] ?? "var(--fg-3)" }}
                      />
                      <span className="text-fg-0 flex-1">{r.label}</span>
                      <span className="font-mono text-fg-2">{r.paceDisplay}</span>
                      <span className="font-mono text-fg-3">{r.hr} bpm</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
