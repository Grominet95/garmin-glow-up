// Calendar — annual heatmap of activities, filterable by sport.
function CalendarView() {
  // 52 weeks × 7 days
  const weeks = 52;
  // Sport per day (deterministic generator for stable look)
  const sportOptions = [null, "run", "run", "run", "bike", "swim", "trail", "lift", null];
  const intensities = ["low", "med", "high", "v-high"];
  const grid = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const seed = (w * 7 + d) * 9301 + 49297;
    const r = ((seed * seed) % 233280) / 233280;
    const sport = sportOptions[Math.floor(r * sportOptions.length)];
    if (!sport) return null;
    const intensity = intensities[Math.floor(((seed * 13) % 100) / 25)];
    const km = Math.round((r * 20 + (intensity === "v-high" ? 15 : 0)) * 10) / 10;
    return { sport, intensity, km };
  }));

  const monthLabels = ["May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"];

  // Right rail: stat for the selected month / day
  const recent = [
    { date: "May 12", sport: "run",   label: "Tempo loop · 14 km",     hr: 164, pace: "4:03" },
    { date: "May 11", sport: "bike",  label: "Z2 endurance · 42 km",   hr: 138, pace: "27 kph" },
    { date: "May 10", sport: "trail", label: "Long · Brittany hills",  hr: 152, pace: "5:28" },
    { date: "May 09", sport: "lift",  label: "Posterior chain",        hr: 122, pace: "—" },
    { date: "May 08", sport: "swim",  label: "CSS intervals · 2.0 km", hr: 142, pace: "1:42 /100" },
  ];

  return (
    <div className="tempo" style={{ "--accent": "var(--swim)" }}>
      <Sidebar active="calendar"/>
      <div className="main">
        <TopBar
          crumbs={["Library", "Calendar", "May 2025 → May 2026"]}
          right={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--fg-2)" }}>Filter</span>
              {Object.keys(SPORT).map((s, i) => (
                <span key={s} className="chip" style={i < 4 ? { background: "var(--bg-3)", color: "var(--fg-0)" } : null}>
                  <span className="swatch" style={{ background: `var(--${s})` }}></span>{SPORT[s].label}
                </span>
              ))}
            </div>
          }
        />
        <div className="scroll" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "baseline", marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>Year heatmap</h3>
                <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 11, color: "var(--fg-2)" }}>
                  <span>378 sessions</span>
                  <span>2,148 km</span>
                  <span>189h</span>
                  <span>117k kcal</span>
                </div>
              </div>

              {/* Heatmap grid */}
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 6 }}>
                {/* Day labels */}
                <div style={{ display: "grid", gridTemplateRows: "repeat(7, 12px)", gap: 2, marginTop: 18, fontSize: 9, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                  {["", "Tu", "", "Th", "", "Sa", ""].map((l, i) => <div key={i}>{l}</div>)}
                </div>
                <div>
                  {/* Month labels row */}
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${weeks}, 1fr)`, fontSize: 9, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                    {monthLabels.map((m, i) => (
                      <div key={i} style={{ gridColumn: `${Math.round((i / 12) * weeks) + 1} / span 4`, textAlign: "left" }}>{m}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${weeks}, 1fr)`, gridTemplateRows: "repeat(7, 12px)", gap: 2, gridAutoFlow: "column" }}>
                    {grid.flatMap((week, wi) => week.map((cell, di) => {
                      const isToday = wi === weeks - 1 && di === 1;
                      if (isToday) {
                        return (
                          <div key={`${wi}-${di}`} style={{ background: "var(--pink)", borderRadius: 2, boxShadow: "0 0 6px var(--pink)" }} title="Today"></div>
                        );
                      }
                      if (!cell) return <div key={`${wi}-${di}`} style={{ background: "var(--bg-2)", borderRadius: 2 }}></div>;
                      const alpha = cell.intensity === "low" ? 0.4 : cell.intensity === "med" ? 0.7 : cell.intensity === "high" ? 0.9 : 1;
                      const border = cell.intensity === "v-high" ? `1px solid var(--fg-0)` : "none";
                      return (
                        <div key={`${wi}-${di}`} style={{
                          background: `var(--${cell.sport})`,
                          opacity: alpha,
                          borderRadius: 2,
                          outline: border,
                        }}></div>
                      );
                    }))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", marginTop: 12, gap: 14, fontSize: 11, color: "var(--fg-2)" }}>
                <span>Intensity</span>
                <div style={{ display: "flex", gap: 2 }}>
                  {[0.25, 0.5, 0.75, 1].map((o, i) => (
                    <div key={i} style={{ width: 14, height: 12, background: "var(--run)", opacity: o, borderRadius: 2 }}></div>
                  ))}
                </div>
                <span style={{ marginLeft: "auto", color: "var(--fg-3)" }}>Click a cell to drill down · Press <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>/</span> to search</span>
              </div>
            </div>

            {/* Monthly volume breakdown */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "baseline", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Monthly distance · 12 months</h3>
                <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 11, color: "var(--fg-2)" }}>
                  <span>Best <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>April · 252 km</span></span>
                  <span>Avg <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>179 km</span></span>
                </div>
              </div>
              <svg width="100%" height="180" viewBox="0 0 1080 180" preserveAspectRatio="none">
                {[0.25, 0.5, 0.75].map(p => <line key={p} x1="0" y1={p*150} x2="1080" y2={p*150} stroke="var(--line-soft)" strokeDasharray="2 3"/>)}
                {monthLabels.map((m, i) => {
                  const x = (i / 11) * 1040 + 20;
                  const total = 130 + Math.sin(i / 2) * 60 + (i === 11 ? 30 : 0);
                  const run = total * 0.5, bike = total * 0.25, swim = total * 0.08, trail = total * 0.12, lift = total * 0.05;
                  let y = 150;
                  const segs = [
                    { v: lift, c: "var(--lift)" },
                    { v: swim, c: "var(--swim)" },
                    { v: trail, c: "var(--trail)" },
                    { v: bike, c: "var(--bike)" },
                    { v: run, c: "var(--run)" },
                  ];
                  return (
                    <g key={i}>
                      {segs.map((s, si) => {
                        const h = (s.v / 252) * 130;
                        y -= h;
                        return <rect key={si} x={x - 22} y={y} width={44} height={h} fill={s.c} opacity={0.92}/>;
                      })}
                      <text x={x} y={168} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-2)">{m}</text>
                      <text x={x} y={y - 4} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-1)">{Math.round(total)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Recent activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recent.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 6px", borderBottom: i < recent.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--bg-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name={r.sport} size={13} color={`var(--${r.sport})`}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-2)", display: "flex", gap: 10, fontFamily: "var(--font-mono)" }}>
                      <span>{r.date}</span>
                      <span>HR {r.hr}</span>
                      <span>{r.pace}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
              <h3>Streak</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="num" style={{ fontSize: 32, fontWeight: 550, letterSpacing: "-0.03em" }}>42</span>
                <span style={{ fontSize: 12, color: "var(--fg-2)" }}>active days</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-2)", marginTop: 6 }}>
                Started Apr 1 · 89% adherence to plan
              </div>
              <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} style={{ width: 4, height: 18, borderRadius: 1,
                    background: i < 38 ? "var(--swim)" : (i < 40 ? "var(--bg-3)" : "var(--swim)"),
                    opacity: i < 38 ? 0.4 + (i / 50) : 1
                  }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.CalendarView = CalendarView;
