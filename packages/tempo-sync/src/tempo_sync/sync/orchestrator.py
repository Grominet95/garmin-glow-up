from __future__ import annotations

import asyncio
import logging

from tempo_sync.auth.tokens import TokenStore
from tempo_sync.db.session import get_db
from tempo_sync.garmin.client import GarminClient

logger = logging.getLogger(__name__)

_semaphore = asyncio.Semaphore(2)
_BACKOFF = [2, 8, 30, 120, 600]


def _get_client() -> GarminClient:
    store = TokenStore()
    client = GarminClient(store)
    if not client.resume():
        raise RuntimeError("Not authenticated")
    return client


def sync_all(scope: list[str] | None = None, force: bool = False) -> None:
    if scope is None:
        scope = ["activities", "health", "load", "progress"]

    logger.info("Starting sync: %s (force=%s)", scope, force)
    db = get_db()
    try:
        client = _get_client()
        if "activities" in scope:
            from tempo_sync.sync.activities import pull_recent
            pull_recent(client=client, db=db, force=force)
        if "health" in scope:
            from tempo_sync.sync.health import pull_health
            pull_health(client=client, db=db)
        if "load" in scope:
            from tempo_sync.sync.load import compute_load
            compute_load(db=db)
        if "progress" in scope:
            from tempo_sync.sync.progress import pull_progress
            pull_progress(client=client, db=db)
        db.commit()
        logger.info("Sync complete")
    except Exception as e:
        db.rollback()
        logger.error("Sync failed: %s", e)
        raise
    finally:
        db.close()
