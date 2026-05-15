// Health overview — sleep, HRV, stress, body battery, SpO2.
function HealthView() {
  // 30-day series
  const D = 30;
  const hrv = Array.from({ length: D }, (_, i) => 48 + Math.sin(i / 4) * 9 + (i / D) * 4 + (Math.random() - 0.5) * 3);
  const rhr = Array.from({ length: D }, (_, i) => 52 - Math.sin(i / 5) * 3 + (Math.random() - 0.5) * 1.5);
  const stress = Array.from({ length: D }, (_, i) => 30 + Math.sin(i / 3) * 12 + (Math.random() - 0.5) * 10);
  const bb = Array.from({ length: D }, (_, i) => 70 + Math.sin(i / 4) * 18 + (Math.random() - 0.5) * 6);
  const spo2 = Array.from({ length: D }, (_, i) => 96 + Math.sin(i / 6) * 1 + (Math.random() - 0.5) * 1);
  const sleepHrs = Array.from({ length: D }, (_, i) => 7.2 + Math.sin(i / 3) * 0.9 + (Math.random() - 0.5) * 0.5);

  // Last night sleep stages — 8 hours × 12 (5-min blocks)
  const SLEEP_N = 96;
  const sleepBlocks = Array.from({ length: SLEEP_N }, (_, i) => {
    const phase = i / SLEEP_N;
    if (phase < 0.05) return 0; // awake
    if (phase < 0.12) return 1; // light
    if (phase < 0.22) return 3; // deep
    if (phase < 0.32) return 1; // light
    if (phase < 0.42) return 2; // rem
    if (phase < 0.52) return 1; // light
    if (phase < 0.62) return 3; // deep
    if (phase < 0.7) return 1;
    if (phase < 0.8) return 2;  // rem
    if (phase < 0.95) return 1;
    return 0;
  });
  const stageColor = ["var(--fg-3)", "var(--z2)", "var(--z4)", "var(--z5)"];
  const stageLabel = ["Awake", "Light", "REM", "Deep"];

  return (
    <div className="tempo" style={{ "--accent": "var(--lift)" }}>
      <Sidebar active="health"/>
      <div className="main">
        <TopBar
          crumbs={["Library", "Health", "30-day window"]}
          right={
            <div style={{ display: "flex", gap: 6 }}>
              {["7d", "30d", "90d", "1y"].map(r => (
                <span key={r} className="chip" style={r === "30d" ? { background: "var(--bg-3)", color: "var(--fg-0)" } : null}>{r}</span>
              ))}
            </div>
          }
        />
        <div className="scroll" style={{ display: "grid", gridTemplateRows: "auto auto auto", gap: 14 }}>

          {/* Top row: sleep stages timeline (wide) + tonight body battery prediction */}
          <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 14 }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Last night · 7h 42m</h3>
                <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 11, color: "var(--fg-2)", alignItems: "center" }}>
                  <span style={{ color: "var(--lift)" }}>Score 86 · Restorative</span>
                  <span>23:18 → 07:00</span>
                </div>
              </div>
              {/* Hypnogram */}
              <svg width="100%" height="120" viewBox="0 0 1100 120" preserveAspectRatio="none">
                {/* stage rails */}
                {[0, 1, 2, 3].map(s => (
                  <line key={s} x1="0" y1={20 + s * 26} x2="1100" y2={20 + s * 26} stroke="var(--line-soft)" strokeDasharray="2 3"/>
                ))}
                {/* stage segments */}
                {sleepBlocks.map((stage, i) => {
                  const x = (i / SLEEP_N) * 1100;
                  const w = 1100 / SLEEP_N;
                  return <rect key={i} x={x} y={20 + stage * 26 - 4} width={w + 0.5} height="8" fill={stageColor[stage]} rx="1"/>;
                })}
                {/* connecting line through stage transitions */}
                <path d={sleepBlocks.map((s, i) => {
                  const x = (i / SLEEP_N) * 1100 + (1100 / SLEEP_N / 2);
                  const y = 20 + s * 26;
                  return (i === 0 ? "M" : "L") + x + " " + y;
                }).join(" ")} stroke="var(--fg-1)" strokeWidth="1" fill="none" opacity="0.4"/>

                {/* stage labels */}
                {[0, 1, 2, 3].map(s => (
                  <text key={s} x="0" y={20 + s * 26 + 4} fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-2)">{stageLabel[s]}</text>
                ))}
                {/* time axis */}
                <g fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-3)">
                  <text x="40" y="118">23:00</text>
                  <text x="260" y="118">01:00</text>
                  <text x="490" y="118">03:00</text>
                  <text x="720" y="118">05:00</text>
                  <text x="970" y="118">07:00</text>
                </g>
              </svg>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
                {[
                  ["Deep", "1:32", "20%"],
                  ["REM", "1:48", "23%"],
                  ["Light", "4:00", "52%"],
                  ["Awake", "0:22", "5%"],
                ].map(([l, v, p]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 550 }}>{v}</div>
                    <div style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{p}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Body battery · 24h</h3>
              <svg width="100%" height="140" viewBox="0 0 360 140" preserveAspectRatio="none">
                {[20, 50, 80].map(y => <line key={y} x1="0" y1={y} x2="360" y2={y} stroke="var(--line-soft)" strokeDasharray="2 3"/>)}
                {/* battery curve over 24h */}
                {(() => {
                  const N = 96;
                  const pts = Array.from({ length: N }, (_, i) => {
                    const t = i / N;
                    if (t < 0.3) return 30 + (1 - Math.cos(t * Math.PI / 0.3)) * 35; // sleep recharge
                    if (t < 0.5) return 95 - (t - 0.3) * 80; // morning drain
                    if (t < 0.6) return 75 - Math.sin((t - 0.5) * 30) * 5;
                    if (t < 0.7) return 50 - (t - 0.6) * 150; // workout drain
                    return 35 - (t - 0.7) * 40;
                  });
                  const { d } = pathFromSeries(pts, 360, 110, v => v, 8, 12);
                  return <>
                    <path d={d + ` L 360 110 L 0 110 Z`} fill="var(--lift)" opacity="0.18"/>
                    <path d={d} stroke="var(--lift)" strokeWidth="2" fill="none"/>
                  </>;
                })()}
                {/* now marker (currently morning) */}
                <line x1="120" y1="0" x2="120" y2="110" stroke="var(--fg-0)" strokeOpacity="0.5" strokeDasharray="2 3"/>
                <circle cx="120" cy="22" r="4" fill="var(--bg-0)" stroke="var(--lift)" strokeWidth="2"/>
                <text x="124" y="14" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-0)">82 now</text>
                <g fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-3)">
                  <text x="0" y="130">23h</text>
                  <text x="80" y="130">07h</text>
                  <text x="160" y="130">12h</text>
                  <text x="240" y="130">18h</text>
                  <text x="360" y="130" textAnchor="end">23h</text>
                </g>
              </svg>
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg-1)" }}>
                Predicted low <span className="num" style={{ fontFamily: "var(--font-mono)", color: "var(--fg-0)" }}>~12</span> after evening workout · recharge starts 22:30
              </div>
            </div>
          </div>

          {/* Mid row: HRV, RHR, Stress, SpO2 — quad of trend cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <TrendCard title="HRV · nightly" value="54" unit="ms" delta="+6 vs 30d avg" tone="var(--lift)" series={hrv} band={[42, 62]}/>
            <TrendCard title="Resting HR"   value="49" unit="bpm" delta="−2 vs 30d avg" tone="var(--run)"  series={rhr} band={[48, 56]}/>
            <TrendCard title="Stress · avg" value="28" unit="/100" delta="low all-day" tone="var(--swim)" series={stress}/>
            <TrendCard title="SpO₂ · sleep" value="96.2" unit="%"  delta="stable" tone="var(--bike)" series={spo2} band={[95, 98]}/>
          </div>

          {/* Bottom: Sleep duration vs consistency + Stress timeline */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Sleep · duration & consistency</h3>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-2)" }}>
                  Bedtime variance <span className="num" style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>±28 min</span>
                </span>
              </div>
              <svg width="100%" height="140" viewBox="0 0 700 140" preserveAspectRatio="none">
                {[5, 6, 7, 8, 9].map(h => (
                  <line key={h} x1="0" y1={130 - (h - 4) * 22} x2="700" y2={130 - (h - 4) * 22} stroke="var(--line-soft)" strokeDasharray="2 3"/>
                ))}
                {sleepHrs.map((h, i) => {
                  const x = (i / (D - 1)) * 690 + 5;
                  const y = 130 - (h - 4) * 22;
                  const hardCol = h < 6.5 ? "var(--z4)" : h > 8.2 ? "var(--z2)" : "var(--lift)";
                  return (
                    <g key={i}>
                      <line x1={x} y1="130" x2={x} y2={y} stroke={hardCol} strokeWidth="3" opacity="0.5"/>
                      <circle cx={x} cy={y} r="3" fill={hardCol}/>
                    </g>
                  );
                })}
                <g fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-3)">
                  <text x="0" y="138">d−30</text>
                  <text x="350" y="138" textAnchor="middle">d−15</text>
                  <text x="700" y="138" textAnchor="end">today</text>
                </g>
                <g fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-2)">
                  <text x="6" y={130 - (8 - 4) * 22 - 3}>8h</text>
                  <text x="6" y={130 - (6 - 4) * 22 - 3}>6h</text>
                </g>
              </svg>
            </div>

            <div className="card">
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Stress today</h3>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-2)" }}>09:42 · live</span>
              </div>
              {/* heat strip */}
              <div style={{ display: "flex", height: 36, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                {Array.from({ length: 48 }).map((_, i) => {
                  const t = i / 47;
                  let s = 30 + Math.sin(t * 6) * 18 + (t > 0.6 ? 30 : 0);
                  if (t < 0.3) s = 10 + Math.random() * 5;
                  const c = s < 25 ? "var(--z2)" : s < 50 ? "var(--z3)" : s < 75 ? "var(--z4)" : "var(--z5)";
                  return <div key={i} style={{ flex: 1, background: c, opacity: 0.85 }}></div>;
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rest</div>
                  <div className="num" style={{ fontSize: 17, fontWeight: 550, color: "var(--z2)" }}>5h 12m</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Low</div>
                  <div className="num" style={{ fontSize: 17, fontWeight: 550, color: "var(--z3)" }}>2h 48m</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Med</div>
                  <div className="num" style={{ fontSize: 17, fontWeight: 550, color: "var(--z4)" }}>1h 18m</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>High</div>
                  <div className="num" style={{ fontSize: 17, fontWeight: 550, color: "var(--z5)" }}>0h 24m</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function TrendCard({ title, value, unit, delta, tone, series, band }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="num" style={{ fontSize: 28, fontWeight: 550, letterSpacing: "-0.02em", color: tone }}>{value}</span>
        <span style={{ fontSize: 12, color: "var(--fg-2)" }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-1)", margin: "2px 0 8px" }}>{delta}</div>
      <svg width="100%" height="44" viewBox="0 0 240 44" preserveAspectRatio="none">
        {band && (() => {
          const min = Math.min(...series), max = Math.max(...series);
          const yLo = 44 - ((band[0] - min) / (max - min)) * 40 - 2;
          const yHi = 44 - ((band[1] - min) / (max - min)) * 40 - 2;
          return <rect x="0" y={yHi} width="240" height={yLo - yHi} fill={tone} opacity="0.08"/>;
        })()}
        {(() => {
          const { d } = pathFromSeries(series, 240, 44, v => v, 4, 4);
          return <>
            <path d={d + ` L 240 44 L 0 44 Z`} fill={tone} opacity="0.10"/>
            <path d={d} stroke={tone} strokeWidth="1.6" fill="none"/>
          </>;
        })()}
        {/* terminal dot */}
        {(() => {
          const min = Math.min(...series), max = Math.max(...series);
          const last = series[series.length - 1];
          const x = 240;
          const y = 44 - ((last - min) / (max - min)) * 40 - 2;
          return <circle cx={x - 1} cy={y} r="2.5" fill={tone}/>;
        })()}
      </svg>
    </div>
  );
}

window.HealthView = HealthView;
