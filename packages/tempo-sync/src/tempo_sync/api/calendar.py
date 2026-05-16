from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel

from tempo_sync.api.deps import DbDep, TokenDep
from tempo_sync.db.models import Activity

router = APIRouter()


class CalendarCell(BaseModel):
    dateLocal: str
    sport: str
    intensity: str
    distanceKm: float


class CalendarTotals(BaseModel):
    sessions: int
    distanceKm: float
    durationS: int
    kcal: int


class MonthBucket(BaseModel):
    month: str  # "2025-05"
    totalKm: float
    bySport: dict[str, float]


class StreakInfo(BaseModel):
    activeDays: int
    startDate: str
    adherencePct: int


class RecentItem(BaseModel):
    id: int
    dateLocal: str
    sport: str
    label: str
    hr: int
    metricDisplay: str
    distanceKm: float
    durationS: int


class CalendarResponse(BaseModel):
    rangeStart: str
    rangeEnd: str
    cells: list[CalendarCell]
    totals: CalendarTotals
    monthly: list[MonthBucket]
    streak: StreakInfo
    recent: list[RecentItem]


def _fmt_pace(s_per_km: float) -> str:
    m = int(s_per_km // 60)
    s = int(s_per_km % 60)
    return f"{m}:{s:02d}"


def _fmt_duration(duration_s: int) -> str:
    h = duration_s // 3600
    m = (duration_s % 3600) // 60
    if h:
        return f"{h}:{m:02d}"
    return f"{m}m"


def _metric_display(a: Activity) -> str:
    if a.sport in ("run", "trail", "walk") and a.avg_pace_s_per_km:
        return _fmt_pace(a.avg_pace_s_per_km)
    if a.sport == "bike" and a.avg_speed_mps:
        return f"{a.avg_speed_mps * 3.6:.0f} kph"
    if a.sport == "swim" and a.avg_pace_s_per_km:
        return _fmt_pace(a.avg_pace_s_per_km)
    if a.duration_s:
        return _fmt_duration(a.duration_s)
    return "--"


def _intensity(tss: float | None) -> str:
    t = tss or 0
    if t < 50:
        return "low"
    elif t < 100:
        return "med"
    elif t < 150:
        return "high"
    return "v-high"


def _act_date(a: Activity) -> date:
    return a.start_time_local.date() if a.start_time_local else a.start_time.date()


@router.get("/calendar", response_model=CalendarResponse)
def get_calendar(
    _token: TokenDep,
    db: DbDep,
):
    today = date.today()
    range_end = today
    range_start = date(today.year - 1, today.month, 1)
    # Extra history for streak calculation
    query_start = range_start - timedelta(days=31)

    acts = (
        db.query(Activity)
        .filter(Activity.start_time >= datetime.combine(query_start, datetime.min.time()))
        .filter(Activity.start_time <= datetime.combine(range_end, datetime.max.time()))
        .order_by(Activity.start_time.desc())
        .all()
    )

    display_acts = [a for a in acts if _act_date(a) >= range_start]

    cells = [
        CalendarCell(
            dateLocal=_act_date(a).isoformat(),
            sport=a.sport,
            intensity=_intensity(a.tss),
            distanceKm=(a.distance_m or 0) / 1000,
        )
        for a in display_acts
    ]

    totals = CalendarTotals(
        sessions=len(display_acts),
        distanceKm=sum((a.distance_m or 0) / 1000 for a in display_acts),
        durationS=sum(a.duration_s or 0 for a in display_acts),
        kcal=sum(a.calories_kcal or 0 for a in display_acts),
    )

    monthly_map: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for a in display_acts:
        month_key = _act_date(a).strftime("%Y-%m")
        monthly_map[month_key][a.sport] += (a.distance_m or 0) / 1000

    monthly: list[MonthBucket] = []
    cur = date(range_start.year, range_start.month, 1)
    while cur <= range_end:
        month_key = cur.strftime("%Y-%m")
        by_sport = dict(monthly_map.get(month_key, {}))
        monthly.append(MonthBucket(month=month_key, totalKm=sum(by_sport.values()), bySport=by_sport))
        cur = date(cur.year + 1, 1, 1) if cur.month == 12 else date(cur.year, cur.month + 1, 1)

    # Streak: consecutive days from today backwards
    active_dates: set[date] = {_act_date(a) for a in acts}
    streak_days = 0
    streak_start = today
    check = today if today in active_dates else today - timedelta(days=1)
    while check in active_dates:
        streak_days += 1
        streak_start = check
        check -= timedelta(days=1)

    last_30 = {today - timedelta(days=i) for i in range(30)}
    adherence_pct = round(len(active_dates & last_30) / 30 * 100)

    streak = StreakInfo(
        activeDays=streak_days,
        startDate=streak_start.isoformat() if streak_days > 0 else today.isoformat(),
        adherencePct=adherence_pct,
    )

    recent = [
        RecentItem(
            id=a.id,
            dateLocal=_act_date(a).isoformat(),
            sport=a.sport,
            label=a.title or "Activity",
            hr=a.avg_hr or 0,
            metricDisplay=_metric_display(a),
            distanceKm=(a.distance_m or 0) / 1000,
            durationS=a.duration_s or 0,
        )
        for a in display_acts[:10]
    ]

    return CalendarResponse(
        rangeStart=range_start.isoformat(),
        rangeEnd=range_end.isoformat(),
        cells=cells,
        totals=totals,
        monthly=monthly,
        streak=streak,
        recent=recent,
    )
