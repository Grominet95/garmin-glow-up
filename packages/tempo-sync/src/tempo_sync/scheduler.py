from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def _run_sync(scope: list[str] | None = None) -> None:
    try:
        from tempo_sync.sync.orchestrator import sync_all
        sync_all(scope=scope)
    except Exception as e:
        logger.error("Scheduled sync error: %s", e)


def start_scheduler() -> None:
    from tempo_sync.settings import get_settings
    settings = get_settings()

    scheduler.add_job(
        _run_sync,
        trigger=IntervalTrigger(hours=settings.sync.interval_hours),
        id="full-sync",
        coalesce=True,
        max_instances=1,
        kwargs={"scope": ["activities", "health", "load", "progress"]},
    )
    scheduler.add_job(
        _run_sync,
        trigger=IntervalTrigger(hours=1),
        id="health-only",
        coalesce=True,
        max_instances=1,
        kwargs={"scope": ["health"]},
    )
    scheduler.add_job(
        _run_sync,
        trigger=CronTrigger(hour=4, minute=0),
        id="compute-load",
        coalesce=True,
        max_instances=1,
        kwargs={"scope": ["load"]},
    )
    scheduler.start()
    logger.info("Scheduler started (sync every %dh)", settings.sync.interval_hours)


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
