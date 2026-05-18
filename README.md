<div align="center">

# Garmin Glow Up

**What if Garmin Connect actually looked good?**

[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey?logo=apple&logoColor=white)](https://github.com/Grominet95/garmin-glow-up)
[![Backend](https://img.shields.io/badge/backend-Python%203.12-3776ab?logo=python&logoColor=white)](packages/garmin-glow-up-sync)
[![Frontend](https://img.shields.io/badge/frontend-Tauri%202%20%2B%20React%2019-ffc131?logo=tauri&logoColor=white)](packages/garmin-glow-up-desktop)
[![License](https://img.shields.io/badge/license-MIT%20%2F%20AGPL--3.0-blue)](LICENSE)

<br/>

<img src="screenshots/GarminGlowUpCapture1.png" width="100%" alt="Garmin Glow Up: Dashboard" />

<br/>

<table>
  <tr>
    <td width="33%"><img src="screenshots/GarminGlowUpCapture2.png" width="100%" alt="Screenshot 2" /></td>
    <td width="33%"><img src="screenshots/GarminGlowUpCapture3.png" width="100%" alt="Screenshot 3" /></td>
    <td width="33%"><img src="screenshots/GarminGlowUpCapture4.png" width="100%" alt="Screenshot 4" /></td>
  </tr>
</table>

</div>

Garmin makes great hardware. The software, not so much. Garmin Glow Up is a native macOS app that pulls your data from Garmin Connect and presents it the way it deserves: clean, fast, and actually pleasant to look at.

Everything runs locally: your data stays on your machine. Not affiliated with Garmin Ltd.

## Get started

### 1. Prerequisites

Install these tools before anything else:

| Tool | Install |
|------|---------|
| Node.js 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | `npm i -g pnpm` |
| Python 3.12+ | [python.org](https://python.org) |
| uv | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Rust | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |

### 2. Clone the repo

```bash
git clone https://github.com/Grominet95/garmin-glow-up.git
cd garmin-glow-up
```

### 3. Install

```bash
./garmin-glow-up install
```

This installs all dependencies and sets up the local database.

### 4. Launch

```bash
./garmin-glow-up launch
```

### 5. Connect and sync

On first launch, the app will ask for your Garmin Connect email and password. Your credentials are stored in the macOS keychain, nothing written to disk in plain text.

Once signed in, click **Sync** to pull your data.

> **The first sync covers a full year of history and may take a bit of time, usually several minutes, depending on your activity count.**

## What you get

- Dashboard with your training form curve (CTL / ATL / TSB), sleep quality, body battery, and last session at a glance
- Real GPS route maps, lap splits, and HR zone breakdowns
- Your training week laid out clearly, no clutter
- Race predictor, VO2max trends, personal records

## Architecture

Two processes, one contract:

```
garmin-glow-up-sync     Python FastAPI on 127.0.0.1:8765
                        Garmin SSO, FIT parsing, SQLite, scheduler

garmin-glow-up-desktop  Tauri 2 + React 19 native app
                        Reads from the sync service via HTTP
```

The database lives at `~/.garmin-glow-up/garmin-glow-up.db` on your machine and is never committed to the repo.

## Tech stack

**Backend**: Python 3.12, FastAPI, SQLAlchemy, Alembic, APScheduler, garminconnect, fitparse, keyring

**Frontend**: React 19, TanStack Router, TanStack Query, Zustand, Tailwind CSS, Tauri 2


## License

`garmin-glow-up-sync`: MIT  
`garmin-glow-up-desktop`: AGPL-3.0
