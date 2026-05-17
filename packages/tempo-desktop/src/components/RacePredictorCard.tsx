import { useState } from "react";
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
    { distance: "10 km", time: "38:55", pace: "3:53", deltaSec: -14, focus: false },
    { distance: "Half", time: "1:26:30", pace: "4:06", deltaSec: -32, focus: false },
    { distance: "Mara", time: "3:04:10", pace: "4:22", deltaSec: -68, focus: false },
  ],
  trend10kSec: Array.from({ length: 60 }, (_, i) => {
    const base = 2410 - i * 1.1;
    return base + Math.sin(i / 4) * 8 + Math.sin(i / 9) * 12;
  }),
  trendDelta: "−1:14 since Mar",
};

// Riegel exponent factors relative to 10 km
const RIEGEL: Record<string, number> = {
  "5 km": (5 / 10) ** 1.06,
  "10 km": 1,
  Half: (21.0975 / 10) ** 1.06,
  Mara: (42.195 / 10) ** 1.06,
};

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function fmtDelta(sec: number): string {
  const abs = Math.abs(sec);
  if (abs >= 60) return `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
  return `${abs}s`;
}

function fmtTrendDelta(sec: number): string {
  const abs = Math.abs(Math.round(sec));
  const sign = sec < 0 ? "−" : "+";
  if (abs >= 60) return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
  return `${sign}${abs}s`;
}

export function RacePredictorCard({ switcher, data }: Props) {
  const d = data ?? MOCK_DATA;
  const [selected, setSelected] = useState<string>(d.predictions[0].distance);

  const ratio = RIEGEL[selected] ?? 1;
  const trend = d.trend10kSec.map((v) => v * ratio);

  const W = 360;
  const H = 56;
  const PT = 4;
  const PB = 4;
  const tMin = Math.min(...trend);
  const tMax = Math.max(...trend);
  const tMid = (tMin + tMax) / 2;
  // enforce a minimum visual range of 2% of mean (e.g. ~48s for 10K) so near-flat data still shows
  const effectiveRange = Math.max(tMax - tMin, tMid * 0.02, 1);
  const adjMin = tMid - effectiveRange * 0.6;
  const adjSpan = effectiveRange * 1.2;
  const innerH = H - PT - PB;
  const pts: [number, number][] = trend.map((v, i) => [
    (i / (trend.length - 1)) * W,
    PT + innerH - ((v - adjMin) / adjSpan) * innerH,
  ]);
  const trendDeltaSec = trend.length >= 2 ? trend[trend.length - 1] - trend[0] : 0;
  const hasVariation = trend.length >= 5 && Math.max(...trend) !== Math.min(...trend);

  const sparkLine = hasVariation ? smoothPath(pts) : "";
  const sparkArea = hasVariation ? `${sparkLine} L${W} ${H - PB} L0 ${H - PB} Z` : "";
  const last = pts.length > 0 ? pts[pts.length - 1] : ([W, H / 2] as [number, number]);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 10 }}>
        {switcher ?? <h3 style={{ margin: 0 }}>Race predictor</h3>}
        <span className="chip" style={{ marginLeft: "auto" }}>
          VO₂max {d.vo2max.toFixed(1)}
        </span>
      </div>

      <div style={{ display: "grid", gap: 2 }}>
        {d.predictions.map((p) => {
          const isSelected = p.distance === selected;
          return (
            <button
              key={p.distance}
              type="button"
              onClick={() => setSelected(p.distance)}
              style={{
                display: "grid",
                gridTemplateColumns: "54px 1fr auto",
                alignItems: "baseline",
                gap: 10,
                padding: "5px 6px",
                marginLeft: -6,
                marginRight: -6,
                borderRadius: 5,
                background: isSelected
                  ? "color-mix(in oklch, var(--run) 8%, transparent)"
                  : "transparent",
                borderLeft: `2px solid ${isSelected ? "var(--run)" : "transparent"}`,
                cursor: "pointer",
                userSelect: "none",
                width: "calc(100% + 12px)",
                textAlign: "left",
                border: "none",
                color: "inherit",
                font: "inherit",
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
                <span
                  style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
                >
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
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px solid var(--line-soft)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9.5,
            color: "var(--fg-2)",
            fontFamily: "var(--font-mono)",
            marginBottom: 5,
          }}
        >
          <span>{selected} trend · 60d</span>
          <span style={{ color: trendDeltaSec < 0 ? "var(--run)" : "var(--tangerine)" }}>
            {fmtTrendDelta(trendDeltaSec)}
          </span>
        </div>
        {hasVariation ? (
          <svg
            aria-hidden="true"
            width="100%"
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <path d={sparkArea} fill="var(--run)" opacity="0.08" />
            <path
              d={sparkLine}
              stroke="var(--run)"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--run)" />
          </svg>
        ) : (
          <div
            style={{
              height: H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--fg-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {trend.length < 5 ? `collecting data · ${trend.length}/5 days` : "no variation yet"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
