import { useState } from "react";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { type HealthWindow, type SleepSegment, useHealth } from "../hooks/useHealth";
import { fmtHr } from "../lib/format";

const WINDOWS: HealthWindow[] = ["24h", "7d", "30d", "90d", "1y"];

// Sleep stage colors: 0=awake 1=light 2=rem 3=deep
const SLEEP_COLOR: Record<number, string> = {
  0: "var(--fg-3)",
  1: "var(--z2)",
  2: "var(--z3)",
  3: "var(--z5)",
};
const SLEEP_LABEL: Record<number, string> = { 0: "Awake", 1: "Light", 2: "REM", 3: "Deep" };

// ─── helpers ────────────────────────────────────────────────────────────────

function lastNonNull(s: (number | null)[] | undefined | null): number | null {
  if (!s) return null;
  for (let i = s.length - 1; i >= 0; i--) if (s[i] !== null) return s[i];
  return null;
}

function windowAvg(s: (number | null)[] | undefined | null): number | null {
  if (!s) return null;
  const vals = s.filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function fmtStageDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `0:${String(m).padStart(2, "0")}`;
}

function parseHHMM(s: string): number {
  const parts = s.split(":");
  return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
}

function fmtClockHour(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  return `${h}h`;
}

// ─── sleep hypnogram time axis ────────────────────────────────────────────

