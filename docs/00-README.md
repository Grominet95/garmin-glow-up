# Garmin Glow Up — Developer Handoff

> Open-source desktop client for Garmin Connect.
> This folder is the complete specification for implementing the live app on top of the existing HTML/React design (`Tempo.html` + `tempo/*.jsx` at repo root).

## Read order

| # | File | Audience | Purpose |
|---|------|----------|---------|
| 0 | `00-README.md` | everyone | this index |
| 1 | `01-architecture.md` | engineer | repo layout, processes, deps, decisions |
| 2 | `02-phases.md` | engineer | 10-phase delivery plan with acceptance criteria |
| 3 | `03-backend-sync.md` | engineer (Python) | auth, Garmin endpoints, FIT parser, scheduler |
| 4 | `04-database.md` | engineer | SQLite schema, migrations, indices |
| 5 | `05-api-contract.md` | both | REST endpoints + payload schemas (the only contract between the two services) |
| 6 | `06-desktop-shell.md` | engineer (Rust/TS) | Tauri shell, IPC, secret storage |
| 7 | `07-screens.md` | engineer (TS) | screen-by-screen data wiring — maps each existing `.jsx` to the endpoint that feeds it |
| 8 | `08-design-tokens.md` | engineer (TS) | how the existing styling system survives the migration to Vite + Tailwind |
| 9 | `09-build-ship.md` | engineer | build, sign, ship, auto-update |

## Hard rules

1. **Do not clone Garmin Connect's UI.** The existing Tempo designs are original and replace it entirely. The only thing borrowed from Garmin is their *data* via the unofficial API — that is fair game for a personal open-source client; their visual identity is not. Never lift screenshots, icons, or the triangle mark.
2. **Two processes, one contract.** The Python sync service and the Tauri/React desktop are decoupled by a tiny REST API on `127.0.0.1` (see `05-api-contract.md`). Do not bypass it — no direct SQLite reads from the React side, no React-specific logic in Python.
3. **Tokens never touch the disk in clear.** Use the OS keychain via `keyring` (Python) and `tauri-plugin-stronghold` or `keyring-rs` (Rust). See `03-backend-sync.md §Auth`.
4. **Be a polite client.** Rate-limit: one full sync per 1–4 h, exponential backoff, respect 429. See `03-backend-sync.md §Rate limiting`.
5. **Existing designs are the source of truth for layout and data shape.** Do not redesign screens; wire them up. The `.jsx` files at `tempo/*.jsx` already declare every field the UI needs — `07-screens.md` extracts them into typed contracts.

## What "done" looks like (Phase 10)

- User installs a 8–15 MB `.dmg` / `.msi` / `.AppImage`.
- First launch: Garmin SSO modal → tokens stored in keychain → background sync starts.
- After ~60 s on a fresh install, "Today" dashboard is fully populated from real data.
- Every screen in `Tempo.html` renders with the user's own data — no mocks.
- The sync service can run standalone (port `:8765`) for headless / NAS / Jarvis re-use.
- CI builds signed artefacts for macOS (arm64, x86_64), Windows (x86_64), and Linux (x86_64) on tag push.
