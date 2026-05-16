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
  if (n < 2) return null;

  const W = 1000;
  const H = 200;
  const PAD_T = 20;
  const PAD_B = 22;
  const chartH = H - PAD_T - PAD_B;

  const minVal = Math.floor(Math.min(...values) - 1);
  const maxVal = Math.ceil(Math.max(...values) + 1);
  const span = maxVal - minVal || 1;

  const toX = (i: number) => (i / (n - 1)) * W;
  const toY = (v: number) => PAD_T + chartH - ((v - minVal) / span) * chartH;

  const pts = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");
  const area = `${pts} L${W} ${H - PAD_B} L0 ${H - PAD_B} Z`;

  const gridMin = Math.ceil(minVal / 5) * 5;
  const gridLines: number[] = [];
  for (let v = gridMin; v <= maxVal; v += 5) gridLines.push(v);

  const axisIdxs = [0, Math.floor(n * 0.33), Math.floor(n * 0.66), n - 1];
  const fmtMonth = (iso: string) => {
    const [y, m] = iso.split("-");
    return new Date(+y, +m - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const nowY = toY(values[n - 1]);

  // Fitness age reference line — invert the _fitness_age lookup
  const faRefVo2 =
    fitnessAge == null
      ? null
      : fitnessAge <= 20
        ? 62
        : fitnessAge <= 24
          ? 58
          : fitnessAge <= 28
            ? 54
            : fitnessAge <= 32
              ? 50
              : 46;
  const faInRange = faRefVo2 !== null && faRefVo2 >= minVal && faRefVo2 <= maxVal;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vo2g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--run)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--run)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map((v) => (
        <g key={v}>
          <line
            x1="0"
            y1={toY(v)}
            x2={W}
            y2={toY(v)}
            stroke="var(--line-soft)"
            strokeDasharray="2 5"
          />
          <text x="4" y={toY(v) - 4} fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-3)">
            {v}
          </text>
        </g>
      ))}

      {/* Fitness age line */}
      {faInRange && faRefVo2 !== null && (
        <g>
          <line
            x1="0"
            y1={toY(faRefVo2)}
            x2={W}
            y2={toY(faRefVo2)}
            stroke="var(--violet)"
            strokeDasharray="3 6"
            strokeWidth="1.5"
            opacity="0.65"
          />
          <text
            x={W - 4}
            y={toY(faRefVo2) - 5}
            fontSize="10"
            fontFamily="var(--font-mono)"
            fill="var(--violet)"
            textAnchor="end"
            opacity="0.8"
          >
            Fitness age {fitnessAge}
          </text>
        </g>
      )}

      {/* Area + line */}
      <path d={area} fill="url(#vo2g)" />
      <path
        d={pts}
        stroke="var(--run)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Today marker */}
      <circle cx={W} cy={nowY} r="5" fill="var(--bg-1)" stroke="var(--run)" strokeWidth="2.5" />
      <text
        x={W - 8}
        y={PAD_T - 5}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--fg-3)"
        textAnchor="end"
      >
        Today
      </text>

      {/* X-axis */}
      <g fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-3)">
        {axisIdxs.map((i, idx) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 2}
            textAnchor={idx === 0 ? "start" : idx === axisIdxs.length - 1 ? "end" : "middle"}
          >
            {fmtMonth(months[i])}
          </text>
        ))}
      </g>
    </svg>
  );
}

// ── Race Predictions ─────────────────────────────────────────────────────────

