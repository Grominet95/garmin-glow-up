interface StatProps {
  label: string;
  value: string;
  unit?: string;
  tone?: "lead" | "accent" | "dim" | null;
}

export function Stat({ label, value, unit, tone }: StatProps) {
  const valueColor =
    tone === "lead"
      ? "var(--fg-0)"
      : tone === "accent"
        ? "var(--accent)"
        : tone === "dim"
          ? "var(--fg-2)"
          : "var(--fg-0)";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.08em] text-fg-2 font-medium">{label}</span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-[22px] font-[550] tracking-[-0.03em] num"
          style={{ color: valueColor }}
        >
          {value}
        </span>
        {unit && <span className="text-[12px] text-fg-2">{unit}</span>}
      </div>
    </div>
  );
}
