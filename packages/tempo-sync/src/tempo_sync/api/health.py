from __future__ import annotations

import json
import math
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
    bodyBatteryCharged: list[int | None]
    spo2: list[float | None]
    sleepHours: list[float | None]
    bodyBatteryIntraday: list[list[int]] | None


class SleepSegment(BaseModel):
    stage: int  # 0=awake 1=light 2=rem 3=deep
    offsetMin: int


class LastNight(BaseModel):
    durationS: int
    score: int
    scoreLabel: str
    bedTimeLocal: str
    wakeTimeLocal: str
    blocks5min: list[int]
    segments: list[SleepSegment]
    totals: dict
    hrvDelta: float | None


class StressToday(BaseModel):
    restS: int
    lowS: int
    medS: int
    highS: int


class HealthResponse(BaseModel):
    window: str
    series: HealthSeries
    lastNight: LastNight | None
    stressToday: StressToday | None
    tonightForecast: dict | None
    bedtimeVarianceMin: int | None


WINDOW_DAYS = {"24h": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365}


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

    dates, hrv, rhr, stress, bb, bb_charged, spo2, sleep_h = [], [], [], [], [], [], [], []
    for i in range(days):
        d = start + timedelta(days=i)
        r = row_map.get(d)
        dates.append(d.isoformat())
        hrv.append(r.hrv_overnight if r else None)
        rhr.append(r.resting_hr if r else None)
        stress.append(r.stress_avg if r else None)
        bb.append(r.body_battery_high if r else None)
        bb_charged.append(r.body_battery_charged if r else None)
        spo2.append(round(float(r.spo2_avg), 1) if r and r.spo2_avg is not None else None)
        sleep_h.append(round((r.sleep_seconds or 0) / 3600, 1) if r and r.sleep_seconds else None)

    # Today's intraday body battery for 24H chart
    today_metric = row_map.get(today)
    body_battery_intraday: list[list[int]] | None = None
    if today_metric and today_metric.body_battery_intraday:
        try:
            body_battery_intraday = json.loads(today_metric.body_battery_intraday)
        except (ValueError, TypeError):
            pass

    # Last night — fall back to yesterday if today has no sleep data
    sleep_m = today_metric
    sleep_date = today
    if not (sleep_m and sleep_m.sleep_seconds):
        yesterday = today - timedelta(days=1)
        sleep_m = row_map.get(yesterday)
        if not (sleep_m and sleep_m.sleep_seconds):
            sleep_m = db.query(DailyMetric).filter(DailyMetric.date == yesterday).first()
        sleep_date = yesterday

    last_night = None
    if sleep_m and sleep_m.sleep_seconds:
        stage_rows = (
            db.query(SleepStage)
            .filter(SleepStage.date == sleep_date)
            .order_by(SleepStage.t_offset_min)
            .all()
        )
        stage_map_idx = {"awake": 0, "light": 1, "rem": 2, "deep": 3}
        blocks = [stage_map_idx.get(s.stage, 0) for s in stage_rows]
        segs = [SleepSegment(stage=stage_map_idx.get(s.stage, 0), offsetMin=s.t_offset_min) for s in stage_rows]

        hrv_vals = [v for v in hrv if v is not None]
        hrv_avg = sum(hrv_vals) / len(hrv_vals) if hrv_vals else None
        hrv_last = sleep_m.hrv_overnight
        hrv_delta = round(hrv_last - hrv_avg, 1) if hrv_last and hrv_avg else None

        score = sleep_m.sleep_score or 0
        score_label = (
            "Excellent" if score >= 80
            else "Restorative" if score >= 70
            else "Good" if score >= 60
            else "Fair" if score >= 40
            else "Poor"
        )
        last_night = LastNight(
            durationS=sleep_m.sleep_seconds,
            score=score,
            scoreLabel=score_label,
            bedTimeLocal=sleep_m.sleep_start.strftime("%H:%M") if sleep_m.sleep_start else "--",
            wakeTimeLocal=sleep_m.sleep_end.strftime("%H:%M") if sleep_m.sleep_end else "--",
            blocks5min=blocks,
            segments=segs,
            totals={
                "awakeS": sleep_m.sleep_awake_s or 0,
                "lightS": sleep_m.sleep_light_s or 0,
                "remS": sleep_m.sleep_rem_s or 0,
                "deepS": sleep_m.sleep_deep_s or 0,
            },
            hrvDelta=hrv_delta,
        )

    # Stress today
    stress_m = today_metric
    if not (stress_m and stress_m.stress_rest_s is not None):
        stress_m = row_map.get(today - timedelta(days=1))
    stress_today = None
    if stress_m and stress_m.stress_rest_s is not None:
        total_s = (
            (stress_m.stress_rest_s or 0) + (stress_m.stress_low_s or 0)
            + (stress_m.stress_med_s or 0) + (stress_m.stress_high_s or 0)
        )
        if total_s > 0:
            stress_today = StressToday(
                restS=stress_m.stress_rest_s or 0,
                lowS=stress_m.stress_low_s or 0,
                medS=stress_m.stress_med_s or 0,
                highS=stress_m.stress_high_s or 0,
            )

    # Bedtime variance across window
    bedtime_variance_min: int | None = None
    sleep_starts = [r.sleep_start for r in rows if r.sleep_start is not None]
    if len(sleep_starts) >= 3:
        def _mins(dt) -> int:
            m = dt.hour * 60 + dt.minute
            # Normalize: bedtimes after noon are "before midnight" (negative offset)
            return m - 24 * 60 if m > 12 * 60 else m
        bedtime_mins = [_mins(dt) for dt in sleep_starts]
        avg_bt = sum(bedtime_mins) / len(bedtime_mins)
        std = math.sqrt(sum((b - avg_bt) ** 2 for b in bedtime_mins) / len(bedtime_mins))
        bedtime_variance_min = round(std)

    return HealthResponse(
        window=window,
        series=HealthSeries(
            dates=dates, hrv=hrv, rhr=rhr, stress=stress,
            bodyBattery=bb, bodyBatteryCharged=bb_charged, spo2=spo2, sleepHours=sleep_h,
            bodyBatteryIntraday=body_battery_intraday,
        ),
        lastNight=last_night,
        stressToday=stress_today,
        tonightForecast=None,
        bedtimeVarianceMin=bedtime_variance_min,
    )
