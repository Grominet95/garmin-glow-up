# 03 — Backend sync service (`tempo-sync`)

Python 3.12, FastAPI, runs as a sidecar on `127.0.0.1:8765`.

## Module map

```
src/tempo_sync/
├── __main__.py        # `python -m tempo_sync [serve|sync|auth|...]`
├── settings.py        # pydantic-settings (env + ~/.tempo/config.toml)
├── auth/
│   ├── login.py       # SSO flow
│   ├── tokens.py      # TokenStore (keyring)
│   └── mfa.py         # MFA prompt strategy
├── garmin/
│   └── client.py      # the *only* place the third-party lib is referenced
├── fit/
│   ├── parse.py       # fitparse adapter → typed dicts
│   └── stream.py      # downsampling, smoothing, zone derivation
├── db/
│   ├── models.py      # SQLAlchemy 2.0 declarative
│   ├── session.py     # session factory, WAL pragmas
│   └── migrations/    # Alembic
├── sync/
│   ├── orchestrator.py  # the public entry: sync_all()
│   ├── activities.py
│   ├── health.py
│   ├── load.py        # CTL/ATL/TSB compute
│   └── progress.py    # PRs, course bests
├── scheduler.py       # APScheduler glue
└── api/
    ├── app.py         # create_app()
    ├── deps.py        # `db_session`, `require_token`
    ├── dashboard.py
    ├── activities.py
    ├── load.py
    ├── calendar.py
    ├── health.py
    ├── progress.py
    └── sync.py        # /sync/status (SSE), /sync/run
```

## Auth — keep it boxed

Garmin tightens SSO every few months (Cloudflare Turnstile, MFA changes, breaking redirect chains). Isolate the surface:

```python
# garmin/client.py — the ONLY file that imports python-garminconnect
from garminconnect import Garmin
from tempo_sync.auth.tokens import TokenStore

class GarminClient:
    """Thin wrapper. Swap the underlying lib here in <50 LOC."""

    def __init__(self, store: TokenStore):
        self._store = store
        self._api: Garmin | None = None

    def login(self, email: str, password: str, mfa: Callable[[], str] | None = None):
        api = Garmin(email, password, prompt_mfa=mfa or (lambda: ""))
        api.login()
        self._store.save(api.dump_tokens())
        self._api = api

    def resume(self) -> bool:
        tokens = self._store.load()
        if not tokens:
            return False
        self._api = Garmin()
        self._api.login(token_data=tokens)
        return True

    # …one method per Garmin endpoint we actually consume…
    def activities(self, start: int, limit: int) -> list[dict]:
        return self._api.get_activities(start, limit)
    def activity_details(self, aid: int) -> dict:
        return self._api.get_activity(aid)
    def activity_fit(self, aid: int) -> bytes:
        return self._api.download_activity(aid, dl_fmt=Garmin.ActivityDownloadFormat.ORIGINAL)
    # … health, sleep, body battery, hrv, body comp, etc.
```

Rule: nothing outside `garmin/client.py` imports `garminconnect` or knows its types. Mock the wrapper in unit tests.

## Token storage

```python
# auth/tokens.py
import json, keyring
SERVICE = "tempo.garmin.connect"

class TokenStore:
    def save(self, tokens: dict) -> None:
        keyring.set_password(SERVICE, "default", json.dumps(tokens))

    def load(self) -> dict | None:
        raw = keyring.get_password(SERVICE, "default")
        return json.loads(raw) if raw else None

    def clear(self) -> None:
        keyring.delete_password(SERVICE, "default")
```

Refuse to fall back to a plaintext file. If `keyring` raises on Linux because libsecret is missing, surface a clear error: "Install gnome-keyring or pass `--insecure-store` (NOT recommended)."

## MFA strategy

- **Desktop:** sidecar pauses, posts `{"event": "mfa_required"}` to its SSE channel; React shows a modal with a 6-digit input.
- **CLI:** prompts stdin.
- Both feed the code into `prompt_mfa` callback.

## Rate limiting

Garmin tolerates personal OSS clients but punishes abuse. Hard rules in `sync/orchestrator.py`:

| Resource | Min interval |
|---|---|
| Activities list | 1 h |
| Activity FIT download (per ID, once) | once, then never re-fetch unless `force=True` |
| Sleep / HRV / Body Battery | 1 h |
| Body composition | 6 h |
| Full sync | 1 h |

- One global semaphore (`asyncio.Semaphore(2)`) caps concurrent in-flight requests.
- 429 / 503 → exponential backoff `[2s, 8s, 30s, 120s, 600s]`, then surface to UI.
- Default schedule: every 2 h when desktop is in foreground; every 6 h in background; nothing within 10 min of the last successful sync.

## FIT parsing

```python
# fit/parse.py
from fitparse import FitFile

def parse(blob: bytes) -> ParsedFit:
    fit = FitFile(blob)
    records, laps, events = [], [], []
    for msg in fit.get_messages():
        if msg.name == "record":
            records.append({f.name: f.value for f in msg.fields})
        elif msg.name == "lap":
            laps.append({f.name: f.value for f in msg.fields})
        elif msg.name == "event":
            events.append({f.name: f.value for f in msg.fields})
    return ParsedFit(records=records, laps=laps, events=events)
```

`fit/stream.py` then:
- normalises timestamps to seconds-from-start
- derives HR zone per record (from athlete profile)
- computes lap-level summaries if missing
- downsamples to ~600 points for the chart payload (LTTB algorithm — keep visual peaks)

## Scheduler

```python
# scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = AsyncIOScheduler()
scheduler.add_job(sync_orchestrator.run_all,
                  IntervalTrigger(hours=2),
                  id="full-sync", coalesce=True, max_instances=1)
```

Lifecycle hooked into FastAPI's lifespan context. Jobs:
- `full-sync` — every 2 h
- `health-only` — every 1 h (cheaper, no FIT downloads)
- `compute-load` — every 24 h at 04:00 local (CTL/ATL/TSB rolling window)
- `prune-streams` — weekly, drops raw FIT blobs older than 365 d (keeps summaries)

## CLI

```
$ tempo-sync --help
Commands:
  serve              Run the HTTP API (foreground).
  sync [--since N{d,h}] [--force]
                     Run one sync now.
  auth login         Interactive SSO.
  auth status        Show token expiry.
  auth logout        Delete tokens.
  db inspect         Print row counts per table.
  db reset           Drop & recreate (asks confirmation).
```

## Settings (`~/.tempo/config.toml`)

```toml
[sync]
interval_hours = 2
units = "metric"        # or "imperial"
locale = "fr_FR"

[athlete]
max_hr = 192
resting_hr = 48
ftp = 268
threshold_pace = "3:55" # min/km
zones_method = "lthr"   # or "max-hr" / "ltp"

[api]
bind = "127.0.0.1:8765"
log_level = "info"

[storage]
db_path = "~/.tempo/tempo.db"
fit_cache = "~/.tempo/fit/"
prune_days = 365
```

Settings are read once at boot and watched by `watchfiles` for hot-reload.

## Logging

- Structured logs to `~/.tempo/logs/sync-YYYY-MM-DD.log` (rotated daily, 14-day retention).
- Never log the bearer token, never log the password, never log the email at INFO level (DEBUG OK if `--debug`).
- `GET /diagnostics/tail?lines=200` exposes the last N lines for the desktop's settings → "Show logs" button.
