from __future__ import annotations

import asyncio
from collections.abc import Callable


def stdin_mfa() -> str:
    return input("Enter MFA code: ").strip()


class AsyncMfaGate:
    """Used in server mode: sidecar pauses and waits for the React modal to POST the code."""

    def __init__(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop
        self._event: asyncio.Event = asyncio.Event()
        self._code: str = ""

    def make_callback(self, on_waiting: Callable[[], None] | None = None) -> Callable[[], str]:
        def _wait() -> str:
            if on_waiting:
                on_waiting()
            future = asyncio.run_coroutine_threadsafe(self._event.wait(), self._loop)
            future.result()
            return self._code

        return _wait

    def submit(self, code: str) -> None:
        self._code = code
        self._loop.call_soon_threadsafe(self._event.set)

    def reset(self) -> None:
        self._loop.call_soon_threadsafe(self._event.clear)
        self._code = ""
