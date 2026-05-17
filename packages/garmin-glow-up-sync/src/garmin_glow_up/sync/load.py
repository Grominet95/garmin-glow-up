from __future__ import annotations

import logging
from datetime import date, timedelta

from sqlalchemy.orm import Session

from garmin_glow_up.db.models import Activity, DailyLoad

logger = logging.getLogger(__name__)

CTL_DAYS = 42
ATL_DAYS = 7


def compute_load(db: Session, days_back: int = 365) -> None:
    today = date.today()
    start = today - timedelta(days=days_back)

    # Build daily TSS dict
    acts = db.query(Activity).filter(Activity.start_time >= start).all()
    daily_tss: dict[date, float] = {}
    for act in acts:
        act_date = act.start_time_local.date() if act.start_time_local else act.start_time.date()
        daily_tss[act_date] = daily_tss.get(act_date, 0.0) + (act.tss or 0.0)

    ctl = 0.0
    atl = 0.0
    ctl_k = 1 - (1 / CTL_DAYS)
    atl_k = 1 - (1 / ATL_DAYS)

    # Prime EWMA from 2× CTL_DAYS back
    prime_start = start - timedelta(days=CTL_DAYS * 2)
    existing = {
        r.date: r
        for r in db.query(DailyLoad).filter(DailyLoad.date >= start).all()
    }

    prev_week_ctl: float | None = None
    for i in range((today - prime_start).days + 1):
        d = prime_start + timedelta(days=i)
        tss = daily_tss.get(d, 0.0)
        ctl = ctl * ctl_k + tss * (1 - ctl_k)
        atl = atl * atl_k + tss * (1 - atl_k)
        tsb = ctl - atl

        if d >= start:
            if prev_week_ctl is None and i >= 7:
                prev_week_ctl = ctl
            ramp = None
            if prev_week_ctl and prev_week_ctl > 0:
                ramp = (ctl - prev_week_ctl) / prev_week_ctl * 100

            row = existing.get(d) or DailyLoad(date=d)
            row.daily_tss = tss
            row.ctl = round(ctl, 2)
            row.atl = round(atl, 2)
            row.tsb = round(tsb, 2)
            row.ramp_rate_pct = round(ramp, 1) if ramp is not None else None
            db.merge(row)

        if i >= 7:
            prev_week_ctl = ctl

    logger.info("Load computed up to %s", today)
