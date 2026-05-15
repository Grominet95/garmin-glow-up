#!/usr/bin/env bash
# Launches the sync server and desktop app together.
# Ctrl+C kills both.
set -euo pipefail

trap 'kill 0' EXIT INT TERM

TEMPO_DEV_SIDECAR=external \
  uv run --project packages/tempo-sync tempo-sync serve &

pnpm --filter tempo-desktop tauri dev