function PredictionRow({ p }: { p: ProgressResponse["predictions"][number] }) {
  const faster = p.deltaPct !== null && p.deltaPct < 0;
  const barPct = p.prSecs ? Math.min(100, (p.prSecs / p.predictedSecs) * 100) : 0;

  const prDateFmt = (() => {
    if (!p.prDate || p.prDate === "--") return null;
    const d = new Date(p.prDate);
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  })();

  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        background: p.featured ? "var(--bg-2)" : "transparent",
        border: p.featured ? "1px solid var(--line)" : "1px solid transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {/* Distance label */}
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: "var(--fg-3)",
            width: 68,
            flexShrink: 0,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {p.distLabel}
        </span>

        {/* Predicted time */}
        <span
          style={{
            fontSize: p.featured ? 22 : 18,
            fontWeight: 570,
            letterSpacing: "-0.02em",
            color: p.featured ? "var(--tangerine)" : "var(--fg-0)",
            fontFamily: "var(--font-mono)",
            flex: 1,
            minWidth: 0,
          }}
        >
          {p.predictedDisplay}
        </span>

        {/* PR + delta */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {p.prDisplay !== "--" && (
            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--fg-2)",
                lineHeight: 1.3,
              }}
            >
              PR {p.prDisplay}
              {prDateFmt && <span style={{ color: "var(--fg-3)" }}> · {prDateFmt}</span>}
            </div>
          )}
          {p.deltaPct !== null && (
            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                color: faster ? "var(--lime)" : "var(--tangerine)",
              }}
            >
              {p.deltaPct > 0 ? "+" : ""}
              {p.deltaPct}%
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {barPct > 0 && (
        <div style={{ marginTop: 5, height: 3, borderRadius: 999, background: "var(--bg-3)" }}>
          <div
            style={{
              height: "100%",
              width: `${barPct}%`,
              borderRadius: 999,
              background: p.featured ? "var(--tangerine)" : "var(--run)",
              opacity: 0.75,
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
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--fg-2)",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Course Records
      </div>
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
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  color: "var(--fg-0)",
                  fontWeight: 550,
                }}
              >
                {c.timeDisplay}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  minWidth: 40,
                  textAlign: "right",
                  color: isPr || faster ? "var(--lime)" : "var(--fg-3)",
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
  const pr = highlights.find((h) => h.kind === "pr");
  const trend = highlights.find((h) => h.kind === "trend");
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {pr && (
        <span
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
          + {pr.body.replace("New PR: ", "")}
        </span>
      )}
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
  const vo2 = data?.vo2max;
  const hasVo2 = (vo2?.values?.length ?? 0) >= 2;
  const currentVo2 = vo2?.values?.[(vo2?.values?.length ?? 0) - 1];

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
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
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
                {hasVo2 && (
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
                    {vo2?.months?.length} months
                  </span>
                )}
              </div>

              {hasVo2 ? (
                <>
                  {/* Value + badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 4,
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
                      {currentVo2?.toFixed(1)}
                    </span>
                    <span
                      style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}
                    >
                      ml/kg/min
                    </span>
                    {vo2?.fitnessAge != null && (
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: "color-mix(in oklch, var(--tangerine) 18%, transparent)",
                          color: "var(--tangerine)",
                          border:
                            "1px solid color-mix(in oklch, var(--tangerine) 30%, transparent)",
                        }}
                      >
                        ↑ Fitness age {vo2.fitnessAge}
                      </span>
                    )}
                  </div>

                  {/* Delta */}
                  {(vo2?.deltaLast90d ?? 0) !== 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--font-mono)",
                          padding: "2px 7px",
                          borderRadius: 6,
                          background:
                            (vo2?.deltaLast90d ?? 0) > 0
                              ? "color-mix(in oklch, var(--run) 18%, transparent)"
                              : "color-mix(in oklch, var(--tangerine) 18%, transparent)",
                          color: (vo2?.deltaLast90d ?? 0) > 0 ? "var(--run)" : "var(--tangerine)",
                        }}
                      >
                        {(vo2?.deltaLast90d ?? 0) > 0 ? "+" : ""}
                        {vo2?.deltaLast90d} in 90 days
                      </span>
                    </div>
                  )}

                  <Vo2maxChart
                    months={vo2?.months ?? []}
                    values={vo2?.values ?? []}
                    fitnessAge={vo2?.fitnessAge ?? null}
                  />
                </>
              ) : (
                /* Empty state */
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 6 }}>
                    No VO₂max history yet
                  </div>
                  <div
                    style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}
                  >
                    Run a sync — Garmin training status will populate this chart
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column ─────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Race Predictions */}
              {predictions.length > 0 && (
                <div className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {predictions.map((p) => (
                      <PredictionRow key={p.distance} p={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Race PRs — only when no predictions */}
              {predictions.length === 0 && (
                <div className="card" style={{ padding: "14px 16px" }}>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--fg-2)",
                      fontWeight: 600,
                      marginBottom: 10,
                    }}
                  >
                    Race PRs
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {data.races
                      .filter((r) => r.prDisplay !== "--")
                      .map((r) => (
                        <div
                          key={r.distance}
                          style={{ display: "flex", alignItems: "baseline", gap: 8 }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: "var(--font-mono)",
                              color: "var(--fg-3)",
                              width: 70,
                              textTransform: "uppercase",
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
