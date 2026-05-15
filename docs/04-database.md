# 04 — Database

SQLite with WAL, foreign keys ON. One file: `~/.tempo/tempo.db`. SQLAlchemy 2.0 declarative.

Heavily inspired by [GarminDB](https://github.com/tcgoetz/GarminDB) — don't reinvent. This schema is a normalised subset focused on what the Tempo UI actually reads.

## Pragmas (applied on every connection)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;   -- 256 MB
PRAGMA cache_size = -32000;     -- 32 MB
```

## Tables

### `athlete`

Singleton row. Mirrors `~/.tempo/config.toml [athlete]` for query convenience.

| col | type | notes |
|---|---|---|
| id | INT PK | always 1 |
| garmin_user_id | TEXT | from /userprofile |
| max_hr | INT | bpm |
| resting_hr | INT | bpm |
| ftp | INT | watts |
| threshold_pace_s_per_km | INT | seconds |
| weight_kg | REAL | latest |
| birth_date | DATE | |
| sex | TEXT | M/F/X |
| updated_at | TIMESTAMP | |

### `activities`

Header per session. The detail tables hang off this.

| col | type | notes |
|---|---|---|
| id | INT PK | Garmin activity ID |
| sport | TEXT | `run` `bike` `swim` `trail` `lift` `walk` `hike` `row` `other` |
| sub_sport | TEXT | nullable: `tempo`, `intervals`, `recovery`, `track`, … |
| start_time | TIMESTAMP | UTC |
| start_time_local | TIMESTAMP | for display |
| timezone | TEXT | IANA |
| title | TEXT | user-set or default |
| distance_m | REAL | |
| duration_s | INT | moving time |
| elapsed_s | INT | wall-clock |
| avg_hr | INT | |
| max_hr | INT | |
| avg_pace_s_per_km | REAL | nullable for non-distance sports |
| avg_speed_mps | REAL | |
| avg_cadence | INT | spm for run, rpm for bike |
| avg_power_w | INT | nullable |
| np_w | INT | normalised power, nullable |
| tss | REAL | computed, see `sync/load.py` |
| intensity_factor | REAL | TSS / 100 |
| elevation_gain_m | REAL | |
| elevation_loss_m | REAL | |
| calories_kcal | INT | |
| training_effect_aerobic | REAL | 0–5 |
| training_effect_anaerobic | REAL | 0–5 |
| training_effect_label | TEXT | from Garmin |
| epoc | REAL | ml/kg |
| recovery_time_h | INT | |
| route_polyline | TEXT | encoded polyline (Google poly6) |
| start_lat | REAL | |
| start_lon | REAL | |
| weather_temp_c | REAL | nullable |
| weather_wind_kph | REAL | nullable |
| weather_label | TEXT | "Light wind", … |
| device | TEXT | "Forerunner 965" |
| has_dynamics | BOOL | running dynamics present |
| has_power | BOOL | |
| fit_path | TEXT | relative to fit_cache, nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Index: `(start_time DESC)`, `(sport, start_time DESC)`.

### `activity_streams`

One row per second (or per record) per activity. **The big table.**

| col | type | notes |
|---|---|---|
| activity_id | INT FK | cascade delete |
| t_offset_s | INT | seconds from `start_time` |
| latitude | REAL | nullable |
| longitude | REAL | nullable |
| altitude_m | REAL | |
| distance_m | REAL | cumulative |
| hr | INT | bpm, nullable |
| speed_mps | REAL | |
| cadence | INT | |
| power_w | INT | nullable |
| temperature_c | REAL | nullable |
| vertical_osc_cm | REAL | nullable |
| ground_contact_ms | INT | nullable |
| stride_length_m | REAL | nullable |
| balance_pct | REAL | nullable, 0..100 = % left |

Primary key: `(activity_id, t_offset_s)`. WITHOUT ROWID for tighter storage.

### `activity_laps`

| col | type | notes |
|---|---|---|
| id | INT PK | |
| activity_id | INT FK | |
| idx | INT | 0-based |
| label | TEXT | "WU", "I 3", "CD 1", "K 7", auto-derived else "Lap N" |
| t_offset_s | INT | start within activity |
| duration_s | INT | |
| distance_m | REAL | |
| avg_hr | INT | |
| avg_pace_s_per_km | REAL | |
| avg_cadence | INT | |
| avg_power_w | INT | |
| elev_gain_m | REAL | |
| elev_loss_m | REAL | |
| hr_zone | INT | 1..5, derived |

### `activity_zones`

Time-in-zone per activity (HR + power).

| col | type | notes |
|---|---|---|
| activity_id | INT FK | |
| zone_type | TEXT | `hr` or `power` |
| zone | INT | 1..5 |
| seconds | INT | |

Primary key: `(activity_id, zone_type, zone)`.

### `daily_metrics`

One row per local day. Health overview + form computation.

| col | type | notes |
|---|---|---|
| date | DATE PK | local |
| resting_hr | INT | |
| hrv_overnight | INT | ms |
| sleep_score | INT | 0..100 |
| sleep_seconds | INT | |
| sleep_deep_s | INT | |
| sleep_rem_s | INT | |
| sleep_light_s | INT | |
| sleep_awake_s | INT | |
| sleep_start | TIMESTAMP | local |
| sleep_end | TIMESTAMP | local |
| body_battery_high | INT | |
| body_battery_low | INT | |
| body_battery_charged | INT | overnight delta |
| stress_avg | INT | 0..100 |
| spo2_avg | INT | |
| steps | INT | |
| weight_kg | REAL | nullable |
| vo2max | REAL | nullable |
| vibe_word | TEXT | nullable, derived (Phase 7) — see `sync/load.py§vibe` |

### `daily_load`

Pre-computed CTL / ATL / TSB per day (cheaper than recomputing on every read).

| col | type | notes |
|---|---|---|
| date | DATE PK | |
| daily_tss | REAL | sum of activities that day |
| ctl | REAL | 42-day EWMA |
| atl | REAL | 7-day EWMA |
| tsb | REAL | ctl − atl |
| ramp_rate_pct | REAL | week-over-week |

Refresh: full recompute on every activity insert touching the last 60 days (cheap).

### `sleep_stages`

5-minute resolution last-night stages (and history).

| col | type |
|---|---|
| date | DATE |
| t_offset_min | INT |
| stage | TEXT (`awake`/`light`/`rem`/`deep`) |

Primary key: `(date, t_offset_min)`.

### `personal_records`

| col | type | notes |
|---|---|---|
| id | INT PK | |
| sport | TEXT | |
| metric | TEXT | `1k`, `5k`, `10k`, `half`, `marathon`, `mile`, `ftp`, `vo2max`, `course:<slug>` |
| value | REAL | |
| unit | TEXT | `s`, `m`, `w`, `mlkgmin` |
| activity_id | INT FK | nullable |
| achieved_at | DATE | |
| display_value | TEXT | pre-formatted ("4:48", "280 W") |

### `course_bests`

| col | type | notes |
|---|---|---|
| course_slug | TEXT PK part | |
| activity_id | INT FK | |
| time_s | INT | |
| delta_to_prev_s | INT | negative = faster |
| achieved_at | DATE | |
| name | TEXT | display name |

### `badges`

| col | type |
|---|---|
| id | INT PK |
| slug | TEXT UNIQUE |
| label | TEXT |
| sport | TEXT |
| earned_at | DATE NULL |

### `vo2max_history`

| col | type |
|---|---|
| date | DATE PK |
| sport | TEXT (`run` / `bike`) |
| value | REAL |

### `race_predictions`

| col | type |
|---|---|
| date | DATE |
| distance | TEXT (`1mi`, `5k`, `10k`, `half`, `marathon`, `50k`) |
| predicted_time_s | INT |

Primary key: `(date, distance)`.

### `sync_runs`

Audit + UI status.

| col | type |
|---|---|
| id | INT PK |
| started_at | TIMESTAMP |
| finished_at | TIMESTAMP NULL |
| status | TEXT (`running`, `ok`, `error`, `rate_limited`) |
| pulled_activities | INT |
| error_msg | TEXT NULL |

## Indices

```sql
CREATE INDEX idx_activities_start         ON activities(start_time DESC);
CREATE INDEX idx_activities_sport_start   ON activities(sport, start_time DESC);
CREATE INDEX idx_streams_activity         ON activity_streams(activity_id);
CREATE INDEX idx_laps_activity            ON activity_laps(activity_id, idx);
CREATE INDEX idx_records_metric           ON personal_records(metric, achieved_at DESC);
CREATE INDEX idx_zones_activity           ON activity_zones(activity_id);
CREATE INDEX idx_daily_load_date          ON daily_load(date DESC);
```

## Migration discipline

- Every schema change ships an Alembic migration. Never edit a baseline after release.
- Tests: `tests/db/test_migrations.py` walks `upgrade → downgrade → upgrade` on a temp DB.
- Backup before migrating: on app launch, if `alembic current` is behind, copy `tempo.db` → `tempo.db.pre-<ts>.bak` first.

## Why this shape

- **`activity_streams` is the only "wide" table.** Every chart in the UI either reads it (Activity detail) or reads pre-aggregated tables (`daily_load`, `activity_zones`, `daily_metrics`). Avoid scanning streams from any other read path.
- **Pre-compute on write, never on read.** CTL/ATL/TSB, zone times, lap derivations, course bests — all written into their dedicated tables during sync. The desktop sees fast read-only queries.
- **Soft-delete is not needed.** Every Garmin activity has a stable ID; if the user deletes upstream we drop locally.
