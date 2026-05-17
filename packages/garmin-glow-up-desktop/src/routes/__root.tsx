import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Sidebar } from "../components/Sidebar";

export const Route = createRootRoute({
  component: AppShell,
});

function AppShell() {
  return (
    <div
      className="flex"
      style={{ width: "100vw", height: "100vh", background: "var(--bg-0)", overflow: "hidden" }}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
