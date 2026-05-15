// Dashboard — empty state (no recent sync, rest day).
function DashboardEmpty() {
  return (
    <div className="tempo" style={{ "--accent": "var(--fg-2)" }}>
      <Sidebar active="dashboard"/>
      <div className="main">
        <TopBar
          crumbs={["Library", <span key="d">Today · Friday, May 16</span>]}
          right={
            <div style={{ display: "flex", gap: 8 }}>
              <span className="pill" style={{ color: "var(--fg-2)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--fg-3)" }}></span>
                Last sync · 8 days ago
              </span>
              <button style={{ ...btnGhost3, background: "var(--fg-0)", color: "var(--bg-0)", border: "none" }}>
                <Icon name="sync" size={12}/>Sync now
              </button>
            </div>
          }
        />
        <div className="scroll" style={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 14 }}>

          {/* Hero — calm rest-day message */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14 }}>
            <div className="card" style={{ padding: "20px 22px", position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Status</div>
              <div style={{ fontSize: 28, fontWeight: 550, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 6 }}>
                Rest day. <span style={{ color: "var(--fg-2)" }}>Nothing to chase today.</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-1)", marginBottom: 16, maxWidth: 520 }}>
                No activity logged since May 8. Either you're recovering — fair enough — or your watch hasn't synced yet. Plug it in or hit <span style={{ fontFamily: "var(--font-mono)", background: "var(--bg-2)", padding: "1px 5px", borderRadius: 3 }}>⌘R</span> when you're back online.
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...btnGhost3, background: "var(--fg-0)", color: "var(--bg-0)", border: "none", padding: "7px 12px" }}>
                  <Icon name="sync" size={12}/>Sync now
                </button>
                <button style={btnGhost3}>
                  <Icon name="play" size={12}/>Plan tomorrow
                </button>
                <button style={btnGhost3}>
                  <Icon name="info" size={12}/>Import .fit file
                </button>
              </div>

              {/* Faded last sparkline */}
              <div style={{ position: "absolute", right: -20, bottom: -20, width: 360, height: 140, opacity: 0.18, pointerEvents: "none" }}>
                <svg width="100%" height="100%" viewBox="0 0 360 140">
                  <path d="M0 100 C 60 60, 120 90, 180 70 S 280 30, 360 60" stroke="var(--run)" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <path d="M0 110 C 60 90, 120 105, 180 95 S 280 80, 360 90" stroke="var(--bike)" strokeWidth="2" fill="none" strokeDasharray="3 3"/>
                </svg>
              </div>
            </div>

            <EmptyCard label="Body battery" sub="Pair watch to see">
              <TickArc value={0} max={100} label="No data" unit="—" color="var(--fg-3)" size={140}/>
            </EmptyCard>

            <EmptyCard label="Sleep" sub="No data for last night">
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="num" style={{ fontSize: 30, fontWeight: 550, color: "var(--fg-3)", letterSpacing: "-0.02em" }}>—:—</span>
                <span style={{ fontSize: 12, color: "var(--fg-3)" }}>last seen May 8</span>
              </div>
              <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden", marginTop: 14, marginBottom: 6, opacity: 0.35 }}>
                {[8, 12, 22, 14, 18, 10, 16].map((w, i) => (
                  <div key={i} style={{ flex: w, background: "var(--fg-3)", marginRight: 1 }}></div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                <span>Deep —</span><span>REM —</span><span>Light —</span><span>HRV —</span>
              </div>
            </EmptyCard>
          </div>

          {/* Mid: last session ghost + planned */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, alignContent: "start" }}>
            <div className="card empty-card" style={{ minHeight: 200, flexDirection: "column", gap: 10, padding: 24 }}>
              <Icon name="run" size={22} color="var(--fg-3)"/>
              <div style={{ fontSize: 14, color: "var(--fg-1)", textAlign: "center" }}>No recent session</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", textAlign: "center", maxWidth: 320 }}>
                Last activity was May 8 — open it from the Calendar, or record a new one to start your week.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={btnGhost3}>Open last session</button>
                <button style={btnGhost3}><Icon name="play" size={12}/>Plan workout</button>
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Planned · Today</h3>
                <span className="chip" style={{ marginLeft: "auto" }}>nothing scheduled</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--fg-1)", margin: "10px 0 12px" }}>
                Rest is part of the plan. Tomorrow's recovery jog is queued for <span className="num" style={{ fontFamily: "var(--font-mono)", color: "var(--fg-0)" }}>07:00</span>.
              </div>
              <div style={{ background: "var(--bg-2)", borderRadius: 8, padding: 12, border: "1px solid var(--line-soft)" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <Icon name="run" size={14} color="var(--run)"/>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Recovery jog · Saturday</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-2)" }}>
                  35 min easy · Z1–Z2 · keep HR under 145
                </div>
              </div>
            </div>
          </div>

          {/* Week strip — mostly empty */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>This week</h3>
              <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-3)" }}>
                0 sessions · 0 km · waiting on sync
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
                <div key={i} className="empty-card" style={{ minHeight: 96, flexDirection: "column", padding: "10px 12px", justifyContent: "flex-start", alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-3)" }}>
                    <span>{d}</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-3)", fontSize: 11, fontStyle: "italic" }}>
                    {i === 5 ? "rec jog" : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function EmptyCard({ label, sub, children }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>{label}</h3>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-3)" }}>{sub}</span>
      </div>
      {children}
    </div>
  );
}

const btnGhost3 = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent", color: "var(--fg-1)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 450,
  fontFamily: "inherit",
};

window.DashboardEmpty = DashboardEmpty;
