// Activity Detail — the hero screen.
// 1280x800. Sport-coded to "run" (chartreuse accent).

function ActivityDetail({
  data = RUN, splits = SPLITS,
  title = "Tempo Loop · 14.0 km",
  subtitle = "Run · Tuesday, May 12 · 06:42",
  accent = "var(--run)",
  sport = "run",
  mapPath = null,                  // null = use default loop
  routeName = "ROUTE · GAVRE PARK LOOP · 14.02 KM",
  routeCoords = "47.218°N · −1.546°W · 06:42 → 07:39",
  fastestCallout = "3:50 /km",
  hero = null,                      // array of {label, value, unit, tone}
  zones = ZONES,
  dynamics = null,                  // { vosc, gct, stride, vratio, balance }
  trainingEffect = null,            // { headline, sub, aerobic, anaerobic, aeroLabel, anLabel, epoc, load, intensity, recovery }
  missing = []                      // ["dynamics", "power"] — graceful gaps
}) {
  const [cursorIdx, setCursorIdx] = React.useState(Math.floor(data.length * 0.61));
  const chartRef = React.useRef(null);
  // --- Map: stylized topo-loop ---
  const defaultMapPath = "M58 200 C 70 160, 110 130, 150 145 S 220 200, 250 175 S 305 110, 360 95 S 440 90, 460 130 S 470 220, 430 245 S 340 270, 290 245 S 200 230, 160 250 S 90 255, 58 200 Z";
  const finalMapPath = mapPath || defaultMapPath;

  // ── Multi-series chart (HR + Pace + Cadence + Elevation) ──
  const chartW = 700, chartH = 220;
  const trackH = 44;
  const tracks = [
    { key: "hr",   label: "Heart rate",       unit: "bpm",  color: "var(--z4)",  getY: d => d.hr,   stroke: 1.5, fill: true },
    { key: "pace", label: "Pace",             unit: "min/km", color: "var(--run)", getY: d => -d.pace, stroke: 1.5, fill: false },
    { key: "cad",  label: "Cadence",          unit: "spm",  color: "var(--fg-1)", getY: d => d.cad, stroke: 1.2, fill: false },
    { key: "ele",  label: "Elevation",        unit: "m",    color: "var(--fg-2)", getY: d => d.ele, stroke: 1.2, fill: true },
  ];

  // ── Hover cursor position (interactive) ──
  const cursorX = (cursorIdx / (data.length - 1)) * chartW;
  const cursorPt = data[cursorIdx];
  const onChartMove = (e) => {
    const rect = chartRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(x * (data.length - 1))));
    setCursorIdx(idx);
  };

  // ── Splits viz: bars where color = HR zone, height = pace, with elevation under ──
  const maxPace = Math.max(...splits.map(s => s.pace));
  const minPace = Math.min(...splits.map(s => s.pace));
  const zoneOf = (hr) => {
    if (hr < 130) return "var(--z1)";
    if (hr < 150) return "var(--z2)";
    if (hr < 165) return "var(--z3)";
    if (hr < 178) return "var(--z4)";
    return "var(--z5)";
  };

  const heroDefault = [
    { label: "Distance",  value: "14.02", unit: "km",      tone: "lead" },
    { label: "Time",      value: "56:48", unit: "min:sec" },
    { label: "Avg pace",  value: "4:03",  unit: "/km",     tone: "accent" },
    { label: "Avg HR",    value: "164",   unit: "bpm" },
    { label: "Elevation", value: "+186",  unit: "m" },
    { label: "Cadence",   value: "180",   unit: "spm" },
    { label: "Calories",  value: "892",   unit: "kcal" },
    { label: "TSS",       value: "78",    unit: "·",      tone: "dim" },
  ];
  const heroStats = hero || heroDefault;

  const teDefault = {
    headline: <>A <b style={{ color: accent }}>tempo</b> effort that pushed aerobic capacity while leaving anaerobic reserves intact.</>,
    sub: "You'll be ready for a hard session in ~36h.",
    aerobic: 3.8, anaerobic: 1.6,
    aeroLabel: "Improving", anLabel: "Maintaining",
    epoc: "78 ml/kg", load: "132", intensity: "0.91", recovery: "36h",
  };
  const te = trainingEffect || teDefault;

  return (
    <div className="tempo" style={{ "--accent": accent }}>
      <Sidebar active="activity"/>
      <div className="main">
        <TopBar
          crumbs={["Library", "Activity", <span key="a" className="num">{title}</span>]}
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="pill"><span className="dot"></span>{subtitle}</span>
              <button style={btnGhost}><Icon name="share" size={13}/>Share</button>
              <button style={btnGhost}><Icon name="filter" size={13}/>Compare</button>
            </div>
          }
        />
        <div className="scroll" style={{ display: "grid", gridTemplateRows: "auto auto auto auto", gap: 14 }}>
          {/* Hero stat strip */}
          <div style={heroStrip}>
            {heroStats.map((s, i) => <Stat key={i} label={s.label} value={s.value} unit={s.unit} tone={s.tone} accent={accent}/>)}
          </div>

          {/* Map + Chart row */}
          <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 14 }}>
            {/* MAP card */}
            <div className="card" style={{ padding: 0, position: "relative", overflow: "hidden", height: 286 }}>
              <div style={mapBg}>
                <svg width="100%" height="100%" viewBox="0 0 520 286" preserveAspectRatio="xMidYMid slice">
                  {/* topo contour lines — concentric */}
                  <defs>
                    <radialGradient id="topo" cx="65%" cy="35%" r="55%">
                      <stop offset="0" stopColor="rgba(255,255,255,0.05)"/>
                      <stop offset="1" stopColor="rgba(255,255,255,0)"/>
                    </radialGradient>
                  </defs>
                  <rect width="520" height="286" fill="url(#topo)"/>
                  {/* contours */}
                  {[110, 90, 70, 50, 30].map((r, i) => (
                    <ellipse key={i} cx="360" cy="100" rx={r * 1.6} ry={r}
                      fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                      strokeDasharray={i === 0 ? "" : (i === 2 ? "" : "2 4")}
                    />
                  ))}
                  {[80, 60, 40].map((r, i) => (
                    <ellipse key={"c" + i} cx="140" cy="220" rx={r * 1.4} ry={r * 0.7}
                      fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                      strokeDasharray={i === 1 ? "" : "2 4"}
                    />
                  ))}
                  {/* roads — subtle grid */}
                  <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
                    <path d="M0 100 L520 100"/>
                    <path d="M0 230 L520 230"/>
                    <path d="M200 0 L200 286"/>
                    <path d="M420 0 L420 286"/>
                  </g>
                  {/* path glow under */}
                  <path d={finalMapPath} fill="none" stroke={accent} strokeWidth="9" opacity="0.18" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* path proper */}
                  <path d={finalMapPath} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* km tick dots along the path */}
                  {splits.map((s, i) => {
                    // approx positions along the loop, decorative
                    const angle = (i / splits.length) * Math.PI * 2 - Math.PI / 2;
                    const cx = 260 + Math.cos(angle) * 175;
                    const cy = 170 + Math.sin(angle) * 75;
                    return <circle key={i} cx={cx} cy={cy} r="2" fill="var(--bg-0)" stroke={accent} strokeWidth="1.2"/>;
                  })}
                  {/* current position */}
                  <g>
                    <circle cx="430" cy="245" r="14" fill={accent} opacity="0.18"/>
                    <circle cx="430" cy="245" r="5" fill={accent}/>
                    <circle cx="430" cy="245" r="2.5" fill="var(--bg-0)"/>
                  </g>
                  {/* labels */}
                  <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-1)">
                    <text x="70" y="195">START</text>
                    <text x="320" y="86">↑ +62m</text>
                    <text x="370" y="262" fill={accent}>{fastestCallout}</text>
                  </g>
                </svg>
              </div>
              {/* corner overlay */}
              <div style={{ position: "absolute", top: 12, left: 14, fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                {routeName}
              </div>
              <div style={{ position: "absolute", bottom: 12, right: 14, display: "flex", gap: 6 }}>
                {["Map", "Topo", "Satellite"].map((m, i) => (
                  <span key={m} className="chip" style={i === 1 ? { color: "var(--fg-0)", background: "var(--bg-3)" } : null}>{m}</span>
                ))}
              </div>
              <div style={{ position: "absolute", bottom: 12, left: 14, fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                {routeCoords}
              </div>
            </div>

            {/* Chart card */}
            <div className="card" style={{ padding: "12px 14px", height: 286, overflow: "hidden" }} ref={chartRef}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                <h3 style={{ margin: 0 }}>Synchronized series</h3>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {tracks.map(t => (
                    <span key={t.key} className="chip">
                      <span className="swatch" style={{ background: t.color }}></span>{t.label}
                    </span>
                  ))}
                </div>
              </div>
              <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 14}`} preserveAspectRatio="none" style={{ display: "block", cursor: "crosshair" }} onMouseMove={onChartMove}>
                {/* shared vertical grid (4 ticks) */}
                {[0.25, 0.5, 0.75].map(p => (
                  <line key={p} x1={p * chartW} y1="0" x2={p * chartW} y2={chartH} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2 3"/>
                ))}
                {/* tracks */}
                {tracks.map((t, i) => {
                  const yTop = i * trackH + 4;
                  const { d } = pathFromSeries(data, chartW, trackH, t.getY, 6, 6);
                  const area = d + ` L ${chartW} ${yTop + trackH} L 0 ${yTop + trackH} Z`;
                  // Shift path down
                  return (
                    <g key={t.key} transform={`translate(0 ${yTop})`}>
                      <text x="4" y="9" fill="var(--fg-2)" fontSize="9.5" fontFamily="var(--font-mono)" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</text>
                      <text x={chartW - 4} y="9" textAnchor="end" fill="var(--fg-0)" fontSize="10.5" fontFamily="var(--font-mono)">
                        {t.key === "hr" && `${Math.round(cursorPt.hr)} ${t.unit}`}
                        {t.key === "pace" && `${fmtPace(cursorPt.pace)} ${t.unit}`}
                        {t.key === "cad" && `${Math.round(cursorPt.cad)} ${t.unit}`}
                        {t.key === "ele" && `${Math.round(cursorPt.ele)} ${t.unit}`}
                      </text>
                      {t.fill && (
                        <path d={area} fill={t.color} opacity="0.10"/>
                      )}
                      <path d={d} fill="none" stroke={t.color} strokeWidth={t.stroke} strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                  );
                })}
                {/* cursor */}
                <line x1={cursorX} y1="0" x2={cursorX} y2={chartH} stroke="var(--fg-0)" strokeWidth="1" opacity="0.5"/>
                {tracks.map((t, i) => {
                  const yTop = i * trackH + 4;
                  const ys = data.map(t.getY);
                  const min = Math.min(...ys), max = Math.max(...ys);
                  const y = yTop + 6 + (trackH - 12) - ((t.getY(cursorPt) - min) / (max - min)) * (trackH - 12);
                  return <circle key={i} cx={cursorX} cy={y} r="3" fill="var(--bg-0)" stroke={t.color} strokeWidth="1.6"/>;
                })}
                {/* time axis */}
                <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-3)">
                  <text x="0" y={chartH + 12}>00:00</text>
                  <text x={chartW * 0.25} y={chartH + 12} textAnchor="middle">14:12</text>
                  <text x={chartW * 0.5} y={chartH + 12} textAnchor="middle">28:24</text>
                  <text x={chartW * 0.75} y={chartH + 12} textAnchor="middle">42:36</text>
                  <text x={chartW} y={chartH + 12} textAnchor="end">56:48</text>
                </g>
              </svg>
            </div>
          </div>

          {/* Splits — barcode of effort */}
          <div className="card" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Splits</h3>
              <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 11, color: "var(--fg-2)", alignItems: "center" }}>
                <span>color = HR zone</span>
                <span>height = pace</span>
                <span style={{ height: 12, width: 1, background: "var(--line)" }}></span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {ZONES.map(z => <span key={z.z} style={{ width: 8, height: 8, borderRadius: 2, background: z.ink }}></span>)}
                  <span>Z1 → Z5</span>
                </div>
              </div>
            </div>
            <svg width="100%" height="100" viewBox="0 0 1140 100" preserveAspectRatio="none">
              {splits.map((s, i) => {
                const w = 1140 / splits.length;
                const x = i * w;
                const norm = 1 - (s.pace - minPace) / (maxPace - minPace + 0.0001);
                const h = 12 + norm * 56;
                const y = 70 - h;
                return (
                  <g key={i}>
                    <rect x={x + 4} y={y} width={w - 8} height={h} fill={zoneOf(s.hr)} rx="2"/>
                    <text x={x + w / 2} y={y - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-1)">{fmtPace(s.pace)}</text>
                    <text x={x + w / 2} y="86" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-2)">{s.k}</text>
                    {/* elevation tick (below) */}
                    <rect x={x + w/2 - 1} y={94} width="2" height={Math.max(2, Math.abs(s.ele) * 0.4)}
                      fill={s.ele >= 0 ? "var(--fg-2)" : "var(--fg-3)"}
                      transform={s.ele < 0 ? `translate(0,0)` : undefined}/>
                  </g>
                );
              })}
              {/* fastest km callout */}
              <g>
                <line x1={(7.5 * 1140) / splits.length} y1="0" x2={(7.5 * 1140) / splits.length} y2="100" stroke="var(--fg-0)" strokeOpacity="0.3" strokeDasharray="2 3"/>
              </g>
            </svg>
          </div>

          {/* Zones + Dynamics + Training effect */}
          <div style={{ display: "grid", gridTemplateColumns: "300px 400px 1fr", gap: 14 }}>
            {/* HR Zones — vertical density */}
            <div className="card">
              <h3>Heart-rate zones</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...zones].reverse().map(z => (
                  <div key={z.z} style={{ display: "grid", gridTemplateColumns: "26px 60px 1fr 36px", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>Z{z.z}</span>
                    <span style={{ fontSize: 12 }}>{z.label}</span>
                    <div style={{ height: 8, background: "var(--bg-2)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: `${z.pct}%`, background: z.ink,
                        borderRadius: 2,
                      }}></div>
                    </div>
                    <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 11, textAlign: "right", color: "var(--fg-1)" }}>{z.pct}%</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line-soft)", display: "flex", gap: 16, fontSize: 11, color: "var(--fg-2)" }}>
                <div>Avg <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>164</span></div>
                <div>Max <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>183</span></div>
                <div>HRR <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>76%</span></div>
              </div>
            </div>

            {/* Running dynamics */}
            {missing.includes("dynamics") ? (
              <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                <h3>Running dynamics</h3>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--fg-2)" }}>
                  <Icon name="info" size={18}/>
                  <div style={{ fontSize: 13, color: "var(--fg-1)" }}>No paired pod or watch</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", textAlign: "center", maxWidth: 220 }}>Vertical oscillation, GCT, stride length and balance require a HRM-Pro or compatible accessory.</div>
                </div>
              </div>
            ) : (
              <div className="card">
                <h3>{dynamics?.title || "Running dynamics"}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <DynamicBar label={dynamics?.a?.label ?? "Vertical oscillation"} value={dynamics?.a?.value ?? "7.2"}  unit={dynamics?.a?.unit ?? "cm"} pct={dynamics?.a?.pct ?? 0.35} accent={accent}/>
                  <DynamicBar label={dynamics?.b?.label ?? "Ground contact"}       value={dynamics?.b?.value ?? "232"}  unit={dynamics?.b?.unit ?? "ms"} pct={dynamics?.b?.pct ?? 0.55} accent={accent}/>
                  <DynamicBar label={dynamics?.c?.label ?? "Stride length"}        value={dynamics?.c?.value ?? "1.34"} unit={dynamics?.c?.unit ?? "m"}  pct={dynamics?.c?.pct ?? 0.7}  accent={accent}/>
                  <DynamicBar label={dynamics?.d?.label ?? "Vertical ratio"}       value={dynamics?.d?.value ?? "5.4"}  unit={dynamics?.d?.unit ?? "%"}  pct={dynamics?.d?.pct ?? 0.4}  accent={accent}/>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                  <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>{dynamics?.balanceLabel ?? "Left / Right balance"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{dynamics?.left ?? "49.2%"}</span>
                    <div style={{ flex: 1, height: 6, background: "var(--bg-2)", borderRadius: 999, position: "relative" }}>
                      <div style={{ position: "absolute", left: dynamics?.left ?? "49.2%", top: -3, width: 2, height: 12, background: "var(--fg-0)" }}></div>
                      <div style={{ position: "absolute", left: "50%", top: -1, width: 1, height: 8, background: "var(--fg-3)" }}></div>
                    </div>
                    <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{dynamics?.right ?? "50.8%"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Training effect — narrative */}
            <div className="card" style={{ position: "relative" }}>
              <h3>Training effect</h3>
              <div style={{ fontSize: 13, color: "var(--fg-0)", marginBottom: 12, lineHeight: 1.4, maxWidth: 360 }}>
                {te.headline} <span style={{ color: "var(--fg-2)" }}>{te.sub}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <TEBar label="Aerobic"   value={te.aerobic}   desc={te.aeroLabel}  tone={accent}/>
                <TEBar label="Anaerobic" value={te.anaerobic} desc={te.anLabel}    tone="var(--bike)"/>
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--fg-2)" }}>
                <span>EPOC <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>{te.epoc}</span></span>
                <span>Load <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>{te.load}</span></span>
                <span>{missing.includes("power") ? "NP" : "IF"} <span style={{ color: missing.includes("power") ? "var(--fg-3)" : "var(--fg-0)", fontFamily: "var(--font-mono)" }}>{missing.includes("power") ? "—" : te.intensity}</span></span>
                <span>Recovery <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>{te.recovery}</span></span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── tiny atoms ──
const heroStrip = {
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  background: "var(--bg-1)",
  border: "1px solid var(--line-soft)",
  borderRadius: "var(--r-md)",
};
function Stat({ label, value, unit, tone, accent = "var(--run)" }) {
  const big = tone === "lead" ? 28 : 22;
  const color = tone === "accent" ? accent : (tone === "dim" ? "var(--fg-2)" : "var(--fg-0)");
  return (
    <div style={{ padding: "12px 14px", borderRight: "1px solid var(--line-soft)" }}>
      <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-2)", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: big, fontWeight: 550, letterSpacing: "-0.025em", color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>{unit}</div>
    </div>
  );
}
const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent", color: "var(--fg-1)",
  border: "1px solid var(--line-soft)",
  borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer",
  fontFamily: "inherit",
};
const mapBg = {
  position: "absolute", inset: 0,
  background: "radial-gradient(80% 100% at 70% 30%, #1a1e1a 0%, #14171a 60%, #0e1014 100%)",
};

function DynamicBar({ label, value, unit, pct, accent = "var(--run)" }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "2px 0 6px" }}>
        <span className="num" style={{ fontSize: 18, fontWeight: 550 }}>{value}</span>
        <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{unit}</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, background: accent, borderRadius: 2 }}></div>
      </div>
    </div>
  );
}

function TEBar({ label, value, desc, tone }) {
  const v = Math.min(5, Math.max(0, value));
  const segs = 5;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: tone }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${segs}, 1fr)`, gap: 3, marginBottom: 6 }}>
        {Array.from({ length: segs }).map((_, i) => {
          const fillFrac = Math.min(1, Math.max(0, v - i));
          return (
            <div key={i} style={{ height: 6, background: "var(--bg-2)", borderRadius: 1, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fillFrac * 100}%`, background: tone }}></div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-1)" }}>{desc}</div>
    </div>
  );
}

window.ActivityDetail = ActivityDetail;
