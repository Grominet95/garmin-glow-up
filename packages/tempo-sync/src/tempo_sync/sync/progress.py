from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from tempo_sync.db.models import PersonalRecord, RacePrediction, Vo2maxHistory
from tempo_sync.garmin.client import GarminClient

logger = logging.getLogger(__name__)


def pull_progress(client: GarminClient, db: Session, full: bool = True) -> None:
    today = date.today()

    # ── Personal Records ──────────────────────────────────────────────────────
    try:
        prs = client.personal_records()
        for pr in prs:
            sport = pr.get("sport", {}).get("typeKey", "run")
            metric = pr.get("typeKey", "unknown")
            value = pr.get("value")
            if value is None:
                continue
            achieved_str = pr.get("prStartTimeGmt")
            achieved = datetime.fromisoformat(achieved_str).date() if isinstance(achieved_str, str) else None
            row = PersonalRecord(
                sport=sport,
                metric=metric,
                value=float(value),
                unit="s",
                achieved_at=achieved,
                display_value=_fmt_time(int(value)) if isinstance(value, (int, float)) else str(value),
            )
            db.merge(row)
    except Exception as e:
        logger.warning("PR pull failed: %s", e)

    # ── Race Predictions ──────────────────────────────────────────────────────
    try:
        preds = client.race_predictions()
        for dist, time_s in (preds or {}).items():
            try:
                if time_s:
                    db.merge(RacePrediction(date=today, distance=dist, predicted_time_s=int(time_s)))
            except (ValueError, TypeError):
                pass
    except Exception as e:
        logger.warning("Race predictions failed: %s", e)

    # ── VO2max history (monthly snapshots for last 24 months) ─────────────────
    if full:
        try:
            _pull_vo2max_history(client, db, today)
        except Exception as e:
            logger.warning("VO2max history pull failed: %s", e)


def _pull_vo2max_history(client: GarminClient, db: Session, today: date) -> None:
    """Query training_status for the 1st of each month over the last 24 months.
    Each date returns the VO2max current for that date, giving monthly snapshots.
    """
    filled = 0
    for months_back in range(0, 25):
        # First day of each month going back
        y = today.year
        m = today.month - months_back
        while m <= 0:
            m += 12
            y -= 1
        query_date = date(y, m, 1)
        # Don't query future dates
        if query_date > today:
            continue
        # Use today if querying current month
        if query_date.year == today.year and query_date.month == today.month:
            query_date = today
        try:
            status = client.training_status(query_date.isoformat())
            generic = (status.get("mostRecentVO2Max") or {}).get("generic") or {}
            vo2 = generic.get("vo2MaxPreciseValue") or generic.get("vo2MaxValue")
            cal_date_str = generic.get("calendarDate")
            if vo2 is None:
                continue
            # Store by measurement date (calendarDate) rather than query date
            store_date = date.fromisoformat(cal_date_str) if cal_date_str else query_date
            db.merge(Vo2maxHistory(date=store_date, sport="run", value=float(vo2)))
            filled += 1
        except Exception as e:
            logger.debug("VO2max pull failed for %s: %s", query_date, e)

    if filled:
        logger.info("VO2max history: pulled %d monthly snapshots", filled)


def _fmt_time(seconds: int) -> str:
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"
