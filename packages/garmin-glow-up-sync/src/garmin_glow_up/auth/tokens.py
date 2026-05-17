from __future__ import annotations

import json

import keyring
import keyring.errors

SERVICE = "garmin-glow-up.garmin.connect"


class TokenStore:
    def save(self, tokens: dict) -> None:
        keyring.set_password(SERVICE, "default", json.dumps(tokens))

    def load(self) -> dict | None:
        try:
            raw = keyring.get_password(SERVICE, "default")
        except keyring.errors.KeyringError as e:
            raise RuntimeError(
                "Keyring unavailable. On Linux, install gnome-keyring or "
                "pass --insecure-store (NOT recommended)."
            ) from e
        return json.loads(raw) if raw else None

    def clear(self) -> None:
        try:
            keyring.delete_password(SERVICE, "default")
        except keyring.errors.PasswordDeleteError:
            pass
