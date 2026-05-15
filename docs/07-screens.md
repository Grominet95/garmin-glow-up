# 07 — Screen-by-screen wiring

For each existing `tempo/*.jsx` file: which endpoint feeds it, which charts to swap to real implementations, which fields the mock currently hardcodes, and what to do about them.

The source JSX is canonical — never redesign during the port. If a layout decision puzzles you, read the original `.jsx`, do not invent.

---

## `Dashboard` — `tempo/dashboard.jsx`

**Route:** `/`
**Endpoint:** `GET /dashboard` → `DashboardResponse`
**Hook:** `useDashboard()`

### Mock → live mapping

| JSX line / variable | Becomes |
|---|---|
| `ctl`, `atl`, `tsb` arrays of 28 | `data.form28d.{ctl,atl,tsb}` |
| `week[]` literal | `data.week[]` |
| `<VibeChip word="Spring-loaded" .../>` | `data.vibe.{word, sub}` (hide chip if null) |
| `<span className="pill">Fresh · TSB +6</span>` | `data.status.tone` + `data.status.tsb` |
| Status copy block | `data.status.{headline, subhead, body}` |
| `<TickArc value={82} label="Charged" .../>` | `data.bodyBattery.{current, label}` |
| Sleep card (7:42, 23:18→07:00, segments) | `data.sleep.*` |
| "Last session" mini-card | `data.lastSession.*` |
| "Planned · Today" card | `data.plannedToday.*` (hide entire card if null) |
| Week totals "89.7 km · 6 sessions · +8%" | `data.weekTotals.*` |

### Charts

