// Dashboard — "Today" overview.
function Dashboard() {
  // Form chart data (CTL/ATL/TSB over 28 days)
  const days = 28;
  const ctl = Array.from({ length: days }, (_, i) => 50 + Math.sin(i / 5) * 6 + i * 0.5);
  const atl = Array.from({ length: days }, (_, i) => 48 + Math.sin(i / 3) * 14 + i * 0.6);
  const tsb = ctl.map((c, i) => c - atl[i]);

  // Week activities
  const week = [
    { day: "Mon", sport: "run",   km: 9.2,  tss: 52, label: "Easy" },
    { day: "Tue", sport: "run",   km: 14.0, tss: 78, label: "Tempo" },
    { day: "Wed", sport: "lift",  km: 0,    tss: 30, label: "Strength" },
    { day: "Thu", sport: "bike",  km: 42,   tss: 88, label: "Z2" },
    { day: "Fri", sport: null,    km: 0,    tss: 0,  label: "Rest" },
    { day: "Sat", sport: "trail", km: 22.5, tss: 145,label: "Long" },
    { day: "Sun", sport: "swim",  km: 2.0,  tss: 38, label: "Recovery" },
  ];
  const totalKm = week.reduce((s, w) => s + w.km, 0);
  const totalTss = week.reduce((s, w) => s + w.tss, 0);

  return (
    <div className="tempo" style={{ "--accent": "var(--run)" }}>
      <Sidebar active="dashboard"/>
      <div className="main">
        <TopBar
          crumbs={["Library", <span key="d">Today · Tuesday, May 12</span>]}
          right={
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <VibeChip word="Spring-loaded" sub="form fresh, body charged"/>
              <span className="pill"><span className="dot"></span>Fresh · TSB +6</span>
              <button style={btnGhost2}><Icon name="play" size={12}/>Plan workout</button>
            </div>
          }
        />
        <div className="scroll" style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 14 }}>

          {/* Top hero — status banner */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14 }}>
            <div className="card" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Status</div>
              <div style={{ fontSize: 28, fontWeight: 550, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 4 }}>
                Productive build. <span style={{ color: "var(--fg-2)" }}>Push tempo, recover smart.</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-1)", marginBottom: 14 }}>
                Form is trending up after 9 quality days. A controlled hard effort today fits the plan.
              </div>
              {/* Mini CTL/ATL/TSB chart */}
              <svg width="100%" height="100" viewBox="0 0 540 100" preserveAspectRatio="none">
                {[0.25, 0.5, 0.75].map(p => <line key={p} x1="0" y1={p*100} x2="540" y2={p*100} stroke="var(--line-soft)" strokeDasharray="2 3"/>)}
                <path d={pathFromSeries(ctl, 540, 100, v => v, 8, 20).d} stroke="var(--run)" strokeWidth="2" fill="none"/>
                <path d={pathFromSeries(atl, 540, 100, v => v, 8, 20).d} stroke="var(--bike)" strokeWidth="1.6" fill="none" strokeDasharray="3 3"/>
                <path d={pathFromSeries(tsb, 540, 100, v => v, 18, 8).d} stroke="var(--swim)" strokeWidth="1.4" fill="none"/>
                <text x="6" y="14" fontSize="10" fontFamily="var(--font-mono)" fill="var(--run)">CTL · Fitness</text>
                <text x="120" y="14" fontSize="10" fontFamily="var(--font-mono)" fill="var(--bike)">ATL · Fatigue</text>
                <text x="240" y="14" fontSize="10" fontFamily="var(--font-mono)" fill="var(--swim)">TSB · Form</text>
              </svg>
            </div>

            <div className="card">
              <h3>Body battery</h3>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <TickArc value={82} label="Charged" unit="from 64" color="var(--run)" size={140}/>
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-2)", textAlign: "center", marginTop: -4 }}>
                +18 overnight · drains to ~48 by noon
              </div>
            </div>

            <div className="card">
              <h3>Sleep</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="num" style={{ fontSize: 30, fontWeight: 550, letterSpacing: "-0.02em" }}>7:42</span>
                <span style={{ fontSize: 12, color: "var(--fg-2)" }}>23:18 → 07:00</span>
              </div>
              {/* Sleep stages strip */}
              <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden", marginTop: 10, marginBottom: 6 }}>
                {[
                  { w: 8,  c: "var(--z5)" }, { w: 12, c: "var(--z4)" }, { w: 22, c: "var(--z2)" },
                  { w: 14, c: "var(--z1)" }, { w: 18, c: "var(--z3)" }, { w: 10, c: "var(--z4)" },
                  { w: 16, c: "var(--z2)" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: s.w, background: s.c, opacity: 0.85 }}></div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>
                <span>Deep <span style={{ color: "var(--fg-0)" }}>1:32</span></span>
                <span>REM <span style={{ color: "var(--fg-0)" }}>1:48</span></span>
                <span>Light <span style={{ color: "var(--fg-0)" }}>4:00</span></span>
                <span>HRV <span style={{ color: "var(--run)" }}>+8</span></span>
              </div>
            </div>
          </div>

          {/* Middle: last session big card + planned workout */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
            <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr" }}>
                {/* Map mini */}
                <div style={{ background: "radial-gradient(60% 100% at 60% 40%, #1a1e1a, #0e1014)", padding: 14, position: "relative" }}>
                  <svg width="100%" height="140" viewBox="0 0 140 140">
                    <path d="M20 70 C 30 40, 60 30, 80 50 S 110 100, 90 110 S 40 105, 20 70 Z"
                      fill="none" stroke="var(--run)" strokeWidth="2"/>
                    <circle cx="20" cy="70" r="3" fill="var(--run)"/>
                  </svg>
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Last session · Yesterday</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                    <Icon name="run" size={18} color="var(--run)"/>
                    <span style={{ fontSize: 22, fontWeight: 550 }}>Tempo loop</span>
                    <span style={{ color: "var(--fg-2)", fontSize: 13 }}>06:42 → 07:39</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                    {[
                      ["Distance", "14.02", "km"],
                      ["Pace",     "4:03",  "/km"],
                      ["HR",       "164",   "bpm"],
                      ["Load",     "132",   "TSS"],
                      ["Effect",   "3.8",   "aerobic"],
                    ].map(([l, v, u]) => (
                      <div key={l}>
                        <div style={{ fontSize: 10, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</div>
                        <div className="num" style={{ fontSize: 17, fontWeight: 550 }}>{v}</div>
                        <div style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{u}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                    <span className="chip"><span className="swatch" style={{ background: "var(--run)" }}></span>Tempo Z3-Z4</span>
                    <span className="chip">Gavre park</span>
                    <span className="chip">14°C · light wind</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-1)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Open detail <Icon name="arrow-right" size={11}/>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Planned · Today</h3>
                <span className="chip" style={{ marginLeft: "auto" }}>scheduled 18:00</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 550, marginBottom: 4 }}>5×1k @ threshold</div>
              <div style={{ fontSize: 12, color: "var(--fg-1)", marginBottom: 12 }}>
                Target pace 3:48–3:52 /km · 90s float between · 20min warm + cool.
              </div>
              {/* Workout structure */}
              <svg width="100%" height="44" viewBox="0 0 360 44">
                <rect x="0"   y="20" width="50" height="12" rx="2" fill="var(--z2)" opacity="0.7"/>
                {[80, 130, 180, 230, 280].map((x, i) => (
                  <React.Fragment key={i}>
                    <rect x={x} y="8" width="22" height="32" rx="2" fill="var(--z4)"/>
                    {i < 4 && <rect x={x + 25} y="22" width="20" height="8" rx="2" fill="var(--z1)" opacity="0.7"/>}
                  </React.Fragment>
                ))}
                <rect x="310" y="20" width="50" height="12" rx="2" fill="var(--z2)" opacity="0.7"/>
                <text x="0"   y="6" fontSize="9" fill="var(--fg-2)" fontFamily="var(--font-mono)">WU</text>
                <text x="80"  y="6" fontSize="9" fill="var(--fg-2)" fontFamily="var(--font-mono)">5× thr</text>
                <text x="310" y="6" fontSize="9" fill="var(--fg-2)" fontFamily="var(--font-mono)">CD</text>
              </svg>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-2)" }}>
                <span>Distance <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>~11 km</span></span>
                <span>Est. TSS <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>92</span></span>
                <span>Est. duration <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>52:00</span></span>
              </div>
            </div>
          </div>

          {/* Bottom: week strip */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>This week</h3>
              <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "var(--fg-2)" }}>
                <span>Volume <span className="num" style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)", marginLeft: 4 }}>89.7 km</span></span>
                <span>Load <span className="num" style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)", marginLeft: 4 }}>{totalTss}</span></span>
                <span>Sessions <span className="num" style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)", marginLeft: 4 }}>6</span></span>
                <span>Ramp <span className="num" style={{ color: "var(--run)", fontFamily: "var(--font-mono)", marginLeft: 4 }}>+8%</span></span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {week.map((d, i) => (
                <div key={i} style={{
                  background: "var(--bg-2)", borderRadius: 8, padding: "10px 12px",
                  border: i === 1 ? "1px solid var(--run)" : "1px solid var(--line-soft)",
                  minHeight: 96, display: "flex", flexDirection: "column", gap: 6
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-2)" }}>
                    <span>{d.day}</span>
                    {d.sport && <Icon name={d.sport} size={12} color={`var(--${d.sport})`}/>}
                  </div>
                  {d.sport ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 550, letterSpacing: "-0.02em" }}>
                        {d.km > 0 ? `${d.km} km` : `${d.tss} TSS`}
                      </div>
                      <div style={{ marginTop: "auto", height: 4, background: "var(--bg-3)", borderRadius: 2, position: "relative" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, d.tss)}%`, background: `var(--${d.sport})`, borderRadius: 2 }}></div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--fg-3)", fontSize: 12, fontStyle: "italic" }}>rest</div>
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

const btnGhost2 = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "var(--accent)", color: "var(--accent-ink)",
  border: "1px solid var(--accent)",
  borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 500,
  fontFamily: "inherit",
};

window.Dashboard = Dashboard;
