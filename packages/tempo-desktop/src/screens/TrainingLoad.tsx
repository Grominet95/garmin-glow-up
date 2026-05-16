import { useState } from "react";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { type LoadResponse, useLoad } from "../hooks/useLoad";

const RANGES = ["30d", "90d", "120d", "1y", "all"] as const;
type Range = (typeof RANGES)[number];

const RANGE_LABELS: Record<Range, string> = {
  "30d": "30-day rolling window",
  "90d": "90-day rolling window",
  "120d": "120-day rolling window",
  "1y": "1-year rolling window",
  all: "Full history",
};

const SPORTS = ["run", "bike", "swim", "trail", "lift"] as const;
const SPORT_LABELS: Record<string, string> = {
  run: "Run",
  bike: "Bike",
  swim: "Swim",
  trail: "Trail",
  lift: "Strength",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function ctlPath(arr: number[], maxV: number): string {
  if (arr.length < 2) return "";
  return arr
    .map((v, i) => {
      const x = ((i / (arr.length - 1)) * 1140).toFixed(1);
      const y = (180 - (v / maxV) * 170).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

function tsbPath(arr: number[]): string {
  if (arr.length < 2) return "";
  return arr
    .map((v, i) => {
      const x = ((i / (arr.length - 1)) * 1140).toFixed(1);
      const y = (180 - v * 1.2).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

function getDelta(
  series: LoadResponse["series"],
  field: "ctl" | "atl" | "tsb",
  daysBack: number
): string {
  if (series.length < 2) return "";
  const last = series[series.length - 1];
  const current = last[field];
  const cutoffMs = new Date(last.date).getTime() - daysBack * 86_400_000;
  const ref = [...series].reverse().find((s) => new Date(s.date).getTime() <= cutoffMs);
  if (!ref) return "";
  const d = current - ref[field];
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)} / ${daysBack}d`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── sub-components ───────────────────────────────────────────────────────────

function BigStat({
  label,
  value,
  delta,
  tone,
  desc,
}: {
  label: string;
  value: string;
  delta: string;
  tone: string;
  desc: string;
}) {
  return (
    <div className="card" style={{ borderLeft: `2px solid ${tone}` }}>
      <h3
        style={{
          color: tone,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 0 6px",
        }}
      >
        {label}
      </h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 38,
            fontWeight: 550,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            color: "var(--fg-0)",
          }}
        >
          {value}
        </span>
        {delta && (
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>
            {delta}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-2)", marginTop: 4 }}>{desc}</div>
    </div>
  );
}

function RampCard({ rampPerWeek }: { rampPerWeek: number }) {
  const clamped = Math.max(-2, Math.min(10, rampPerWeek));
  const pct = ((clamped + 2) / 12) * 100;
  const sign = rampPerWeek > 0 ? "+" : "";
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <h3
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "0 0 6px",
          color: "var(--fg-2)",
        }}
      >
        Ramp Rate
      </h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{ fontSize: 28, fontWeight: 550, letterSpacing: "-0.02em", color: "var(--fg-0)" }}
        >
          {sign}
          {rampPerWeek.toFixed(1)}
        </span>
        <span style={{ fontSize: 13, color: "var(--fg-2)" }}>CTL / week</span>
      </div>
      <div
        style={{
          marginTop: 10,
          height: 8,
          borderRadius: 999,
          background:
            "linear-gradient(90deg, var(--z2) 0%, var(--z2) 50%, var(--z4) 75%, var(--z5) 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: -3,
            width: 2,
            height: 14,
            background: "var(--fg-0)",
            borderRadius: 1,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--fg-2)",
          fontFamily: "var(--font-mono)",
          marginTop: 4,
        }}
      >
        <span>−2</span>
        <span>safe</span>
        <span>caution</span>
        <span>+10</span>
      </div>
    </div>
  );
}

function PerfChart({ series }: { series: LoadResponse["series"] }) {
  if (series.length < 2) return null;

  const ctls = series.map((s) => s.ctl);
  const atls = series.map((s) => s.atl);
  const tsbs = series.map((s) => s.tsb);
  const tsss = series.map((s) => s.tss);

  const maxCtlAtl = Math.max(...ctls, ...atls, 1);
  const maxTss = Math.max(...tsss, 1);

  const ctlD = ctlPath(ctls, maxCtlAtl);
  const atlD = ctlPath(atls, maxCtlAtl);
  const tsbD = tsbPath(tsbs);

  const n = series.length;

  // Date axis: first, ~1/3, ~2/3, today
  const axisIdxs = [0, Math.floor(n * 0.33), Math.floor(n * 0.66), n - 1];
  const axisLabels = axisIdxs.map((i) => ({
    x: (i / (n - 1)) * 1140,
    label: i === n - 1 ? `${formatDate(series[i].date)} · today` : formatDate(series[i].date),
    anchor: i === n - 1 ? "end" : i === 0 ? "start" : "middle",
  }));

  // Phase labels at quarters
  const phaseNames = ["BASE", "BUILD 1", "BUILD 2", "PEAK"];
  const phases = phaseNames.map((name, q) => ({
    x: (((q * 0.25 + 0.04) * n) / (n - 1)) * 1140,
    name,
  }));
  const phaseLines = [0.25, 0.5, 0.75].map((f) => ((f * n) / (n - 1)) * 1140);

  const nowY = 180 - (ctls[n - 1] / maxCtlAtl) * 170;

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", padding: "14px 18px" }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--fg-2)",
          }}
        >
          Performance Management
        </h3>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            fontSize: 11,
            color: "var(--fg-2)",
            alignItems: "center",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span
              style={{ width: 12, height: 2, background: "var(--run)", display: "inline-block" }}
            />
            CTL
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 12,
                height: 0,
                borderTop: "2px dashed var(--bike)",
                display: "inline-block",
              }}
            />
            ATL
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span
              style={{ width: 12, height: 2, background: "var(--swim)", display: "inline-block" }}
            />
            TSB
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 7,
                height: 7,
                background: "var(--fg-3)",
                borderRadius: 1,
                display: "inline-block",
              }}
            />
            daily TSS
          </span>
        </div>
      </div>
      <div style={{ position: "relative", minHeight: 240 }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1140 280"
          preserveAspectRatio="none"
          style={{ overflow: "visible", display: "block", minHeight: 240 }}
          aria-hidden="true"
        >
          {/* Horizontal gridlines */}
          {[40, 80, 120, 160].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="1140"
              y2={y}
              stroke="var(--line-soft)"
              strokeDasharray="2 4"
            />
          ))}

          {/* TSB zero baseline */}
          <line x1="0" y1="180" x2="1140" y2="180" stroke="var(--line)" strokeDasharray="3 3" />

          {/* Daily TSS bars */}
          {tsss.map((v, i) => {
            const x = (i / (n - 1)) * 1140;
            const h = (v / maxTss) * 50;
            return (
              <rect
                key={x.toFixed(2)}
                x={x - 1.5}
                y={280 - h}
                width="3"
                height={h}
                fill="var(--fg-3)"
                opacity="0.55"
              />
            );
          })}

          {phaseLines.map((x) => (
            <line
              key={x}
              x1={x}
              y1="20"
              x2={x}
              y2="270"
              stroke="var(--line)"
              strokeDasharray="1 4"
            />
          ))}
          <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-2)">
            {phases.map(({ x, name }) => (
              <text key={name} x={x} y="14">
                {name}
              </text>
            ))}
          </g>

          {/* CTL filled area + line */}
          <path d={`${ctlD} L 1140 180 L 0 180 Z`} fill="var(--run)" opacity="0.08" />
          <path d={ctlD} stroke="var(--run)" strokeWidth="2.2" fill="none" />

          {/* ATL dashed line */}
          <path d={atlD} stroke="var(--bike)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />

          {/* TSB line */}
          <path d={tsbD} stroke="var(--swim)" strokeWidth="1.5" fill="none" />

          {/* Now marker */}
          <line
            x1="1140"
            y1="0"
            x2="1140"
            y2="280"
            stroke="var(--fg-0)"
            strokeOpacity="0.35"
            strokeDasharray="2 3"
          />
          <circle
            cx="1140"
            cy={nowY}
            r="4"
            fill="var(--bg-0)"
            stroke="var(--run)"
            strokeWidth="2"
          />

          {/* X-axis date labels */}
          <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-3)">
            {axisLabels.map(({ x, label, anchor }) => (
              <text key={label} x={x} y="276" textAnchor={anchor as "start" | "middle" | "end"}>
                {label}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

function WeeklyVolume({ weekly }: { weekly: LoadResponse["weekly"] }) {
  const shown = weekly.slice(-16);
  if (shown.length === 0) return null;

  const maxTotal = Math.max(
    ...shown.map((w) => SPORTS.reduce((s, sp) => s + (w.bySport[sp] ?? 0), 0)),
    1
  );

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--fg-2)",
          }}
        >
          Weekly volume by sport · {shown.length}w
        </h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {SPORTS.map((sp) => (
            <span
              key={sp}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "var(--fg-2)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: `var(--${sp})`,
                  display: "inline-block",
                }}
              />
              {SPORT_LABELS[sp]}
            </span>
          ))}
        </div>
      </div>
      <svg
        width="100%"
        height="80"
        viewBox="0 0 1140 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {shown.map((w, i) => {
          const barW = 1140 / shown.length - 6;
          const x = i * (1140 / shown.length) + 3;
          let y = 70;
          return (
            <g key={w.weekStart}>
              {[...SPORTS].map((sp) => {
                const h = ((w.bySport[sp] ?? 0) / maxTotal) * 64;
                y -= h;
                return (
                  <rect
                    key={sp}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={`var(--${sp})`}
                    opacity="0.9"
                  />
                );
              })}
              <text
                x={x + barW / 2}
                y={78}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fill="var(--fg-3)"
              >
                w{i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── main screen ──────────────────────────────────────────────────────────────

export function TrainingLoad() {
  const [range, setRange] = useState<Range>("120d");
  const { data, isLoading } = useLoad(range);

  const rangeSelector = (
    <div style={{ display: "flex", gap: 6 }}>
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRange(r)}
          className="transition-colors"
          style={{
            padding: "3px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            background: range === r ? "var(--bg-3)" : "transparent",
            color: range === r ? "var(--fg-0)" : "var(--fg-2)",
            border: `1px solid ${range === r ? "var(--line)" : "transparent"}`,
            cursor: "pointer",
          }}
        >
          {r}
        </button>
      ))}
    </div>
  );

  // Compute deltas and ramp from series once data is loaded
  const ctlDelta = data ? getDelta(data.series, "ctl", 28) : "";
  const atlDelta = data ? getDelta(data.series, "atl", 7) : "";
  const tsbDelta = data ? getDelta(data.series, "tsb", 7) : "";
  const rampPerWeek =
    data && data.series.length >= 8
      ? data.series[data.series.length - 1].ctl - data.series[data.series.length - 8].ctl
      : data
        ? data.current.rampPctWoW
        : 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Library", "Training load", RANGE_LABELS[range]]} right={rangeSelector} />
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
            <SkeletonCard key={i} />
          ))}

        {data && (
          <>
            {/* 4 metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <BigStat
                label="CTL · Fitness"
                value={data.current.ctl.toFixed(0)}
                delta={ctlDelta}
                tone="var(--run)"
                desc="rolling 42d load average"
              />
              <BigStat
                label="ATL · Fatigue"
                value={data.current.atl.toFixed(0)}
                delta={atlDelta}
                tone="var(--bike)"
                desc="rolling 7d load average"
              />
              <BigStat
                label="TSB · Form"
                value={
                  data.current.tsb > 0
                    ? `+${data.current.tsb.toFixed(0)}`
                    : data.current.tsb.toFixed(0)
                }
                delta={tsbDelta}
                tone="var(--swim)"
                desc="CTL − ATL"
              />
              <RampCard rampPerWeek={rampPerWeek} />
            </div>

            {/* Performance Management chart */}
            <PerfChart series={data.series} />

            {/* Weekly Volume by Sport */}
            <WeeklyVolume weekly={data.weekly} />

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div className="space-y-2">
                {data.recommendations.map((r) => (
                  <div key={r.body} className="card">
                    <span
                      className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded-sm mr-2"
                      style={{
                        background:
                          r.kind === "fatigue"
                            ? "color-mix(in oklch, var(--tangerine) 20%, transparent)"
                            : "color-mix(in oklch, var(--lime) 20%, transparent)",
                        color: r.kind === "fatigue" ? "var(--tangerine)" : "var(--lime)",
                      }}
                    >
                      {r.kind}
                    </span>
                    <span className="text-[13px] text-fg-1">{r.body}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
