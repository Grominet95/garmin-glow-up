# 02 — Delivery Phases

Ten phases, each ~1–4 days of focused work. Each phase has a single demoable outcome — do not move forward until "Definition of done" is true.

---

## Phase 0 — Repo scaffold (½ day)

**Goal:** empty monorepo that builds on all three OSes in CI.

**Tasks**
1. `pnpm init` at root, set up `pnpm-workspace.yaml` covering `packages/*`.
2. Create `packages/tempo-sync/pyproject.toml` with `uv` and a stub `python -m tempo_sync` that prints `"sync v0"`.
3. Scaffold `packages/tempo-desktop` with `pnpm create tauri-app` → React + TS template, then port the Vite config.
4. Add `.github/workflows/ci.yml` that runs `biome ci`, `vitest run`, `ruff check`, `pytest -q` on push.
5. Add `handoff/` (this folder) to the repo so contributors find it.

**Definition of done:** CI green on a fresh PR; `pnpm --filter tempo-desktop dev` shows the default Tauri window; `uv run -p packages/tempo-sync python -m tempo_sync` prints the stub.

---

## Phase 1 — Auth & token vault (1–2 days)

**Goal:** user can log in to Garmin from a CLI; tokens persist in the OS keychain.

**Tasks** (see `03-backend-sync.md §Auth` for details)
1. Wrap `python-garminconnect`'s SSO call in `tempo_sync.auth.login(email, password, mfa_callback)`.
2. Implement `TokenStore` with `keyring` backend; refuse to fall back to a file.
3. CLI: `python -m tempo_sync auth login` (prompts) and `auth status` (prints expiry).
4. Hot-swap surface: keep all third-party calls inside `tempo_sync.garmin.client.GarminClient` so swapping libraries is < 50 LOC.

**Definition of done:** `auth login` succeeds, `auth status` shows a valid token, killing & restarting the CLI does not re-prompt.

---

## Phase 2 — Database & first pull (1–2 days)

**Goal:** activities for the last 30 days land in SQLite.

**Tasks**
1. Define SQLAlchemy models per `04-database.md`.
2. `alembic init`, generate baseline migration `0001_baseline`.
3. Implement `tempo_sync.sync.activities.pull_recent(days=30)`:
   - list activity IDs via Garmin endpoint
   - upsert summary rows
   - download `.FIT` for each
   - parse with `fitparse` → rows in `activity_streams`, `activity_laps`
4. Wire APScheduler with a job that pulls every 2 h (overridable per-resource).

**Definition of done:** `python -m tempo_sync sync --since 30d` runs end-to-end; `sqlite3 ~/.tempo/tempo.db "SELECT count(*) FROM activities"` ≥ 1; the FIT for the most recent run has stream rows.

---

## Phase 3 — REST API skeleton (1 day)

**Goal:** every endpoint listed in `05-api-contract.md` returns 200 with shape-correct mock data.

**Tasks**
1. Set up FastAPI app in `tempo_sync.api.app:create_app()`.
2. One router per resource: `/dashboard`, `/activities`, `/activities/{id}`, `/load`, `/calendar`, `/health`, `/progress`.
3. Pydantic response models matching `05-api-contract.md` exactly.
4. CORS off, bind `127.0.0.1:8765`, signed-cookie auth (`X-Tempo-Token` header generated on first launch).
5. `/openapi.json` exposed → script `pnpm gen:types` in desktop generates `src/types.ts` via `openapi-typescript`.

**Definition of done:** `curl http://127.0.0.1:8765/dashboard | jq` returns the full Dashboard payload; types generated; type check passes on a stub React `useDashboard()` hook.

---

## Phase 4 — Wire real data into endpoints (2–3 days)

**Goal:** each endpoint reads from SQLite, not stubs.

