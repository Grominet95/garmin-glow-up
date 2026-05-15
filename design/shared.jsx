// Tempo — shared helpers, sample data, atoms.
// Exposes globals at end of file.

const SPORT = {
  run:   { label: "Run",     color: "var(--run)",   icon: "run" },
  bike:  { label: "Bike",    color: "var(--bike)",  icon: "bike" },
  swim:  { label: "Swim",    color: "var(--swim)",  icon: "swim" },
  trail: { label: "Trail",   color: "var(--trail)", icon: "trail" },
  lift:  { label: "Strength",color: "var(--lift)",  icon: "lift" },
};

// ── Tiny icon set (stroke-based, 16px viewbox) ───────────────
function Icon({ name, size = 16, color = "currentColor", stroke = 1.6 }) {
  const c = color;
  const sw = stroke;
  const common = { width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: c, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "run":
      return <svg {...common}><circle cx="10" cy="3.2" r="1.2"/><path d="M5 14l2-4 2 1 2-3"/><path d="M5 8l3-2 2 1 2.5-.5"/></svg>;
    case "bike":
      return <svg {...common}><circle cx="4" cy="11" r="2.4"/><circle cx="12" cy="11" r="2.4"/><path d="M4 11l3-5h3l2 5"/><path d="M7 6h2"/></svg>;
    case "swim":
      return <svg {...common}><path d="M1.5 7.5c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0"/><path d="M1.5 11c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0"/><circle cx="11" cy="4" r="1.2"/></svg>;
    case "trail":
      return <svg {...common}><path d="M2 13l3-5 2 2 4-6 3 9"/></svg>;
    case "lift":
      return <svg {...common}><path d="M2 8h12M4 5v6M12 5v6M1.5 7v2M14.5 7v2"/></svg>;
    case "dashboard":
      return <svg {...common}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
    case "calendar":
      return <svg {...common}><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6h12M5 1.5v2M11 1.5v2"/></svg>;
    case "load":
      return <svg {...common}><path d="M2 12l3-4 3 2 3-6 3 4"/></svg>;
    case "heart":
      return <svg {...common}><path d="M8 13.5s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7z"/></svg>;
    case "trophy":
      return <svg {...common}><path d="M4 3h8v3a4 4 0 0 1-8 0V3z"/><path d="M4 4H2v1a2 2 0 0 0 2 2M12 4h2v1a2 2 0 0 1-2 2M6 13h4M7 10v3M9 10v3"/></svg>;
    case "search":
      return <svg {...common}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>;
    case "settings":
      return <svg {...common}><circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4"/></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M3 8h10M9 4l4 4-4 4"/></svg>;
    case "arrow-up":
      return <svg {...common}><path d="M8 13V3M4 7l4-4 4 4"/></svg>;
    case "arrow-down":
      return <svg {...common}><path d="M8 3v10M4 9l4 4 4-4"/></svg>;
    case "play":
      return <svg {...common}><path d="M4 3l9 5-9 5z" fill={c}/></svg>;
    case "share":
      return <svg {...common}><circle cx="4" cy="8" r="1.6"/><circle cx="12" cy="3.5" r="1.6"/><circle cx="12" cy="12.5" r="1.6"/><path d="M5.4 7.3l5.2-3M5.4 8.7l5.2 3"/></svg>;
    case "filter":
      return <svg {...common}><path d="M2 3h12M4 8h8M6 13h4"/></svg>;
    case "sync":
      return <svg {...common}><path d="M13 5a5 5 0 0 0-9-1V2M3 11a5 5 0 0 0 9 1v2"/><path d="M4 4V2H2M12 12v2h2"/></svg>;
    case "info":
      return <svg {...common}><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5h.01"/></svg>;
    case "sparkle":
      // four-point sparkle for PR / new-record / glow-up moments
      return <svg width={size} height={size} viewBox="0 0 16 16" fill={c} stroke="none"><path d="M8 1.5l1.1 4.5L13.5 7 9.1 8.1 8 12.5 6.9 8.1 2.5 7l4.4-1z"/></svg>;
    case "glow-mark":
      // brand mark: rising arc terminating in a glowing dot
      return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M2.5 12.5 C 4 11, 6 10, 7.5 6.5 C 8.5 4, 10 3, 12 3" stroke={c} strokeWidth="1.7" strokeLinecap="round" fill="none"/><circle cx="12" cy="3" r="2.2" fill={c}/></svg>;
    case "moon":
      return <svg {...common}><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"/></svg>;
    case "sun":
      return <svg {...common}><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1"/></svg>;
    case "mountain":
      return <svg {...common}><path d="M1 13l4-7 3 5 2-3 5 5z"/></svg>;
    case "wind":
      return <svg {...common}><path d="M2 6h8a2 2 0 1 0-2-2M2 10h11a2 2 0 1 1-2 2"/></svg>;
    case "drop":
      return <svg {...common}><path d="M8 1.5s4 5 4 8a4 4 0 1 1-8 0c0-3 4-8 4-8z"/></svg>;
    default: return null;
  }
}

