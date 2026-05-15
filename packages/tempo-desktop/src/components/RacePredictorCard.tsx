import type { ReactNode } from "react";

interface Prediction {
  distance: string;
  time: string;
  pace: string;
  deltaSec: number;
  focus: boolean;
}

export interface RacePredictorData {
  vo2max: number;
  predictions: Prediction[];
  trend10kSec: number[];
  trendDelta: string;
}

interface Props {
  switcher?: ReactNode;
  data?: RacePredictorData | null;
}

const MOCK_DATA: RacePredictorData = {
  vo2max: 56.4,
  predictions: [
    { distance: "5 km", time: "18:42", pace: "3:44", deltaSec: -8, focus: false },
    { distance: "10 km", time: "38:55", pace: "3:53", deltaSec: -14, focus: true },
    { distance: "Half", time: "1:26:30", pace: "4:06", deltaSec: -32, focus: false },
    { distance: "Mara", time: "3:04:10", pace: "4:22", deltaSec: -68, focus: false },
  ],
  trend10kSec: Array.from({ length: 60 }, (_, i) => {
    const base = 2410 - i * 1.1;
    return base + Math.sin(i / 4) * 8 + Math.sin(i / 9) * 12;
  }),
  trendDelta: "−1:14 since Mar",
};

function fmtDelta(sec: number): string {
  const abs = Math.abs(sec);
  if (abs >= 60) {
    return `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
  }
  return `${abs}s`;
}

export function RacePredictorCard({ switcher, data }: Props) {
  const d = data ?? MOCK_DATA;
  const trend = d.trend10kSec;
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const pts = trend.map((v, i): [number, number] => {
    const x = (i / (trend.length - 1)) * 360;
    const y = 26 - ((max - v) / (max - min)) * 12 - 12;
    return [x, y];
  });
  const sparkD = pts
    .map(([x, y], i) =>
      i ? `L${x.toFixed(1)} ${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`
    )
    .join(" ");
  const sparkArea = `${sparkD} L360 28 L0 28 Z`;
  const last = pts[pts.length - 1];

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 10 }}>
        {switcher ?? <h3 style={{ margin: 0 }}>Race predictor</h3>}
        <span className="chip" style={{ marginLeft: "auto" }}>
          VO₂max {d.vo2max.toFixed(1)}
        </span>
      </div>

      <div style={{ display: "grid", gap: 1 }}>
        {d.predictions.map((p) => (
          <div
            key={p.distance}
            style={{
              display: "grid",
              gridTemplateColumns: "54px 1fr auto",
              alignItems: "baseline",
              gap: 10,
              padding: "2px 6px",
              marginLeft: -6,
              marginRight: -6,
              borderRadius: 5,
              background: p.focus
                ? "color-mix(in oklch, var(--run) 8%, transparent)"
                : "transparent",
              borderLeft: p.focus ? "2px solid var(--run)" : "2px solid transparent",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--fg-2)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {p.distance}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                className="num"
                style={{ fontSize: 17, fontWeight: 550, letterSpacing: "-0.02em" }}
              >
                {p.time}
              </span>
              <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                {p.pace}/km
              </span>
            </div>
            <span
              style={{
                fontSize: 10.5,
                color: p.deltaSec < 0 ? "var(--run)" : "var(--fg-2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {p.deltaSec < 0 ? "↓" : "↑"}
              {fmtDelta(p.deltaSec)}
              <span style={{ color: "var(--fg-3)", marginLeft: 3 }}>30d</span>
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: "1px solid var(--line-soft)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9.5,
            color: "var(--fg-2)",
            fontFamily: "var(--font-mono)",
            position: "absolute",
            top: 6,
            left: 0,
            right: 0,
            pointerEvents: "none",
          }}
        >
          <span>10K trend · 60d</span>
          <span style={{ color: "var(--run)" }}>{d.trendDelta}</span>
        </div>
        <svg
          aria-hidden="true"
          width="100%"
          height="28"
          viewBox="0 0 360 28"
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          <path d={sparkArea} fill="var(--run)" opacity="0.08" />
          <path d={sparkD} stroke="var(--run)" strokeWidth="1.4" fill="none" />
          <circle cx={last[0]} cy={last[1]} r="2.2" fill="var(--run)" />
        </svg>
      </div>
    </div>
  );
}
