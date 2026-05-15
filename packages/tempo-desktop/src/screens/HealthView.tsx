import { useState } from "react";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { type HealthWindow, useHealth } from "../hooks/useHealth";
import { fmtDurationHuman } from "../lib/format";

const WINDOWS: HealthWindow[] = ["7d", "30d", "90d", "1y"];
const SLEEP_STAGE_COLOR = ["var(--fg-3)", "var(--z2)", "var(--z3)", "var(--z5)"];
const SLEEP_STAGE_LABEL = ["Awake", "Light", "REM", "Deep"];

function Sparkline({ data, color }: { data: (number | null)[]; color: string }) {
  const vals = data.filter((v): v is number => v !== null);
  if (!vals.length) return <div className="h-8 empty-card rounded-sm" />;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const w = 200;
  const h = 32;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = v !== null ? h - 4 - ((v - min) / span) * (h - 8) : null;
      return y !== null ? `${i === 0 ? "M" : "L"}${x.toFixed(0)} ${y.toFixed(0)}` : null;
    })
    .filter(Boolean)
    .join(" ");
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <path d={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HealthView() {
  const [window, setWindow] = useState<HealthWindow>("30d");
  const { data, isLoading } = useHealth(window);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Health"]} />
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {/* Window selector */}
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className="px-3 py-1 rounded-sm text-[12px] font-mono transition-colors"
              style={{
                background: window === w ? "var(--bg-3)" : "transparent",
                color: window === w ? "var(--fg-0)" : "var(--fg-2)",
                border: "1px solid",
                borderColor: window === w ? "var(--line)" : "transparent",
                cursor: "pointer",
              }}
            >
              {w}
            </button>
          ))}
        </div>

        {isLoading && <SkeletonCard className="h-48" />}

        {data && (
          <>
            {/* Series sparklines */}
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "hrv" as const, label: "HRV", color: "var(--violet)", unit: "ms" },
                  { key: "rhr" as const, label: "Resting HR", color: "var(--cyan)", unit: "bpm" },
                  { key: "stress" as const, label: "Stress", color: "var(--tangerine)", unit: "" },
                  {
                    key: "bodyBattery" as const,
                    label: "Body Battery",
                    color: "var(--lime)",
                    unit: "",
                  },
                  { key: "spo2" as const, label: "SpO₂", color: "var(--solar)", unit: "%" },
                  { key: "sleepHours" as const, label: "Sleep", color: "var(--z3)", unit: "h" },
                ] as const
              ).map(({ key, label, color, unit }) => (
                <div key={key} className="card">
                  <h3>{label}</h3>
                  <Sparkline data={data.series[key]} color={color} />
                  {data.series[key].filter(Boolean).length > 0 && (
                    <div className="text-[11px] font-mono text-fg-2 mt-1 num">
                      avg{" "}
                      {(
                        data.series[key]
                          .filter((v): v is number => v !== null)
                          .reduce((a, b) => a + b, 0) /
                        data.series[key].filter((v) => v !== null).length
                      ).toFixed(1)}{" "}
                      {unit}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Last night */}
            {data.lastNight && (
              <div className="card">
                <h3>Last Night</h3>
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <div className="text-[28px] font-[550] tracking-[-0.03em] num text-fg-0">
                      {fmtDurationHuman(data.lastNight.durationS)}
                    </div>
                    <div className="text-[11px] font-mono text-fg-2">
                      {data.lastNight.bedTimeLocal} → {data.lastNight.wakeTimeLocal}
                    </div>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-md text-center"
                    style={{ background: "var(--bg-2)" }}
                  >
                    <div className="text-[22px] font-[550] num text-fg-0">
                      {data.lastNight.score}
                    </div>
                    <div className="text-[10px] text-fg-2">{data.lastNight.scoreLabel}</div>
                  </div>
                </div>

                {/* Sleep stages timeline */}
                {data.lastNight.blocks5min.length > 0 && (
                  <div className="flex gap-px rounded overflow-hidden" style={{ height: 16 }}>
                    {data.lastNight.blocks5min.map((stage, i) => (
                      <div
                        key={`block-${i}`}
                        style={{ flex: 1, background: SLEEP_STAGE_COLOR[stage] }}
                        title={SLEEP_STAGE_LABEL[stage]}
                      />
                    ))}
                  </div>
                )}

                {/* Stage totals */}
                <div className="flex gap-3 mt-2">
                  {(
                    [
                      { key: "deepS" as const, label: "Deep", color: "var(--z5)" },
                      { key: "remS" as const, label: "REM", color: "var(--z3)" },
                      { key: "lightS" as const, label: "Light", color: "var(--z2)" },
                      { key: "awakeS" as const, label: "Awake", color: "var(--fg-3)" },
                    ] as const
                  ).map(({ key, label, color }) => (
                    <div key={key} className="flex items-center gap-1.5 text-[11px]">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <span className="text-fg-2">{label}</span>
                      <span className="font-mono text-fg-0 num">
                        {fmtDurationHuman(data.lastNight.totals[key])}
                      </span>
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
