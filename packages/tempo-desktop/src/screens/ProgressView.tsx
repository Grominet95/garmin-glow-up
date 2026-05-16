import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { type ProgressResponse, useProgress } from "../hooks/useProgress";

// ── VO2max area chart ────────────────────────────────────────────────────────

function Vo2maxChart({
  months,
  values,
  fitnessAge,
}: {
  months: string[];
  values: number[];
  fitnessAge: number | null;
}) {
  const n = values.length;
  if (n < 2)
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-3)",
          fontSize: 13,
        }}
      >
        Not enough data
      </div>
    );

  const W = 1000;
  const H = 220;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 24;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const minVal = Math.floor(Math.min(...values) - 1);
  const maxVal = Math.ceil(Math.max(...values) + 1);
  const span = maxVal - minVal || 1;

  const toX = (i: number) => (i / (n - 1)) * W;
  const toY = (v: number) => PAD_TOP + chartH - ((v - minVal) / span) * chartH;

  const linePts = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePts} L${W} ${H - PAD_BOTTOM} L0 ${H - PAD_BOTTOM} Z`;

  // Y-axis grid lines at every 5 units
  const gridMin = Math.ceil(minVal / 5) * 5;
  const gridLines: number[] = [];
  for (let v = gridMin; v <= maxVal; v += 5) gridLines.push(v);

  // Date axis labels
  const axisIdxs = [0, Math.floor(n * 0.33), Math.floor(n * 0.66), n - 1];
  const fmtMonth = (iso: string) => {
    const [y, m] = iso.split("-");
    return new Date(+y, +m - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const nowX = W;
  const nowY = toY(values[n - 1]);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vo2grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--run)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--run)" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Grid lines + Y labels */}
      {gridLines.map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1="0" y1={y} x2={W} y2={y} stroke="var(--line-soft)" strokeDasharray="2 5" />
            <text
              x="0"
              y={y - 4}
              fontSize="11"
              fontFamily="var(--font-mono)"
              fill="var(--fg-3)"
              textAnchor="start"
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* Fitness age reference line */}
      {fitnessAge !== null &&
        (() => {
          // Reference VO2max for fitness age: invert the lookup table
          const refVo2 =
            fitnessAge <= 20
              ? 62
              : fitnessAge <= 24
                ? 58
                : fitnessAge <= 28
                  ? 54
                  : fitnessAge <= 32
                    ? 50
                    : 46;
          if (refVo2 < minVal || refVo2 > maxVal) return null;
          const fy = toY(refVo2);
          return (
            <g>
              <line
                x1="0"
                y1={fy}
                x2={W}
                y2={fy}
                stroke="var(--violet)"
                strokeDasharray="3 6"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text
                x={W - 4}
                y={fy - 5}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="var(--violet)"
                textAnchor="end"
                opacity="0.8"
              >
                Fitness age {fitnessAge}
              </text>
            </g>
          );
        })()}

      {/* Area fill */}
      <path d={areaPath} fill="url(#vo2grad)" />

      {/* Line */}
      <path
        d={linePts}
        stroke="var(--run)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Today marker */}
      <circle cx={nowX} cy={nowY} r="5" fill="var(--bg-1)" stroke="var(--run)" strokeWidth="2.5" />
      <text
        x={nowX - 6}
        y={PAD_TOP - 4}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--fg-3)"
        textAnchor="end"
      >
        Today
      </text>

      {/* X-axis date labels */}
      <g fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-3)">
        {axisIdxs.map((i, idx) => {
          const x = toX(i);
          const anchor = idx === 0 ? "start" : idx === axisIdxs.length - 1 ? "end" : "middle";
          return (
            <text key={i} x={x} y={H - 2} textAnchor={anchor}>
              {fmtMonth(months[i])}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

// ── Race Predictions ─────────────────────────────────────────────────────────

function PredictionRow({ p }: { p: ProgressResponse["predictions"][number] }) {
  const faster = p.deltaPct !== null && p.deltaPct < 0;
  const barPct = p.prSecs ? Math.min(100, (p.prSecs / p.predictedSecs) * 100) : 50;

  const fmtPrDate = (iso: string) => {
    if (!iso || iso === "--") return null;
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };
  const prDateFmt = fmtPrDate(p.prDate);

  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: p.featured ? "var(--bg-2)" : "transparent",
        border: p.featured ? "1px solid var(--line-soft)" : "1px solid transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--fg-3)",
            width: 72,
            flexShrink: 0,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {p.distLabel}
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 550,
            letterSpacing: "-0.02em",
            color: p.featured ? "var(--tangerine)" : "var(--fg-0)",
            fontFamily: "var(--font-mono)",
            flex: 1,
          }}
        >
          {p.predictedDisplay}
        </span>
        <div style={{ textAlign: "right" }}>
          {p.prDisplay !== "--" && (
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}>
              PR {p.prDisplay}
              {prDateFmt && <span style={{ color: "var(--fg-3)" }}> · {prDateFmt}</span>}
            </div>
          )}
          {p.deltaPct !== null && (
            <div
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                color: faster ? "var(--lime)" : "var(--tangerine)",
                fontWeight: 500,
              }}
            >
              {p.deltaPct > 0 ? "+" : ""}
              {p.deltaPct}%
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {p.prSecs && (
        <div
          style={{
            marginTop: 6,
            height: 3,
            borderRadius: 999,
            background: "var(--bg-3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${barPct}%`,
              borderRadius: 999,
              background: p.featured ? "var(--tangerine)" : "var(--run)",
              opacity: 0.8,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Course Records ────────────────────────────────────────────────────────────

