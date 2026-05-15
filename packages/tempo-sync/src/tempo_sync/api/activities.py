from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel

from tempo_sync.api.deps import DbDep, TokenDep
from tempo_sync.db.models import Activity, ActivityLap, ActivityStream, ActivityZone

router = APIRouter()


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


class ActivityListItem(BaseModel):
    id: int
    sport: str
    startTimeLocal: str
    title: str
    distanceKm: float
    avgHr: int
    avgPaceDisplay: str
    avgPaceUnit: str
    tss: float
    intensity: str


class ActivitiesPage(BaseModel):
    items: list[ActivityListItem]
    nextCursor: str | None


@router.get("/activities", response_model=ActivitiesPage)
def list_activities(
    _token: TokenDep,
    db: DbDep,
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    sport: str | None = None,
    limit: int = 200,
    cursor: str | None = None,
):
    q = db.query(Activity).order_by(Activity.start_time.desc())
    if from_:
        q = q.filter(Activity.start_time >= datetime.fromisoformat(from_))
    if to:
        q = q.filter(Activity.start_time <= datetime.fromisoformat(to))
    if sport:
        sports = sport.split(",")
        q = q.filter(Activity.sport.in_(sports))
    q = q.limit(limit)
    rows = q.all()
    items = [
        ActivityListItem(
            id=r.id,
            sport=r.sport,
            startTimeLocal=r.start_time_local.isoformat() if r.start_time_local else r.start_time.isoformat(),
            title=r.title or "Activity",
            distanceKm=(r.distance_m or 0) / 1000,
            avgHr=r.avg_hr or 0,
            avgPaceDisplay=_fmt_pace(r.avg_pace_s_per_km) if r.avg_pace_s_per_km else "--",
            avgPaceUnit="/km",
            tss=r.tss or 0,
            intensity=_intensity(r.tss),
        )
        for r in rows
    ]
    return ActivitiesPage(items=items, nextCursor=None)


class StatOut(BaseModel):
    label: str
    value: str
    unit: str
    tone: str | None = None


class StreamsOut(BaseModel):
    n: int
    timeS: list[int]
    hr: list[int | None]
    pace: list[float | None]
    cadence: list[int | None]
    elevation: list[float | None]
    power: list[int | None] | None = None


class SplitOut(BaseModel):
    k: str
    distanceM: float
    pace: float
    paceDisplay: str
    hr: int
    cad: int
    elevDelta: float
    zone: int


class ZoneRowOut(BaseModel):
    z: int
    label: str
    pct: float
    min: int
    max: int


class HrSummary(BaseModel):
    avg: int
    max: int
    hrrPct: float


class DynamicsOut(BaseModel):
    verticalOscCm: float
    groundContactMs: float
    strideLengthM: float
    verticalRatioPct: float
    leftPct: float
    rightPct: float


class TrainingEffect(BaseModel):
    headline: str
    sub: str
    aerobic: float
    aeroLabel: str
    anaerobic: float
    anLabel: str
    epoc: float
    load: float
    intensity: float | None
    recoveryHours: int


class MapOut(BaseModel):
    routeName: str
    routeCoords: str
    polyline: str
    fastestCallout: str
    bbox: list[float]


class ActivityDetailResponse(BaseModel):
    id: int
    sport: str
    subSport: str | None
    title: str
    subtitle: str
    accent: str
    hero: list[StatOut]
    map: MapOut | None
    streams: StreamsOut
    splits: list[SplitOut]
    zones: list[ZoneRowOut]
    hrSummary: HrSummary
    dynamics: DynamicsOut | None
    trainingEffect: TrainingEffect
    missing: list[str]


ZONE_META = [
    (1, "Recovery", 0, 130),
    (2, "Endurance", 130, 150),
    (3, "Tempo", 150, 165),
    (4, "Threshold", 165, 178),
    (5, "VO₂", 178, 220),
]