// ── Sidebar nav ──────────────────────────────────────────────
function Sidebar({ active }) {
  const top = [
    { id: "dashboard", label: "Today", icon: "dashboard", kbd: "1" },
    { id: "activity",  label: "Activity",   icon: "run", kbd: "2" },
    { id: "load",      label: "Training Load", icon: "load", kbd: "3" },
    { id: "calendar",  label: "Calendar",   icon: "calendar", kbd: "4" },
    { id: "health",    label: "Health",     icon: "heart", kbd: "5" },
    { id: "progress",  label: "Progress",   icon: "trophy", kbd: "6" },
  ];
  return (
    <aside className="side">
      <div className="brand">
        <span className="mark">
          <Icon name="glow-mark" size={13} color="currentColor"/>
        </span>
        <span className="wordmark">
          <span>Glow</span>
          <span className="dot"></span>
          <span style={{ marginLeft: 4 }}>Up</span>
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>0.4.2</span>
      </div>
      <div className="nav-section">Library</div>
      {top.map(n => (
        <div key={n.id} className={"navi " + (active === n.id ? "active" : "")}>
          <Icon name={n.icon} size={14} />
          <span>{n.label}</span>
          <span className="kbd">{n.kbd}</span>
        </div>
      ))}
      <div className="nav-section">Pinned</div>
      <div className="navi"><span className="swatch" style={{ width: 8, height: 8, borderRadius: 2, background: "var(--run)" }}></span><span>Marathon block · Spring</span></div>
      <div className="navi"><span className="swatch" style={{ width: 8, height: 8, borderRadius: 2, background: "var(--bike)" }}></span><span>FTP test history</span></div>
      <div className="navi"><span className="swatch" style={{ width: 8, height: 8, borderRadius: 2, background: "var(--trail)" }}></span><span>UTMB build</span></div>
      <div style={{ flex: 1 }}></div>
      <div className="navi" style={{ color: "var(--fg-2)" }}>
        <Icon name="sync" size={14} />
        <span>Synced 4 min ago</span>
      </div>
      <div className="navi" style={{ color: "var(--fg-2)" }}>
        <Icon name="settings" size={14} />
        <span>Preferences</span>
        <span className="kbd">⌘,</span>
      </div>
    </aside>
  );
}

// Top bar with breadcrumbs + actions
function TopBar({ crumbs = [], right = null }) {
  return (
    <div className="topbar">
      <div className="crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span style={i === crumbs.length - 1 ? { color: "var(--fg-0)", fontWeight: 500 } : null}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="spacer"></div>
      {right}
    </div>
  );
}

// ── Sample data ──────────────────────────────────────────────
// Generate a realistic 14-km tempo run with surges.
function genRunSeries() {
  const N = 240; // 4s samples, ~16min — visual density not literal duration
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // pace 3:50 → 4:30 min/km undulating, surge mid
    const surge = Math.exp(-Math.pow((t - 0.55) * 6, 2)) * -0.5; // faster surge
    const wave = Math.sin(t * 9.2) * 0.18 + Math.sin(t * 27) * 0.05;
    const drift = t * 0.25;
    const pace = 4.05 + wave + drift + surge;          // min/km
    const hr = 142 + (5.05 - pace) * 35 + Math.sin(t * 11) * 3; // inversely tracks pace
    const cad = 178 + Math.sin(t * 14) * 3 + (5 - pace) * 4;
    const ele = 60 + Math.sin(t * 3.4) * 12 + Math.sin(t * 9) * 4 + t * 18;
    pts.push({ t, pace, hr, cad, ele });
  }
  return pts;
}
const RUN = genRunSeries();

// HR zones (Z1–Z5) time spent (in % of total)
const ZONES = [
  { z: 1, label: "Recovery", min: 0,  max: 130, pct: 4,  ink: "var(--z1)" },
  { z: 2, label: "Endurance",min: 130, max: 150, pct: 17, ink: "var(--z2)" },
  { z: 3, label: "Tempo",    min: 150, max: 165, pct: 41, ink: "var(--z3)" },
  { z: 4, label: "Threshold",min: 165, max: 178, pct: 31, ink: "var(--z4)" },
  { z: 5, label: "VO₂",      min: 178, max: 200, pct: 7,  ink: "var(--z5)" },
];

