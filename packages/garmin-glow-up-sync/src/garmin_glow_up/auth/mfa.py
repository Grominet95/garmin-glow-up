from __future__ import annotations

import asyncio
from collections.abc import Callable


def stdin_mfa() -> str:
    return input("Enter MFA code: ").strip()


class AsyncMfaGate:
    """Used in server mode: sidecar pauses and waits for the React modal to POST the code."""

    def __init__(self) -> None:
        self._event: asyncio.Event = asyncio.Event()
        self._code: str = ""

    def make_callback(self) -> Callable[[], str]:
        def _wait() -> str:
            loop = asyncio.get_event_loop()
            loop.run_until_complete(self._event.wait())
            return self._code

        return _wait

    def submit(self, code: str) -> None:
        self._code = code
        self._event.set()

    def reset(self) -> None:
        self._event.clear()
        self._code = ""
