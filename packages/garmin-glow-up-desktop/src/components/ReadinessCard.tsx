import type { ReactNode } from "react";

interface ReadinessFactor {
  name: string;
  value: string;
  pct: number;
  color: string;
}

export interface ReadinessData {
  score: number;
  delta7d: number;
  tone: "green" | "yellow" | "red";
  factors: ReadinessFactor[];
}

interface Props {
  switcher?: ReactNode;
  data?: ReadinessData | null;
}

export function ReadinessCard({ switcher, data }: Props) {
  if (!data) {
    return (
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 10 }}>
          {switcher ?? <h3 style={{ margin: 0 }}>Readiness</h3>}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>No readiness data</div>
      </div>
    );
  }
  const d = data;
  const toneColor =
    d.tone === "green" ? "var(--run)" : d.tone === "yellow" ? "var(--tangerine)" : "var(--z5)";

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 10 }}>
        {switcher ?? <h3 style={{ margin: 0 }}>Readiness</h3>}
        <span className="chip" style={{ marginLeft: "auto" }}>
          <span className="swatch" style={{ background: toneColor }} />
          {d.tone}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <span
          className="num"
          style={{ fontSize: 32, fontWeight: 550, letterSpacing: "-0.03em", lineHeight: 1 }}
        >
          {d.score}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-2)" }}>/ 100</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            color: d.delta7d >= 0 ? "var(--run)" : "var(--tangerine)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {d.delta7d > 0 ? "+" : ""}
          {d.delta7d} vs 7d avg
        </span>
      </div>

      <div style={{ display: "grid", gap: 5 }}>
        {d.factors.map((f) => (
          <div key={f.name}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10.5,
                marginBottom: 2,
              }}
            >
              <span style={{ color: "var(--fg-1)" }}>{f.name}</span>
              <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>
                {f.value}
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: "var(--bg-3)",
                borderRadius: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${f.pct}%`,
                  background: f.color,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "70%",
                  top: -1,
                  bottom: -1,
                  width: 1,
                  background: "var(--fg-3)",
                  opacity: 0.5,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