function SleepTimeAxis({
  bedTimeLocal,
  durationS,
  marginLeft,
}: { bedTimeLocal: string; durationS: number; marginLeft: number }) {
  const totalMin = durationS / 60;
  const startMin = parseHHMM(bedTimeLocal);
  const nLabels = 5;
  const labels = Array.from({ length: nLabels }, (_, i) => {
    const offset = (i / (nLabels - 1)) * totalMin;
    return fmtClockHour(startMin + offset);
  });
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginLeft,
        marginTop: 5,
      }}
    >
      {labels.map((l, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: positional labels
          key={i}
          style={{ fontSize: 9, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

// ─── sleep hypnogram (when segment data available) ─────────────────────────

function SleepHypnogram({
  segments,
  durationS,
  bedTimeLocal,
}: { segments: SleepSegment[]; durationS: number; bedTimeLocal: string }) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {[3, 2, 1, 0].map((row) => (
        <div key={row} style={{ display: "flex", alignItems: "stretch", height: 14 }}>
          <span
            style={{
              fontSize: 9,
              color: "var(--fg-3)",
              width: 34,
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
      <SleepTimeAxis bedTimeLocal={bedTimeLocal} durationS={durationS} marginLeft={34} />
    </div>
  );
}

// ─── fallback hypnogram (blocks5min) ──────────────────────────────────────

function FallbackHypnogram({
  blocks,
  durationS,
  bedTimeLocal,
}: { blocks: number[]; durationS: number; bedTimeLocal: string }) {
  if (!blocks.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {[3, 2, 1, 0].map((row) => (
        <div key={row} style={{ display: "flex", alignItems: "stretch", height: 14 }}>
          <span
            style={{
              fontSize: 9,
              color: "var(--fg-3)",
              width: 34,
              flexShrink: 0,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              lineHeight: "14px",
            }}
          >
            {SLEEP_LABEL[row]}
          </span>
          <div style={{ flex: 1, display: "flex", gap: 1 }}>
            {blocks.map((stage, idx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: positional blocks
                key={idx}
                style={{
                  flex: 1,
                  height: "100%",
                  background: stage === row ? SLEEP_COLOR[row] : "transparent",
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
        </div>
      ))}
      <SleepTimeAxis bedTimeLocal={bedTimeLocal} durationS={durationS} marginLeft={34} />
    </div>
  );
}

// ─── proportional totals bar (last resort fallback) ───────────────────────

function SleepTotalsBar({
  totals,
  durationS,
  bedTimeLocal,
  wakeTimeLocal,
}: {
  totals: { awakeS: number; lightS: number; remS: number; deepS: number };
  durationS: number;
  bedTimeLocal: string;
  wakeTimeLocal: string;
}) {
  if (!durationS) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {(
        [
          { key: "deepS", stage: 3 },
          { key: "remS", stage: 2 },
          { key: "lightS", stage: 1 },
        ] as const
      ).map(({ key, stage }) => {
        const s = (totals[key] ?? 0) as number;
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span
              style={{
                fontSize: 9,
                color: "var(--fg-3)",
                width: 34,
                flexShrink: 0,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {SLEEP_LABEL[stage]}
            </span>
            <div
              style={{
                flex: 1,
                height: 10,
                background: "var(--bg-3)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(s / durationS) * 100}%`,
                  height: "100%",
                  background: SLEEP_COLOR[stage],
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        );
      })}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginLeft: 34,
          marginTop: 2,
        }}
      >
        <span style={{ fontSize: 9, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          {bedTimeLocal}
        </span>
        <span style={{ fontSize: 9, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          {wakeTimeLocal}
        </span>
      </div>
    </div>
  );
}

// ─── body battery Y-axis labels ───────────────────────────────────────────

function BatteryYAxis({ timeAxisH = 18 }: { timeAxisH?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: 20,
        flexShrink: 0,
        paddingBottom: timeAxisH,
        alignSelf: "stretch",
      }}
    >
      {[100, 75, 50, 25, 0].map((v) => (
        <span
          key={v}
          style={{
            fontSize: 7,
            color: "var(--fg-3)",
            fontFamily: "var(--font-mono)",
            textAlign: "right",
            lineHeight: 1,
          }}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

// ─── body battery 24H intraday chart ────────────────────────────────────────

function BodyBattery24H({ intraday }: { intraday: [number, number][] }) {
  const W = 200;
  const H = 64;
  const padT = 6;
  const padB = 2;

  const minX = intraday[0][0];
  const maxX = Math.max(intraday[intraday.length - 1][0], minX + 60);
  const spanX = maxX - minX || 1;

  const toX = (min: number) => ((min - minX) / spanX) * W;
  const toY = (v: number) => padT + (H - padT - padB) * (1 - v / 100);

  const pts = intraday.map(([min, level]) => ({ x: toX(min), y: toY(level) }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)} ${H - padB} L${pts[0].x.toFixed(1)} ${H - padB} Z`;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const clampedNowMin = Math.min(Math.max(nowMin, minX), maxX);
  const nowX = toX(clampedNowMin);
  const lastPt = pts[pts.length - 1];

  // Time labels every 3h within range
  const timeLabels: { label: string; xPct: string }[] = [];
  const startH = Math.ceil(minX / 60);
  const endH = Math.floor(maxX / 60);
  for (let h = startH; h <= endH; h += 3) {
    timeLabels.push({
      label: `${String(h % 24).padStart(2, "0")}h`,
      xPct: `${((toX(h * 60) / W) * 100).toFixed(1)}%`,
    });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Responsive chart: SVG fills all available height */}
      <div style={{ flex: 1, position: "relative", minHeight: 80 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="grad-bb24h" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--violet)" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {/* Reference lines at 75 / 50 / 25 */}
          {[75, 50, 25].map((v) => (
            <line
              key={v}
              x1="0"
              y1={toY(v)}
              x2={W}
              y2={toY(v)}
              stroke="var(--fg-3)"
              strokeWidth="0.4"
              strokeDasharray="3 3"
              opacity="0.35"
            />
          ))}
          <path d={areaPath} fill="url(#grad-bb24h)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--violet)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Current time dashed marker */}
          <line
            x1={nowX}
            y1={0}
            x2={nowX}
            y2={H}
            stroke="var(--fg-2)"
            strokeWidth="0.8"
            strokeDasharray="3 2"
            opacity="0.5"
          />
          {/* Current level dot */}
          <circle
            cx={nowX}
            cy={lastPt.y}
            r={3}
            fill="var(--violet)"
            stroke="var(--bg-1)"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      {/* Time axis */}
      <div style={{ position: "relative", height: 16, marginTop: 2, flexShrink: 0 }}>
        {timeLabels.map(({ label, xPct }) => (
          <span
            key={label}
            style={{
              position: "absolute",
              left: xPct,
              transform: "translateX(-50%)",
              fontSize: 8,
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── filled sparkline ─────────────────────────────────────────────────────

function FilledSparkline({
  data,
  color,
  gradId,
  scaleMin: fixedMin,
  scaleMax: fixedMax,
  refLines,
  height = 48,
}: {
  data: (number | null)[];
  color: string;
  gradId: string;
  scaleMin?: number;
  scaleMax?: number;
  refLines?: { value: number; label?: string }[];
  height?: number;
}) {
  const vals = data.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!vals.length) return <div className="empty-card rounded" style={{ height }} />;

  const W = 200;
  const H = height;
  const padT = 4;
  const padB = 2;
  const minV = fixedMin ?? Math.min(...vals);
  const maxV = fixedMax ?? Math.max(...vals);
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
      style={{ width: "100%", height, display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {refLines?.map(({ value, label }) => {
        const y = toY(value);
        return (
          <g key={value}>
            <line
              x1="0"
              y1={y}
              x2={W}
              y2={y}
              stroke="var(--fg-3)"
              strokeWidth="0.5"
              strokeDasharray="3 3"
              opacity="0.5"
            />
            {label && (
              <text x="2" y={y - 2} fontSize="6" fill="var(--fg-3)" opacity="0.7">
                {label}
              </text>
            )}
          </g>
        );
      })}
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

// ─── lollipop chart ───────────────────────────────────────────────────────

function LollipopChart({ data }: { data: (number | null)[] }) {
  const vals = data.filter((v): v is number => v !== null);
  if (!vals.length) return <div className="empty-card rounded" style={{ height: 100 }} />;

  const scaleMin = 4;
  const scaleMax = 10;
  const chartH = 84;
  const toH = (v: number) =>
    ((Math.min(Math.max(v, scaleMin), scaleMax) - scaleMin) / (scaleMax - scaleMin)) * chartH;

  // Axis labels at d-30, d-15, today
  const n = data.length;
  const axisLabels = [
    { label: `d-${n - 1}`, idx: 0 },
    { label: `d-${Math.round((n - 1) / 2)}`, idx: Math.round((n - 1) / 2) },
    { label: "today", idx: n - 1 },
  ];

  return (
    <div style={{ position: "relative", paddingBottom: 14 }}>
      {/* Y-axis reference lines */}
      {[6, 7, 8, 9].map((h) => (
        <div
          key={h}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 14 + toH(h),
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
              width: 20,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {h}h
          </span>
          <div
            style={{
              flex: 1,
              height: 0,
              borderTop: `1px ${h === 8 ? "dashed" : "dotted"} var(--line)`,
              opacity: h === 8 ? 1 : 0.6,
              marginLeft: 4,
            }}
          />
        </div>
      ))}

      {/* Lollipops */}
      <div style={{ marginLeft: 26, display: "flex", alignItems: "flex-end", height: chartH }}>
        {data.map((v, i) => {
          if (v === null)
            return (
              <div
                key={`null-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional
                  i
                }`}
                style={{ flex: 1 }}
              />
            );
          const h = toH(v);
          const color =
            v >= 7 && v <= 9
              ? "var(--violet)"
              : v < 6
                ? "var(--z5)"
                : v < 7
                  ? "var(--z4)"
                  : "var(--solar)";
          return (
            <div
              key={`v-${
                // biome-ignore lint/suspicious/noArrayIndexKey: positional
                i
              }`}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  position: "relative",
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  width: 1.5,
                  height: Math.max(0, h - 5),
                  background: color,
                  opacity: 0.45,
                  flexShrink: 0,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div style={{ marginLeft: 26, position: "relative", height: 14 }}>
        {axisLabels.map(({ label, idx }) => (
          <span
            key={label}
            style={{
              position: "absolute",
              left: `${((idx + 0.5) / n) * 100}%`,
              transform: "translateX(-50%)",
              fontSize: 8,
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── stress today ────────────────────────────────────────────────────────────

function StressToday({
  restS,
  lowS,
  medS,
  highS,
}: { restS: number; lowS: number; medS: number; highS: number }) {
  const total = restS + lowS + medS + highS;
  if (!total) return null;

  const now = new Date();
  const liveLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} live`;

  const segments = [
    { label: "REST", s: restS, color: "var(--lime)" },
    { label: "LOW", s: lowS, color: "var(--solar)" },
    { label: "MED", s: medS, color: "var(--tangerine)" },
    { label: "HIGH", s: highS, color: "var(--z5)" },
  ];
  const dayS = 86400;

  return (
    <>
      {/* Live timestamp */}
      <div
        className="text-[10px] font-mono"
        style={{ color: "var(--fg-3)", marginBottom: 8, textAlign: "right" }}
      >
        {liveLabel}
      </div>

      {/* Segmented bar */}
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 24 }}>
        {segments.map(({ label, s, color }) =>
          s > 0 ? <div key={label} style={{ flex: s, background: color }} /> : null
        )}
        {total < dayS && <div style={{ flex: dayS - total, background: "var(--bg-3)" }} />}
      </div>

      {/* Time axis */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {[0, 6, 12, 18, 24].map((h) => (
          <span
            key={h}
            style={{ fontSize: 9, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
          >
            {String(h).padStart(2, "0")}h
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {segments.map(({ label, s, color }) => (
          <div key={label}>
            <div
              className="text-[10px] uppercase tracking-[0.07em]"
              style={{ color: "var(--fg-3)" }}
            >
              {label}
            </div>
            <div className="text-[17px] font-[550] tracking-[-0.03em] num" style={{ color }}>
              {fmtHr(s)}
            </div>
          </div>
        ))}
      </div>
    </>
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
    "24h": "Today · 24H",
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
            {/* ── Top row: Last Night + Body Battery ── */}
            <div className="grid gap-3" style={{ gridTemplateColumns: "3fr 2fr" }}>
              {/* LAST NIGHT */}
              {data.lastNight ? (
                <div className="card">
                  <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>Last Night · {fmtHr(data.lastNight.durationS)}</h3>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="text-[11px] font-medium" style={{ color: "var(--violet)" }}>
                        Score {data.lastNight.score} · {data.lastNight.scoreLabel}
                      </div>
                      <div className="text-[11px] font-mono" style={{ color: "var(--fg-2)" }}>
                        {data.lastNight.bedTimeLocal} → {data.lastNight.wakeTimeLocal}
                      </div>
                    </div>
                  </div>

                  {/* Hypnogram — best available data */}
                  {(data.lastNight.segments ?? []).length > 0 ? (
                    <SleepHypnogram
                      segments={data.lastNight.segments}
                      durationS={data.lastNight.durationS}
                      bedTimeLocal={data.lastNight.bedTimeLocal}
                    />
                  ) : (data.lastNight.blocks5min ?? []).length > 0 ? (
                    <FallbackHypnogram
                      blocks={data.lastNight.blocks5min}
                      durationS={data.lastNight.durationS}
                      bedTimeLocal={data.lastNight.bedTimeLocal}
                    />
                  ) : (
                    <SleepTotalsBar
                      totals={data.lastNight.totals}
                      durationS={data.lastNight.durationS}
                      bedTimeLocal={data.lastNight.bedTimeLocal}
                      wakeTimeLocal={data.lastNight.wakeTimeLocal}
                    />
                  )}

                  {/* Stage totals */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {(
                      [
                        { key: "deepS", label: "Deep" },
                        { key: "remS", label: "REM" },
                        { key: "lightS", label: "Light" },
                        { key: "awakeS", label: "Awake" },
                      ] as const
                    ).map(({ key, label }) => {
                      const s = (data.lastNight?.totals?.[key] ?? 0) as number;
                      const dur = data.lastNight?.durationS ?? 0;
                      const pct = dur > 0 ? Math.round((s / dur) * 100) : 0;
                      return (
                        <div key={key}>
                          <div className="text-[10px] uppercase tracking-[0.08em] mb-0.5 text-fg-3">
                            {label}
                          </div>
                          <div className="text-[20px] font-[550] tracking-[-0.03em] num text-fg-0">
                            {fmtStageDuration(s)}
                          </div>
                          <div className="text-[11px] num text-fg-2">{pct}%</div>
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
                {win === "24h" && data.series.bodyBatteryIntraday ? (
                  <>
                    <h3>Body Battery · 24H</h3>
                    <div className="flex items-baseline gap-1" style={{ marginBottom: 4 }}>
                      <span
                        className="text-[36px] font-[550] tracking-[-0.05em] num"
                        style={{ color: "var(--violet)" }}
                      >
                        {lastNonNull(data.series.bodyBattery) ?? "—"}
                      </span>
                      <span className="text-[12px] text-fg-2">now</span>
                    </div>
                    {/* Chart + Y-axis */}
                    <div className="flex-1 flex gap-1 min-h-0">
                      <BatteryYAxis timeAxisH={18} />
                      <BodyBattery24H intraday={data.series.bodyBatteryIntraday} />
                    </div>
                  </>
                ) : (
                  <>
                    <h3>Body Battery · {win}</h3>
                    {lastNonNull(data.series.bodyBattery) !== null ? (
                      <>
                        <div className="flex items-baseline gap-1" style={{ marginBottom: 2 }}>
                          <span
                            className="text-[36px] font-[550] tracking-[-0.05em] num"
                            style={{ color: "var(--violet)" }}
                          >
                            {lastNonNull(data.series.bodyBattery)}
                          </span>
                          <span className="text-[12px] text-fg-2">now</span>
                        </div>
                        {/* Chart + Y-axis */}
                        <div className="flex-1 flex gap-1 min-h-0">
                          <BatteryYAxis timeAxisH={22} />
                          <div className="flex-1 flex flex-col">
                            <FilledSparkline
                              data={data.series.bodyBattery}
                              color="var(--violet)"
                              gradId="grad-bb"
                              scaleMin={0}
                              scaleMax={100}
                              refLines={[{ value: 75 }, { value: 50 }, { value: 25 }]}
                              height={120}
                            />
                            {/* Time axis */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: 4,
                              }}
                            >
                              {[
                                `d-${data.series.bodyBattery.length - 1}`,
                                `d-${Math.round((data.series.bodyBattery.length - 1) / 2)}`,
                                "today",
                              ].map((l) => (
                                <span
                                  key={l}
                                  style={{
                                    fontSize: 8,
                                    color: "var(--fg-3)",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 empty-card rounded min-h-[80px]" />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Middle row: 4 metric cards ── */}
            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  {
                    title: "HRV · Nightly",
                    key: "hrv",
                    unit: "ms",
                    color: "var(--violet)",
                    gradId: "grad-hrv",
                    higherIsBetter: true,
                    useDelta: data.lastNight?.hrvDelta ?? null,
                  },
                  {
                    title: "Resting HR",
                    key: "rhr",
                    unit: "bpm",
                    color: "var(--lime)",
                    gradId: "grad-rhr",
                    higherIsBetter: false,
                  },
                  {
                    title: "Stress · Avg",
                    key: "stress",
                    unit: "/100",
                    color: "var(--cyan)",
                    gradId: "grad-stress",
                    higherIsBetter: false,
                  },
                  {
                    title: "SpO₂ · Sleep",
                    key: "spo2",
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
                const spo2Label =
                  m.key === "spo2" && current !== null
                    ? current >= 95
                      ? "stable"
                      : current >= 90
                        ? "low"
                        : "very low"
                    : undefined;
                const hrvLabel = m.key === "hrv" && current === null ? "not tracked" : undefined;
                return (
                  <MetricCard
                    key={m.title}
                    title={m.title}
                    current={current}
                    unit={m.unit}
                    delta={delta}
                    higherIsBetter={m.higherIsBetter}
                    secondaryLabel={hrvLabel ?? stressLabel ?? spo2Label}
                    series={series}
                    color={m.color}
                    gradId={m.gradId}
                    window={win}
                  />
                );
              })}
            </div>

            {/* ── Bottom: Sleep duration + Stress Today ── */}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: data.stressToday ? "3fr 2fr" : "1fr" }}
            >
              <div className="card">
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Sleep · Duration &amp; Consistency</h3>
                  {data.bedtimeVarianceMin !== null && data.bedtimeVarianceMin !== undefined && (
                    <span className="text-[11px] font-mono" style={{ color: "var(--fg-2)" }}>
                      Bedtime variance ±{data.bedtimeVarianceMin} min
                    </span>
                  )}
                </div>
                <LollipopChart data={data.series.sleepHours} />
              </div>
              {data.stressToday && (
                <div className="card">
                  <h3>Stress Today</h3>
                  <StressToday {...data.stressToday} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
