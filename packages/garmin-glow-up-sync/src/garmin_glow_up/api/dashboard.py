from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from garmin_glow_up.api.deps import DbDep, TokenDep
from garmin_glow_up.db.models import Activity, DailyLoad, DailyMetric, RacePrediction

router = APIRouter()

SPORT_LABEL = {
    "run": "Run", "bike": "Bike", "swim": "Swim", "trail": "Trail",
    "lift": "Strength", "walk": "Walk", "hike": "Hike", "row": "Row", "other": "Other",
}

_TE_LABEL_MAP = {
    "vo2max": "VO₂max",
    "aerobic_base": "Base",
    "aerobic_base_high": "Base+",
    "anaerobic": "Anaerobic",
    "tempo": "Tempo",
    "recovery": "Recovery",
    "threshold": "Threshold",
    "sprint": "Sprint",
    "unknown": "Workout",
}


def _friendly_label(raw: str | None) -> str:
    if not raw:
        return "Workout"
    return _TE_LABEL_MAP.get(raw.lower(), raw.replace("_", " ").title())


class SyncStatus(BaseModel):
    lastSync: str | None
    running: bool
    nextRun: str | None


class VibeOut(BaseModel):
    word: str
    sub: str


class Form28d(BaseModel):
    days: list[str]
    ctl: list[float]
    atl: list[float]
    tsb: list[float]


