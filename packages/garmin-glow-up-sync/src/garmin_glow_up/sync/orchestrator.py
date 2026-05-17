from __future__ import annotations

import asyncio
import logging

from garmin_glow_up.auth.tokens import TokenStore
from garmin_glow_up.db.session import get_db
from garmin_glow_up.garmin.client import GarminClient

logger = logging.getLogger(__name__)

_semaphore = asyncio.Semaphore(2)
_BACKOFF = [2, 8, 30, 120, 600]


def _get_client() -> GarminClient:
    store = TokenStore()
    client = GarminClient(store)
    if not client.resume():
        raise RuntimeError("Not authenticated")
    return client


def sync_all(scope: list[str] | None = None, force: bool = False, days: int = 365) -> None:
    if scope is None:
        scope = ["activities", "health", "load", "progress"]

    logger.info("Starting sync: %s (force=%s, days=%d)", scope, force, days)
    db = get_db()
    try:
        client = _get_client()
        if "activities" in scope:
            from garmin_glow_up.sync.activities import pull_recent
            pull_recent(client=client, db=db, force=force, days=days)
        if "health" in scope:
            from garmin_glow_up.sync.health import pull_health
            pull_health(client=client, db=db, days=min(days, 30))
        if "load" in scope:
            from garmin_glow_up.sync.load import compute_load
            compute_load(db=db)
        if "progress" in scope:
            from garmin_glow_up.sync.progress import pull_progress
            pull_progress(client=client, db=db, full=days >= 30)
        db.commit()
        logger.info("Sync complete")
    except Exception as e:
        db.rollback()
        logger.error("Sync failed: %s", e)
        raise
    finally:
        db.close()
