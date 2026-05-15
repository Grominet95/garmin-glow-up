interface TickArcProps {
  value: number;
  max?: number;
  color?: string;
  size?: number;
  label?: string;
  unit?: string;
}

export function TickArc({
  value,
  max = 100,
  color = "var(--accent)",
  size = 120,
  label,
  unit,
}: TickArcProps) {
  const ticks = 32;
  const v = Math.min(1, Math.max(0, value / max));
  const lit = Math.round(ticks * v);
  const arcSpan = Math.PI * 1.5;
  const start = Math.PI * 0.75;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const tickLen = 8;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {Array.from({ length: ticks }).map((_, i) => {
        const a = start + (i / (ticks - 1)) * arcSpan;
        const x1 = cx + Math.cos(a) * (r - tickLen);
        const y1 = cy + Math.sin(a) * (r - tickLen);
        const x2 = cx + Math.cos(a) * r;
        const y2 = cy + Math.sin(a) * r;
        const on = i < lit;
        return (
          <line
            key={`tick-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={on ? color : "var(--line)"}
            strokeWidth={on ? 2.2 : 1.6}
            strokeLinecap="round"
            opacity={on ? 1 : 0.6}
          />
        );
      })}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="var(--fg-0)"
        fontSize="26"
        fontWeight="550"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </text>
      {label && (
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="var(--fg-2)"
          fontSize="10.5"
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {label}
        </text>
      )}
      {unit && (
        <text
          x={cx}
          y={cy + 28}
          textAnchor="middle"
          fill="var(--fg-2)"
          fontSize="9.5"
          fontFamily="var(--font-mono)"
        >
          {unit}
        </text>
      )}
    </svg>
  );
}