class BodyBattery(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    current: int
    label: str
    from_: int
    drainsToByNoon: int


class SleepOut(BaseModel):
    durationS: int
    bedTimeLocal: str
    wakeTimeLocal: str
    stages: dict
    hrvDelta: float | None
    score: int


class LastSession(BaseModel):
    id: int
    sport: str
    title: str
    startTimeLocal: str
    endTimeLocal: str
    distanceKm: float
    avgPaceDisplay: str
    avgPaceUnit: str
    avgHr: int
    tss: float
    aerobicTE: float
    chips: list[str]
    routePolyline: str | None


class WeekDay(BaseModel):
    dayLabel: str
    dateLocal: str
    sport: str | None
    isToday: bool
    label: str
    distanceKm: float
    tss: float


class WeekTotals(BaseModel):
    volumeKm: float
    tss: float
    sessions: int
    rampPct: float


class StatusOut(BaseModel):
    headline: str
    subhead: str
    body: str
    tone: str
    tsb: float


class ReadinessFactor(BaseModel):
    name: str
    value: str
    pct: int
    color: str


class ReadinessOut(BaseModel):
    score: int
    delta7d: int
    tone: str  # "green" | "yellow" | "red"
    factors: list[ReadinessFactor]


class RacePredictionOut(BaseModel):
    distance: str
    time: str
    pace: str
    deltaSec: int
    focus: bool


class RacePredictorOut(BaseModel):
    vo2max: float
    predictions: list[RacePredictionOut]
    trend10kSec: list[float]
    trendDelta: str


class DashboardResponse(BaseModel):
    state: str
    todayLocal: str
    syncStatus: SyncStatus
    status: StatusOut
    vibe: VibeOut | None
    form28d: Form28d
    bodyBattery: dict | None
    sleep: SleepOut | None
    lastSession: LastSession | None
    plannedToday: dict | None
    readiness: ReadinessOut | None
    racePredictor: RacePredictorOut | None
    week: list[WeekDay]
    weekTotals: WeekTotals


def _fmt_pace(s_per_km: float) -> str:
    m = int(s_per_km // 60)
    s = int(s_per_km % 60)
    return f"{m}:{s:02d}"


def _fmt_time(seconds: int) -> str:
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def _tone_from_tsb(tsb: float) -> str:
    if tsb > 5:
        return "fresh"
    elif tsb > -10:
        return "neutral"
    elif tsb > -20:
        return "tired"
    return "tired"


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(_token: TokenDep, db: DbDep):
    today = date.today()
    today_str = today.isoformat()

    # Last 7 days activity check
    week_start = today - timedelta(days=today.weekday())
    recent_cutoff = today - timedelta(days=7)
    recent_activities = (
        db.query(Activity)
        .filter(Activity.start_time >= datetime.combine(recent_cutoff, datetime.min.time()))
        .order_by(Activity.start_time.desc())
        .all()
    )

    state = "ready" if recent_activities else "empty"

    # Form 28d
    load_rows = (
        db.query(DailyLoad)
        .filter(DailyLoad.date >= today - timedelta(days=27))
        .order_by(DailyLoad.date)
        .all()
    )
    days_map = {r.date: r for r in load_rows}
    form_days, form_ctl, form_atl, form_tsb = [], [], [], []
    for i in range(28):
        d = today - timedelta(days=27 - i)
        row = days_map.get(d)
        form_days.append(d.isoformat())
        form_ctl.append(row.ctl if row else 0.0)
        form_atl.append(row.atl if row else 0.0)
        form_tsb.append(row.tsb if row else 0.0)

    current_tsb = form_tsb[-1] if form_tsb else 0.0
    tone = _tone_from_tsb(current_tsb)

    # Today's metrics — fall back to yesterday for sleep (Garmin keys sleep to wake-up date)
    today_metric = db.query(DailyMetric).filter(DailyMetric.date == today).first()
    sleep_metric = today_metric if (today_metric and today_metric.sleep_seconds) else (
        db.query(DailyMetric).filter(DailyMetric.date == today - timedelta(days=1)).first()
    )

    sleep_out = None
    if sleep_metric and sleep_metric.sleep_seconds:
        bed = sleep_metric.sleep_start.strftime("%H:%M") if sleep_metric.sleep_start else "--"
        wake = sleep_metric.sleep_end.strftime("%H:%M") if sleep_metric.sleep_end else "--"
        sleep_out = SleepOut(
            durationS=sleep_metric.sleep_seconds,
            bedTimeLocal=bed,
            wakeTimeLocal=wake,
            stages={
                "deep": sleep_metric.sleep_deep_s or 0,
                "rem": sleep_metric.sleep_rem_s or 0,
                "light": sleep_metric.sleep_light_s or 0,
                "awake": sleep_metric.sleep_awake_s or 0,
            },
            hrvDelta=None,
            score=sleep_metric.sleep_score or 0,
        )

    bb_metric = (
        db.query(DailyMetric)
        .filter(DailyMetric.date <= today, DailyMetric.body_battery_high.isnot(None))
        .order_by(DailyMetric.date.desc())
        .first()
    )
    body_battery = None
    if bb_metric and bb_metric.body_battery_high is not None:
        bb_val = bb_metric.body_battery_high  # last reading from stat list = current level
        charged = bb_metric.body_battery_charged or 0
        # from_val = 0 when charged unknown (old rows) so UI hides "from X" / overnight text
        from_val = max(0, bb_val - charged) if charged else 0
        label = "Charged" if bb_val >= 75 else "Charging" if bb_val >= 50 else "Low" if bb_val >= 25 else "Drained"
        body_battery = {
            "current": bb_val,
            "label": label,
            "from": from_val,
            "drainsToByNoon": max(0, bb_val - 20),
        }

    # Last session
    last_act = recent_activities[0] if recent_activities else None
    last_session = None
    if last_act:
        pace_display = _fmt_pace(last_act.avg_pace_s_per_km) if last_act.avg_pace_s_per_km else "--"
        end_local = None
        if last_act.start_time_local and last_act.duration_s:
            end_dt = last_act.start_time_local + timedelta(seconds=last_act.duration_s)
            end_local = end_dt.strftime("%H:%M")
        chips = []
        if last_act.weather_temp_c is not None:
            chips.append(f"{last_act.weather_temp_c:.0f}°C · {last_act.weather_label or 'clear'}")
        last_session = LastSession(
            id=last_act.id,
            sport=last_act.sport,
            title=last_act.title or "Activity",
            startTimeLocal=last_act.start_time_local.strftime("%H:%M") if last_act.start_time_local else "--",
            endTimeLocal=end_local or "--",
            distanceKm=(last_act.distance_m or 0) / 1000,
            avgPaceDisplay=pace_display,
            avgPaceUnit="/km",
            avgHr=last_act.avg_hr or 0,
            tss=last_act.tss or 0,
            aerobicTE=last_act.training_effect_aerobic or 0,
            chips=chips,
            routePolyline=last_act.route_polyline,
        )

    # Week grid
    week: list[WeekDay] = []
    week_acts_map: dict[date, Activity] = {}
    week_cutoff = datetime.combine(week_start, datetime.min.time())
    for act in db.query(Activity).filter(Activity.start_time >= week_cutoff).all():
        d = act.start_time_local.date() if act.start_time_local else act.start_time.date()
        week_acts_map[d] = act
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i in range(7):
        d = week_start + timedelta(days=i)
        act = week_acts_map.get(d)
        week.append(WeekDay(
            dayLabel=day_names[i],
            dateLocal=d.isoformat(),
            sport=act.sport if act else None,
            isToday=d == today,
            label=_friendly_label(act.training_effect_label) if act else "Rest",
            distanceKm=(act.distance_m or 0) / 1000 if act else 0,
            tss=act.tss or 0 if act else 0,
        ))

    total_km = sum(w.distanceKm for w in week)
    total_tss = sum(w.tss for w in week)
    sessions = sum(1 for w in week if w.sport)

    # ── Readiness (from DailyMetric) ─────────────────────────────
    readiness_metric = (
        today_metric if (today_metric and today_metric.readiness_score is not None)
        else db.query(DailyMetric)
        .filter(DailyMetric.date <= today, DailyMetric.readiness_score.isnot(None))
        .order_by(DailyMetric.date.desc())
        .first()
    )
    readiness_out: ReadinessOut | None = None
    if readiness_metric and readiness_metric.readiness_score is not None:
        r_level = (readiness_metric.readiness_level or "").upper()
        r_tone = "green" if r_level == "HIGH" else "yellow" if r_level == "MODERATE" else "red"
        readiness_out = ReadinessOut(
            score=readiness_metric.readiness_score,
            delta7d=0,
            tone=r_tone,  # type: ignore[arg-type]
            factors=[
                ReadinessFactor(
                    name="Sleep",
                    value=str(readiness_metric.sleep_score or "—"),
                    pct=readiness_metric.readiness_sleep_pct or 0,
                    color="var(--run)",
                ),
                ReadinessFactor(
                    name="HRV",
                    value=f"{readiness_metric.hrv_overnight} ms" if readiness_metric.hrv_overnight else "—",
                    pct=readiness_metric.readiness_hrv_pct or 0,
                    color="var(--run)",
                ),
                ReadinessFactor(
                    name="Acute load",
                    value="balanced",
                    pct=readiness_metric.readiness_load_pct or 0,
                    color="var(--bike)",
                ),
                ReadinessFactor(
                    name="Recovery",
                    value="—",
                    pct=readiness_metric.readiness_recovery_pct or 0,
                    color="var(--run)",
                ),
                ReadinessFactor(
                    name="Stress 24h",
                    value=str(readiness_metric.stress_avg or "—"),
                    pct=readiness_metric.readiness_stress_pct or 0,
                    color="var(--swim)",
                ),
            ],
        )

    # ── Race predictor (from race_predictions table) ──────────────
    race_predictor_out: RacePredictorOut | None = None
    _DIST_MAP = {
        "time5K":           ("5 km",   5.0),
        "time10K":          ("10 km",  10.0),
        "timeHalfMarathon": ("Half",   21.0975),
        "timeMarathon":     ("Mara",   42.195),
    }
    _DIST_ORDER = list(_DIST_MAP.keys())
    # Use most recent available date (Garmin predictions may not update daily)
    latest_pred_date = (
        db.query(RacePrediction.date)
        .filter(RacePrediction.date <= today)
        .order_by(RacePrediction.date.desc())
        .limit(1)
        .scalar()
    )
    today_preds = {
        r.distance: r.predicted_time_s
        for r in db.query(RacePrediction).filter(RacePrediction.date == latest_pred_date).all()
    } if latest_pred_date else {}
    ref_date = (latest_pred_date or today) - timedelta(days=30)
    ref_pred_date = (
        db.query(RacePrediction.date)
        .filter(RacePrediction.date <= ref_date)
        .order_by(RacePrediction.date.desc())
        .limit(1)
        .scalar()
    )
    ago30_preds = {
        r.distance: r.predicted_time_s
        for r in db.query(RacePrediction).filter(RacePrediction.date == ref_pred_date).all()
    } if ref_pred_date else {}
    if today_preds:
        vo2max_val = today_metric.vo2max if today_metric and today_metric.vo2max else 0.0
        predictions = []
        for key in _DIST_ORDER:
            if key not in today_preds:
                continue
            label, dist_km = _DIST_MAP[key]
            t_s = today_preds[key]
            pace_s = t_s / dist_km if dist_km else 0
            delta = (today_preds[key] - ago30_preds[key]) if key in ago30_preds else 0
            predictions.append(RacePredictionOut(
                distance=label,
                time=_fmt_time(t_s),
                pace=_fmt_pace(pace_s),
                deltaSec=delta,
                focus=(key == "time10K"),
            ))
        trend_rows = (
            db.query(RacePrediction)
            .filter(RacePrediction.distance == "time10K", RacePrediction.date >= today - timedelta(days=59))
            .order_by(RacePrediction.date)
            .all()
        )
        trend10k = [r.predicted_time_s for r in trend_rows]
        race_predictor_out = RacePredictorOut(
            vo2max=vo2max_val,
            predictions=predictions,
            trend10kSec=trend10k,
            trendDelta="",
        )

    return DashboardResponse(
        state=state,
        todayLocal=today_str,
        syncStatus=SyncStatus(lastSync=None, running=False, nextRun=None),
        status=StatusOut(
            headline="Keep building." if current_tsb > -5 else "Take it easy.",
            subhead=(
                "Push tempo, recover smart." if tone == "neutral"
                else "Rest day recommended." if tone == "tired"
                else "Form is fresh."
            ),
            body="Your training load is on track. Focus on quality sessions this week.",
            tone=tone,
            tsb=current_tsb,
        ),
        vibe=VibeOut(word="On track", sub="steady build, form holding") if state == "ready" else None,
        form28d=Form28d(days=form_days, ctl=form_ctl, atl=form_atl, tsb=form_tsb),
        bodyBattery=body_battery,
        sleep=sleep_out,
        lastSession=last_session,
        plannedToday=None,
        readiness=readiness_out,
        racePredictor=race_predictor_out,
        week=week,
        weekTotals=WeekTotals(volumeKm=total_km, tss=total_tss, sessions=sessions, rampPct=0.0),
    )