// Splits (km laps)
const SPLITS = [
  { k: 1,  pace: 4.10, hr: 148, cad: 177, ele: +6  },
  { k: 2,  pace: 4.02, hr: 156, cad: 179, ele: +3  },
  { k: 3,  pace: 3.98, hr: 161, cad: 180, ele: -2  },
  { k: 4,  pace: 4.05, hr: 164, cad: 180, ele: +8  },
  { k: 5,  pace: 4.10, hr: 165, cad: 179, ele: +10 },
  { k: 6,  pace: 3.95, hr: 168, cad: 181, ele: -4  },
  { k: 7,  pace: 3.90, hr: 171, cad: 182, ele: -1  },
  { k: 8,  pace: 3.85, hr: 175, cad: 184, ele: +2  },
  { k: 9,  pace: 3.92, hr: 173, cad: 183, ele: +5  },
  { k: 10, pace: 4.02, hr: 170, cad: 181, ele: +6  },
  { k: 11, pace: 4.15, hr: 168, cad: 179, ele: +9  },
  { k: 12, pace: 4.20, hr: 165, cad: 178, ele: +3  },
  { k: 13, pace: 4.30, hr: 162, cad: 177, ele: -5  },
  { k: 14, pace: 4.45, hr: 158, cad: 175, ele: -8  },
];

// ── Generic line/area renderer ───────────────────────────────
function pathFromSeries(points, w, h, getY, padTop = 4, padBottom = 4) {
  const ys = points.map(getY);
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = (max - min) || 1;
  const innerH = h - padTop - padBottom;
  const d = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = padTop + innerH - ((getY(p) - min) / span) * innerH;
    return (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
  }).join(" ");
  return { d, min, max };
}

// fmt helpers
const fmtPace = (decimalMin) => {
  const m = Math.floor(decimalMin);
  const s = Math.round((decimalMin - m) * 60);
  return m + ":" + String(s).padStart(2, "0");
};
const fmtDur = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
};

// ── Sparkline ────────────────────────────────────────────────
function Sparkline({ data, w = 100, h = 28, stroke = "var(--accent)", fill = null, getY = (d) => d }) {
  const { d } = pathFromSeries(data, w, h, getY, 2, 2);
  // area path: close to bottom
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {fill && <path d={area} fill={fill} opacity="0.18"/>}
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Tick gauge (used for VO2, body battery) ──────────────────
function TickArc({ value, max = 100, color = "var(--accent)", size = 120, label, unit }) {
  const ticks = 32;
  const v = Math.min(1, Math.max(0, value / max));
  const lit = Math.round(ticks * v);
  const arcSpan = Math.PI * 1.5;     // 270°
  const start = Math.PI * 0.75;       // bottom-left
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;
  const tickLen = 8;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: ticks }).map((_, i) => {
        const a = start + (i / (ticks - 1)) * arcSpan;
        const x1 = cx + Math.cos(a) * (r - tickLen);
        const y1 = cy + Math.sin(a) * (r - tickLen);
        const x2 = cx + Math.cos(a) * r;
        const y2 = cy + Math.sin(a) * r;
        const on = i < lit;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={on ? color : "var(--line)"}
          strokeWidth={on ? 2.2 : 1.6}
          strokeLinecap="round"
          opacity={on ? 1 : 0.6}
        />;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--fg-0)" fontSize="26" fontWeight="550" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--fg-2)" fontSize="10.5" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</text>
      {unit && <text x={cx} y={cy + 28} textAnchor="middle" fill="var(--fg-2)" fontSize="9.5" fontFamily="var(--font-mono)">{unit}</text>}
    </svg>
  );
}

Object.assign(window, {
  SPORT, Icon, Sidebar, TopBar, VibeChip,
  RUN, ZONES, SPLITS,
  pathFromSeries, fmtPace, fmtDur,
  Sparkline, TickArc, MacChrome,
});

// ── VibeChip — "today's word" mood pill (Dashboard) ──────────
function VibeChip({ word = "Spring-loaded", sub = "form fresh, body charged" }) {
  return (
    <span className="vibe" title={sub}>
      <span className="glow"></span>
      <span style={{ fontWeight: 500 }}>{word}</span>
      <span style={{ color: "var(--fg-2)", fontSize: 11 }}>· {sub}</span>
    </span>
  );
}

// ── macOS window chrome ──────────────────────────────────────
function MacChrome({ title, accent, children }) {
  return (
    <div className="mac" style={accent ? { "--accent": accent } : null}>
      <div className="mac-titlebar">
        <div className="mac-lights">
          <span className="light red"></span>
          <span className="light yellow"></span>
          <span className="light green"></span>
        </div>
        <div className="mac-title">
          <span className="dot"></span>
          <span>{title || "Tempo"}</span>
        </div>
        <div className="mac-right" style={{ fontSize: 11, alignItems: "center" }}>
          <Icon name="search" size={12} color="currentColor"/>
          <Icon name="settings" size={12} color="currentColor"/>
        </div>
      </div>
      {children}
    </div>
  );
}
