// Activity variants — short intervals + a cycling activity with missing power data.

// --- 5×1km intervals on a track ---
function genIntervalSeries() {
  const N = 240;
  const pts = [];
  // 10min warm-up, 5×3min intervals at threshold with 90s float, 10min cool-down
  // Schedule (fraction of total): WU 0-0.2, then 5 reps each (work+rest), CD last 0.2
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    let pace, hr;
    if (t < 0.2) {
      pace = 5.2 - t * 1.5;     // 5:12 → 4:54
      hr = 130 + t * 130;
    } else if (t < 0.8) {
      const seg = (t - 0.2) / 0.6; // 0 → 1 across 5 reps
      const phase = (seg * 5) % 1;  // within one rep
      const inWork = phase < 0.66;
      if (inWork) {
        pace = 3.55 + Math.sin(phase * 10) * 0.05;
        hr = 172 + phase * 12;
      } else {
        pace = 4.8 + (1 - phase) * 0.4;
        hr = 152 - (phase - 0.66) * 40;
      }
    } else {
      pace = 5.0 + (t - 0.8) * 1.5;
      hr = 145 - (t - 0.8) * 80;
    }
    const cad = 178 + (5 - pace) * 4 + Math.sin(t * 14) * 2;
    const ele = 60 + Math.sin(t * 2) * 3;
    pts.push({ t, pace, hr, cad, ele });
  }
  return pts;
}
const INTERVALS_RUN = genIntervalSeries();
// Splits: 1km splits across intervals — alternating fast/slow
const INTERVALS_SPLITS = [
  { k: "WU 1", pace: 5.0, hr: 138, cad: 174, ele: 0 },
  { k: "WU 2", pace: 4.8, hr: 148, cad: 176, ele: 0 },
  { k: "I 1",  pace: 3.55, hr: 173, cad: 188, ele: 0 },
  { k: "R",    pace: 4.7, hr: 148, cad: 175, ele: 0 },
  { k: "I 2",  pace: 3.52, hr: 176, cad: 189, ele: 0 },
  { k: "R",    pace: 4.7, hr: 150, cad: 175, ele: 0 },
  { k: "I 3",  pace: 3.50, hr: 178, cad: 189, ele: 0 },
  { k: "R",    pace: 4.8, hr: 152, cad: 175, ele: 0 },
  { k: "I 4",  pace: 3.48, hr: 180, cad: 190, ele: 0 },
  { k: "R",    pace: 4.8, hr: 154, cad: 174, ele: 0 },
  { k: "I 5",  pace: 3.45, hr: 182, cad: 191, ele: 0 },
  { k: "CD 1", pace: 5.2, hr: 142, cad: 172, ele: 0 },
  { k: "CD 2", pace: 5.5, hr: 132, cad: 168, ele: 0 },
];

const INTERVALS_ZONES = [
  { z: 1, label: "Recovery", min: 0,   max: 130, pct: 8,  ink: "var(--z1)" },
  { z: 2, label: "Endurance",min: 130, max: 150, pct: 35, ink: "var(--z2)" },
  { z: 3, label: "Tempo",    min: 150, max: 165, pct: 14, ink: "var(--z3)" },
  { z: 4, label: "Threshold",min: 165, max: 178, pct: 30, ink: "var(--z4)" },
  { z: 5, label: "VO₂",      min: 178, max: 200, pct: 13, ink: "var(--z5)" },
];

// Track path (oval)
const TRACK_PATH = "M 120 100 a 120 70 0 1 0 240 0 a 120 70 0 1 0 -240 0";

function ActivityIntervals() {
  return (
    <ActivityDetail
      data={INTERVALS_RUN}
      splits={INTERVALS_SPLITS}
      title="5×1k @ threshold · 11.2 km"
      subtitle="Run · Track · Thursday, May 14 · 18:18"
      accent="var(--run)"
      sport="run"
      mapPath={TRACK_PATH}
      routeName="ROUTE · LA BEAUJOIRE TRACK · 28 LAPS"
      routeCoords="47.255°N · −1.526°W · 18:18 → 19:08"
      fastestCallout="3:45 /km"
      hero={[
        { label: "Distance", value: "11.20", unit: "km", tone: "lead" },
        { label: "Time",     value: "50:12", unit: "min:sec" },
        { label: "Avg pace", value: "4:29",  unit: "/km" },
        { label: "Work avg", value: "3:50",  unit: "/km",  tone: "accent" },
        { label: "Avg HR",   value: "158",   unit: "bpm" },
        { label: "Max HR",   value: "184",   unit: "bpm" },
        { label: "Cadence",  value: "182",   unit: "spm" },
        { label: "TSS",      value: "92",    unit: "·",   tone: "dim" },
      ]}
      zones={INTERVALS_ZONES}
      dynamics={{
        a: { label: "Vertical oscillation", value: "6.8", unit: "cm", pct: 0.28 },
        b: { label: "Ground contact",       value: "212", unit: "ms", pct: 0.42 },
        c: { label: "Stride length",        value: "1.52", unit: "m",  pct: 0.85 },
        d: { label: "Vertical ratio",       value: "4.4", unit: "%",   pct: 0.32 },
        left: "50.4%", right: "49.6%",
      }}
      trainingEffect={{
        headline: <>A <b style={{ color: "var(--bike)" }}>VO₂</b> session — heavy anaerobic load, near-PR pace on the closing rep.</>,
        sub: "Big recovery window before the next quality.",
        aerobic: 4.2, anaerobic: 3.6,
        aeroLabel: "Improving", anLabel: "Highly improving",
        epoc: "112 ml/kg", load: "168", intensity: "1.04", recovery: "48h",
      }}
    />
  );
}

