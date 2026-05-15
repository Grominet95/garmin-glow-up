// Training Load — CTL/ATL/TSB long term, ramp rate, volume by sport.
function TrainingLoad() {
  // 120 days
  const days = 120;
  const ctl = [];
  const atl = [];
  const tss = [];
  for (let i = 0; i < days; i++) {
    const phase = i / days;
    // Build phase ramp + taper
    const macroBuild = 40 + phase * 32 + Math.sin(phase * 4) * 4;
    const dailyTss = Math.max(0, Math.sin(i * 1.3) > -0.3
      ? (40 + Math.random() * 90 + Math.sin(i / 7) * 30)
      : 0);
    tss.push(dailyTss);
    ctl.push(macroBuild);
    atl.push(macroBuild + Math.sin(i / 4) * 12 + (Math.random() - 0.5) * 6);
  }
  const tsb = ctl.map((c, i) => c - atl[i]);

  // Weekly volume stacks (last 16 weeks)
  const weeks = 16;
  const sports = ["run", "bike", "swim", "trail", "lift"];
  const weekData = Array.from({ length: weeks }, (_, w) => {
    const baseline = 80 + w * 6 + Math.sin(w / 2) * 14;
    const phase = w / weeks;
    return {
      week: w,
      run:   baseline * (0.4 + Math.sin(w * 1.7) * 0.1),
      bike:  baseline * (0.25 + Math.cos(w * 1.3) * 0.1),
      swim:  baseline * (0.07),
      trail: baseline * (phase > 0.5 ? 0.18 + Math.sin(w) * 0.08 : 0.04),
      lift:  baseline * (0.06),
    };
  });
  const maxWeek = Math.max(...weekData.map(d => sports.reduce((s, k) => s + d[k], 0)));

  return (
    <div className="tempo" style={{ "--accent": "var(--bike)" }}>
      <Sidebar active="load"/>
      <div className="main">
        <TopBar
          crumbs={["Library", "Training load", <span key="x">120-day rolling window</span>]}
          right={
            <div style={{ display: "flex", gap: 6 }}>
              {["30d", "90d", "120d", "1y", "All"].map((r, i) => (
                <span key={r} className="chip" style={r === "120d" ? { background: "var(--bg-3)", color: "var(--fg-0)" } : null}>{r}</span>
              ))}
            </div>
          }
        />
        <div className="scroll" style={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 14 }}>

          {/* Top: 3 big numbers + ramp rate */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <BigStat label="CTL · Fitness"  value="72" delta="+4 / 28d" tone="var(--run)"  desc="rolling 42d load average"/>
            <BigStat label="ATL · Fatigue"  value="78" delta="+9 / 7d"  tone="var(--bike)" desc="rolling 7d load average"/>
            <BigStat label="TSB · Form"     value="-6" delta="-3 / 7d"  tone="var(--swim)" desc="CTL − ATL"/>
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <h3>Ramp rate</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="num" style={{ fontSize: 28, fontWeight: 550, letterSpacing: "-0.02em" }}>+6.2</span>
                <span style={{ fontSize: 13, color: "var(--fg-2)" }}>CTL / week</span>
              </div>
              {/* safe band gauge */}
              <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: "linear-gradient(90deg, var(--z2) 0%, var(--z2) 50%, var(--z4) 75%, var(--z5) 100%)", position: "relative" }}>
                <div style={{ position: "absolute", left: "56%", top: -3, width: 2, height: 14, background: "var(--fg-0)" }}></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                <span>−2</span><span>safe</span><span>caution</span><span>+10</span>
              </div>
            </div>
          </div>

          {/* Main: CTL/ATL/TSB chart */}
          <div className="card" style={{ display: "flex", flexDirection: "column", padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Performance Management</h3>
              <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 11, color: "var(--fg-2)", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: "var(--run)" }}></span>CTL</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: "var(--bike)", borderTop: "1px dashed" }}></span>ATL</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 2, background: "var(--swim)" }}></span>TSB</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, background: "var(--fg-2)", borderRadius: 1 }}></span>daily TSS</span>
              </div>
            </div>
            <div style={{ flex: 1, position: "relative", minHeight: 220 }}>
              <svg width="100%" height="100%" viewBox="0 0 1140 280" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                {/* zero baseline for TSB */}
                <line x1="0" y1="180" x2="1140" y2="180" stroke="var(--line)" strokeDasharray="3 3"/>
                {/* horizontal gridlines */}
                {[40, 80, 120, 160].map(y => <line key={y} x1="0" y1={y} x2="1140" y2={y} stroke="var(--line-soft)" strokeDasharray="2 4"/>)}

                {/* Daily TSS as small bars (bottom strip) */}
                {tss.map((v, i) => {
                  const x = (i / (days - 1)) * 1140;
                  const h = (v / 250) * 50;
                  return <rect key={i} x={x - 1.5} y={280 - h} width="3" height={h} fill="var(--fg-3)" opacity="0.55"/>;
                })}

                {/* TSB filled area (red below 0, green above) */}
                {(() => {
                  const tsbN = tsb.length;
                  const minTsb = Math.min(...tsb), maxTsb = Math.max(...tsb);
                  const yFor = v => 180 - (v / 30) * 30;
                  const pts = tsb.map((v, i) => [(i / (tsbN - 1)) * 1140, yFor(v)]);
                  let pathPos = "", pathNeg = "";
                  pts.forEach(([x, y], i) => {
                    pathPos += (i === 0 ? "M" : "L") + x + " " + Math.min(y, 180);
                    pathNeg += (i === 0 ? "M" : "L") + x + " " + Math.max(y, 180);
                  });
                  return null;
                })()}

                {/* CTL filled area + line */}
                {(() => {
                  const { d } = pathFromSeries(ctl, 1140, 200, v => v, 10, 20);
                  return <>
                    <path d={d + ` L 1140 200 L 0 200 Z`} fill="var(--run)" opacity="0.08"/>
                    <path d={d} stroke="var(--run)" strokeWidth="2.2" fill="none"/>
                  </>;
                })()}
                {/* ATL line (dashed) */}
                <path d={pathFromSeries(atl, 1140, 200, v => v, 10, 20).d} stroke="var(--bike)" strokeWidth="1.5" fill="none" strokeDasharray="4 3"/>
                {/* TSB line (centered around 180) */}
                <path d={tsb.map((v, i) => {
                  const x = (i / (tsb.length - 1)) * 1140;
                  const y = 180 - v * 1.2;
                  return (i === 0 ? "M" : "L") + x + " " + y;
                }).join(" ")} stroke="var(--swim)" strokeWidth="1.5" fill="none"/>

                {/* Now marker */}
                <line x1="1100" y1="0" x2="1100" y2="280" stroke="var(--fg-0)" strokeOpacity="0.4" strokeDasharray="2 3"/>
                <circle cx="1100" cy={200 - (ctl[ctl.length-1] / Math.max(...ctl)) * 180} r="4" fill="var(--bg-0)" stroke="var(--run)" strokeWidth="2"/>

                {/* phase annotations */}
                <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-2)">
                  <text x="80" y="14">BASE</text>
                  <text x="380" y="14">BUILD 1</text>
                  <text x="680" y="14">BUILD 2</text>
                  <text x="970" y="14">PEAK</text>
                </g>
                {/* Phase delimiters */}
                {[230, 530, 830].map(x => <line key={x} x1={x} y1="20" x2={x} y2="270" stroke="var(--line)" strokeDasharray="1 4"/>)}

                {/* axis labels */}
                <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-3)">
                  <text x="0" y="276">Feb 12</text>
                  <text x="280" y="276">Mar 11</text>
                  <text x="560" y="276">Apr 9</text>
                  <text x="840" y="276">May 8</text>
                  <text x="1140" y="276" textAnchor="end">May 12 · today</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Bottom: weekly volume by sport, stacked */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Weekly volume by sport · 16w</h3>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {sports.map(s => (
                  <span key={s} className="chip">
                    <span className="swatch" style={{ background: `var(--${s})` }}></span>{SPORT[s].label}
                  </span>
                ))}
              </div>
            </div>
            <svg width="100%" height="80" viewBox="0 0 1140 80" preserveAspectRatio="none">
              {weekData.map((d, i) => {
                const barW = 1140 / weeks - 6;
                const x = i * (1140 / weeks) + 3;
                let y = 70;
                return (
                  <g key={i}>
                    {sports.map(s => {
                      const h = (d[s] / maxWeek) * 64;
                      y -= h;
                      return <rect key={s} x={x} y={y} width={barW} height={h} fill={`var(--${s})`} opacity="0.9"/>;
                    })}
                    <text x={x + barW/2} y={78} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-3)">w{i+1}</text>
                  </g>
                );
              })}
            </svg>
          </div>

        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, delta, tone, desc }) {
  return (
    <div className="card" style={{ borderLeft: `2px solid ${tone}` }}>
      <h3 style={{ color: tone }}>{label}</h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="num" style={{ fontSize: 38, fontWeight: 550, letterSpacing: "-0.03em" }}>{value}</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{delta}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-2)", marginTop: 4 }}>{desc}</div>
    </div>
  );
}

window.TrainingLoad = TrainingLoad;
