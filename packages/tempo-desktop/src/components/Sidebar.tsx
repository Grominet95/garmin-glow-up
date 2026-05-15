import { Link, useMatchRoute } from "@tanstack/react-router";
import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";
import logo from "../assets/logo.png";

const NAV = [
  { to: "/", label: "Today", icon: "dashboard" as const, kbd: "1" },
  { to: "/activities", label: "Activity", icon: "run" as const, kbd: "2" },
  { to: "/load", label: "Training Load", icon: "load" as const, kbd: "3" },
  { to: "/calendar", label: "Calendar", icon: "calendar" as const, kbd: "4" },
  { to: "/health", label: "Health", icon: "heart" as const, kbd: "5" },
  { to: "/progress", label: "Progress", icon: "trophy" as const, kbd: "6" },
];

export function Sidebar() {
  const matchRoute = useMatchRoute();
  const { theme, toggle } = useTheme();

  return (
    <aside
      className="flex flex-col gap-1 px-3.5 py-4 border-r border-line-soft"
      style={{ background: "var(--bg-0)", width: 200 }}
    >
      <div className="flex items-center gap-2 px-2 pb-4">
        <img src={logo} alt="Garmin Glow Up" style={{ height: 80, width: "auto", objectFit: "contain" }} />
        <span className="ml-auto text-[10px] text-fg-3 font-mono">0.1.0</span>
      </div>

      <div className="text-[11px] text-fg-2 uppercase tracking-[0.08em] font-medium px-2 py-1 pt-3">
        Library
      </div>

      {NAV.map((n) => {
        const isActive = !!matchRoute({ to: n.to, fuzzy: n.to !== "/" });
        return (
          <Link
            key={n.to}
            to={n.to}
            className={[
              "flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-[13px] font-[450] no-underline transition-colors",
              isActive ? "bg-bg-2 text-fg-0" : "text-fg-1 hover:bg-bg-2/60 hover:text-fg-0",
            ].join(" ")}
          >
            <Icon name={n.icon} size={14} />
            <span>{n.label}</span>
            <span className="ml-auto font-mono text-[10.5px] text-fg-3">{n.kbd}</span>
          </Link>
        );
      })}

      <div className="flex-1" />

      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2.5 px-2 py-1.5 text-[13px] text-fg-2 hover:text-fg-0 transition-colors w-full rounded-sm hover:bg-bg-2/60"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <Icon name="settings" size={14} />
        <span>Preferences</span>
        <span className="ml-auto font-mono text-[10.5px] text-fg-3">
          {theme === "dark" ? "☀" : "◑"}
        </span>
      </button>
    </aside>
  );
}
