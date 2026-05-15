from __future__ import annotations

import logging
from datetime import date, datetime

from sqlalchemy.orm import Session

from tempo_sync.db.models import PersonalRecord, RacePrediction
from tempo_sync.garmin.client import GarminClient

logger = logging.getLogger(__name__)


def pull_progress(client: GarminClient, db: Session) -> None:
    today = date.today()

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


def _fmt_time(seconds: int) -> str:
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"
