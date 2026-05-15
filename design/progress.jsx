// Progress / records — VO2max curve, race predictions, PRs.
function ProgressView() {
  // VO2max over 24 months
  const M = 24;
  const vo2 = Array.from({ length: M }, (_, i) => {
    // realistic curve: build to peak, dip, rebuild higher
    const phase = i / M;
    return 52 + Math.sin(phase * Math.PI) * 4 + phase * 6 + (Math.random() - 0.5) * 0.6;
  });

  // Race predictions
  const races = [
    { dist: "1 mile", target: "4:42", pr: "4:48", prDate: "Sep '24" },
    { dist: "5 km",   target: "15:48", pr: "16:02", prDate: "Nov '24", featured: true },
    { dist: "10 km",  target: "33:18", pr: "34:11", prDate: "Mar '25" },
    { dist: "Half",   target: "1:12:42", pr: "1:14:30", prDate: "Oct '24" },
    { dist: "Marathon", target: "2:38", pr: "2:42:18", prDate: "Apr '25" },
    { dist: "50 km",  target: "4:18", pr: "4:30:12", prDate: "Jun '24" },
  ];

  // Course PRs (segments / hills / loops)
  const courses = [
    { name: "Gavre park · 14 km loop",  time: "56:48", delta: "−42s", date: "May 12" },
    { name: "Pommeraye climb · 1.4 km", time: "6:32",  delta: "−8s",  date: "May 5" },
    { name: "Erdre flat 5 km",          time: "16:18", delta: "−12s", date: "Apr 22" },
    { name: "Brittany dunes · 8 km",    time: "33:42", delta: "PR",   date: "Apr 14" },
  ];

  // Badges
  const badges = [
    { label: "5k PR", earned: true, sport: "run" },
    { label: "100k week", earned: true, sport: "run" },
    { label: "FTP 280W", earned: true, sport: "bike" },
    { label: "Vert 3000m", earned: true, sport: "trail" },
    { label: "Sub-16 5k", earned: false, sport: "run" },
    { label: "Marathon sub-2:40", earned: false, sport: "run" },
    { label: "FTP 300W", earned: false, sport: "bike" },
    { label: "100mi week", earned: false, sport: "trail" },
  ];

  return (
    <div className="tempo" style={{ "--accent": "var(--trail)" }}>
      <Sidebar active="progress"/>
      <div className="main">
        <TopBar
          crumbs={["Library", "Progress", "VO₂max, predictions & records"]}
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="spark" style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "color-mix(in oklch, var(--rose) 12%, var(--bg-2))", border: "1px solid color-mix(in oklch, var(--rose) 25%, var(--line-soft))" }}>
                <Icon name="sparkle" size={12} color="var(--rose)"/>
                New PR on Brittany dunes · 8 km
              </span>
              <span className="pill"><span className="dot"></span>Trending up · +3.2 in 90d</span>
            </div>
          }
        />
        <div className="scroll" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gridTemplateRows: "auto 1fr", gap: 14 }}>

          {/* VO2max big card */}
          <div className="card" style={{ gridColumn: "1", gridRow: "1 / span 2", padding: "18px 20px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>VO₂max · estimated</h3>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-2)" }}>24 months</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
              <span className="num" style={{ fontSize: 64, fontWeight: 550, letterSpacing: "-0.04em", lineHeight: 1 }}>
                62
              </span>
              <span style={{ fontSize: 14, color: "var(--fg-2)" }}>ml/kg/min</span>
              <span className="chip" style={{ background: "color-mix(in oklch, var(--trail) 18%, transparent)", borderColor: "transparent", color: "var(--trail)" }}>
                <Icon name="arrow-up" size={10}/>
                Top 5% · age 26 male
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 18 }}>
              <span style={{ color: "var(--fg-0)" }}>+3.2 in 90 days</span> · longest sustained climb in two years
            </div>

            {/* Big curve */}
            <div style={{ flex: 1, minHeight: 280 }}>
              <svg width="100%" height="100%" viewBox="0 0 700 320" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                {[50, 55, 60, 65].map(v => (
                  <g key={v}>
                    <line x1="0" y1={280 - (v - 48) * 14} x2="700" y2={280 - (v - 48) * 14} stroke="var(--line-soft)" strokeDasharray="2 3"/>
                    <text x="0" y={280 - (v - 48) * 14 - 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-3)">{v}</text>
                  </g>
                ))}
                {(() => {
                  const { d } = pathFromSeries(vo2, 700, 280, v => v, 20, 30);
                  return <>
                    <path d={d + ` L 700 280 L 0 280 Z`} fill="var(--trail)" opacity="0.12"/>
                    <path d={d} stroke="var(--trail)" strokeWidth="2.4" fill="none"/>
                  </>;
                })()}
                {/* fitness age band */}
                <line x1="0" y1="124" x2="700" y2="124" stroke="var(--lift)" strokeDasharray="3 3" opacity="0.5"/>
                <text x="694" y="118" textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--lift)">Fitness age 21</text>

                {/* milestones */}
                {[
                  { x: 0.16 * 700, label: "Started build", val: 53 },
                  { x: 0.45 * 700, label: "Injury · 2w off", val: 54 },
                  { x: 0.74 * 700, label: "First sub-16 5k", val: 60 },
                  { x: 0.95 * 700, label: "Today", val: 62 },
                ].map((m, i) => {
                  const y = 280 - (m.val - 48) * 14;
                  return (
                    <g key={i}>
                      <line x1={m.x} y1={y} x2={m.x} y2={y - 22} stroke="var(--fg-3)" strokeDasharray="2 2"/>
                      <circle cx={m.x} cy={y} r="4" fill="var(--bg-1)" stroke="var(--trail)" strokeWidth="2"/>
                      <text x={m.x} y={y - 28} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-1)">{m.label}</text>
                    </g>
                  );
                })}

                <g fontSize="9" fontFamily="var(--font-mono)" fill="var(--fg-3)">
                  <text x="0" y="310">May '24</text>
                  <text x="175" y="310">Aug</text>
                  <text x="350" y="310" textAnchor="middle">Nov</text>
                  <text x="525" y="310" textAnchor="middle">Feb '25</text>
                  <text x="700" y="310" textAnchor="end">May '26</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Race predictions */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Race predictions</h3>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-2)" }}>based on last 28d</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {races.map((r, i) => {
                // Improvement bar: target ahead of PR (lower is better)
                const parse = (t) => {
                  const [a, b, c] = t.split(":");
                  return c ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
                };
                const improve = (parse(r.pr) - parse(r.target)) / parse(r.pr);
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "75px 1fr 80px", alignItems: "center", gap: 10,
                    padding: "8px 8px", borderRadius: 6,
                    background: r.featured ? "color-mix(in oklch, var(--trail) 10%, transparent)" : "transparent",
                    border: r.featured ? "1px solid color-mix(in oklch, var(--trail) 25%, transparent)" : "1px solid transparent",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.dist}</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                        <span className="num" style={{ fontSize: 17, fontWeight: 550, color: r.featured ? "var(--trail)" : "var(--fg-0)", fontFamily: "var(--font-mono)" }}>{r.target}</span>
                        <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                          PR {r.pr} · {r.prDate}
                        </span>
                      </div>
                      <div style={{ height: 3, background: "var(--bg-2)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(1 - improve) * 100}%`, background: "var(--fg-3)" }}></div>
                        <div style={{ position: "absolute", left: `${(1 - improve) * 100}%`, top: 0, bottom: 0, right: 0, background: "var(--trail)" }}></div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--trail)", fontFamily: "var(--font-mono)", textAlign: "right" }}>
                      −{(improve * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Course PRs + badges */}
          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <h3>Course records</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {courses.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 56px 56px", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < courses.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{c.date}</div>
                  </div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 550, fontFamily: "var(--font-mono)", textAlign: "right" }}>{c.time}</div>
                    <div className="num" style={{
                      fontSize: 11, fontFamily: "var(--font-mono)", textAlign: "right",
                      display: "inline-flex", alignItems: "center", gap: 3, justifyContent: "flex-end",
                      color: c.delta === "PR" ? "var(--pink)" : "var(--run)"
                    }}>
                      {c.delta === "PR" && <Icon name="sparkle" size={10} color="var(--pink)"/>}
                      {c.delta}
                    </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 8 }}>Goals</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {badges.map((b, i) => (
                <div key={i} style={{
                  background: b.earned ? "var(--bg-2)" : "transparent",
                  border: b.earned ? `1px solid color-mix(in oklch, var(--${b.sport}) 40%, transparent)` : "1px dashed var(--line)",
                  borderRadius: 8, padding: "8px 6px",
                  textAlign: "center",
                  opacity: b.earned ? 1 : 0.55,
                }}>
                  <div style={{ width: 18, height: 18, margin: "0 auto 4px", borderRadius: 999, background: b.earned ? `var(--${b.sport})` : "var(--bg-3)", display: "grid", placeItems: "center", color: b.earned ? "var(--bg-0)" : "var(--fg-3)" }}>
                    <Icon name={b.earned ? "trophy" : "info"} size={10}/>
                  </div>
                  <div style={{ fontSize: 10.5, color: b.earned ? "var(--fg-0)" : "var(--fg-2)", lineHeight: 1.2 }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

window.ProgressView = ProgressView;
