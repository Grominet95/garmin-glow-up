import type { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  color?: string;
}

export function Chip({ children, color }: ChipProps) {
  return (
    <span className="chip">
      {color && (
        <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ background: color }} />
      )}
      {children}
    </span>
  );
}
