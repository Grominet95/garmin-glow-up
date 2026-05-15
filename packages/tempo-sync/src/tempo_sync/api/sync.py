from __future__ import annotations

import asyncio
import json
from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from tempo_sync.api.deps import DbDep, TokenDep
from tempo_sync.db.models import SyncRun

router = APIRouter(prefix="/sync")

_sync_running = False
_last_sync: datetime | None = None
_subscribers: set[asyncio.Queue] = set()


class SyncRunRequest(BaseModel):
    force: bool = False
    scope: list[str] = ["activities", "health", "load", "progress"]


def _current_status() -> dict:
    return {
        "running": _sync_running,
        "lastSync": _last_sync.isoformat() + "Z" if _last_sync else None,
        "nextRun": None,
    }


async def _broadcast() -> None:
    status = _current_status()
    for q in list(_subscribers):
        try:
            q.put_nowait(status)
        except asyncio.QueueFull:
            pass


@router.get("/status")
async def sync_status(_token: TokenDep):
    async def event_stream():
        q: asyncio.Queue = asyncio.Queue(maxsize=20)
        _subscribers.add(q)
        try:
            yield f"event: status\ndata: {json.dumps(_current_status())}\n\n"
            while True:
                try:
                    data = await asyncio.wait_for(q.get(), timeout=30)
                    yield f"event: status\ndata: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            _subscribers.discard(q)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/run", status_code=202)
async def run_sync(_token: TokenDep, db: DbDep, req: SyncRunRequest):
    global _sync_running
    if _sync_running and not req.force:
        return {"runId": -1, "message": "Sync already running"}

    run = SyncRun(started_at=datetime.utcnow(), status="running")
    db.add(run)
    db.commit()
    db.refresh(run)

    asyncio.create_task(_do_sync(run.id, req.scope, req.force))
    return {"runId": run.id}


async def _do_sync(run_id: int, scope: list[str], force: bool = False) -> None:
    global _sync_running, _last_sync
    _sync_running = True
    await _broadcast()
    try:
        from tempo_sync.sync.orchestrator import sync_all
        await asyncio.get_event_loop().run_in_executor(None, lambda: sync_all(scope=scope, force=force))
        _last_sync = datetime.utcnow()
    except Exception:
        pass
    finally:
        _sync_running = False
        await _broadcast()
