import { useState } from "react";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { useLoad } from "../hooks/useLoad";

const RANGES = ["30d", "90d", "120d", "1y", "all"] as const;
type Range = (typeof RANGES)[number];

export function TrainingLoad() {
  const [range, setRange] = useState<Range>("120d");
  const { data, isLoading } = useLoad(range);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Training Load"]} />
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {/* Range selector */}
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-sm text-[12px] font-mono transition-colors"
              style={{
                background: range === r ? "var(--bg-3)" : "transparent",
                color: range === r ? "var(--fg-0)" : "var(--fg-2)",
                border: "1px solid",
                borderColor: range === r ? "var(--line)" : "transparent",
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <SkeletonCard key={i} />
          ))}

        {data && (
          <>
            {/* Current metrics */}
            <div className="card grid grid-cols-4 gap-6">
              {[
                { label: "CTL", value: data.current.ctl.toFixed(0), color: "var(--cyan)" },
                { label: "ATL", value: data.current.atl.toFixed(0), color: "var(--tangerine)" },
                {
                  label: "TSB",
                  value:
                    data.current.tsb > 0
                      ? `+${data.current.tsb.toFixed(0)}`
                      : data.current.tsb.toFixed(0),
                  color: data.current.tsb >= 0 ? "var(--lime)" : "var(--tangerine)",
                },
                {
                  label: "Ramp",
                  value: `${data.current.rampPctWoW > 0 ? "+" : ""}${data.current.rampPctWoW.toFixed(0)}%`,
                  color: "var(--fg-1)",
                },
              ].map((m) => (
                <div key={m.label}>
                  <div className="text-[11px] uppercase tracking-[0.08em] text-fg-2 font-medium mb-1">
                    {m.label}
                  </div>
                  <div
                    className="text-[28px] font-[550] tracking-[-0.03em] num"
                    style={{ color: m.color }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {/* CTL/ATL chart */}
            <div className="card">
              <h3>Fitness & Fatigue ({data.rangeDays === -1 ? "All" : `${data.rangeDays}d`})</h3>
              {data.series.length > 0 && (
                <svg
                  width="100%"
                  height="80"
                  viewBox="0 0 600 80"
                  preserveAspectRatio="none"
                  style={{ display: "block" }}
                  aria-hidden="true"
                >
                  {(() => {
                    const ctls = data.series.map((s) => s.ctl);
                    const atls = data.series.map((s) => s.atl);
                    const n = data.series.length;
                    const maxV = Math.max(...ctls, ...atls);
                    const span = Math.max(n - 1, 1);
                    const mk = (arr: number[]) =>
                      arr
                        .map(
                          (v, i) =>
                            `${i === 0 ? "M" : "L"}${((i / span) * 600).toFixed(0)} ${(80 - (v / (maxV || 1)) * 76).toFixed(0)}`
                        )
                        .join(" ");
                    return (
                      <>
                        <path
                          d={mk(ctls)}
                          fill="none"
                          stroke="var(--cyan)"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d={mk(atls)}
                          fill="none"
                          stroke="var(--tangerine)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray="4 2"
                        />
                      </>
                    );
                  })()}
                </svg>
              )}
            </div>

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
