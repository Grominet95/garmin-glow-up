import { Icon } from "../components/Icon";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { useProgress } from "../hooks/useProgress";
import { todayISO } from "../lib/time";

const SPORT_COLOR: Record<string, string> = {
  run: "var(--run)",
  bike: "var(--bike)",
  swim: "var(--swim)",
  trail: "var(--trail)",
  lift: "var(--lift)",
  walk: "var(--walk)",
};

export function ProgressView() {
  const { data, isLoading } = useProgress();
  const today = todayISO();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={["Progress"]} />
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <SkeletonCard key={i} />
          ))}

        {data && (
          <>
            {/* Fresh PR highlight */}
            {data.highlights
              .filter((h) => h.kind === "pr" && h.dateLocal >= weekAgo)
              .map((h) => (
                <div
                  key={h.dateLocal + h.body}
                  className="card flex items-center gap-3"
                  style={{ borderColor: "color-mix(in oklch, var(--rose) 40%, transparent)" }}
                >
                  <span className="spark">
                    <Icon name="sparkle" size={14} color="var(--rose)" />
                  </span>
                  <span className="text-[13px] font-medium text-fg-0">{h.body}</span>
                  <span className="ml-auto text-[11px] font-mono text-fg-3">{h.dateLocal}</span>
                </div>
              ))}

            {/* VO2max */}
            {data.vo2max.values.length > 0 && (
              <div className="card">
                <h3>VO₂max</h3>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-[32px] font-[550] tracking-[-0.03em] num text-fg-0">
                    {data.vo2max.values[data.vo2max.values.length - 1]?.toFixed(1)}
                  </span>
                  <span className="text-[12px] font-mono text-fg-2">ml/kg/min</span>
                  {data.vo2max.deltaLast90d !== 0 && (
                    <span
                      className="text-[12px] font-mono"
                      style={{
                        color: data.vo2max.deltaLast90d > 0 ? "var(--lime)" : "var(--tangerine)",
                      }}
                    >
                      {data.vo2max.deltaLast90d > 0 ? "+" : ""}
                      {data.vo2max.deltaLast90d} (90d)
                    </span>
                  )}
                </div>
                <svg
                  width="100%"
                  height="40"
                  viewBox="0 0 400 40"
                  preserveAspectRatio="none"
                  style={{ display: "block" }}
                  aria-hidden="true"
                >
                  {(() => {
                    const vals = data.vo2max.values;
                    const n = vals.length;
                    if (n < 2) return null;
                    const min = Math.min(...vals);
                    const max = Math.max(...vals);
                    const span = max - min || 1;
                    const d = vals
                      .map(
                        (v, i) =>
                          `${i === 0 ? "M" : "L"}${((i / (n - 1)) * 400).toFixed(0)} ${(40 - 4 - ((v - min) / span) * 32).toFixed(0)}`
                      )
                      .join(" ");
                    return (
                      <path
                        d={d}
                        fill="none"
                        stroke="var(--violet)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    );
                  })()}
                </svg>
              </div>
            )}

            {/* Race PRs */}
            <div className="card">
              <h3>Race PRs</h3>
              <div className="grid grid-cols-3 gap-3">
                {data.races.map((r) => (
                  <div
                    key={r.distance}
                    className="p-3 rounded-md"
                    style={{
                      background: r.featured ? "var(--bg-2)" : "transparent",
                      border: r.featured ? "1px solid var(--line-soft)" : "none",
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-fg-3 font-medium mb-1">
                      {r.distance}
                    </div>
                    <div className="text-[18px] font-[550] tracking-[-0.02em] num text-fg-0">
                      {r.prDisplay}
                    </div>
                    {r.prDate !== "--" && (
                      <div className="text-[10px] font-mono text-fg-3 mt-0.5">{r.prDate}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Courses */}
            {data.courses.length > 0 && (
              <div className="card">
                <h3>Course Bests</h3>
                <div className="space-y-1.5">
                  {data.courses.map((c) => (
                    <div key={c.name} className="flex items-center gap-3 text-[12px]">
                      <span className="text-fg-0 flex-1">{c.name}</span>
                      <span className="font-mono text-fg-0 num">{c.timeDisplay}</span>
                      <span
                        className="font-mono text-[11px]"
                        style={{
                          color:
                            c.deltaDisplay === "PR" || c.deltaDisplay.startsWith("-")
                              ? "var(--lime)"
                              : "var(--fg-2)",
                        }}
                      >
                        {c.deltaDisplay}
                      </span>
                      <span className="font-mono text-fg-3">{c.dateLocal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Badges */}
            {data.badges.length > 0 && (
              <div className="card">
                <h3>Badges</h3>
                <div className="flex flex-wrap gap-2">
                  {data.badges.map((b) => (
                    <div
                      key={b.slug}
                      className="flex flex-col items-center gap-1 p-2 rounded-md text-center"
                      style={{
                        background: "var(--bg-2)",
                        opacity: b.earned ? 1 : 0.35,
                        minWidth: 60,
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-full grid place-items-center"
                        style={{
                          background: b.earned
                            ? (SPORT_COLOR[b.sport] ?? "var(--fg-3)")
                            : "var(--bg-3)",
                        }}
                      >
                        <Icon
                          name="trophy"
                          size={12}
                          color={b.earned ? "var(--bg-1)" : "var(--fg-3)"}
                        />
                      </span>
                      <span className="text-[9px] text-fg-2 leading-tight">{b.label}</span>
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
