from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Query
from pydantic import BaseModel

from garmin_glow_up.api.deps import DbDep, TokenDep
from garmin_glow_up.db.models import Activity, DailyLoad

router = APIRouter()


class SeriesPoint(BaseModel):
    date: str
    ctl: float
    atl: float
    tss: float
    tsb: float


class WeeklyLoad(BaseModel):
    weekStart: str
    bySport: dict
    totalTss: float
    distanceKm: float


class CurrentLoad(BaseModel):
    ctl: float
    atl: float
    tsb: float
    rampPctWoW: float
    monotony: float
    strain: float


class LoadResponse(BaseModel):
    rangeDays: int
    series: list[SeriesPoint]
    weekly: list[WeeklyLoad]
    current: CurrentLoad
    recommendations: list[dict]


@router.get("/load", response_model=LoadResponse)
def get_load(
    _token: TokenDep,
    db: DbDep,
    range: str = Query("120d"),
):
    range_map = {"30d": 30, "90d": 90, "120d": 120, "365d": 365, "1y": 365, "all": 730}
    days = range_map.get(range, 120)
    today = date.today()
    start = today - timedelta(days=days)

    rows = (
        db.query(DailyLoad)
        .filter(DailyLoad.date >= start)
        .order_by(DailyLoad.date)
        .all()
    )
    series = [
        SeriesPoint(date=r.date.isoformat(), ctl=r.ctl, atl=r.atl, tss=r.daily_tss, tsb=r.tsb)
        for r in rows
    ]

    # Weekly aggregates
    acts = (
        db.query(Activity)
        .filter(Activity.start_time >= start)
        .order_by(Activity.start_time)
        .all()
    )
    weekly_map: dict[date, dict] = {}
    for act in acts:
        act_date = act.start_time_local.date() if act.start_time_local else act.start_time.date()
        week_start = act_date - timedelta(days=act_date.weekday())
        if week_start not in weekly_map:
            weekly_map[week_start] = {"bySport": {}, "totalTss": 0.0, "distanceKm": 0.0}
        weekly_map[week_start]["bySport"][act.sport] = (
            weekly_map[week_start]["bySport"].get(act.sport, 0) + (act.tss or 0)
        )
        weekly_map[week_start]["totalTss"] += act.tss or 0
        weekly_map[week_start]["distanceKm"] += (act.distance_m or 0) / 1000

    weekly = [
        WeeklyLoad(weekStart=ws.isoformat(), **data)
        for ws, data in sorted(weekly_map.items())
    ]

    current_row = rows[-1] if rows else None
    current = CurrentLoad(
        ctl=current_row.ctl if current_row else 0,
        atl=current_row.atl if current_row else 0,
        tsb=current_row.tsb if current_row else 0,
        rampPctWoW=current_row.ramp_rate_pct or 0 if current_row else 0,
        monotony=1.0,
        strain=0.0,
    )

    recommendations = []
    if current.tsb < -20:
        recommendations.append({"kind": "fatigue", "body": "High fatigue detected. Consider an easy recovery day."})
    elif current.tsb > 10:
        recommendations.append({"kind": "build", "body": "Form is fresh — good window to target a quality session."})

    return LoadResponse(rangeDays=days, series=series, weekly=weekly, current=current, recommendations=recommendations)
