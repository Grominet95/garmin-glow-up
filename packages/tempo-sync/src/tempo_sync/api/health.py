from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Query
from pydantic import BaseModel

from tempo_sync.api.deps import DbDep, TokenDep
from tempo_sync.db.models import DailyMetric, SleepStage

router = APIRouter()


class HealthSeries(BaseModel):
    dates: list[str]
    hrv: list[int | None]
    rhr: list[int | None]
    stress: list[int | None]
    bodyBattery: list[int | None]
    spo2: list[int | None]
    sleepHours: list[float | None]


class LastNight(BaseModel):
    durationS: int
    score: int
    scoreLabel: str
    bedTimeLocal: str
    wakeTimeLocal: str
    blocks5min: list[int]
    totals: dict
    hrvDelta: float | None


class HealthResponse(BaseModel):
    window: str
    series: HealthSeries
    lastNight: LastNight | None
    tonightForecast: dict | None


WINDOW_DAYS = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}


@router.get("/health", response_model=HealthResponse)
def get_health(
    _token: TokenDep,
    db: DbDep,
    window: str = Query("30d"),
):
    days = WINDOW_DAYS.get(window, 30)
    today = date.today()
    start = today - timedelta(days=days - 1)

    rows = (
        db.query(DailyMetric)
        .filter(DailyMetric.date >= start)
        .order_by(DailyMetric.date)
        .all()
    )
    row_map = {r.date: r for r in rows}

    dates, hrv, rhr, stress, bb, spo2, sleep_h = [], [], [], [], [], [], []
    for i in range(days):
        d = start + timedelta(days=i)
        r = row_map.get(d)
        dates.append(d.isoformat())
        hrv.append(r.hrv_overnight if r else None)
        rhr.append(r.resting_hr if r else None)
        stress.append(r.stress_avg if r else None)
        bb.append(r.body_battery_high if r else None)
        spo2.append(r.spo2_avg if r else None)
        sleep_h.append(round((r.sleep_seconds or 0) / 3600, 1) if r and r.sleep_seconds else None)

    # Last night
    today_metric = row_map.get(today)
    last_night = None
    if today_metric and today_metric.sleep_seconds:
        stage_rows = (
            db.query(SleepStage)
            .filter(SleepStage.date == today)
            .order_by(SleepStage.t_offset_min)
            .all()
        )
        stage_map = {"awake": 0, "light": 1, "rem": 2, "deep": 3}
        blocks = [stage_map.get(s.stage, 0) for s in stage_rows]
        score = today_metric.sleep_score or 0
        score_label = "Excellent" if score >= 80 else "Good" if score >= 60 else "Fair" if score >= 40 else "Poor"
        last_night = LastNight(
            durationS=today_metric.sleep_seconds,
            score=score,
            scoreLabel=score_label,
            bedTimeLocal=today_metric.sleep_start.strftime("%H:%M") if today_metric.sleep_start else "--",
            wakeTimeLocal=today_metric.sleep_end.strftime("%H:%M") if today_metric.sleep_end else "--",
            blocks5min=blocks,
            totals={
                "awakeS": today_metric.sleep_awake_s or 0,
                "lightS": today_metric.sleep_light_s or 0,
                "remS": today_metric.sleep_rem_s or 0,
                "deepS": today_metric.sleep_deep_s or 0,
            },
            hrvDelta=None,
        )

    return HealthResponse(
        window=window,
        series=HealthSeries(
            dates=dates, hrv=hrv, rhr=rhr, stress=stress,
            bodyBattery=bb, spo2=spo2, sleepHours=sleep_h,
        ),
        lastNight=last_night,
        tonightForecast=None,
    )