- Mini CTL/ATL/TSB chart in the status card: keep the existing inline SVG `pathFromSeries(...)`. It's tiny and works.
- Sleep stages strip: pure CSS flex — already perfect.
- Body battery dial: keep `<TickArc>` (it's a pure SVG component).

### Behaviour additions

- `useDashboard` polls every 60 s.
- When `state === "empty"`, render `<DashboardEmpty/>` instead. `DashboardEmpty` takes zero props; its sole need is `data.syncStatus.lastSync` for the "Last sync · 8 days ago" pill — pass it through.
- "Plan workout" and "Sync now" buttons → `POST /sync/run` and route `/plan/new` respectively (the plan route is post-MVP; gate behind a feature flag).

---

## `ActivityDetail` — `tempo/activity.jsx`

**Route:** `/activities/:id`
**Endpoint:** `GET /activities/:id` → `ActivityDetailResponse`
**Hook:** `useActivity(id)`

This is the hero screen and the most data-dense one. Read its prop list at the top of `activity.jsx` — it already declares the override surface. We map each prop slot to a response field; the variants (`ActivityIntervals`, `ActivityNoPower`) become *the same component* called with `data` coming back from different IDs.

### Mock → live mapping

| JSX | Becomes |
|---|---|
| `data = RUN` (the 240-point sample series) | `data.streams.*` — note that `streams` is an object of parallel arrays, not an array of objects; adapt `pathFromSeries` to read `streams.timeS[i]` + `streams.hr[i]` |
| `splits = SPLITS` | `data.splits[]` |
| `title`, `subtitle` | `data.title`, `data.subtitle` |
| `mapPath` (decorative SVG default) | replace map card with `<RouteMap polyline={data.map.polyline} bbox={data.map.bbox} accent={accent} fastest={data.map.fastestCallout} />` |
| `routeName`, `routeCoords`, `fastestCallout` | `data.map.routeName`, `data.map.routeCoords`, `data.map.fastestCallout` |
| `hero` (8 stats) | `data.hero[]` — already typed identically (`{label, value, unit, tone}`) |
| `zones = ZONES` | `data.zones[]` |
| Avg/Max/HRR footer | `data.hrSummary.{avg, max, hrrPct}` |
| `dynamics` literal | `data.dynamics` (null → keep the existing "No paired pod" empty state) |
| `trainingEffect` literal | `data.trainingEffect` |
| `missing` | `data.missing[]` |

### Charts

- **Synchronised chart** (current inline SVG with 4 stacked tracks): rewrite as `<SyncedMultiSeries data={data.streams} tracks={tracks} />` powered by Visx. Requirements:
  - Brush on the horizontal axis — drag a window, all 4 tracks zoom together, splits below highlight the bracketed range.
  - Crosshair shared across tracks; live readouts in the top-right of each track (already designed).
  - 60 fps on a 600-point payload; throttle hover to `requestAnimationFrame`.
- **Splits barcode:** keep inline SVG — geometry is bespoke and Visx adds no value.
- **HR zones bars:** pure CSS, keep.
- **Map:** MapLibre GL with a custom dark style matching `var(--bg-0)` / `var(--bg-1)`. See `RouteMap.tsx` spec below.

### `<RouteMap>` component

Props: `{ polyline: string; bbox: [n,e,s,w]; accent: string; fastest?: string }`

- Decode polyline (`@mapbox/polyline`).
- Use MapLibre `tinaccord-dark` or build a custom style; tiles from OpenFreeMap or Stadia (free tier).
- Draw the route as a `line` layer with the `accent` colour, plus a wider semi-transparent halo underneath (matches current design).
- Start dot + current-position dot as `circle` layers.
- Km tick dots from `data.splits` projected onto the line.
- Map/Topo/Satellite chips top-right control `style/source` swaps.

### Variants

`ActivityIntervals` and `ActivityNoPower` in `activity-variants.jsx` are *not* separate screens — they're the same `ActivityDetail` with different payloads. Confirm by inspecting the file: it exports two thin wrappers that pass overrides. After the port, both call sites become `/activities/:id` with the relevant ID, and the wrapper component goes away.

---

## `TrainingLoad` — `tempo/training-load.jsx`

**Route:** `/load`
**Endpoint:** `GET /load?range=120d` → `LoadResponse`
**Hook:** `useLoad(range)`

### Mock → live mapping

| JSX | Becomes |
|---|---|
| 120-day `ctl`/`atl`/`tss`/`tsb` arrays | `data.series[]` (array of `{date, ctl, atl, tsb, tss}`) |
| 16-week stacked volumes | `data.weekly[]` |
| Range chips "30d / 90d / 120d / 1y / All" | controlled by hook param; persist to URL search `?range=120d` |
| Top 4 big numbers | `data.current.*` and derived |
| Recommendations panel (if present) | `data.recommendations[]` |

### Charts

- CTL/ATL/TSB long chart → Visx `LinePath` ×3, brush on x. Threshold-band overlay for TSB (red < −20, yellow < 0, green ≥ 0).
- Stacked weekly volume → Visx `BarStack` on `data.weekly[*].bySport`.
- The "ramp rate" sparkline can stay as inline SVG.

---

## `CalendarView` — `tempo/calendar.jsx`

**Route:** `/calendar`
**Endpoint:** `GET /calendar?year=YYYY` → `CalendarResponse`
**Hook:** `useCalendar(year)`

### Mock → live mapping

| JSX | Becomes |
|---|---|
| The seeded `grid` 52×7 generator | `data.cells[]` (sparse — only days with activity) |
| "378 sessions, 2,148 km, 189h" header | `data.totals.*` |
| `recent[]` literal | `data.recent[]` |
| Sport filter chips | local state; on change, filter `cells[]` client-side (server doesn't need to know) |

### Chart

- Year heatmap → Observable Plot `Plot.cell()` keyed by `dateLocal` and coloured by `sport`. Saves ~150 LOC vs. hand-rolling SVG.
- Today-dot (the rose accent) — overlay a `Plot.dot()` layer keyed on `today === dateLocal`.

---

## `HealthView` — `tempo/health.jsx`

**Route:** `/health`
**Endpoint:** `GET /health?window=30d` → `HealthResponse`
**Hook:** `useHealth(window)`

### Mock → live mapping

| JSX | Becomes |
|---|---|
| 30-day `hrv`, `rhr`, `stress`, `bb`, `spo2`, `sleepHrs` | `data.series.*` |
| 8-hour sleep block strip (96 entries) | `data.lastNight.blocks5min[]` |
| Sleep totals (Deep / REM / Light / Awake) | `data.lastNight.totals.*` |
| "Tonight" prediction card | `data.tonightForecast.*` (hide if null) |

### Charts

- HRV / RHR / Stress / BB / SpO2 / Sleep — six small Recharts `LineChart`s is fine here (Visx is overkill for a 30-point spark). The decision in `01-architecture.md` to "use Recharts for the simple stuff" lives here.
- Sleep stages timeline → custom SVG; the 4-colour palette is bound to CSS vars (`--z2/z4/z5` + `--fg-3`).

---

## `ProgressView` — `tempo/progress.jsx`

**Route:** `/progress`
**Endpoint:** `GET /progress` → `ProgressResponse`
**Hook:** `useProgress()`

### Mock → live mapping

| JSX | Becomes |
|---|---|
| 24-month VO2max curve | `data.vo2max.{months, values}` |
| `races[]` | `data.races[]` |
| `courses[]` | `data.courses[]` |
| `badges[]` | `data.badges[]` |
| "New PR on Brittany dunes" chip | `data.highlights[0]` when `kind === "pr"` |

### Charts

- VO₂max curve → Visx `LinePath` + dot annotations on the peaks.
- Badges grid → static — earned ones in full colour, locked ones desaturated.

### Sparkle moment

The rose sparkle for PRs is intentional brand juice — keep it, but only render when `highlights[].kind === "pr"` actually has an entry less than 7 days old. Don't fake celebrate.

---

## Shared concerns

### Units

The desktop converts SI → display in `lib/format.ts`. Settings drive a `units` context; every place that currently writes `"4:03"` or `"14.02 km"` calls a formatter:

```ts
fmtPace(seconds, { unit: "kmh"|"mph"|"min/km"|"min/mi" })
fmtDistance(metres, units)
fmtDuration(seconds)
fmtElevation(metres, units)
```

The API returns `paceDisplay` strings *as a hint for SI/metric* — when the user flips to imperial, recompute from the raw numeric `pace` field. This is why every response carries both a raw and a display form for paces/distances.

### Empty states

Every screen has at least two empty shapes:
1. **No data yet** (fresh install, no sync) — Reuse `DashboardEmpty` tone copy.
2. **No data in this window** — Friendly: "Nothing logged in the last 30 days. Widen the range or sync to pick up new sessions."

### Error boundaries

One boundary per route. Catches:
- `unauthenticated` → redirect to first-run wizard.
- `garmin_down` → toast "Garmin is unreachable. Showing your last cached data."
- `db_locked` → silent retry after 250 ms (almost always self-resolves).
- everything else → "Something broke. Open logs?"

### Loading skeletons

For every screen, write a skeleton that matches the final layout — same card shapes, same grid, all text replaced with `<Skeleton>` blocks. The transition from skeleton → real data should be a *fill*, not a re-layout. This is what makes the app feel native.
