export type IconName =
  | "run"
  | "bike"
  | "swim"
  | "trail"
  | "lift"
  | "dashboard"
  | "calendar"
  | "load"
  | "heart"
  | "trophy"
  | "search"
  | "settings"
  | "arrow-right"
  | "arrow-up"
  | "arrow-down"
  | "play"
  | "share"
  | "filter"
  | "sync"
  | "info"
  | "sparkle"
  | "glow-mark"
  | "moon"
  | "sun"
  | "mountain"
  | "wind"
  | "drop";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}

const ICONS: Record<IconName, (props: { c: string; sw: number }) => JSX.Element> = {
  run: ({ c, sw }) => (
    <>
      <circle cx="10" cy="3.2" r="1.2" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M5 14l2-4 2 1 2-3" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M5 8l3-2 2 1 2.5-.5" stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),
  bike: ({ c, sw }) => (
    <>
      <circle cx="4" cy="11" r="2.4" stroke={c} strokeWidth={sw} fill="none" />
      <circle cx="12" cy="11" r="2.4" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M4 11l3-5h3l2 5" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M7 6h2" stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),
  swim: ({ c, sw }) => (
    <>
      <path
        d="M1.5 7.5c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0"
        stroke={c}
        strokeWidth={sw}
        fill="none"
      />
      <path
        d="M1.5 11c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0"
        stroke={c}
        strokeWidth={sw}
        fill="none"
      />
      <circle cx="11" cy="4" r="1.2" stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),
  trail: ({ c, sw }) => <path d="M2 13l3-5 2 2 4-6 3 9" stroke={c} strokeWidth={sw} fill="none" />,
  lift: ({ c, sw }) => (
    <>
      <path d="M2 8h12M4 5v6M12 5v6M1.5 7v2M14.5 7v2" stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),
  dashboard: ({ c, sw }) => (
    <>
      <rect x="2" y="2" width="5" height="5" rx="1" stroke={c} strokeWidth={sw} fill="none" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke={c} strokeWidth={sw} fill="none" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke={c} strokeWidth={sw} fill="none" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),
  calendar: ({ c, sw }) => (
    <>
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M2 6h12M5 1.5v2M11 1.5v2" stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),
  load: ({ c, sw }) => <path d="M2 12l3-4 3 2 3-6 3 4" stroke={c} strokeWidth={sw} fill="none" />,
  heart: ({ c, sw }) => (
    <path
      d="M8 13.5s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7z"
      stroke={c}
      strokeWidth={sw}
      fill="none"
    />
  ),
  trophy: ({ c, sw }) => (
    <>
      <path d="M4 3h8v3a4 4 0 0 1-8 0V3z" stroke={c} strokeWidth={sw} fill="none" />
      <path
        d="M4 4H2v1a2 2 0 0 0 2 2M12 4h2v1a2 2 0 0 1-2 2M6 13h4M7 10v3M9 10v3"
        stroke={c}
        strokeWidth={sw}
        fill="none"
      />
    </>
  ),
  search: ({ c, sw }) => (
    <>
      <circle cx="7" cy="7" r="4.5" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M10.5 10.5l3 3" stroke={c} strokeWidth={sw} />
    </>
  ),
  settings: ({ c, sw }) => (
    <>
      <circle cx="8" cy="8" r="2" stroke={c} strokeWidth={sw} fill="none" />
      <path
        d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4"
        stroke={c}
        strokeWidth={sw}
      />
    </>
  ),
  "arrow-right": ({ c, sw }) => (
    <path d="M3 8h10M9 4l4 4-4 4" stroke={c} strokeWidth={sw} fill="none" />
  ),
  "arrow-up": ({ c, sw }) => (
    <path d="M8 13V3M4 7l4-4 4 4" stroke={c} strokeWidth={sw} fill="none" />
  ),
  "arrow-down": ({ c, sw }) => (
    <path d="M8 3v10M4 9l4 4 4-4" stroke={c} strokeWidth={sw} fill="none" />
  ),
  play: ({ c }) => <path d="M4 3l9 5-9 5z" fill={c} />,
  share: ({ c, sw }) => (
    <>
      <circle cx="4" cy="8" r="1.6" stroke={c} strokeWidth={sw} fill="none" />
      <circle cx="12" cy="3.5" r="1.6" stroke={c} strokeWidth={sw} fill="none" />
      <circle cx="12" cy="12.5" r="1.6" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M5.4 7.3l5.2-3M5.4 8.7l5.2 3" stroke={c} strokeWidth={sw} />
    </>
  ),
  filter: ({ c, sw }) => <path d="M2 3h12M4 8h8M6 13h4" stroke={c} strokeWidth={sw} fill="none" />,
  sync: ({ c, sw }) => (
    <>
      <path
        d="M13 5a5 5 0 0 0-9-1V2M3 11a5 5 0 0 0 9 1v2"
        stroke={c}
        strokeWidth={sw}
        fill="none"
      />
      <path d="M4 4V2H2M12 12v2h2" stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),
  info: ({ c, sw }) => (
    <>
      <circle cx="8" cy="8" r="6" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M8 7v4M8 5h.01" stroke={c} strokeWidth={sw} />
    </>
  ),
  sparkle: ({ c }) => (
    <path d="M8 1.5l1.1 4.5L13.5 7 9.1 8.1 8 12.5 6.9 8.1 2.5 7l4.4-1z" fill={c} />
  ),
  "glow-mark": ({ c }) => (
    <>
      <path
        d="M2.5 12.5 C 4 11, 6 10, 7.5 6.5 C 8.5 4, 10 3, 12 3"
        stroke={c}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="3" r="2.2" fill={c} />
    </>
  ),
  moon: ({ c, sw }) => (
    <path
      d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"
      stroke={c}
      strokeWidth={sw}
      fill="none"
    />
  ),
  sun: ({ c, sw }) => (
    <>
      <circle cx="8" cy="8" r="3" stroke={c} strokeWidth={sw} fill="none" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1"
        stroke={c}
        strokeWidth={sw}
      />
    </>
  ),
  mountain: ({ c, sw }) => (
    <path d="M1 13l4-7 3 5 2-3 5 5z" stroke={c} strokeWidth={sw} fill="none" />
  ),
  wind: ({ c, sw }) => (
    <>
      <path d="M2 6h8a2 2 0 1 0-2-2" stroke={c} strokeWidth={sw} fill="none" />
      <path d="M2 10h11a2 2 0 1 1-2 2" stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),
  drop: ({ c, sw }) => (
    <path d="M8 1.5s4 5 4 8a4 4 0 1 1-8 0c0-3 4-8 4-8z" stroke={c} strokeWidth={sw} fill="none" />
  ),
};

export function Icon({ name, size = 16, color = "currentColor", stroke = 1.6 }: IconProps) {
  const renderer = ICONS[name];
  if (!renderer) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      {renderer({ c: color, sw: stroke })}
    </svg>
  );
}
