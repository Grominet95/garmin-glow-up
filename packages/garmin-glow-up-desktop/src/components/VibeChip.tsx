interface VibeChipProps {
  word: string;
  sub: string;
}

export function VibeChip({ word, sub }: VibeChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] text-fg-0 border border-line-soft"
      style={{ background: "var(--bg-1)" }}
      title={sub}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: "var(--rose)",
          boxShadow:
            "0 0 8px var(--rose), 0 0 0 3px color-mix(in oklch, var(--rose) 25%, transparent)",
        }}
      />
      <span className="font-medium">{word}</span>
      <span className="text-fg-2 text-[11px]">· {sub}</span>
    </span>
  );
}
