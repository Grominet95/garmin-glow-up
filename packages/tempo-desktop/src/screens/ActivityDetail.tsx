import { Chip } from "../components/Chip";
import { SkeletonCard } from "../components/Skeleton";
import { Stat } from "../components/Stat";
import { TopBar } from "../components/TopBar";
import { useActivity } from "../hooks/useActivity";

const ZONE_COLORS = ["var(--z1)", "var(--z2)", "var(--z3)", "var(--z4)", "var(--z5)"];

interface Props {
  id: number;
}

export function ActivityDetail({ id }: Props) {
  const { data, isLoading, error } = useActivity(id);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumbs={["Activity", "Loading…"]} />
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumbs={["Activity"]} />
        <div className="flex-1 flex items-center justify-center text-fg-2">Activity not found</div>
      </div>
    );
  }

  const accentColor = `var(--${data.accent})`;

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      <TopBar crumbs={["Activity", data.title]} />
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {/* Header */}
        <div className="card" style={{ borderLeft: `2px solid ${accentColor}` }}>
          <h2 className="text-[18px] font-[550] tracking-[-0.02em] text-fg-0 m-0 mb-1">
            {data.title}
          </h2>
          <p className="text-[12px] text-fg-2 m-0">{data.subtitle}</p>
        </div>

        {/* Hero stats */}
        <div className="card">
          <h3>Stats</h3>
          <div className="grid grid-cols-4 gap-4">
            {data.hero.map((s) => (
              <Stat
                key={s.label}
                label={s.label}
                value={s.value}
                unit={s.unit}
                tone={s.tone as "positive" | "negative" | "neutral" | undefined}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* HR Zones */}
          <div className="card">
            <h3>HR Zones</h3>
            <div className="space-y-1.5">
              {data.zones.map((z) => (
                <div key={z.z} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-fg-3 w-4">{z.z}</span>
                  <div
                    className="flex-1 rounded overflow-hidden"
                    style={{ height: 6, background: "var(--bg-3)" }}
                  >
                    <div
                      style={{
                        width: `${z.pct}%`,
                        height: "100%",
                        background: ZONE_COLORS[z.z - 1],
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-fg-2 w-10 text-right">
                    {z.pct.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-fg-3 w-16">{z.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 text-[11px] font-mono text-fg-2">
              <span>Avg {data.hrSummary.avg} bpm</span>
              <span>Max {data.hrSummary.max} bpm</span>
            </div>
          </div>

          {/* Training effect */}
          <div className="card">
            <h3>Training Effect</h3>
            <div className="text-[15px] font-medium text-fg-0 mb-1">
              {data.trainingEffect.headline}
            </div>
            <div className="flex gap-4 mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fg-3">Aerobic</div>
                <div className="text-[20px] font-[550] num" style={{ color: "var(--lime)" }}>
                  {data.trainingEffect.aerobic.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fg-3">Anaerobic</div>
                <div className="text-[20px] font-[550] num" style={{ color: "var(--tangerine)" }}>
                  {data.trainingEffect.anaerobic.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fg-3">EPOC</div>
                <div className="text-[20px] font-[550] num">
                  {data.trainingEffect.epoc.toFixed(1)}
                </div>
              </div>
            </div>
            <div className="text-[12px] text-fg-2">
              Recovery: {data.trainingEffect.recoveryHours}h
            </div>
          </div>
        </div>

        {/* Splits */}
        {data.splits.length > 0 && (
          <div className="card">
            <h3>Splits</h3>
            <div className="space-y-0.5">
              {data.splits.map((split) => (
                <div
                  key={split.k}
                  className="flex items-center gap-3 py-1 border-b border-line-soft last:border-0 text-[12px]"
                >
                  <span className="font-mono text-fg-3 w-8">{split.k}</span>
                  <span className="font-mono text-fg-0 w-14">{split.paceDisplay}</span>
                  <span className="font-mono text-fg-2 w-14">{split.hr} bpm</span>
                  <span className="font-mono text-fg-2 w-14">{split.cad} spm</span>
                  <span
                    className="font-mono w-12"
                    style={{ color: split.elevDelta > 0 ? "var(--tangerine)" : "var(--cyan)" }}
                  >
                    {split.elevDelta > 0 ? "+" : ""}
                    {Math.round(split.elevDelta)}m
                  </span>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ZONE_COLORS[split.zone - 1] }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Running dynamics */}
        {data.dynamics && (
          <div className="card">
            <h3>Running Dynamics</h3>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Vert. Osc." value={data.dynamics.verticalOscCm.toFixed(1)} unit="cm" />
              <Stat
                label="GCT"
                value={String(Math.round(data.dynamics.groundContactMs))}
                unit="ms"
              />
              <Stat label="Stride" value={data.dynamics.strideLengthM.toFixed(2)} unit="m" />
            </div>
          </div>
        )}

        {/* Missing data notice */}
        {data.missing.length > 0 && (
          <div className="text-[11px] text-fg-3 font-mono">No data: {data.missing.join(", ")}</div>
        )}
      </div>
    </div>
  );
}
