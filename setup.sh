#!/usr/bin/env bash
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────
ROSE='\033[38;5;211m'
ROSE_B='\033[1;38;5;211m'
GREEN='\033[38;5;121m'
RED='\033[38;5;203m'
DIM='\033[2m'
BOLD='\033[1m'
R='\033[0m'

step()    { echo -e "\n${ROSE_B}  ✦  $1${R}"; }
ok()      { echo -e "  ${GREEN}✓${R}  $1"; }
fail()    { echo -e "  ${RED}✗${R}  $1"; exit 1; }
note()    { echo -e "  ${DIM}    $1${R}"; }
divider() { echo -e "\n  ${DIM}$(printf '%.0s─' {1..46})${R}"; }

# ── Header ──────────────────────────────────────────────────────
clear
echo ""
echo -e "  ${ROSE_B}✦ Tempo${R}  ${DIM}by Garmin Glow Up${R}"
echo ""
echo -e "  ${DIM}Setting up your local environment.${R}"
divider

# ── Check prerequisites ─────────────────────────────────────────
step "Checking prerequisites"

check_cmd() {
  local cmd="$1" label="$2" hint="$3"
  if command -v "$cmd" &>/dev/null; then
    ok "$label $(${cmd} --version 2>&1 | head -1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)"
  else
    echo -e "  ${RED}✗${R}  ${BOLD}$label${R} not found."
    echo -e "  ${DIM}    → $hint${R}"
    fail "Please install $label and re-run this script."
  fi
}

check_cmd node   "Node.js"  "https://nodejs.org"
check_cmd pnpm   "pnpm"     "npm install -g pnpm"
check_cmd python3 "Python"  "https://python.org"
check_cmd uv     "uv"       "curl -LsSf https://astral.sh/uv/install.sh | sh"
check_cmd cargo  "Rust"     "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"

# ── Node dependencies ───────────────────────────────────────────
divider
step "Installing Node dependencies"
pnpm install --frozen-lockfile
ok "pnpm install done"

# ── Python dependencies ─────────────────────────────────────────
divider
step "Installing Python dependencies"
uv sync --project packages/tempo-sync
ok "uv sync done"

# ── Database ────────────────────────────────────────────────────
divider
step "Running database migrations"
note "Database lives at ~/.tempo/tempo.db (local to your machine, never committed)"
(cd packages/tempo-sync && uv run alembic upgrade head)
ok "Migrations applied"

# ── Garmin auth ─────────────────────────────────────────────────
divider
step "Connecting your Garmin account"
echo ""
echo -e "  ${DIM}Your credentials are stored in the OS keychain.${R}"
echo -e "  ${DIM}Nothing is written to disk in plain text.${R}"
echo ""

uv run --project packages/tempo-sync tempo-sync auth login

ok "Garmin account connected"

# ── Done ────────────────────────────────────────────────────────
divider
echo ""
echo -e "  ${ROSE_B}✦  You're all set.${R}"
echo ""
echo -e "  Start Tempo with two terminals:\n"
echo -e "  ${ROSE}Terminal 1${R}  ${DIM}(sync service)${R}"
echo -e "  ${BOLD}  uv run --project packages/tempo-sync tempo-sync serve${R}"
echo ""
echo -e "  ${ROSE}Terminal 2${R}  ${DIM}(desktop app)${R}"
echo -e "  ${BOLD}  pnpm --filter tempo-desktop tauri dev${R}"
echo ""
divider
echo ""
