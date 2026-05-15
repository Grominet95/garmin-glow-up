from __future__ import annotations

from collections.abc import Callable

from tempo_sync.auth.tokens import TokenStore
from tempo_sync.garmin.client import GarminClient


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
