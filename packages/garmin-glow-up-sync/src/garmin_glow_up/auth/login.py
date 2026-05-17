from __future__ import annotations

from collections.abc import Callable

from garmin_glow_up.auth.tokens import TokenStore
from garmin_glow_up.garmin.client import GarminClient


def login(
    email: str,
    password: str,
    mfa_callback: Callable[[], str] | None = None,
    store: TokenStore | None = None,
) -> GarminClient:
    store = store or TokenStore()
    client = GarminClient(store)
    client.login(email, password, mfa=mfa_callback)
    return client