function CourseRecords({ courses }: { courses: ProgressResponse["courses"] }) {
  if (courses.length === 0) return null;
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <h3
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--fg-2)",
          margin: "0 0 10px",
          fontWeight: 600,
        }}
      >
        Course Records
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {courses.map((c) => {
          const isPr = c.deltaDisplay === "PR";
          const faster = !isPr && c.deltaDisplay.startsWith("-");
          return (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--fg-0)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    color: "var(--fg-3)",
                    marginTop: 1,
                  }}
                >
                  {c.dateLocal}
                </div>
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontFamily: "var(--font-mono)",
                  color: "var(--fg-0)",
                  fontWeight: 500,
                }}
              >
                {c.timeDisplay}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: isPr ? "var(--lime)" : faster ? "var(--lime)" : "var(--fg-3)",
                  minWidth: 40,
                  textAlign: "right",
                }}
              >
                {c.deltaDisplay}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TopBar highlights ────────────────────────────────────────────────────────

function HighlightChips({ highlights }: { highlights: ProgressResponse["highlights"] }) {
  const prs = highlights.filter((h) => h.kind === "pr").slice(0, 1);
  const trend = highlights.find((h) => h.kind === "trend");
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {prs.map((h) => (
        <span
          key={h.body}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            padding: "3px 10px",
            borderRadius: 999,
            background: "color-mix(in oklch, var(--rose) 18%, transparent)",
            color: "var(--rose)",
            border: "1px solid color-mix(in oklch, var(--rose) 30%, transparent)",
          }}
        >
          + {h.body.replace("New PR: ", "")}
        </span>
      ))}
      {trend && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            color: "var(--fg-1)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--tangerine)",
              display: "inline-block",
            }}
          />
          {trend.body}
        </span>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ProgressView() {
  const { data, isLoading } = useProgress();

  const highlights = data?.highlights ?? [];
  const predictions = data?.predictions ?? [];
  const courses = data?.courses ?? [];
  const topBarRight = highlights.length ? <HighlightChips highlights={highlights} /> : undefined;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar
        crumbs={["Library", "Progress", "VO₂max, predictions & records"]}
        right={topBarRight}
      />

      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
            <SkeletonCard />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        )}

        {data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* ── Left: VO2max ─────────────────────────────────────────── */}
            <div className="card" style={{ padding: "18px 20px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                <span
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--fg-2)",
                    fontWeight: 600,
                  }}
                >
                  VO₂max · Estimated
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--fg-3)",
                    padding: "2px 8px",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 999,
                  }}
                >
                  {data.vo2max.months?.length ?? 0} months
                </span>
              </div>

              {/* Value row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 52,
                    fontWeight: 600,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    color: "var(--fg-0)",
                  }}
                >
                  {data.vo2max.values[data.vo2max.values.length - 1]?.toFixed(1) ?? "--"}
                </span>
                <span
                  style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}
                >
                  ml/kg/min
                </span>
                {data.vo2max.fitnessAge != null && (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "color-mix(in oklch, var(--tangerine) 18%, transparent)",
                      color: "var(--tangerine)",
                      border: "1px solid color-mix(in oklch, var(--tangerine) 30%, transparent)",
                    }}
                  >
                    Fitness age {data.vo2max.fitnessAge}
                  </span>
                )}
              </div>

              {/* Delta line */}
              {data.vo2max.deltaLast90d !== 0 && (
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    marginBottom: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: 6,
                      background:
                        data.vo2max.deltaLast90d > 0
                          ? "color-mix(in oklch, var(--run) 18%, transparent)"
                          : "color-mix(in oklch, var(--tangerine) 18%, transparent)",
                      color: data.vo2max.deltaLast90d > 0 ? "var(--run)" : "var(--tangerine)",
                    }}
                  >
                    {data.vo2max.deltaLast90d > 0 ? "↑" : "↓"}{" "}
                    {data.vo2max.deltaLast90d > 0 ? "+" : ""}
                    {data.vo2max.deltaLast90d} in 90 days
                  </span>
                </div>
              )}

              {/* Chart */}
              <Vo2maxChart
                months={data.vo2max.months ?? []}
                values={data.vo2max.values ?? []}
                fitnessAge={data.vo2max.fitnessAge ?? null}
              />
            </div>

            {/* ── Right column ─────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Race Predictions */}
              {predictions.length > 0 && (
                <div className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--fg-2)",
                        fontWeight: 600,
                      }}
                    >
                      Race Predictions
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        color: "var(--fg-3)",
                      }}
                    >
                      based on last 28d
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {predictions.map((p) => (
                      <PredictionRow key={p.distance} p={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Race PRs fallback (only when no predictions) */}
              {predictions.length === 0 && (
                <div className="card" style={{ padding: "14px 16px" }}>
                  <h3
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--fg-2)",
                      margin: "0 0 10px",
                      fontWeight: 600,
                    }}
                  >
                    Race PRs
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {data.races
                      .filter((r) => r.prDisplay !== "--")
                      .map((r) => (
                        <div
                          key={r.distance}
                          style={{ display: "flex", alignItems: "baseline", gap: 8 }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: "var(--font-mono)",
                              color: "var(--fg-3)",
                              width: 72,
                            }}
                          >
                            {r.distance}
                          </span>
                          <span
                            style={{
                              fontSize: 18,
                              fontFamily: "var(--font-mono)",
                              fontWeight: 550,
                              color: "var(--fg-0)",
                            }}
                          >
                            {r.prDisplay}
                          </span>
                          {r.prDate !== "--" && (
                            <span
                              style={{
                                fontSize: 11,
                                fontFamily: "var(--font-mono)",
                                color: "var(--fg-3)",
                              }}
                            >
                              {r.prDate}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Course Records */}
              <CourseRecords courses={courses} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
