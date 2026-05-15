# 09 — Build & ship

## Local development

```bash
# bootstrap once
corepack enable pnpm
curl -LsSf https://astral.sh/uv/install.sh | sh
rustup default stable

pnpm install                # workspace deps
uv sync --project packages/tempo-sync

# two terminals
uv run --project packages/tempo-sync python -m tempo_sync serve
pnpm --filter tempo-desktop tauri dev
```

In dev, Tauri skips the sidecar spawn (env: `TEMPO_DEV_SIDECAR=external`) and the desktop talks to the externally-running Python server on `:8765`. The handshake token in dev is the literal string `dev-token`.

## CI matrix

`.github/workflows/release.yml` — triggered on `v*` tags.

```yaml
strategy:
  matrix:
    include:
      - os: macos-14         # arm64
        target: aarch64-apple-darwin
        py: x86_64-apple-darwin   # uv builds universal2 sync binary
      - os: macos-13         # x86_64
        target: x86_64-apple-darwin
      - os: ubuntu-22.04
        target: x86_64-unknown-linux-gnu
      - os: windows-latest
        target: x86_64-pc-windows-msvc
```

Each job:
1. Cache pnpm + cargo + uv.
2. Build the sync binary with PyInstaller (`pyinstaller --onefile --name tempo-sync src/tempo_sync/__main__.py`); rename to `tempo-sync-<target>[.exe]`.
3. Move it into `packages/tempo-desktop/src-tauri/binaries/`.
4. `pnpm --filter tempo-desktop tauri build --target <target>`.
5. Upload `.dmg`, `.msi`, `.AppImage`, `.deb`, `latest.json` as release assets.

## Code signing

### macOS
- Apple Developer ID Application certificate stored as `APPLE_CERTIFICATE` + `APPLE_CERTIFICATE_PASSWORD` secrets.
- `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific), `APPLE_TEAM_ID` for notarisation.
- `tauri.bundle.macOS.signingIdentity` + `entitlements.plist` (microphone/camera not needed; outgoing network only).

### Windows
- Either: code-signing cert in `.pfx` + `WINDOWS_CERTIFICATE` / `WINDOWS_CERTIFICATE_PASSWORD`.
- Or: ship unsigned and document SmartScreen "Run anyway" workaround in README until certificate budget exists.

### Linux
- No signing required for `.AppImage` / `.deb`. Provide SHA256 sums in release notes.

## Auto-update

- Generate keypair once locally: `pnpm tauri signer generate -w ~/.tauri/tempo.key`.
- Put public key in `tauri.conf.json` `plugins.updater.pubkey`.
- Put private key in `TAURI_SIGNING_PRIVATE_KEY` (single-line PEM).
- After each successful build, the CI step signs the artefacts and emits `latest.json`:

```json
{
  "version": "0.2.0",
  "notes": "Faster sync, MFA modal fixes.",
  "pub_date": "2026-05-12T10:00:00Z",
  "platforms": {
    "darwin-aarch64": { "signature": "…", "url": "https://github.com/<o>/<r>/releases/download/v0.2.0/Tempo_0.2.0_aarch64.dmg" },
    "darwin-x86_64":  { "…" },
    "windows-x86_64": { "…" },
    "linux-x86_64":   { "…" }
  }
}
```

The desktop checks once per launch + every 24 h thereafter.

## Versioning

- Semantic versioning. Pre-1.0 → minor bumps allowed to break things.
- One `version` field in `packages/tempo-desktop/package.json`; CI propagates to `tauri.conf.json` and `pyproject.toml` via a `pnpm bump` script.
- Git tags drive releases: `git tag v0.2.0 && git push --tags`.

## Telemetry

**Default: none.** This is an open-source personal tool that talks to a private account. Anything beyond a local error log is opt-in.

If opt-in (Settings → "Help improve Tempo"):
- Crash reports only (Sentry self-hosted or PostHog).
- No request bodies, no Garmin user ID, no email, no IPs.
- The setting is `false` by default and persists per-install.

## Distribution channels

- **Primary** — GitHub Releases (links from README).
- **Future** — Homebrew cask (`brew install --cask tempo`), winget manifest, AUR.
- **Never** — Mac App Store or MS Store (the unofficial Garmin API would get the app pulled; nothing about that is worth the certification cost).

## Release checklist

- [ ] All Phase 10 acceptance criteria met.
- [ ] Smoke test on each of the four targets — first-run wizard → real data on screen.
- [ ] `pnpm changeset` notes written.
- [ ] Tag pushed, CI green on all 4 targets.
- [ ] `latest.json` reachable at the GitHub Releases URL.
- [ ] README install section updated with the new download links.

## Legal & repo hygiene

- License: **AGPL-3.0** for the desktop, **MIT** for `tempo-sync` if you want re-use. (Decide upfront; do not relicense later.)
- README disclaimer: not affiliated with Garmin Ltd.; uses the unofficial API; trademarks belong to their owners.
- A clean `CONTRIBUTING.md` pointing to this `handoff/` folder as the architecture spec.
- No Garmin screenshots, logos, or icons in the repo. The brand mark is the original "rising arc → glowing dot" already in the design canvas.
