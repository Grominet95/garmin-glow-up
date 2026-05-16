import { useMemo, useState } from "react";
import { Icon, type IconName } from "../components/Icon";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { type CalendarCell, type MonthBucket, useCalendar } from "../hooks/useCalendar";
import { fmtDurationHuman } from "../lib/format";

const SPORT_COLOR: Record<string, string> = {
  run: "var(--run)",
  bike: "var(--bike)",
  swim: "var(--swim)",
  trail: "var(--trail)",
  lift: "var(--lift)",
  walk: "var(--walk)",
  other: "var(--fg-3)",
};

const SPORT_ICON: Record<string, IconName> = {
  run: "run",
  bike: "bike",
  swim: "swim",
  trail: "trail",
  lift: "lift",
  walk: "run",
};

const SPORT_PRIORITY: Record<string, number> = {
  run: 6,
  trail: 5,
  bike: 4,
  swim: 3,
  lift: 2,
  walk: 1,
  other: 0,
};

const SPORT_CHIPS = [
  { sport: "run", label: "Run" },
  { sport: "bike", label: "Bike" },
  { sport: "swim", label: "Swim" },
  { sport: "trail", label: "Trail" },
  { sport: "lift", label: "Strength" },
] as const;

const SPORT_ORDER = ["run", "trail", "bike", "swim", "lift", "walk", "other"];
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_LABELS = ["", "Tu", "", "Th", "", "Sa", ""];

const CELL_SIZE = 9;
const CELL_GAP = 2;
const WEEK_W = CELL_SIZE + CELL_GAP;
const DAY_LABEL_W = 18;
const CHART_HEIGHT = 120;

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtMonthRange(rangeStart: string, rangeEnd: string): string {
  const s = isoToDate(rangeStart);
  const e = isoToDate(rangeEnd);
  return `${MONTH_ABBR[s.getMonth()]} ${s.getFullYear()} → ${MONTH_ABBR[e.getMonth()]} ${e.getFullYear()}`;
}

function fmtActivityDate(iso: string): string {
  const d = isoToDate(iso);
  return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
}

function buildWeeks(rangeStart: string, rangeEnd: string): Date[][] {
  const start = isoToDate(rangeStart);
  const end = isoToDate(rangeEnd);

  // First Monday on or before start
  const dow = (start.getDay() + 6) % 7; // Mon=0
  const cur = new Date(start);
  cur.setDate(start.getDate() - dow);

  const weeks: Date[][] = [];
  while (cur <= end) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function buildMonthLabels(weeks: Date[][]): Array<{ weekIdx: number; label: string }> {
  const labels: Array<{ weekIdx: number; label: string }> = [];
  let lastMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    const month = weeks[i][0].getMonth();
    if (month !== lastMonth) {
      labels.push({ weekIdx: i, label: MONTH_ABBR[month] });
      lastMonth = month;
    }
  }
  return labels;
}

function buildDayMap(cells: CalendarCell[], activeFilters: Set<string>): Map<string, CalendarCell> {
  const map = new Map<string, CalendarCell>();
  for (const cell of cells) {
    if (!activeFilters.has(cell.sport)) continue;
    const existing = map.get(cell.dateLocal);
    if (!existing || (SPORT_PRIORITY[cell.sport] ?? 0) > (SPORT_PRIORITY[existing.sport] ?? 0)) {
      map.set(cell.dateLocal, cell);
    }
  }
  return map;
}

function dateToISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Heatmap ────────────────────────────────────────────────────────────────

interface HeatmapProps {
  cells: CalendarCell[];
  rangeStart: string;
  rangeEnd: string;
  activeFilters: Set<string>;
}