// --- Cycling activity, no power meter paired ---
function genBikeSeries() {
  const N = 240;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const hilly = Math.sin(t * 8) * 30 + Math.sin(t * 21) * 12;
    pts.push({
      t,
      pace: 4.5 - hilly / 80,    // surrogate for speed (higher = faster)
      hr: 140 + hilly / 4 + Math.sin(t * 12) * 4,
      cad: 88 + Math.sin(t * 7) * 6,
      ele: 60 + Math.sin(t * 3) * 25 + t * 30 + hilly / 3,
    });
  }
  return pts;
}
const BIKE_DATA = genBikeSeries();
const BIKE_SPLITS = Array.from({ length: 8 }, (_, i) => ({
  k: `${(i + 1) * 5}`, // every 5km
  pace: 1.8 + Math.sin(i * 1.3) * 0.2,
  hr: 138 + Math.sin(i * 0.9) * 14,
  cad: 86 + Math.sin(i) * 5,
  ele: Math.round(Math.sin(i * 1.7) * 30),
}));

const BIKE_PATH = "M40 220 C 80 180, 110 150, 160 160 S 250 100, 320 120 S 400 200, 460 180 S 480 240, 430 260 S 280 280, 200 250 S 60 240, 40 220 Z";

function ActivityNoPower() {
  return (
    <ActivityDetail
      data={BIKE_DATA}
      splits={BIKE_SPLITS}
      title="Z2 endurance · 42 km"
      subtitle="Bike · Monday, May 11 · 09:14"
      accent="var(--bike)"
      sport="bike"
      mapPath={BIKE_PATH}
      routeName="ROUTE · LOIRE LOOP · 42.1 KM"
      routeCoords="47.198°N · −1.611°W · 09:14 → 10:42"
      fastestCallout="36 kph"
      hero={[
        { label: "Distance", value: "42.18", unit: "km", tone: "lead" },
        { label: "Time",     value: "1:28",  unit: "h:min" },
        { label: "Avg speed",value: "28.7",  unit: "kph", tone: "accent" },
        { label: "Avg HR",   value: "138",   unit: "bpm" },
        { label: "Elevation",value: "+412",  unit: "m" },
        { label: "Cadence",  value: "86",    unit: "rpm" },
        { label: "Power",    value: "—",     unit: "no meter", tone: "dim" },
        { label: "TSS",      value: "~88",   unit: "HR-based", tone: "dim" },
      ]}
      zones={[
        { z: 1, label: "Recovery", min: 0, max: 130, pct: 18, ink: "var(--z1)" },
        { z: 2, label: "Endurance",min: 130, max: 150, pct: 58, ink: "var(--z2)" },
        { z: 3, label: "Tempo",    min: 150, max: 165, pct: 19, ink: "var(--z3)" },
        { z: 4, label: "Threshold",min: 165, max: 178, pct: 5,  ink: "var(--z4)" },
        { z: 5, label: "VO₂",      min: 178, max: 200, pct: 0,  ink: "var(--z5)" },
      ]}
      missing={["dynamics", "power"]}
      trainingEffect={{
        headline: <>Steady <b style={{ color: "var(--bike)" }}>aerobic</b> base ride — long enough to build, easy enough to absorb.</>,
        sub: "Training effect estimated from HR; pair a power meter to refine.",
        aerobic: 2.8, anaerobic: 0.4,
        aeroLabel: "Maintaining", anLabel: "Minor",
        epoc: "62 ml/kg", load: "88", intensity: "0.74", recovery: "20h",
      }}
    />
  );
}

window.ActivityIntervals = ActivityIntervals;
window.ActivityNoPower = ActivityNoPower;
