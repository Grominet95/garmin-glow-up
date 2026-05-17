#!/usr/bin/env bash
# Launches the sync server and desktop app together.
# Ctrl+C kills both.
set -euo pipefail

trap 'kill 0' EXIT INT TERM

GGU_DEV_SIDECAR=external \
  uv run --project packages/garmin-glow-up-sync garmin-glow-up serve &

pnpm --filter garmin-glow-up-desktop tauri dev
