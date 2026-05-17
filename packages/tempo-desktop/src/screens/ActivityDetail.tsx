import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SkeletonCard } from "../components/Skeleton";
import { TopBar } from "../components/TopBar";
import { api } from "../lib/api";
import { useActivity } from "../hooks/useActivity";

const ZONE_COLORS = ["var(--z1)", "var(--z2)", "var(--z3)", "var(--z4)", "var(--z5)"];

function zoneColor(z: number) {
  return ZONE_COLORS[Math.max(0, Math.min(4, z - 1))];
}

function fmtTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtPace(secPerKm: number): string {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm <= 0) return "--";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Build a local SVG path within a track (y=0 at top, y=trackH at bottom).
// Handles null gaps by lifting the pen.
function pathFromSeries(
  values: (number | null)[],
  w: number,
  trackH: number,
  padTop: number,
  padBot: number
): { d: string; min: number; max: number } {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (valid.length === 0) return { d: "", min: 0, max: 1 };
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const drawable = trackH - padTop - padBot;
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * w;
    if (v === null || !Number.isFinite(v)) {
      pen = false;
      return;
    }
    const y = padTop + drawable - ((v - min) / range) * drawable;
    d += pen ? ` L ${x.toFixed(1)} ${y.toFixed(1)}` : `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    pen = true;
  });
  return { d, min, max };
}

// Cursor y in global SVG coords (track is at yTop offset).
function cursorYGlobal(
  values: (number | null)[],
  idx: number,
  yTop: number,
  trackH: number,
  padTop: number,
  padBot: number,
  seriesMin: number,
  seriesMax: number
): number | null {
  const val = values[idx];
  if (val === null || val === undefined || !Number.isFinite(val)) return null;
  const range = seriesMax - seriesMin || 1;
  const drawable = trackH - padTop - padBot;
  return yTop + padTop + drawable - ((val - seriesMin) / range) * drawable;
}

function downsample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

// Parse JSON polyline [[lat, lng], ...] as stored by tempo-sync
function parsePolyline(json: string): [number, number][] {
  try {
    return JSON.parse(json) as [number, number][];
  } catch {
    return [];
  }
}

// Project decoded [lat,lng] points to an SVG path, auto-fitting to the viewBox.
// Returns the path string plus the SVG coords of the first and last point.
function polylineToSvgPath(
  pts: [number, number][],
  svgW: number,
  svgH: number,
  pad = 20,
): { d: string; start: [number, number]; end: [number, number] } {
  if (pts.length === 0) return { d: "", start: [0, 0], end: [0, 0] };
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const rangeW = maxLng - minLng || 1e-6;
  const rangeH = maxLat - minLat || 1e-6;
  const drawW = svgW - 2 * pad;
  const drawH = svgH - 2 * pad;
  const scale = Math.min(drawW / rangeW, drawH / rangeH);
  const offX = pad + (drawW - rangeW * scale) / 2;
  const offY = pad + (drawH - rangeH * scale) / 2;
  const project = ([lat, lng]: [number, number]): [number, number] => [
    offX + (lng - minLng) * scale,
    offY + (maxLat - lat) * scale,
  ];
  const d = pts
    .map((pt, idx) => {
      const [x, y] = project(pt);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return { d, start: project(pts[0]), end: project(pts[pts.length - 1]) };
}

// Human-readable training effect label from raw Garmin string
function fmtTeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function teDesc(val: number): string {
  if (val >= 4) return "Highly improving";
  if (val >= 3) return "Improving";
  if (val >= 2) return "Maintaining";
  return "Base";
}

interface DynamicBarProps {
  label: string;
  value: string;
  unit: string;
  pct: number;
  accent: string;
}

function DynamicBar({ label, value, unit, pct, accent }: DynamicBarProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "2px 0 6px" }}>
        <span className="num" style={{ fontSize: 18, fontWeight: 550 }}>
          {value}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{unit}</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.min(100, pct * 100)}%`,
            background: accent,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

interface TEBarProps {
  label: string;
  value: number;
  desc: string;
  tone: string;
}

function TEBar({ label, value, desc, tone }: TEBarProps) {
  const v = Math.min(5, Math.max(0, value));
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-2)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
        <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: tone }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, marginBottom: 6 }}
      >
        {(["s1", "s2", "s3", "s4", "s5"] as const).map((id, i) => {
          const fill = Math.min(1, Math.max(0, v - i));
          return (
            <div
              key={id}
              style={{
                height: 6,
                background: "var(--bg-2)",
                borderRadius: 1,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${fill * 100}%`,
                  background: tone,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-1)" }}>{desc}</div>
    </div>
  );
}

const CHART_W = 700;
const TRACK_H = 44;
const PAD_TOP = 10;
const PAD_BOT = 6;
const MAX_PTS = 300;

interface Props {
  id: number;
}

export function ActivityDetail({ id }: Props) {
  const { data, isLoading, error } = useActivity(id);
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPct, setCursorPct] = useState(0.61);
  const [selectedLaps, setSelectedLaps] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit() {
    if (!data) return;
    setEditTitle(data.title);
    setEditDesc(data.description ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    if (!data) return;
    setSaving(true);
    try {
      await api(`/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      await queryClient.invalidateQueries({ queryKey: ["activity", id] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumbs={["Activity", "Loading…"]} />
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar crumbs={["Activity"]} />
        <div className="flex-1 flex items-center justify-center text-fg-2">Activity not found</div>
      </div>
    );
  }

  const accent = `var(--${data.accent})`;
  const {
    streams,
    splits,
    zones,
    hrSummary,
    dynamics,
    trainingEffect,
    map: mapInfo,
    missing,
  } = data;

  // Downsample streams
  const hrS = downsample(streams.hr, MAX_PTS);
  const paceS = downsample(streams.pace, MAX_PTS);
  const cadS = downsample(streams.cadence, MAX_PTS);
  const eleS = downsample(streams.elevation, MAX_PTS);
  const timeS = downsample(streams.timeS, MAX_PTS);

  // Pace inverted so faster = higher on chart
  const paceInv = paceS.map((v) => (v !== null ? -v : null));

  const chartH = TRACK_H * 4;
  const cursorIdx = Math.round(cursorPct * (hrS.length - 1));
  const cursorX = cursorPct * CHART_W;

  type TrackDef = {
    key: string;
    label: string;
    unit: string;
    color: string;
    values: (number | null)[];
    fill: boolean;
    displayVal: (v: number) => string;
  };

  const tracks: TrackDef[] = [
    {
      key: "hr",
      label: "Heart rate",
      unit: "bpm",
      color: "var(--z4)",
      values: hrS,
      fill: true,
      displayVal: (v) => `${Math.round(v)}`,
    },
    {
      key: "pace",
      label: "Pace",
      unit: "min/km",
      color: accent,
      values: paceInv,
      fill: false,
      displayVal: (v) => fmtPace(-v),
    },
    {
      key: "cad",
      label: "Cadence",
      unit: "spm",
      color: "var(--fg-1)",
      values: cadS,
      fill: false,
      displayVal: (v) => `${Math.round(v)}`,
    },
    {
      key: "ele",
      label: "Elevation",
      unit: "m",
      color: "var(--fg-2)",
      values: eleS,
      fill: true,
      displayVal: (v) => `${Math.round(v)}`,
    },
  ];

  const trackSeries = tracks.map((t) =>
    pathFromSeries(t.values, CHART_W, TRACK_H, PAD_TOP, PAD_BOT)
  );

  const totalSec = timeS[timeS.length - 1] ?? 0;
  const timeLabels = [0, 0.25, 0.5, 0.75, 1].map((p) => fmtTime(Math.round(p * totalSec)));

  const onChartMove = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCursorPct(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  // Splits bar chart
  const splitPaces = splits.map((s) => s.pace).filter((p) => p > 0);
  const maxPace = splitPaces.length ? Math.max(...splitPaces) : 400;
  const minPace = splitPaces.length ? Math.min(...splitPaces) : 300;

  // Map path: decode real GPS polyline if available, else decorative fallback
  const FALLBACK_PATH =
    "M58 200 C 70 160, 110 130, 150 145 S 220 200, 250 175 S 305 110, 360 95 S 440 90, 460 130 S 470 220, 430 245 S 340 270, 290 245 S 200 230, 160 250 S 90 255, 58 200 Z";
  const routeData = mapInfo?.polyline
    ? polylineToSvgPath(parsePolyline(mapInfo.polyline), 520, 286, 72)
    : null;
  const routePath = routeData?.d ?? FALLBACK_PATH;
  const routeStart = routeData?.start ?? null;
  const routeEnd = routeData?.end ?? null;

  const onLapClick = (idx: number, multi = false) => {
    setSelectedLaps((prev) => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
      } else {
        if (next.size === 1 && next.has(idx)) next.clear();
        else {
          next.clear();
          next.add(idx);
        }
      }
      return next;
    });
  };

  const selArr = splits.filter((_, i) => selectedLaps.has(i));
  const selDist = selArr.reduce((a, s) => a + s.distanceM, 0);
  const selTime = selArr.reduce((a, s) => a + (s.durationS || 0), 0);
  const selAvgPace = selDist > 0 && selTime > 0 ? selTime / (selDist / 1000) : 0;
  const hrLaps = selArr.filter((s) => s.hr > 0);
  const hrDurTotal = hrLaps.reduce((a, s) => a + (s.durationS || 0), 0);
  const selAvgHR =
    hrLaps.length > 0
      ? hrDurTotal > 0
        ? hrLaps.reduce((a, s) => a + s.hr * (s.durationS || 0), 0) / hrDurTotal
        : hrLaps.reduce((a, s) => a + s.hr, 0) / hrLaps.length
      : 0;
  const cadLaps = selArr.filter((s) => s.cad > 0);
  const cadDurTotal = cadLaps.reduce((a, s) => a + (s.durationS || 0), 0);
  const selAvgCad =
    cadLaps.length > 0
      ? cadDurTotal > 0
        ? cadLaps.reduce((a, s) => a + s.cad * (s.durationS || 0), 0) / cadDurTotal
        : cadLaps.reduce((a, s) => a + s.cad, 0) / cadLaps.length
      : 0;
  const selElevGain = selArr.reduce((a, s) => a + Math.max(0, s.elevDelta), 0);
  const selElevLoss = selArr.reduce((a, s) => a + Math.max(0, -s.elevDelta), 0);

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <TopBar
        crumbs={["Library", "Activity", data.title]}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="chip">
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: accent,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {data.subtitle}
            </span>
            <button
              className="chip"
              onClick={openEdit}
              style={{ cursor: "pointer", background: "none", border: "1px solid var(--line-soft)", padding: "2px 8px" }}
            >
              ✎ Edit
            </button>
          </div>
        }
      />

      {editing && (
        <div
          style={{
            padding: "12px 20px",
            background: "var(--bg-1)",
            borderBottom: "1px solid var(--line-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Titre"
            style={{
              background: "var(--bg-0)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--r-sm)",
              padding: "6px 10px",
              fontSize: 14,
              color: "var(--fg-0)",
              width: "100%",
              outline: "none",
            }}
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optionnelle)"
            rows={2}
            style={{
              background: "var(--bg-0)",
              border: "1px solid var(--line-soft)",
              borderRadius: "var(--r-sm)",
              padding: "6px 10px",
              fontSize: 13,
              color: "var(--fg-0)",
              width: "100%",
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="chip"
              onClick={() => setEditing(false)}
              style={{ cursor: "pointer", background: "none", border: "1px solid var(--line-soft)", padding: "3px 12px" }}
            >
              Annuler
            </button>
            <button
              className="chip"
              onClick={saveEdit}
              disabled={saving}
              style={{
                cursor: saving ? "default" : "pointer",
                background: accent,
                color: "#fff",
                border: "none",
                padding: "3px 12px",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto p-5"
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        {/* Hero stat strip — 8-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            background: "var(--bg-1)",
            border: "1px solid var(--line-soft)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
          }}
        >
          {data.hero.map((s, i) => {
            const color =
              s.tone === "accent" ? accent : s.tone === "dim" ? "var(--fg-2)" : "var(--fg-0)";
            const fontSize = s.tone === "lead" ? 28 : 22;
            return (
              <div
                key={s.label}
                style={{
                  padding: "12px 14px",
                  borderRight: i < data.hero.length - 1 ? "1px solid var(--line-soft)" : undefined,
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--fg-2)",
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  {s.label}
                </div>
                <div
                  className="num"
                  style={{
                    fontSize,
                    fontWeight: 550,
                    letterSpacing: "-0.025em",
                    color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{ fontSize: 10.5, color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}
                >
                  {s.unit}
                </div>
              </div>
            );
          })}
        </div>

        {/* Map + Chart row */}
        <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 14, height: 320 }}>
          {/* MAP card */}
          <div
            className="card"
            style={{ padding: 0, position: "relative", overflow: "hidden", height: "100%" }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(80% 100% at 70% 30%, #1a1e1a 0%, #14171a 60%, #0e1014 100%)",
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 520 286"
                preserveAspectRatio="xMidYMid slice"
                role="img"
                aria-label="Route map"
              >
                <defs>
                  <radialGradient id="topo-grad" cx="65%" cy="35%" r="55%">
                    <stop offset="0" stopColor="rgba(255,255,255,0.05)" />
                    <stop offset="1" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                </defs>
                <rect width="520" height="286" fill="url(#topo-grad)" />
                {([110, 90, 70, 50, 30] as const).map((r, i) => (
                  <ellipse
                    key={r}
                    cx="360"
                    cy="100"
                    rx={r * 1.6}
                    ry={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                    strokeDasharray={i % 2 === 1 ? "2 4" : undefined}
                  />
                ))}
                {([80, 60, 40] as const).map((r, i) => (
                  <ellipse
                    key={`c${r}`}
                    cx="140"
                    cy="220"
                    rx={r * 1.4}
                    ry={r * 0.7}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                    strokeDasharray={i % 2 === 0 ? "2 4" : undefined}
                  />
                ))}
                <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
                  <path d="M0 100 L520 100" />
                  <path d="M0 230 L520 230" />
                  <path d="M200 0 L200 286" />
                  <path d="M420 0 L420 286" />
                </g>
                <path
                  d={routePath}
                  fill="none"
                  stroke={accent}
                  strokeWidth="9"
                  opacity="0.18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={routePath}
                  fill="none"
                  stroke={accent}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {routeEnd && (
                  <>
                    <circle cx={routeEnd[0]} cy={routeEnd[1]} r="14" fill={accent} opacity="0.18" />
                    <circle cx={routeEnd[0]} cy={routeEnd[1]} r="5" fill={accent} />
                    <circle cx={routeEnd[0]} cy={routeEnd[1]} r="2.5" fill="var(--bg-0)" />
                  </>
                )}
                {routeStart && (
                  <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg-1)">
                    <text x={routeStart[0] + 6} y={routeStart[1] - 6}>
                      START
                    </text>
                  </g>
                )}
              </svg>
            </div>
            {mapInfo && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 14,
                  fontSize: 11,
                  color: "var(--fg-2)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                }}
              >
                {mapInfo.routeName}
              </div>
            )}
            <div style={{ position: "absolute", bottom: 12, right: 14, display: "flex", gap: 6 }}>
              {["Map", "Topo", "Satellite"].map((m, i) => (
                <span
                  key={m}
                  className="chip"
                  style={i === 1 ? { color: "var(--fg-0)", background: "var(--bg-2)" } : undefined}
                >
                  {m}
                </span>
              ))}
            </div>
            {mapInfo && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 14,
                  fontSize: 10,
                  color: "var(--fg-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {mapInfo.routeCoords}
              </div>
            )}
          </div>

          {/* Synchronized series chart */}
          <div
            className="card"
            ref={containerRef}
            style={{
              padding: "12px 14px",
              height: "100%",
              overflow: "hidden",
              cursor: "crosshair",
              display: "flex",
              flexDirection: "column",
            }}
            onMouseMove={onChartMove}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
              <h3 style={{ margin: 0 }}>Synchronized series</h3>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {tracks.map((t) => (
                  <span key={t.key} className="chip">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: t.color,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${CHART_W} ${chartH + 14}`}
              preserveAspectRatio="none"
              style={{ display: "block", flex: 1, minHeight: 0 }}
              role="img"
              aria-label="Synchronized series chart"
            >
              {[0.25, 0.5, 0.75].map((p) => (
                <line
                  key={p}
                  x1={p * CHART_W}
                  y1="0"
                  x2={p * CHART_W}
                  y2={chartH}
                  stroke="var(--line-soft)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
              ))}
              {tracks.map((t, i) => {
                const yTop = i * TRACK_H + 4;
                const { d } = trackSeries[i];
                if (!d) return null;
                const localBottom = TRACK_H - PAD_BOT;
                const area = `${d} L ${CHART_W} ${localBottom} L 0 ${localBottom} Z`;
                const cursorVal = t.values[cursorIdx];
                const dv =
                  cursorVal !== null && cursorVal !== undefined ? t.displayVal(cursorVal) : "--";
                return (
                  <g key={t.key} transform={`translate(0 ${yTop})`}>
                    <text
                      x="4"
                      y="9"
                      fill="var(--fg-2)"
                      fontSize="9.5"
                      fontFamily="var(--font-mono)"
                      style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
                    >
                      {t.label}
                    </text>
                    <text
                      x={CHART_W - 4}
                      y="9"
                      textAnchor="end"
                      fill="var(--fg-0)"
                      fontSize="10.5"
                      fontFamily="var(--font-mono)"
                    >
                      {dv} {t.unit}
                    </text>
                    {t.fill && <path d={area} fill={t.color} opacity="0.10" />}
                    <path
                      d={d}
                      fill="none"
                      stroke={t.color}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
              {/* Selected lap highlight bands */}
              {[...selectedLaps].map((lapIdx) => {
                const s = splits[lapIdx];
                if (!s || !totalSec) return null;
                const bx = (s.tOffsetS / totalSec) * CHART_W;
                const bw = (s.durationS / totalSec) * CHART_W;
                return (
                  <rect
                    key={lapIdx}
                    x={bx}
                    y={0}
                    width={Math.max(1, bw)}
                    height={chartH}
                    fill={accent}
                    opacity="0.12"
                  />
                );
              })}
              {/* Cursor line */}
              <line
                x1={cursorX}
                y1="0"
                x2={cursorX}
                y2={chartH}
                stroke="var(--fg-0)"
                strokeWidth="1"
                opacity="0.5"
              />
              {/* Cursor dots — in global SVG coords */}
              {tracks.map((t, i) => {
                const yTop = i * TRACK_H + 4;
                const { min: sMin, max: sMax } = trackSeries[i];
                const cy = cursorYGlobal(
                  t.values,
                  cursorIdx,
                  yTop,
                  TRACK_H,
                  PAD_TOP,
                  PAD_BOT,
                  sMin,
                  sMax
                );
                if (cy === null) return null;
                return (
                  <circle
                    key={t.key}
                    cx={cursorX}
                    cy={cy}
                    r="3"
                    fill="var(--bg-0)"
                    stroke={t.color}
                    strokeWidth="1.6"
                  />
                );
              })}
              {/* Time axis */}
              <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-3)">
                {timeLabels.map((label, i) => (
                  <text
                    key={label}
                    x={i === 0 ? 0 : i === 4 ? CHART_W : CHART_W * (i / 4)}
                    y={chartH + 12}
                    textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
                  >
                    {label}
                  </text>
                ))}
              </g>
            </svg>
          </div>
        </div>

        {/* Splits — barcode of effort + interactive table */}
        {splits.length > 0 && (
          <div className="card" style={{ padding: "12px 14px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Splits</h3>
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 10,
                  color: "var(--fg-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                click · ⌘-click multi
              </span>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  gap: 10,
                  fontSize: 11,
                  color: "var(--fg-2)",
                  alignItems: "center",
                }}
              >
                <span>color = HR zone</span>
                <span>height = pace</span>
                <span style={{ height: 12, width: 1, background: "var(--line-soft)" }} />
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((z) => (
                    <span
                      key={z}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: zoneColor(z),
                        display: "inline-block",
                      }}
                    />
                  ))}
                  <span>Z1 → Z5</span>
                </div>
              </div>
            </div>

            {/* Barcode — clickable */}
            <svg
              width="100%"
              height="80"
              viewBox="0 0 1140 80"
              preserveAspectRatio="none"
              role="img"
              aria-label="Splits bar chart"
              style={{ display: "block", marginBottom: 8 }}
            >
              {splits.map((s, si) => {
                const w = 1140 / splits.length;
                const x = si * w;
                const norm = maxPace > minPace ? 1 - (s.pace - minPace) / (maxPace - minPace) : 0.5;
                const h = 12 + norm * 46;
                const y = 60 - h;
                const isSel = selectedLaps.has(si);
                return (
                  <g
                    key={s.k}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => onLapClick(si, e.metaKey || e.ctrlKey || e.shiftKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onLapClick(si, e.shiftKey);
                    }}
                  >
                    {/* invisible hit area */}
                    <rect x={x} y={0} width={w} height={80} fill="transparent" />
                    <rect
                      x={x + 3}
                      y={y}
                      width={Math.max(1, w - 6)}
                      height={h}
                      fill={zoneColor(s.zone)}
                      rx="2"
                      opacity={isSel ? 1 : selectedLaps.size > 0 ? 0.35 : 0.8}
                    />
                    {isSel && (
                      <rect
                        x={x + 2}
                        y={y - 1}
                        width={Math.max(1, w - 4)}
                        height={h + 2}
                        fill="none"
                        stroke="var(--fg-0)"
                        strokeWidth="1"
                        rx="2"
                        opacity="0.5"
                      />
                    )}
                    <text
                      x={x + w / 2}
                      y="75"
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize="8"
                      fill={isSel ? "var(--fg-0)" : "var(--fg-3)"}
                    >
                      {s.k}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Lap table */}
            <div style={{ overflow: "auto", maxHeight: 240 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr 1fr 1fr 1fr 1fr 1fr",
                  gap: "0 8px",
                  padding: "3px 8px",
                  fontSize: 9.5,
                  color: "var(--fg-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontFamily: "var(--font-mono)",
                  borderBottom: "1px solid var(--line-soft)",
                  marginBottom: 2,
                }}
              >
                <span>#</span>
                <span>Dist</span>
                <span>Time</span>
                <span>Pace</span>
                <span>HR</span>
                <span>Cad</span>
                <span>Elev ±</span>
              </div>
              {splits.map((s, si) => {
                const isSel = selectedLaps.has(si);
                return (
                  <button
                    key={s.k}
                    type="button"
                    onClick={(e) => onLapClick(si, e.metaKey || e.ctrlKey || e.shiftKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onLapClick(si, e.shiftKey);
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr 1fr 1fr 1fr 1fr 1fr",
                      gap: "0 8px",
                      padding: "5px 8px",
                      cursor: "pointer",
                      borderRadius: 4,
                      borderLeft: isSel ? `2px solid ${accent}` : "2px solid transparent",
                      borderTop: "none",
                      borderRight: "none",
                      borderBottom: "none",
                      background: isSel ? "var(--bg-2)" : "transparent",
                      width: "100%",
                      textAlign: "left",
                      fontSize: 11.5,
                      fontFamily: "var(--font-mono)",
                      color: isSel ? "var(--fg-0)" : "var(--fg-1)",
                    }}
                  >
                    <span style={{ color: isSel ? accent : "var(--fg-2)" }}>{s.k}</span>
                    <span>{(s.distanceM / 1000).toFixed(2)} km</span>
                    <span>{fmtDuration(s.durationS)}</span>
                    <span style={{ color: isSel ? accent : undefined }}>{s.paceDisplay}</span>
                    <span>{s.hr > 0 ? `${s.hr} bpm` : "—"}</span>
                    <span>{s.cad > 0 ? `${s.cad} spm` : "—"}</span>
                    <span
                      style={{
                        color:
                          s.elevDelta > 1
                            ? "var(--fg-1)"
                            : s.elevDelta < -1
                              ? "var(--fg-2)"
                              : "var(--fg-3)",
                      }}
                    >
                      {s.elevDelta >= 0 ? "+" : ""}
                      {Math.round(s.elevDelta)} m
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selection summary */}
            {selectedLaps.size > 0 && (
              <div
                style={{
                  borderTop: "1px solid var(--line-soft)",
                  paddingTop: 10,
                  marginTop: 8,
                  display: "flex",
                  gap: 24,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--fg-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    paddingTop: 4,
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedLaps.size} lap{selectedLaps.size > 1 ? "s" : ""}
                </div>
                {[
                  { label: "Dist", value: (selDist / 1000).toFixed(2), unit: "km" },
                  { label: "Time", value: fmtDuration(selTime), unit: "" },
                  { label: "Pace", value: fmtPace(selAvgPace), unit: "/km" },
                  { label: "HR", value: selAvgHR > 0 ? String(Math.round(selAvgHR)) : "—", unit: selAvgHR > 0 ? "bpm" : "" },
                  ...(selAvgCad > 0
                    ? [{ label: "Cad", value: String(Math.round(selAvgCad)), unit: "spm" }]
                    : []),
                  { label: "Gain", value: `+${Math.round(selElevGain)}`, unit: "m" },
                  ...(selElevLoss > 1
                    ? [{ label: "Loss", value: `-${Math.round(selElevLoss)}`, unit: "m" }]
                    : []),
                ].map(({ label, value, unit }) => (
                  <div key={label}>
                    <div
                      style={{
                        fontSize: 9.5,
                        color: "var(--fg-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 1,
                      }}
                    >
                      {label}
                    </div>
                    <span
                      className="num"
                      style={{ fontSize: 17, fontWeight: 550, color: "var(--fg-0)" }}
                    >
                      {value}
                    </span>
                    {unit && (
                      <span style={{ fontSize: 10, color: "var(--fg-2)", marginLeft: 2 }}>
                        {unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Heart-rate zones + Running dynamics + Training effect */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 460px 1fr", gap: 14 }}>
          {/* HR Zones — reversed (Z5 at top) */}
          <div className="card">
            <h3>Heart-rate zones</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...zones].reverse().map((z) => (
                <div
                  key={z.z}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "26px 60px 1fr 36px",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}
                  >
                    Z{z.z}
                  </span>
                  <span style={{ fontSize: 12 }}>{z.label}</span>
                  <div
                    style={{
                      height: 8,
                      background: "var(--bg-2)",
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
                        width: `${z.pct}%`,
                        background: ZONE_COLORS[z.z - 1],
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <span
                    className="num"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      textAlign: "right",
                      color: "var(--fg-1)",
                    }}
                  >
                    {z.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid var(--line-soft)",
                display: "flex",
                gap: 16,
                fontSize: 11,
                color: "var(--fg-2)",
              }}
            >
              <div>
                Avg{" "}
                <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>
                  {hrSummary.avg}
                </span>
              </div>
              <div>
                Max{" "}
                <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>
                  {hrSummary.max}
                </span>
              </div>
              <div>
                HRR{" "}
                <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>
                  {hrSummary.hrrPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Running dynamics */}
          {dynamics ? (
            <div className="card">
              <h3>Running dynamics</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <DynamicBar
                  label="Vertical oscillation"
                  value={dynamics.verticalOscCm.toFixed(1)}
                  unit="cm"
                  pct={dynamics.verticalOscCm / 15}
                  accent={accent}
                />
                <DynamicBar
                  label="Ground contact"
                  value={String(Math.round(dynamics.groundContactMs))}
                  unit="ms"
                  pct={dynamics.groundContactMs / 400}
                  accent={accent}
                />
                <DynamicBar
                  label="Stride length"
                  value={dynamics.strideLengthM.toFixed(2)}
                  unit="m"
                  pct={dynamics.strideLengthM / 2.5}
                  accent={accent}
                />
                <DynamicBar
                  label="Vertical ratio"
                  value={dynamics.verticalRatioPct.toFixed(1)}
                  unit="%"
                  pct={dynamics.verticalRatioPct / 10}
                  accent={accent}
                />
              </div>
              <div
                style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}
              >
                <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>
                  Left / Right balance
                </div>
                {dynamics.leftPct !== null && dynamics.rightPct !== null ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                      {dynamics.leftPct.toFixed(1)}%
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        background: "var(--bg-2)",
                        borderRadius: 999,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: `${dynamics.leftPct}%`,
                          top: -3,
                          width: 2,
                          height: 12,
                          background: "var(--fg-0)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: -1,
                          width: 1,
                          height: 8,
                          background: "var(--fg-3)",
                        }}
                      />
                    </div>
                    <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                      {dynamics.rightPct.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <span
                    style={{ fontSize: 13, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
                  >
                    — requires HRM-Pro or Running Dynamics Pod
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <h3>Running dynamics</h3>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 13, color: "var(--fg-1)" }}>No paired pod or watch</div>
                <div
                  style={{ fontSize: 11, color: "var(--fg-3)", textAlign: "center", maxWidth: 220 }}
                >
                  Vertical oscillation, GCT, stride length and balance require a HRM-Pro or
                  compatible accessory.
                </div>
              </div>
            </div>
          )}

          {/* Training effect */}
          <div className="card">
            <h3>Training effect</h3>
            <div
              style={{
                fontSize: 13,
                color: "var(--fg-0)",
                marginBottom: 12,
                lineHeight: 1.4,
                maxWidth: 360,
              }}
            >
              {fmtTeLabel(trainingEffect.headline)}
              {trainingEffect.sub && (
                <span style={{ color: "var(--fg-2)" }}> {trainingEffect.sub}</span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <TEBar
                label="Aerobic"
                value={trainingEffect.aerobic}
                desc={trainingEffect.aeroLabel || teDesc(trainingEffect.aerobic)}
                tone={accent}
              />
              <TEBar
                label="Anaerobic"
                value={trainingEffect.anaerobic}
                desc={trainingEffect.anLabel || teDesc(trainingEffect.anaerobic)}
                tone="var(--bike)"
              />
            </div>
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid var(--line-soft)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--fg-2)",
              }}
            >
              <span>
                EPOC{" "}
                <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>
                  {trainingEffect.epoc.toFixed(0)}
                </span>
              </span>
              <span>
                Load{" "}
                <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>
                  {trainingEffect.load.toFixed(0)}
                </span>
              </span>
              <span>
                {missing.includes("power") ? "NP" : "IF"}{" "}
                <span
                  style={{
                    color: missing.includes("power") ? "var(--fg-3)" : "var(--fg-0)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {trainingEffect.intensity !== null ? trainingEffect.intensity.toFixed(2) : "—"}
                </span>
              </span>
              <span>
                Recovery{" "}
                <span style={{ color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>
                  {trainingEffect.recoveryHours}h
                </span>
              </span>
            </div>
          </div>
        </div>

        {missing.length > 0 && (
          <div className="text-[11px] text-fg-3 font-mono">No data: {missing.join(", ")}</div>
        )}
      </div>
    </div>
  );
}
