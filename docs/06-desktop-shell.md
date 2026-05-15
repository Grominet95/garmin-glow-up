# 06 — Desktop shell (`tempo-desktop`)

Tauri 2 + React 19 + TypeScript + Vite. The webview is the entire UI; Rust handles only what a webview cannot: sidecar lifecycle, secure storage, deep links, OS menus, auto-update.

## Top-level layout

```
packages/tempo-desktop/
├── src-tauri/
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   ├── binaries/                # platform-suffixed sidecar binaries
│   │   ├── tempo-sync-x86_64-apple-darwin
│   │   ├── tempo-sync-aarch64-apple-darwin
│   │   ├── tempo-sync-x86_64-pc-windows-msvc.exe
│   │   └── tempo-sync-x86_64-unknown-linux-gnu
│   └── src/
│       ├── main.rs
│       ├── sidecar.rs           # spawn, handshake, kill
│       ├── secure.rs            # keyring-rs wrapper for the token
│       └── menu.rs              # native menus, shortcuts
├── src/
│   ├── main.tsx
│   ├── app.tsx                  # router root, query provider, theme
│   ├── routes/                  # TanStack Router file-based
│   │   ├── __root.tsx           # app shell: Sidebar + TopBar slot
│   │   ├── index.tsx            # /  → Dashboard
│   │   ├── activities/
│   │   │   ├── index.tsx        # list (Calendar/Library)
│   │   │   └── $id.tsx          # /activities/:id → ActivityDetail
│   │   ├── load.tsx
│   │   ├── calendar.tsx
│   │   ├── health.tsx
│   │   └── progress.tsx
│   ├── screens/                 # presentational (1:1 with tempo/*.jsx)
│   ├── components/              # Sidebar, TopBar, Icon, Stat, Chip…
│   ├── charts/
│   │   ├── SyncedMultiSeries.tsx   # Visx — the Activity chart
│   │   ├── YearHeatmap.tsx         # Observable Plot — Calendar
│   │   ├── DistributionStrip.tsx   # Plot — splits/zones
│   │   └── RouteMap.tsx            # MapLibre GL
│   ├── hooks/                   # useDashboard, useActivity(id), …
│   ├── lib/
│   │   ├── api.ts               # fetch wrapper, token injection
│   │   ├── format.ts            # pace, duration, units conversion
│   │   ├── env.ts               # bridge to Tauri commands
│   │   └── time.ts
│   ├── styles/
│   │   ├── tokens.css           # ports tempo/styles.css (CSS vars)
│   │   └── tailwind.css
│   └── types.ts                 # generated from /openapi.json
├── biome.json
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

## `main.rs` — sidecar boot

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, RunEvent};
mod sidecar;
mod secure;
mod menu;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let res = sidecar::start(&handle).await;
                if let Err(e) = res {
                    handle.dialog().message(format!("Sync failed to start: {e}")).show();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            secure::get_token,
            secure::clear_credentials,
            sidecar::restart_sync,
        ])
        .build(tauri::generate_context!())
        .expect("tauri build")
        .run(|app, event| {
            if let RunEvent::ExitRequested { .. } = event {
                let _ = sidecar::shutdown(app);
            }
        });
}
```

## `sidecar.rs` — lifecycle contract

The sidecar emits a single boot line on stdout that the Rust side captures:

```
TEMPO-READY token=<hex32> port=8765
```

After parsing that line, Rust stashes the token in keyring (`secure::store_token`) and emits `sync-ready` to the webview. All further communication is HTTP from React to `127.0.0.1:8765`.

Behaviour:
- Restart on unexpected exit, max 3 attempts in 30 s.
- On shutdown, send SIGTERM, wait 5 s, then SIGKILL.
- In dev (`pnpm tauri dev`), prefer a sidecar started externally (`uv run tempo-sync serve --port 8765`) and skip the spawn.

## React entry

```tsx
// src/app.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { setToken } from "./lib/api";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function App() {
  useEffect(() => {
    const unlisten = listen<string>("sync-ready", (e) => setToken(e.payload));
    return () => { unlisten.then(f => f()); };
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

## API client

```ts
// src/lib/api.ts
let token = "";
export const setToken = (t: string) => { token = t; };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`http://127.0.0.1:8765${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), "X-Tempo-Token": token },
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}
```

## TanStack Query hooks (one per resource)

```ts
// hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { components } from "../types";

type DashboardResponse = components["schemas"]["DashboardResponse"];

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardResponse>("/dashboard"),
    refetchInterval: 60_000,
  });
}
```

Pattern: every hook owns one endpoint; screens consume one hook; no component fetches directly.

## Routing & screen → route map

| URL | Route file | Screen | Hook |
|---|---|---|---|
| `/` | `routes/index.tsx` | `Dashboard` / `DashboardEmpty` | `useDashboard()` |
| `/activities/:id` | `routes/activities/$id.tsx` | `ActivityDetail` | `useActivity(id)` |
| `/load` | `routes/load.tsx` | `TrainingLoad` | `useLoad()` |
| `/calendar` | `routes/calendar.tsx` | `CalendarView` | `useCalendar(year)` |
| `/health` | `routes/health.tsx` | `HealthView` | `useHealth(window)` |
| `/progress` | `routes/progress.tsx` | `ProgressView` | `useProgress()` |

Sidebar nav state is derived from the router's matched route, not a separate prop.

## Sync indicator

The TopBar reads from `useSyncStatus()` which opens an `EventSource("/sync/status")` and keeps the last status in a Zustand store (the only piece of state outside TanStack Query). When `mfa_required` shows up, an MFA modal mounts at the app shell level.

## OS menus & shortcuts

`menu.rs`:
- File → Sync now (`⌘R`)
- File → Force re-sync last 30d (`⌘⇧R`)
- File → Import .fit (opens file dialog → POSTs to `/import/fit`)
- View → switch screen (`⌘1..⌘6`)
- Window standard items
- Help → "Show logs" (opens `~/.tempo/logs` in OS file viewer)

## Secure storage in Rust

Use `keyring-rs` to mirror what the Python side does. Two entries only:
- `tempo.app.token` — the sidecar bearer token, regenerated per launch
- nothing else; Garmin tokens stay on the Python side

## Auto-update

`tauri-plugin-updater` configured against `https://github.com/<owner>/garmin-glow-up/releases/latest/download/latest.json`. Public key in `tauri.conf.json`; private signing key kept in `TAURI_SIGNING_PRIVATE_KEY` repo secret. Updates land silently and apply on next launch.

## DevX

```
pnpm install                        # bootstrap workspace
pnpm --filter tempo-desktop dev     # vite + tauri dev, expects sidecar running on :8765
pnpm --filter tempo-desktop gen     # regenerate src/types.ts from /openapi.json
pnpm --filter tempo-desktop build   # production bundle
```

Storybook is optional; the existing `Tempo.html` already serves as a design canvas.
