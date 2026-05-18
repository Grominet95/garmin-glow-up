import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { CardSwitcher } from "../components/CardSwitcher";
import { Chip } from "../components/Chip";
import { Icon, type IconName } from "../components/Icon";
import { RacePredictorCard } from "../components/RacePredictorCard";
import { ReadinessCard } from "../components/ReadinessCard";
import { SkeletonCard } from "../components/Skeleton";
import { TickArc } from "../components/TickArc";
import { TopBar } from "../components/TopBar";
import { VibeChip } from "../components/VibeChip";
import { useAuthStatus } from "../hooks/useAuthStatus";
import { useDashboard } from "../hooks/useDashboard";
import { fmtHr } from "../lib/format";
import { DashboardEmpty } from "./DashboardEmpty";
import { LoginScreen } from "./LoginScreen";

// ── Helpers ───────────────────────────────────────────────────

function pathD(data: number[], w: number, h: number, padTop = 8, padBottom = 8): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const innerH = h - padTop - padBottom;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: padTop + innerH - ((v - min) / span) * innerH,
  }));
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function fmtSleep(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

// ── Stat column (Last Session) ────────────────────────────────

function StatCol({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div className="num" style={{ fontSize: 17, fontWeight: 550 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        {unit}
      </div>
    </div>
  );
}

// ── Map card — real GPS route or placeholder ──────────────────

function MapCard({ sport, routePolyline }: { sport: string; routePolyline: string | null }) {
  const color = `var(--${["run", "trail", "lift", "bike", "swim", "walk"].includes(sport) ? sport : "run"})`;
  const W = 160;
  const H = 180;
  const PAD = 14;

  let pathStr = "";
  let startX = 0;
  let startY = 0;

  if (routePolyline) {
    try {
      const pts: [number, number][] = JSON.parse(routePolyline);
      if (pts.length >= 2) {
        const lats = pts.map((p) => p[0]);
        const lons = pts.map((p) => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        // Equirectangular: correct longitude for latitude distortion
        const midLat = (minLat + maxLat) / 2;
        const cosLat = Math.cos((midLat * Math.PI) / 180);
        const spanLon = (maxLon - minLon) * cosLat || 0.0001;
        const spanLat = maxLat - minLat || 0.0001;

        const availW = W - PAD * 2;
        const availH = H - PAD * 2;
        const scale = Math.min(availW / spanLon, availH / spanLat) * 0.88;
        const offX = (W - spanLon * scale) / 2;
        const offY = (H - spanLat * scale) / 2;

        const px = (lon: number) => offX + (lon - minLon) * cosLat * scale;
        const py = (lat: number) => H - offY - (lat - minLat) * scale;

        pathStr = pts
          .map((p, i) => `${i === 0 ? "M" : "L"}${px(p[1]).toFixed(1)} ${py(p[0]).toFixed(1)}`)
          .join(" ");
        startX = px(pts[0][1]);
        startY = py(pts[0][0]);
      }
    } catch {
      // fall through to placeholder
    }
  }

  return (
    <div
      style={{
        background: "radial-gradient(60% 100% at 60% 40%, #1a1e1a, #0e1014)",
        width: 300,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg
        aria-hidden="true"
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        {pathStr ? (
          <>
            <path
              d={pathStr}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            <circle cx={startX} cy={startY} r="3.5" fill={color} />
          </>
        ) : (
          <>
            <path
              d="M20 70 C 30 40, 60 30, 80 50 S 110 100, 90 110 S 40 105, 20 70 Z"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="20" cy="70" r="3" fill={color} />
          </>
        )}
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function Dashboard() {
  const { data: authStatus, isLoading: authLoading } = useAuthStatus();
  const { data, isLoading } = useDashboard();
  const [variant, setVariant] = useState<"readiness" | "predictor">("readiness");
  const switcher: ReactNode = (
    <CardSwitcher
      active={variant}
      onChange={(v) => setVariant(v as "readiness" | "predictor")}
      options={[
        { value: "readiness", label: "Readiness" },
        { value: "predictor", label: "Predictor" },
      ]}
    />
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumbs={["Today"]} />
        <div className="flex-1 p-5 grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return <LoginScreen />;
  }

  if (!data || data.state === "empty") {
    return <DashboardEmpty syncStatus={data?.syncStatus ?? null} />;
  }

  const {
    form28d,
    status,
    vibe,
    bodyBattery,
    sleep,
    lastSession,
    week,
    weekTotals,
    readiness,
    racePredictor,
  } = data;

  const tsbMin = Math.min(...form28d.tsb);
  const tsbMax = Math.max(...form28d.tsb);
  const tsbZeroY =
    tsbMin < 0 && tsbMax > 0 ? 4 + 52 * (1 - (0 - tsbMin) / (tsbMax - tsbMin)) : null;

  const todayDisplay = new Date(`${data.todayLocal}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar crumbs={[`Today · ${todayDisplay}`]} right={undefined} />

      {/* Scroll area — minHeight 100% makes rows fill the viewport; 1fr/1fr/auto shares space */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateRows: "1fr 1fr auto",
            gap: 14,
            padding: "20px 24px 24px",
            minHeight: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* ── Row 1: Status · Body Battery · Sleep ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14 }}>
            {/* STATUS */}
            <div
              className="card"
              style={{
                padding: "18px 20px 76px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--fg-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                Status
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  {vibe && <VibeChip word={vibe.word} sub={vibe.sub} />}
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 550,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    {status.headline} <span style={{ color: "var(--fg-2)" }}>{status.subhead}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-1)", marginBottom: 12 }}>
                    {status.body}
                  </div>
                </div>
                <span
                  className="num"
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "var(--bg-2)",
                    border: "1px solid var(--line-soft)",
                    fontFamily: "var(--font-mono)",
                    flexShrink: 0,
                    marginTop: 2,
                    color:
                      status.tone === "fresh"
                        ? "var(--lime)"
                        : status.tone === "tired"
                          ? "var(--tangerine)"
                          : "var(--fg-1)",
                  }}
                >
                  {status.tsb > 0 ? `+${status.tsb.toFixed(0)}` : status.tsb.toFixed(0)} TSB
                </span>
              </div>

              {/* CTL / ATL / TSB sparklines */}
              <div style={{ marginTop: "auto", paddingTop: 12 }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
                  {(
                    [
                      { label: "Fitness", color: "var(--run)", dashed: false },
                      { label: "Fatigue", color: "var(--bike)", dashed: true },
                      { label: "Form", color: "var(--swim)", dashed: false },
                    ] as const
                  ).map(({ label, color, dashed }) => (
                    <span
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 10,
                        color: "var(--fg-2)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <svg
                        width="18"
                        height="8"
                        aria-hidden="true"
                        style={{ display: "block", flexShrink: 0 }}
                      >
                        <line
                          x1="0"
                          y1="4"
                          x2="18"
                          y2="4"
                          stroke={color}
                          strokeWidth="1.5"
                          strokeDasharray={dashed ? "3 2" : undefined}
                          strokeLinecap="round"
                        />
                      </svg>
                      {label}
                    </span>
                  ))}
                </div>
                <svg
                  aria-hidden="true"
                  width="100%"
                  height="80"
                  viewBox="0 0 540 80"
                  preserveAspectRatio="none"
                  style={{ display: "block" }}
                >
                  {[0.33, 0.67].map((p) => (
                    <line
                      key={p}
                      x1="0"
                      y1={p * 80}
                      x2="540"
                      y2={p * 80}
                      stroke="var(--line-soft)"
                      strokeDasharray="2 3"
                      opacity="0.4"
                    />
                  ))}
                  {tsbZeroY !== null && (
                    <line
                      x1="0"
                      y1={tsbZeroY}
                      x2="540"
                      y2={tsbZeroY}
                      stroke="var(--swim)"
                      strokeWidth="0.8"
                      strokeDasharray="4 4"
                      opacity="0.4"
                    />
                  )}
                  <path
                    d={pathD(form28d.tsb, 540, 80, 4, 4)}
                    stroke="var(--swim)"
                    strokeWidth="1.4"
                    fill="none"
                  />
                  <path
                    d={pathD(form28d.atl, 540, 80, 4, 4)}
                    stroke="var(--bike)"
                    strokeWidth="1.6"
                    fill="none"
                    strokeDasharray="3 3"
                  />
                  <path
                    d={pathD(form28d.ctl, 540, 80, 4, 4)}
                    stroke="var(--run)"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 3,
                  }}
                >
                  {["4w", "3w", "2w", "1w", "now"].map((l) => (
                    <span
                      key={l}
                      style={{
                        fontSize: 9,
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

            {/* BODY BATTERY */}
            <div className="card">
              <h3>Body battery</h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 56,
                }}
              >
                <TickArc
                  value={bodyBattery?.current ?? 0}
                  label={bodyBattery?.label ?? "—"}
                  unit={
                    bodyBattery && bodyBattery.from > 0 ? `from ${bodyBattery.from}` : undefined
                  }
                  color="var(--run)"
                  size={170}
                />
              </div>
              {bodyBattery ? (
                <div
                  style={{ fontSize: 11, color: "var(--fg-2)", textAlign: "center", marginTop: -4 }}
                >
                  +{Math.max(0, bodyBattery.current - bodyBattery.from)} overnight
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--fg-3)", textAlign: "center" }}>
                  No data
                </div>
              )}
            </div>

            {/* SLEEP */}
            <div className="card">
              <h3>Sleep</h3>
              {sleep ? (
                <>
                  <div style={{ marginTop: 86 }}>
                    <div
                      style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}
                    >
                      <span
                        className="num"
                        style={{ fontSize: 30, fontWeight: 550, letterSpacing: "-0.02em" }}
                      >
                        {fmtSleep(sleep.durationS)}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--fg-2)" }}>
                        {sleep.bedTimeLocal} → {sleep.wakeTimeLocal}
                      </span>
                    </div>

                    {/* Sleep stage strip — zone colors: deep=z5, rem=z4, light=z2, awake=z1 */}
                    <div
                      style={{
                        display: "flex",
                        height: 22,
                        borderRadius: 4,
                        overflow: "hidden",
                        marginBottom: 6,
                      }}
                    >
                      {(["deep", "rem", "light", "awake"] as const).map((stage) => {
                        const zColors = {
                          deep: "var(--z5)",
                          rem: "var(--z4)",
                          light: "var(--z2)",
                          awake: "var(--z1)",
                        };
                        const total = Object.values(sleep.stages).reduce((a, b) => a + b, 0) || 1;
                        const flex = sleep.stages[stage] / total;
                        return flex > 0 ? (
                          <div
                            key={stage}
                            style={{ flex, background: zColors[stage], opacity: 0.85 }}
                            title={`${stage}: ${Math.round(sleep.stages[stage] / 60)}m`}
                          />
                        ) : null;
                      })}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10.5,
                        color: "var(--fg-2)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span>
                        Deep{" "}
                        <span style={{ color: "var(--fg-0)" }}>{fmtHr(sleep.stages.deep)}</span>
                      </span>
                      <span>
                        REM <span style={{ color: "var(--fg-0)" }}>{fmtHr(sleep.stages.rem)}</span>
                      </span>
                      <span>
                        Light{" "}
                        <span style={{ color: "var(--fg-0)" }}>{fmtHr(sleep.stages.light)}</span>
                      </span>
                      {sleep.score > 0 && (
                        <span>
                          Score <span style={{ color: "var(--fg-0)" }}>{sleep.score}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>No sleep data</div>
              )}
            </div>
          </div>

          {/* ── Row 2: Last Session · Variant card ── */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, minHeight: 212 }}
          >
            {/* LAST SESSION */}
            {lastSession ? (
              <Link
                to="/activities/$id"
                params={{ id: String(lastSession.id) }}
                style={{ textDecoration: "none", display: "block", height: "100%" }}
              >
                <div className="card" style={{ padding: 0, overflow: "hidden", height: "100%" }}>
                  <div
                    style={{ display: "grid", gridTemplateColumns: "300px 1fr", height: "100%" }}
                  >
                    <MapCard
                      sport={lastSession.sport}
                      routePolyline={lastSession.routePolyline ?? null}
                    />
                    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column" }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--fg-2)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 6,
                        }}
                      >
                        Last session · {lastSession.startTimeLocal} → {lastSession.endTimeLocal}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 10,
                          marginBottom: 14,
                        }}
                      >
                        <Icon
                          name={lastSession.sport as IconName}
                          size={18}
                          color={`var(--${lastSession.sport})`}
                        />
                        <span style={{ fontSize: 22, fontWeight: 550 }}>{lastSession.title}</span>
                      </div>
                      <div
                        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}
                      >
                        <StatCol
                          label="Distance"
                          value={lastSession.distanceKm.toFixed(2)}
                          unit="km"
                        />
                        <StatCol label="Pace" value={lastSession.avgPaceDisplay} unit="/km" />
                        <StatCol label="HR" value={String(lastSession.avgHr)} unit="bpm" />
                        <StatCol
                          label="Load"
                          value={String(Math.round(lastSession.tss))}
                          unit="TSS"
                        />
                        <StatCol
                          label="Effect"
                          value={lastSession.aerobicTE.toFixed(1)}
                          unit="aerobic"
                        />
                      </div>
                      {lastSession.chips.length > 0 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                          {lastSession.chips.map((c) => (
                            <Chip key={c}>{c}</Chip>
                          ))}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: "auto",
                          paddingTop: 14,
                          fontSize: 11,
                          color: "var(--fg-2)",
                        }}
                      >
                        Open detail <Icon name="arrow-right" size={11} color="var(--fg-2)" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="card empty-card" style={{ minHeight: 140 }}>
                No recent sessions
              </div>
            )}

            {variant === "readiness" && <ReadinessCard switcher={switcher} data={readiness} />}
            {variant === "predictor" && (
              <RacePredictorCard switcher={switcher} data={racePredictor} />
            )}
          </div>

          {/* ── Row 3: This Week ── */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>This week</h3>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  gap: 14,
                  fontSize: 11,
                  color: "var(--fg-2)",
                }}
              >
                <span>
                  Volume{" "}
                  <span
                    className="num"
                    style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)", marginLeft: 4 }}
                  >
                    {weekTotals.volumeKm.toFixed(1)} km
                  </span>
                </span>
                <span>
                  Load{" "}
                  <span
                    className="num"
                    style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)", marginLeft: 4 }}
                  >
                    {Math.round(weekTotals.tss)}
                  </span>
                </span>
                <span>
                  Sessions{" "}
                  <span
                    className="num"
                    style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)", marginLeft: 4 }}
                  >
                    {weekTotals.sessions}
                  </span>
                </span>
                {weekTotals.rampPct !== 0 && (
                  <span>
                    Ramp{" "}
                    <span
                      className="num"
                      style={{
                        color: weekTotals.rampPct > 0 ? "var(--run)" : "var(--tangerine)",
                        fontFamily: "var(--font-mono)",
                        marginLeft: 4,
                      }}
                    >
                      {weekTotals.rampPct > 0 ? "+" : ""}
                      {weekTotals.rampPct.toFixed(0)}%
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {week.map((d, i) => (
                <div
                  key={d.dateLocal}
                  style={{
                    background: "var(--bg-2)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    border: d.isToday ? "1px solid var(--run)" : "1px solid var(--line-soft)",
                    minHeight: 96,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      color: "var(--fg-2)",
                    }}
                  >
                    <span>{d.dayLabel}</span>
                    {d.sport && (
                      <Icon name={d.sport as IconName} size={12} color={`var(--${d.sport})`} />
                    )}
                  </div>

                  {d.sport ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</div>
                      <div
                        className="num"
                        style={{ fontSize: 16, fontWeight: 550, letterSpacing: "-0.02em" }}
                      >
                        {d.distanceKm > 0
                          ? `${d.distanceKm.toFixed(1)} km`
                          : `${Math.round(d.tss)} TSS`}
                      </div>
                      <div
                        style={{
                          marginTop: "auto",
                          height: 4,
                          background: "var(--bg-3)",
                          borderRadius: 2,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${Math.min(100, d.tss)}%`,
                            background: `var(--${d.sport})`,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: 1,
                        color: "var(--fg-3)",
                        fontSize: 12,
                        fontStyle: "italic",
                      }}
                    >
                      rest
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
