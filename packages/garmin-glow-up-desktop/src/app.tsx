import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useSyncStore } from "./hooks/useSyncStatus";
import { setToken } from "./lib/api";
import { router } from "./router";

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  const setReady = useSyncStore((s) => s.setReady);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(window as unknown as Record<string, unknown>).__TAURI__
    ) {
      // Running in plain browser (dev tools) — skip Tauri IPC, auth already disabled
      setReady(true);
      return;
    }
    const unlisten = listen<string>("sync-ready", (e) => {
      setToken(e.payload);
      setReady(true);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [setReady]);

  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
