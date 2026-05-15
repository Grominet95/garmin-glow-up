interface Option {
  value: string;
  label: string;
}

interface Props {
  active: string;
  onChange: (value: string) => void;
  options: Option[];
}

export function CardSwitcher({ active, onChange, options }: Props) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        background: "var(--bg-3)",
        border: "1px solid var(--line)",
        borderRadius: 8,
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === active;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            style={{
              border: 0,
              background: isActive ? "var(--bg-1)" : "transparent",
              color: isActive ? "var(--fg-0)" : "var(--fg-2)",
              boxShadow: isActive
                ? "0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px var(--line-soft)"
                : "none",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              letterSpacing: "-0.005em",
              padding: "5px 11px",
              borderRadius: 6,
              cursor: "pointer",
              transition: "background 120ms, color 120ms",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
