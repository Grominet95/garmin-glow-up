import { useState } from "react";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { type HealthWindow, type SleepSegment, useHealth } from "../hooks/useHealth";
import { fmtHr } from "../lib/format";

const WINDOWS: HealthWindow[] = ["7d", "30d", "90d", "1y"];

const SLEEP_COLOR: Record<number, string> = {
  0: "var(--fg-3)", // awake
  1: "var(--z2)", // light
  2: "var(--z3)", // rem
  3: "var(--z5)", // deep
};
const SLEEP_LABEL: Record<number, string> = { 0: "Awake", 1: "Light", 2: "REM", 3: "Deep" };

// ─── helpers ────────────────────────────────────────────────────────────────

function lastNonNull(s: (number | null)[]): number | null {
  for (let i = s.length - 1; i >= 0; i--) if (s[i] !== null) return s[i];
  return null;
}

function windowAvg(s: (number | null)[]): number | null {
  const vals = s.filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function fmtStageDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `0:${String(m).padStart(2, "0")}`;
}

// ─── SVG components ─────────────────────────────────────────────────────────

function FilledSparkline({
  data,
  color,
  gradId,
}: {
  data: (number | null)[];
  color: string;
  gradId: string;
}) {
  const vals = data.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!vals.length) return <div className="empty-card rounded" style={{ height: 48 }} />;

  const W = 200;
  const H = 48;
  const padT = 4;
  const padB = 2;
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = maxV - minV || 1;
  const toY = (v: number) => padT + (H - padT - padB) * (1 - (v - minV) / span);
  const toX = (i: number) => (i / (data.length - 1)) * W;

  const lineParts: string[] = [];
  let seg = "";
  let firstIdx = -1;
  let lastIdx = -1;
  data.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (seg) {
        lineParts.push(seg);
        seg = "";
      }
      return;
    }
    if (firstIdx < 0) firstIdx = i;
    lastIdx = i;
    seg += seg
      ? ` L${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`
      : `M${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`;
  });
  if (seg) lineParts.push(seg);

  const areaPath =
    lineParts.length && firstIdx >= 0
      ? `${lineParts[0]} L${toX(lastIdx).toFixed(1)} ${H - padB} L${toX(firstIdx).toFixed(1)} ${H - padB} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 48, display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
      {lineParts.map((p) => (
        <path
          key={p}
          d={p}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

function SleepHypnogram({ segments, durationS }: { segments: SleepSegment[]; durationS: number }) {
  const totalMin = Math.max(durationS / 60, 1);
  if (!segments.length) return null;

  const segs = segments.map((s, i) => ({
    ...s,
    durMin: Math.max(
      1,
      i < segments.length - 1 ? segments[i + 1].offsetMin - s.offsetMin : totalMin - s.offsetMin
    ),
  }));

  return (
    <div style={{ display: "grid", gridTemplateRows: "repeat(4, 14px)", gap: 2 }}>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} style={{ display: "flex", alignItems: "stretch" }}>
          <span
            style={{
              fontSize: 9,
              color: "var(--fg-3)",
              width: 30,
              flexShrink: 0,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              lineHeight: "14px",
            }}
          >
            {SLEEP_LABEL[row]}
          </span>
          <div style={{ flex: 1, display: "flex", gap: 1 }}>
            {segs.map((seg) => (
              <div
                key={seg.offsetMin}
                style={{
                  flex: seg.durMin,
                  height: "100%",
                  background: seg.stage === row ? SLEEP_COLOR[row] : "transparent",
                  borderRadius: 2,
                  minWidth: 0,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FallbackHypnogram({ blocks }: { blocks: number[] }) {
  if (!blocks.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateRows: "repeat(4, 14px)", gap: 2 }}>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} style={{ display: "flex", alignItems: "stretch" }}>
          <span
            style={{
              fontSize: 9,
              color: "var(--fg-3)",
              width: 30,
              flexShrink: 0,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              lineHeight: "14px",
            }}
          >
            {SLEEP_LABEL[row]}
          </span>
          <div style={{ flex: 1, display: "flex", gap: 1 }}>
            {blocks.map((stage, i) => {
              // biome-ignore lint/suspicious/noArrayIndexKey: positional epoch slots with no natural key
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: "100%",
                    background: stage === row ? SLEEP_COLOR[row] : "transparent",
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Proportional bar from stage totals — fallback when no segment timeline is available
function SleepTotalsBar({
  totals,
  durationS,
}: {
  totals: { awakeS: number; lightS: number; remS: number; deepS: number };
  durationS: number;
}) {
  if (!durationS) return null;
  const stages = [
    { key: "deepS" as const, stage: 3 },
    { key: "remS" as const, stage: 2 },
    { key: "lightS" as const, stage: 1 },
    { key: "awakeS" as const, stage: 0 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {stages.map(({ key, stage }) => {
        const s = (totals[key] ?? 0) as number;
        const pct = (s / durationS) * 100;
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "var(--fg-3)", width: 32, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {SLEEP_LABEL[stage]}
            </span>
            <div style={{ flex: 1, height: 8, background: "var(--bg-3)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: SLEEP_COLOR[stage], borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LollipopChart({ data }: { data: (number | null)[] }) {
  const vals = data.filter((v): v is number => v !== null);
  if (!vals.length) return <div className="empty-card rounded" style={{ height: 72 }} />;

  const W = 400;
  const H = 72;
  const padT = 6;
  const padB = 4;
  const plotH = H - padT - padB;
  const scaleMin = 0;
  const scaleMax = Math.max(10, ...vals);
  const toY = (h: number) => padT + plotH * (1 - (h - scaleMin) / (scaleMax - scaleMin));
  const n = data.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 72, display: "block" }}
      aria-hidden="true"
    >
      <line
        x1={0}
        y1={toY(8)}
        x2={W}
        y2={toY(8)}
        stroke="var(--line)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {data.map((v, i) => {
        if (v === null) return null;
        const x = ((i + 0.5) / n) * W;
        const y = toY(v);
        const color = v >= 7 && v <= 9 ? "var(--violet)" : v < 6 ? "var(--z4)" : "var(--z3)";
        return (
          <g key={x.toFixed(2)}>
            <line
              x1={x}
              y1={H - padB}
              x2={x}
              y2={y + 3}
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.45}
            />
            <circle cx={x} cy={y} r={3} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  title,
  current,
  unit,
  delta,
  higherIsBetter,
  secondaryLabel,
  series,
  color,
  gradId,
  window: win,
}: {
  title: string;
  current: number | null;
  unit: string;
  delta: number | null;
  higherIsBetter: boolean;
  secondaryLabel?: string;
  series: (number | null)[];
  color: string;
  gradId: string;
  window: HealthWindow;
}) {
  const isGood = delta !== null ? (higherIsBetter ? delta >= 0 : delta <= 0) : null;
  const deltaColor =
    isGood === true ? "var(--lime)" : isGood === false ? "var(--z4)" : "var(--fg-2)";
  const displayVal =
    unit === "%"
      ? (current?.toFixed(1) ?? "—")
      : current !== null
        ? Math.round(current).toString()
        : "—";

  return (
    <div className="card flex flex-col gap-1.5">
      <h3 style={{ marginBottom: 2 }}>{title}</h3>
      <div className="flex items-baseline gap-1">
        <span
          className="text-[26px] font-[550] tracking-[-0.04em] num"
          style={{ color: current !== null ? color : "var(--fg-3)" }}
        >
          {displayVal}
        </span>
        {current !== null && <span className="text-[12px] text-fg-2 num">{unit}</span>}
      </div>
      {delta !== null ? (
        <div className="text-[11px] font-mono" style={{ color: deltaColor }}>
          {delta >= 0 ? "+" : ""}
          {Math.round(delta)} vs {win} avg
        </div>
      ) : secondaryLabel ? (
        <div className="text-[11px] text-fg-2">{secondaryLabel}</div>
      ) : null}
      <div className="mt-auto pt-1">
        <FilledSparkline data={series} color={color} gradId={gradId} />
      </div>
    </div>
  );
}

// ─── main view ───────────────────────────────────────────────────────────────

export function HealthView() {
  const [win, setWin] = useState<HealthWindow>("30d");
  const { data, isLoading } = useHealth(win);

  const winLabel: Record<HealthWindow, string> = {
    "7d": "7-day window",
    "30d": "30-day window",
    "90d": "90-day window",
    "1y": "1-year window",
  };

  const windowPicker = (
    <div className="flex gap-1">
      {WINDOWS.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => setWin(w)}
          className="px-3 py-1 rounded-sm text-[12px] font-mono transition-colors"
          style={{
            background: win === w ? "var(--bg-3)" : "transparent",
            color: win === w ? "var(--fg-0)" : "var(--fg-2)",
            border: "1px solid",
            borderColor: win === w ? "var(--line)" : "transparent",
            cursor: "pointer",
          }}
        >
          {w}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Library", "Health", winLabel[win]]} right={windowPicker} />
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading && <SkeletonCard className="h-48" />}

        {data && (
          <>
            {/* ── Top row: Last Night + Body Battery ───────────────── */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "3fr 2fr" }}>
              {/* LAST NIGHT */}
              {data.lastNight ? (
                <div className="card">
                  <div className="flex items-start justify-between" style={{ marginBottom: 4 }}>
                    <h3 style={{ margin: 0 }}>Last Night · {fmtHr(data.lastNight.durationS)}</h3>
                    <div
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                      style={{
                        background: "color-mix(in oklch, var(--violet) 18%, var(--bg-2))",
                        color: "var(--violet)",
                        border: "1px solid color-mix(in oklch, var(--violet) 35%, var(--line))",
                        flexShrink: 0,
                      }}
                    >
                      Score {data.lastNight.score} · {data.lastNight.scoreLabel}
                    </div>
                  </div>

                  <div className="text-[12px] font-mono text-fg-2 mb-4">
                    {data.lastNight.bedTimeLocal} → {data.lastNight.wakeTimeLocal}
                  </div>

                  {(data.lastNight.segments ?? []).length > 0 ? (
                    <SleepHypnogram
                      segments={data.lastNight.segments}
                      durationS={data.lastNight.durationS}
                    />
                  ) : (data.lastNight.blocks5min ?? []).length > 0 ? (
                    <FallbackHypnogram blocks={data.lastNight.blocks5min} />
                  ) : (
                    <SleepTotalsBar
                      totals={
                        data.lastNight.totals as {
                          awakeS: number;
                          lightS: number;
                          remS: number;
                          deepS: number;
                        }
                      }
                      durationS={data.lastNight.durationS}
                    />
                  )}

                  {/* Stage totals */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {(
                      [
                        { key: "deepS" as const, stage: 3, label: "Deep" },
                        { key: "remS" as const, stage: 2, label: "REM" },
                        { key: "lightS" as const, stage: 1, label: "Light" },
                        { key: "awakeS" as const, stage: 0, label: "Awake" },
                      ] as const
                    ).map(({ key, stage, label }) => {
                      const s = (data.lastNight?.totals?.[key] ?? 0) as number;
                      const pct =
                        data.lastNight?.durationS > 0
                          ? Math.round((s / data.lastNight?.durationS) * 100)
                          : 0;
                      return (
                        <div key={key}>
                          <div
                            className="text-[10px] uppercase tracking-[0.08em] mb-0.5"
                            style={{ color: "var(--fg-3)" }}
                          >
                            {label}
                          </div>
                          <div
                            className="text-[20px] font-[550] tracking-[-0.03em] num"
                            style={{ color: SLEEP_COLOR[stage] }}
                          >
                            {fmtStageDuration(s)}
                          </div>
                          <div className="text-[11px] num" style={{ color: "var(--fg-2)" }}>
                            {pct}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="card flex items-center justify-center min-h-[160px]">
                  <span className="text-[13px] text-fg-3">No sleep data</span>
                </div>
              )}

              {/* BODY BATTERY */}
              <div className="card flex flex-col">
                <h3>Body Battery</h3>
                {lastNonNull(data.series.bodyBattery) !== null ? (
                  <>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span
                        className="text-[36px] font-[550] tracking-[-0.05em] num"
                        style={{ color: "var(--violet)" }}
                      >
                        {lastNonNull(data.series.bodyBattery)}
                      </span>
                      <span className="text-[12px] text-fg-2">now</span>
                    </div>
                    <div className="flex-1">
                      <FilledSparkline
                        data={data.series.bodyBattery}
                        color="var(--violet)"
                        gradId="grad-bb"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 empty-card rounded min-h-[80px]" />
                )}
              </div>
            </div>

            {/* ── Middle row: 4 metric cards ───────────────────────── */}
            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  {
                    title: "HRV · Nightly",
                    key: "hrv" as const,
                    unit: "ms",
                    color: "var(--violet)",
                    gradId: "grad-hrv",
                    higherIsBetter: true,
                    useDelta: data.lastNight?.hrvDelta ?? null,
                  },
                  {
                    title: "Resting HR",
                    key: "rhr" as const,
                    unit: "bpm",
                    color: "var(--cyan)",
                    gradId: "grad-rhr",
                    higherIsBetter: false,
                  },
                  {
                    title: "Stress · Avg",
                    key: "stress" as const,
                    unit: "/100",
                    color: "var(--tangerine)",
                    gradId: "grad-stress",
                    higherIsBetter: false,
                  },
                  {
                    title: "SpO₂ · Sleep",
                    key: "spo2" as const,
                    unit: "%",
                    color: "var(--solar)",
                    gradId: "grad-spo2",
                    higherIsBetter: true,
                  },
                ] as const
              ).map((m) => {
                const series = data.series[m.key] as (number | null)[];
                const current = lastNonNull(series);
                const avg = windowAvg(series);
                const delta =
                  "useDelta" in m && m.useDelta !== undefined
                    ? m.useDelta
                    : current !== null && avg !== null
                      ? current - avg
                      : null;

                const stressLabel =
                  m.key === "stress" && current !== null
                    ? current < 25
                      ? "low all-day"
                      : current < 50
                        ? "moderate"
                        : current < 75
                          ? "high"
                          : "very high"
                    : undefined;

                return (
                  <MetricCard
                    key={m.title}
                    title={m.title}
                    current={current}
                    unit={m.unit}
                    delta={delta}
                    higherIsBetter={m.higherIsBetter}
                    secondaryLabel={stressLabel}
                    series={series}
                    color={m.color}
                    gradId={m.gradId}
                    window={win}
                  />
                );
              })}
            </div>

            {/* ── Bottom: Sleep duration & consistency ─────────────── */}
            <div className="card">
              <h3>Sleep · Duration &amp; Consistency</h3>
              <LollipopChart data={data.series.sleepHours} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