@router.get("/activities/{activity_id}", response_model=ActivityDetailResponse)
def get_activity(_token: TokenDep, db: DbDep, activity_id: int):
    act = db.query(Activity).filter(Activity.id == activity_id).first()
    if not act:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Activity not found")

    missing: list[str] = []
    if not act.has_dynamics:
        missing.append("dynamics")
    if not act.has_power:
        missing.append("power")
    if not act.route_polyline:
        missing.append("map")

    # Streams
    stream_rows = (
        db.query(ActivityStream)
        .filter(ActivityStream.activity_id == activity_id)
        .order_by(ActivityStream.t_offset_s)
        .all()
    )

    # Downsample to ~600 points
    if len(stream_rows) > 600:
        step = len(stream_rows) // 600
        stream_rows = stream_rows[::step]

    time_s = [r.t_offset_s for r in stream_rows]
    hr_vals: list[int | None] = [r.hr for r in stream_rows]
    pace_vals: list[float | None] = [
        1000.0 / r.speed_mps if r.speed_mps and r.speed_mps > 0 else None
        for r in stream_rows
    ]
    cad_vals: list[int | None] = [r.cadence for r in stream_rows]
    elev_vals: list[float | None] = [r.altitude_m for r in stream_rows]
    power_vals: list[int | None] = [r.power_w for r in stream_rows] if act.has_power else None

    streams = StreamsOut(
        n=len(time_s),
        timeS=time_s,
        hr=hr_vals,
        pace=pace_vals,
        cadence=cad_vals,
        elevation=elev_vals,
        power=power_vals,
    )

    # Splits / laps
    laps = db.query(ActivityLap).filter(ActivityLap.activity_id == activity_id).order_by(ActivityLap.idx).all()
    splits = [
        SplitOut(
            k=lap.label or str(lap.idx + 1),
            distanceM=lap.distance_m or 0,
            pace=lap.avg_pace_s_per_km or 0,
            paceDisplay=_fmt_pace(lap.avg_pace_s_per_km) if lap.avg_pace_s_per_km else "--",
            hr=lap.avg_hr or 0,
            cad=lap.avg_cadence or 0,
            elevDelta=(lap.elev_gain_m or 0) - (lap.elev_loss_m or 0),
            zone=lap.hr_zone or 2,
        )
        for lap in laps
    ]

    # Zones
    zone_rows = db.query(ActivityZone).filter(
        ActivityZone.activity_id == activity_id,
        ActivityZone.zone_type == "hr",
    ).all()
    total_zone_s = sum(z.seconds for z in zone_rows) or 1
    zone_map = {z.zone: z.seconds for z in zone_rows}
    zones = [
        ZoneRowOut(
            z=z, label=label, pct=round(zone_map.get(z, 0) / total_zone_s * 100, 1),
            min=mn, max=mx,
        )
        for z, label, mn, mx in ZONE_META
    ]

    # Hero stats
    dist_km = (act.distance_m or 0) / 1000
    dur = act.duration_s or 0
    h, m, s = dur // 3600, (dur % 3600) // 60, dur % 60
    dur_display = f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"
    hero = [
        StatOut(label="Distance", value=f"{dist_km:.2f}", unit="km", tone="lead"),
        StatOut(label="Time", value=dur_display, unit="", tone="lead"),
        StatOut(label="Pace", value=_fmt_pace(act.avg_pace_s_per_km) if act.avg_pace_s_per_km else "--", unit="/km"),
        StatOut(label="HR Avg", value=str(act.avg_hr or "--"), unit="bpm"),
        StatOut(label="Cadence", value=str(act.avg_cadence or "--"), unit="spm"),
        StatOut(label="Elev +", value=str(int(act.elevation_gain_m or 0)), unit="m"),
        StatOut(label="TSS", value=str(int(act.tss or 0)), unit=""),
        StatOut(label="Calories", value=str(act.calories_kcal or "--"), unit="kcal", tone="dim"),
    ]

    # Map
    map_out = None
    if act.route_polyline:
        map_out = MapOut(
            routeName=f"ROUTE · {(act.title or 'Route').upper()} · {dist_km:.2f} KM",
            routeCoords="",
            polyline=act.route_polyline,
            fastestCallout="",
            bbox=[0, 0, 0, 0],
        )

    subtitle_date = act.start_time_local.strftime("%A, %b %-d · %H:%M") if act.start_time_local else ""
    accent = act.sport if act.sport in ("run", "bike", "swim", "trail", "lift") else "run"

    return ActivityDetailResponse(
        id=act.id,
        sport=act.sport,
        subSport=act.sub_sport,
        title=act.title or f"{act.sport.title()} · {dist_km:.1f} km",
        subtitle=f"{act.sport.title()} · {subtitle_date}",
        accent=accent,
        hero=hero,
        map=map_out,
        streams=streams,
        splits=splits,
        zones=zones,
        hrSummary=HrSummary(avg=act.avg_hr or 0, max=act.max_hr or 0, hrrPct=0),
        dynamics=None,
        trainingEffect=TrainingEffect(
            headline=act.training_effect_label or "Base",
            sub="",
            aerobic=act.training_effect_aerobic or 0,
            aeroLabel="",
            anaerobic=act.training_effect_anaerobic or 0,
            anLabel="",
            epoc=act.epoc or 0,
            load=act.tss or 0,
            intensity=act.intensity_factor,
            recoveryHours=act.recovery_time_h or 0,
        ),
        missing=missing,
    )