**Tasks**
- Implement read paths in `tempo_sync.api.dashboard.get_today()`, `activities.list()`, `activities.detail(id)`, etc.
- Pre-compute CTL/ATL/TSB on each sync (cheaper than recomputing on read; cache in a `daily_load` table).
- For `/activities/{id}`, downsample streams to ~600 points before serialising (see `05-api-contract.md §Downsampling`).

**Definition of done:** `curl /dashboard` shows your real last session, real CTL number, real sleep score.

---

## Phase 5 — Tauri shell + sidecar (1 day)

**Goal:** desktop launches the sync sidecar transparently and renders the existing dashboard with real data.

**Tasks**
1. Bundle `tempo-sync` as a PyInstaller binary in `src-tauri/binaries/` (per-target).
2. In `src-tauri/src/main.rs`, on app `setup`: spawn the sidecar, capture stdout, kill on `RunEvent::ExitRequested`.
3. Forward the auto-generated `X-Tempo-Token` from the sidecar's stdout handshake into the React side via Tauri's IPC.
4. In React: `lib/api.ts` — a thin fetch wrapper that prepends the token, retries on connection refused (sidecar warming up).

**Definition of done:** double-click the dev build → no terminal, no extra steps → Dashboard shows real data within 5 s.

---

## Phase 6 — Port the screens (3–5 days)

**Goal:** every JSX file at `tempo/*.jsx` is reborn as a typed TS component in `tempo-desktop/src/screens/`, fed by its hook.

**Order of porting** (each one its own PR):
1. `Dashboard` ← `dashboard.jsx` + `dashboard-empty.jsx`
2. `ActivityDetail` ← `activity.jsx` (+ map via MapLibre, chart via Visx)
3. `TrainingLoad` ← `training-load.jsx`
4. `Calendar` ← `calendar.jsx` (heatmap via Observable Plot)
5. `Health` ← `health.jsx`
6. `Progress` ← `progress.jsx`
7. Variants — `ActivityIntervals`, `ActivityNoPower` use the same `ActivityDetail` with prop overrides (already designed that way).

For each port: read `07-screens.md §<Screen>` to learn the typed data shape and the endpoint that feeds it.

**Definition of done:** every route renders the user's own data; no `Math.random()` and no hard-coded array survives anywhere outside of fixture files used by `vitest`.

---

## Phase 7 — Polish & motion (2 days)

**Tasks**
- TanStack Router transitions via Framer Motion.
- Loading skeletons that match the final layout (use the existing `EmptyCard` pattern).
- Error boundaries → friendly empty states (re-use `DashboardEmpty` copy tone for "no sync yet").
- Keyboard shortcuts: `⌘R` resync, `⌘1..6` switch screen, `⌘K` global search.

---

## Phase 8 — Sync UX (1–2 days)

**Tasks**
- Top-bar sync indicator (dot + last sync time) — read from `GET /sync/status` (SSE).
- "Sync now" button → `POST /sync/run` with progress chunks streamed back.
- Settings screen: rate-limit, sync interval, units (metric/imperial), theme.
- First-run wizard: email → password → MFA → progress bar → "Welcome".

---

## Phase 9 — CLI + headless mode (1 day)

**Tasks**
- `tempo-cli` shim publishes the same commands the desktop uses internally.
- Document `pipx install tempo-cli` workflow for the NAS / Jarvis case.
- Auth flow works in headless mode (prompts on stdin, `TEMPO_MFA_CODE` env override).

---

## Phase 10 — Build, sign, ship (2 days)

**Tasks**
- GitHub Actions matrix: `macos-14` (arm64) + `macos-13` (x86_64) + `windows-latest` + `ubuntu-22.04`.
- Code-sign macOS (Developer ID), notarize. Windows: signed `.msi` (or unsigned with documented SmartScreen workaround).
- `tauri-plugin-updater` with signed update manifest hosted on GitHub releases.
- First release: `v0.1.0`. Tag → release pipeline produces 5 artefacts + `latest.json`.

**Definition of done:** clean machine → download `.dmg` → first-run wizard → real data in < 2 minutes.
