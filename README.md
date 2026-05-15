# Tempo

A beautiful open-source training companion for Garmin athletes. Built as a native macOS app with a clean, opinionated interface that puts your data first.

Not affiliated with Garmin Ltd. Uses the unofficial Connect API. All Garmin trademarks belong to their respective owners.

---

## What it does

- Syncs your activities, health metrics, and training load from Garmin Connect
- Gives you a daily dashboard: form curve (CTL / ATL / TSB), sleep, body battery, last session
- Shows your real GPS routes, lap splits, and HR zone breakdown
- Keeps everything local: your data lives on your machine, not in the cloud

---

## Architecture

Two processes, one contract. They talk over a tiny REST API on loopback and never share a database directly.

```
tempo-sync        Python FastAPI on 127.0.0.1:8765
                  Garmin SSO, FIT parsing, SQLite, scheduler

tempo-desktop     Tauri 2 + React 19 native app
                  Reads from tempo-sync via HTTP, stores nothing itself
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm i -g pnpm` |
| Python | 3.12+ | [python.org](https://python.org) |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |

---

## Quick start

The setup script handles everything: dependencies, database, and Garmin login.

```bash
git clone https://github.com/Grominet95/garmin-glow-up.git
cd garmin-glow-up
bash setup.sh
```

Or step by step:

```bash
# 1. Install dependencies
pnpm install
uv sync --project packages/tempo-sync

# 2. Run database migrations
cd packages/tempo-sync && uv run alembic upgrade head && cd ../..

# 3. Connect your Garmin account
uv run --project packages/tempo-sync tempo-sync auth login

# 4. Start both services (two terminals)
uv run --project packages/tempo-sync tempo-sync serve   # terminal 1
pnpm --filter tempo-desktop tauri dev                    # terminal 2
```

---

## Repo layout

```
garmin-glow-up/
├── packages/
│   ├── tempo-sync/       Python FastAPI service + SQLite
│   └── tempo-desktop/    Tauri 2 + React 19 desktop app
├── docs/                 Technical specifications (00 to 09)
├── design/               Original Tempo design canvas and reference files
└── .github/workflows/    CI + release pipelines
```

---

## Tech stack

**Backend (tempo-sync)**
- Python 3.12, FastAPI, SQLAlchemy, Alembic, APScheduler
- garminconnect for Garmin SSO, fitparse for FIT files
- Credentials stored in the OS keychain via keyring

**Frontend (tempo-desktop)**
- React 19, TanStack Router, TanStack Query, Zustand
- Tailwind CSS with custom design tokens
- Tauri 2 (Rust) for the native shell, window management, and keychain IPC

---

## License

`tempo-sync`: MIT
`tempo-desktop`: AGPL-3.0
