# 01 — Architecture

## Two services, one wire

```
┌──────────────────────────────────────────────────────────────────┐
│                       garmin-glow-up/                            │
│                                                                  │
│   ┌────────────────────────┐        ┌─────────────────────────┐  │
│   │   tempo-desktop        │        │   tempo-sync            │  │
│   │   (Tauri 2 + React)    │ ─────▶ │   (FastAPI + Uvicorn)   │  │
│   │   Rust ~3 MB           │  HTTP  │   Python                │  │
│   │   webview UI           │ :8765  │   port 8765, loopback   │  │
│   │                        │ ◀───── │                         │  │
│   └────────────────────────┘  SSE   └─────────────┬───────────┘  │
│                                                   │              │
│                                          ┌────────▼──────────┐   │
│                                          │   SQLite          │   │
│                                          │   (WAL mode)      │   │
│                                          │   ~/.tempo/db     │   │
│                                          └───────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (occasional)
                    Garmin Connect endpoints
                    (HTTPS + bearer token)
```

**Why two processes:**
- The Python service is reusable headless — Jarvis backend, a NAS sidecar, a CLI, a server cron — anywhere that wants Garmin data without an Electron blob.
- The desktop never needs Python knowledge. The React side speaks REST/SSE and knows nothing about FIT files or OAuth.
- When Garmin breaks SSO (Cloudflare turnstile, MFA changes), only the sync service is patched. The desktop ships unchanged.

**How they ship together:** The Tauri binary bundles a frozen `tempo-sync` (via PyInstaller or `uv tool` + a launcher shim). On launch, the Rust process forks the sidecar; on quit, it sends SIGTERM. For headless deployments, install only `tempo-sync` from PyPI / `pipx`.

## Monorepo layout

```
garmin-glow-up/
├── README.md
├── handoff/                     # this folder
├── pnpm-workspace.yaml
├── .github/workflows/           # CI: lint, test, build matrix
│
├── packages/
│   ├── tempo-sync/              # Python service
│   │   ├── pyproject.toml       # uv-managed
│   │   ├── src/tempo_sync/
│   │   │   ├── __main__.py      # `python -m tempo_sync` entry
│   │   │   ├── api/             # FastAPI routers (one per resource)
│   │   │   ├── auth/            # SSO flow, token storage
│   │   │   ├── garmin/          # python-garminconnect wrapper
│   │   │   ├── fit/             # fitparse adapters
│   │   │   ├── db/              # SQLAlchemy 2.x models + Alembic
│   │   │   ├── scheduler/       # APScheduler jobs
│   │   │   ├── sync/            # orchestration: pull, parse, persist
│   │   │   └── settings.py      # pydantic-settings
│   │   ├── alembic/
│   │   └── tests/
│   │
│   ├── tempo-desktop/           # Tauri shell
│   │   ├── package.json         # pnpm + Vite + React 19
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── biome.json
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── routes/          # TanStack Router file-based routes
│   │   │   ├── screens/         # ports of tempo/*.jsx (typed, wired)
│   │   │   ├── components/      # shared (Sidebar, TopBar, …)
│   │   │   ├── charts/          # Visx multi-series, Plot helpers, MapLibre map
│   │   │   ├── lib/             # api client, hooks (TanStack Query)
│   │   │   ├── styles/          # tokens.css (from tempo/styles.css)
│   │   │   └── types.ts         # generated from OpenAPI (see Phase 2)
│   │   └── src-tauri/
│   │       ├── Cargo.toml
│   │       ├── tauri.conf.json
│   │       └── src/main.rs      # sidecar fork, deep links, updater
│   │
│   └── tempo-cli/               # (Phase 9) thin CLI on the same sync core
│       └── pyproject.toml
│
└── docs/                        # user-facing docs site, MkDocs Material
```

## Tech choices (locked)

| Layer | Pick | Version | Reason |
|---|---|---|---|
| Python pkg manager | **uv** | latest | install in seconds, lock file deterministic |
| API framework | **FastAPI + Uvicorn** | `fastapi ^0.115`, `uvicorn[standard] ^0.32` | typed, async, OpenAPI for free |
| Garmin client | **python-garminconnect** | latest (cyberjunky) | actively maintained, replaces `garth` |
| FIT parser | **fitparse** | `^1.2` | smaller surface than the official SDK |
| ORM | **SQLAlchemy 2.x** | `^2.0` | declarative + typed |
| Migrations | **Alembic** | `^1.13` | standard with SQLA |
| Models | **Pydantic 2** | `^2.9` | shared FastAPI request/response |
| Scheduler | **APScheduler** | `^3.10` | runs in-process |
| Secrets | **keyring** | `^25` | OS-native (Keychain / Cred Manager / libsecret) |
| Desktop shell | **Tauri** | `2.x` | 5–10 MB, native webview, Rust IPC |
| UI | **React + TypeScript + Vite** | React 19, Vite 5 | already what the JSX uses |
| Routing | **TanStack Router** | `^1.x` | type-safe file-based routes |
| Data fetching | **TanStack Query** | `^5.x` | cache + invalidation |
| Styling | **Tailwind CSS + CSS vars** | Tailwind 3 (or 4 once stable) | maps cleanly onto existing tokens |
| Primitives | **Radix UI** | latest | a11y dialogs/menus, styled with Tailwind |
| Motion | **Framer Motion** | latest | screen transitions |
| Dataviz — bespoke | **Visx** | `^3.x` | Activity detail multi-series with brush |
| Dataviz — quick | **Observable Plot** | `^0.6` | calendar heatmap, distributions |
| Maps | **MapLibre GL** | `^4.x` | open-tile fork of Mapbox, no API key |
| Lint/format | **Biome** | `^1.x` | replaces ESLint + Prettier |
| Tests (TS) | **Vitest** | `^2.x` | fast |
| Tests (Py) | **pytest + pytest-asyncio** | latest | standard |
| CI | **GitHub Actions** | — | macOS, Windows, Linux runners |
| Updater | **tauri-plugin-updater** | `2.x` | signed updates |

## Explicitly rejected

- **Electron** — incompatible with the "light, premium, fast" goal. Tauri ships 20× smaller and starts instantly.
- **Raw D3** — too low-level for ROI. Visx gives 80 % of the control for 20 % of the code.
- **Recharts alone** — fine for simple dashboards, hits a wall on synchronised multi-series with brush. Use it for the simple stuff in `Health` only; everything in Activity Detail goes through Visx.
- **Mapbox GL JS** — paid past a tile threshold; key management is a nightmare for an OSS-distributed binary. MapLibre instead.
- **Garmin SSO in Rust** — feasible but 10× the friction every time Garmin tweaks auth. Keep it in Python.
- **garth** — deprecated, no longer tracking Garmin's auth flow.

## Folder conventions

- Python: `snake_case` modules, `PascalCase` SQLA models, `verb_noun` functions.
- TS/React: `PascalCase.tsx` for components, `camelCase.ts` for hooks/utils, one component per file when > 80 LOC.
- Each FastAPI router file owns one resource (`/activities`, `/health`, `/load`) and lives in `api/<resource>.py`.
- Each "screen" in the desktop has a single hook that owns its data fetching (`useDashboardData()`, `useActivityDetail(id)`), and a presentational component that takes typed props — never call `fetch` from JSX directly.

## Environment

- Python 3.12+ (uv handles the install).
- Node 20+ via `corepack enable pnpm`.
- Rust stable via `rustup`.
- macOS dev needs Xcode CLT, Windows needs MSVC build tools, Linux needs `libwebkit2gtk-4.1-dev` + friends (see Tauri prereqs).
