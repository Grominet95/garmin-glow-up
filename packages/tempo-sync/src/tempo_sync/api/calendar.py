from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Query
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


class RecentItem(BaseModel):
    dateLocal: str
    sport: str
    label: str
    hr: int
    paceDisplay: str


class CalendarResponse(BaseModel):
    yearStart: str
    cells: list[CalendarCell]
    totals: CalendarTotals
    recent: list[RecentItem]


def _fmt_pace(s_per_km: float) -> str:
    m = int(s_per_km // 60)
    s = int(s_per_km % 60)
    return f"{m}:{s:02d}"


def _intensity(tss: float | None) -> str:
    t = tss or 0
    if t < 50:
        return "low"
    elif t < 100:
        return "med"
    elif t < 150:
        return "high"
    return "v-high"


@router.get("/calendar", response_model=CalendarResponse)
def get_calendar(
    _token: TokenDep,
    db: DbDep,
    year: int = Query(default=None),
):
    if year is None:
        year = date.today().year
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)

    acts = (
        db.query(Activity)
        .filter(Activity.start_time >= datetime.combine(year_start, datetime.min.time()))
        .filter(Activity.start_time <= datetime.combine(year_end, datetime.max.time()))
        .order_by(Activity.start_time.desc())
        .all()
    )

    cells = [
        CalendarCell(
            dateLocal=(a.start_time_local.date() if a.start_time_local else a.start_time.date()).isoformat(),
            sport=a.sport,
            intensity=_intensity(a.tss),
            distanceKm=(a.distance_m or 0) / 1000,
        )
        for a in acts
    ]

    totals = CalendarTotals(
        sessions=len(acts),
        distanceKm=sum((a.distance_m or 0) / 1000 for a in acts),
        durationS=sum(a.duration_s or 0 for a in acts),
        kcal=sum(a.calories_kcal or 0 for a in acts),
    )

    recent = [
        RecentItem(
            dateLocal=(a.start_time_local.date() if a.start_time_local else a.start_time.date()).isoformat(),
            sport=a.sport,
            label=a.title or "Activity",
            hr=a.avg_hr or 0,
            paceDisplay=_fmt_pace(a.avg_pace_s_per_km) if a.avg_pace_s_per_km else "--",
        )
        for a in acts[:20]
    ]

    return CalendarResponse(yearStart=year_start.isoformat(), cells=cells, totals=totals, recent=recent)