function Heatmap({ cells, rangeStart, rangeEnd, activeFilters }: HeatmapProps) {
  const today = dateToISO(new Date());
  const rangeStartDate = isoToDate(rangeStart);

  const weeks = useMemo(() => buildWeeks(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);
  const dayMap = useMemo(() => buildDayMap(cells, activeFilters), [cells, activeFilters]);

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Month labels */}
      <div style={{ position: "relative", height: 16, marginLeft: DAY_LABEL_W + CELL_GAP }}>
        {monthLabels.map(({ weekIdx, label }) => (
          <span
            key={`${weekIdx}-${label}`}
            style={{
              position: "absolute",
              left: weekIdx * WEEK_W,
              fontSize: 9,
              color: "var(--fg-3)",
              lineHeight: "16px",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "flex", gap: CELL_GAP, alignItems: "flex-start" }}>
        {/* Day-of-week labels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: CELL_GAP,
            width: DAY_LABEL_W,
            flexShrink: 0,
          }}
        >
          {DAY_LABELS.map((label, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: day-of-week header, position is the identity
              key={i}
              style={{
                height: CELL_SIZE,
                fontSize: 8,
                color: "var(--fg-3)",
                lineHeight: `${CELL_SIZE}px`,
                textAlign: "right",
                paddingRight: 3,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, weekIdx) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: week position is the identity
            key={weekIdx}
            style={{ display: "flex", flexDirection: "column", gap: CELL_GAP, flexShrink: 0 }}
          >
            {week.map((day) => {
              const iso = dateToISO(day);
              const cell = dayMap.get(iso);
              const isToday = iso === today;
              const inRange = day >= rangeStartDate && iso <= rangeEnd;

              let bg: string;
              let opacity: number;

              if (!inRange) {
                bg = "transparent";
                opacity = 0;
              } else if (cell) {
                bg = SPORT_COLOR[cell.sport] ?? "var(--fg-3)";
                opacity =
                  cell.intensity === "v-high"
                    ? 1
                    : cell.intensity === "high"
                      ? 0.85
                      : cell.intensity === "med"
                        ? 0.65
                        : 0.45;
              } else {
                bg = "var(--bg-3)";
                opacity = 0.6;
              }

              return (
                <div
                  key={iso}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    borderRadius: 2,
                    background: bg,
                    opacity,
                    outline: isToday ? "1px solid var(--rose)" : undefined,
                    outlineOffset: 1,
                  }}
                  title={iso}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Monthly Bar Chart ───────────────────────────────────────────────────────

interface MonthlyBarChartProps {
  monthly: MonthBucket[];
  activeFilters: Set<string>;
}

function MonthlyBarChart({ monthly, activeFilters }: MonthlyBarChartProps) {
  const filtered = monthly.map((m) => {
    const bySport: Record<string, number> = {};
    for (const [sport, km] of Object.entries(m.bySport)) {
      if (activeFilters.has(sport)) bySport[sport] = km;
    }
    return { ...m, bySport, totalKm: Object.values(bySport).reduce((a, b) => a + b, 0) };
  });

  const maxKm = Math.max(...filtered.map((m) => m.totalKm), 1);
  const activeBuckets = filtered.filter((m) => m.totalKm > 0);
  const avgKm =
    activeBuckets.length > 0
      ? activeBuckets.reduce((s, m) => s + m.totalKm, 0) / activeBuckets.length
      : 0;
  const bestMonth = filtered.reduce(
    (best, m) => (m.totalKm > best.totalKm ? m : best),
    filtered[0]
  );
  const avgHeightPx = (avgKm / maxKm) * CHART_HEIGHT;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            color: "var(--fg-3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Monthly Distance · 12 Months
        </span>
        <div className="flex gap-4" style={{ fontSize: 11, color: "var(--fg-2)" }}>
          {bestMonth?.totalKm > 0 && (
            <span>
              Best{" "}
              <b style={{ color: "var(--fg-0)", fontWeight: 550 }}>
                {MONTH_ABBR[Number.parseInt(bestMonth.month.split("-")[1]) - 1]}
              </b>{" "}
              ·{" "}
              <b style={{ color: "var(--fg-0)", fontWeight: 550 }}>
                {Math.round(bestMonth.totalKm)} km
              </b>
            </span>
          )}
          {avgKm > 0 && (
            <span>
              Avg <b style={{ color: "var(--fg-0)", fontWeight: 550 }}>{Math.round(avgKm)} km</b>
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height: CHART_HEIGHT + 20,
          position: "relative",
        }}
      >
        {/* Average line */}
        {avgKm > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 20 + avgHeightPx,
              left: 0,
              right: 0,
              height: 1,
              background: "var(--fg-3)",
              opacity: 0.25,
              pointerEvents: "none",
            }}
          />
        )}

        {filtered.map((m) => {
          const barH = m.totalKm > 0 ? Math.max((m.totalKm / maxKm) * CHART_HEIGHT, 2) : 0;
          const monthIdx = Number.parseInt(m.month.split("-")[1]) - 1;
          const isBest = m === bestMonth && m.totalKm > 0;

          return (
            <div
              key={m.month}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: CHART_HEIGHT + 20,
                justifyContent: "flex-end",
              }}
            >
              {/* Value label */}
              {m.totalKm > 0 && (
                <div
                  style={{
                    fontSize: 9,
                    color: isBest ? "var(--fg-0)" : "var(--fg-3)",
                    fontWeight: isBest ? 600 : undefined,
                    marginBottom: 2,
                    lineHeight: 1,
                  }}
                >
                  {Math.round(m.totalKm)}
                </div>
              )}

              {/* Stacked bar */}
              {barH > 0 && (
                <div
                  style={{
                    width: "100%",
                    height: barH,
                    borderRadius: 2,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column-reverse",
                  }}
                >
                  {SPORT_ORDER.map((sport) => {
                    const km = m.bySport[sport] ?? 0;
                    if (!km) return null;
                    return (
                      <div
                        key={sport}
                        style={{ flex: km, background: SPORT_COLOR[sport] ?? "var(--fg-3)" }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Month label */}
              <div
                style={{
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  color: isBest ? "var(--fg-0)" : "var(--fg-3)",
                  fontWeight: isBest ? 600 : undefined,
                }}
              >
                {MONTH_ABBR[monthIdx]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CalendarView ────────────────────────────────────────────────────────────

export function CalendarView() {
  const { data, isLoading } = useCalendar();
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(["run", "bike", "swim", "trail", "lift"])
  );

  const toggleFilter = (sport: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(sport)) {
        if (next.size > 1) next.delete(sport);
      } else {
        next.add(sport);
      }
      return next;
    });
  };

  // Dominant sport per day (for streak bar)
  const activeDayMap = useMemo(() => {
    if (!data) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const cell of data.cells) {
      const existing = m.get(cell.dateLocal);
      if (!existing || (SPORT_PRIORITY[cell.sport] ?? 0) > (SPORT_PRIORITY[existing] ?? 0)) {
        m.set(cell.dateLocal, cell.sport);
      }
    }
    return m;
  }, [data]);

  // Last 42 days for streak bar
  const last42 = useMemo(() => {
    const days: string[] = [];
    const base = new Date();
    for (let i = 41; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      days.push(dateToISO(d));
    }
    return days;
  }, []);

  const rangeLabel = data ? fmtMonthRange(data.rangeStart, data.rangeEnd) : "";

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar
        crumbs={["Library", "Calendar", rangeLabel].filter(Boolean)}
        right={
          <div className="flex items-center gap-1.5">
            {SPORT_CHIPS.map(({ sport, label }) => {
              const active = activeFilters.has(sport);
              const color = SPORT_COLOR[sport];
              return (
                <button
                  key={sport}
                  type="button"
                  onClick={() => toggleFilter(sport)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 500,
                    border: `1px solid ${active ? color : "var(--line-soft)"}`,
                    background: active
                      ? `color-mix(in oklch, ${color} 15%, transparent)`
                      : "transparent",
                    color: active ? color : "var(--fg-3)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: color,
                      opacity: active ? 1 : 0.4,
                      flexShrink: 0,
                    }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main content ── */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-w-0">
          {isLoading && (
            <>
              <SkeletonCard className="h-48" />
              <SkeletonCard className="h-48" />
            </>
          )}

          {data && (
            <>
              {/* Heatmap card */}
              <div className="card p-4">
                <div className="flex justify-between items-center mb-3">
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "monospace",
                      color: "var(--fg-3)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Year Heatmap
                  </span>
                  <div className="flex gap-4" style={{ fontSize: 11, color: "var(--fg-2)" }}>
                    <span>
                      <b style={{ color: "var(--fg-0)", fontWeight: 550 }}>
                        {data.totals.sessions}
                      </b>{" "}
                      sessions
                    </span>
                    <span>
                      <b style={{ color: "var(--fg-0)", fontWeight: 550 }}>
                        {Math.round(data.totals.distanceKm)}
                      </b>{" "}
                      km
                    </span>
                    <span>
                      <b style={{ color: "var(--fg-0)", fontWeight: 550 }}>
                        {fmtDurationHuman(data.totals.durationS)}
                      </b>
                    </span>
                    {data.totals.kcal > 0 && (
                      <span>
                        <b style={{ color: "var(--fg-0)", fontWeight: 550 }}>
                          {Math.round(data.totals.kcal / 1000)}k
                        </b>{" "}
                        kcal
                      </span>
                    )}
                  </div>
                </div>

                <Heatmap
                  cells={data.cells}
                  rangeStart={data.rangeStart}
                  rangeEnd={data.rangeEnd}
                  activeFilters={activeFilters}
                />

                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 10, color: "var(--fg-3)" }}>Intensity</span>
                    {([0.45, 0.65, 0.85, 1] as const).map((op) => (
                      <div
                        key={op}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          borderRadius: 2,
                          background: "var(--run)",
                          opacity: op,
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--fg-3)" }}>
                    Click a cell to drill down · Press / to search
                  </span>
                </div>
              </div>

              {/* Monthly bar chart card */}
              <div className="card p-4">
                <MonthlyBarChart monthly={data.monthly} activeFilters={activeFilters} />
              </div>
            </>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div
          className="overflow-y-auto"
          style={{
            width: 272,
            minWidth: 272,
            borderLeft: "1px solid var(--line-soft)",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {isLoading && (
            <>
              <SkeletonCard className="h-48" />
              <SkeletonCard className="h-28" style={{ marginTop: "auto" }} />
            </>
          )}

          {data && (
            <>
              {/* Recent Activity */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: "var(--fg-3)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Recent Activity
                </div>
                <div>
                  {data.recent.slice(0, 5).map((r, i) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom:
                          i < Math.min(data.recent.length, 5) - 1
                            ? "1px solid var(--line-soft)"
                            : undefined,
                      }}
                    >
                      {/* Sport icon */}
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: `color-mix(in oklch, ${SPORT_COLOR[r.sport] ?? "var(--fg-3)"} 16%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon
                          name={SPORT_ICON[r.sport] ?? "run"}
                          size={13}
                          color={SPORT_COLOR[r.sport] ?? "var(--fg-3)"}
                          stroke={1.8}
                        />
                      </div>

                      {/* Info */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--fg-0)",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {r.label}
                          {r.distanceKm >= 0.5 && (
                            <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>
                              {" "}
                              · {r.distanceKm.toFixed(0)} km
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--fg-3)",
                            display: "flex",
                            gap: 8,
                            marginTop: 2,
                          }}
                        >
                          <span>{fmtActivityDate(r.dateLocal)}</span>
                          {r.hr > 0 && <span>HR {r.hr}</span>}
                          {r.metricDisplay !== "--" && <span>{r.metricDisplay}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Streak — pinned to bottom */}
              <div style={{ marginTop: "auto", paddingTop: 24 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: "var(--fg-3)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Streak
                </div>
                <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, color: "var(--fg-0)" }}>
                  {data.streak.activeDays}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4 }}>active days</div>
                {data.streak.activeDays > 0 && (
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
                    Started {fmtActivityDate(data.streak.startDate)} · {data.streak.adherencePct}%
                    adherence to plan
                  </div>
                )}

                {/* 42-day activity bar */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(42, 1fr)",
                    gap: 1,
                    marginTop: 12,
                  }}
                >
                  {last42.map((d) => {
                    const sport = activeDayMap.get(d);
                    return (
                      <div
                        key={d}
                        title={d}
                        style={{
                          height: 8,
                          borderRadius: 1,
                          background: sport
                            ? (SPORT_COLOR[sport] ?? "var(--accent)")
                            : "var(--bg-3)",
                          opacity: sport ? 0.85 : 0.4,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
