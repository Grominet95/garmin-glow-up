from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func

from garmin_glow_up.api.deps import DbDep, TokenDep
from garmin_glow_up.db.models import Badge, CourseBest, DailyMetric, PersonalRecord, RacePrediction, Vo2maxHistory

router = APIRouter()

# Garmin prediction distance keys → (internal key, display label)
_PRED_MAP = {
    "time5K": ("5k", "5 km"),
    "time10K": ("10k", "10 km"),
    "timeHalfMarathon": ("half", "Half"),
    "timeMarathon": ("marathon", "Marathon"),
    "time1Mile": ("1mi", "1 mile"),
}

# Rough value-range → distance mapping for PRs with metric='unknown'
def _infer_metric(value_s: float) -> str | None:
    if 200 <= value_s < 420:
        return "1mi"
    if 900 <= value_s < 1600:
        return "5k"
    if 2000 <= value_s < 3600:
        return "10k"
    if 4500 <= value_s < 9500:
        return "half"
    if 9500 <= value_s < 22000:
        return "marathon"
    return None


def _fitness_age(vo2max: float) -> int:
    if vo2max >= 62:
        return 20
    if vo2max >= 58:
        return 24
    if vo2max >= 54:
        return 28
    if vo2max >= 50:
        return 32
    if vo2max >= 46:
        return 36
    if vo2max >= 42:
        return 40
    return 45


class Vo2maxOut(BaseModel):
    months: list[str]
    values: list[float]
    deltaLast90d: float
    fitnessAge: int | None = None


class RaceOut(BaseModel):
    distance: str
    targetDisplay: str
    prDisplay: str
    prDate: str
    featured: bool = False


class PredictionOut(BaseModel):
    distance: str
    distLabel: str
    predictedDisplay: str
    predictedSecs: int
    prDisplay: str
    prSecs: int | None
    prDate: str
    deltaPct: float | None
    featured: bool = False


class CourseOut(BaseModel):
    name: str
    timeDisplay: str
    deltaDisplay: str
    dateLocal: str
    activityId: int


class BadgeOut(BaseModel):
    slug: str
    label: str
    sport: str
    earned: bool
    earnedAt: str | None


class HighlightOut(BaseModel):
    kind: str
    body: str
    dateLocal: str


class ProgressResponse(BaseModel):
    vo2max: Vo2maxOut
    races: list[RaceOut]
    predictions: list[PredictionOut]
    courses: list[CourseOut]
    badges: list[BadgeOut]
    highlights: list[HighlightOut]


def _fmt_time(seconds: int) -> str:
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


@router.get("/progress", response_model=ProgressResponse)
def get_progress(_token: TokenDep, db: DbDep):
    today = date.today()

    # ── VO2max — merge monthly snapshots (Vo2maxHistory) + recent daily (DailyMetric) ──
    hist_rows = (
        db.query(Vo2maxHistory)
        .filter(Vo2maxHistory.sport == "run")
        .order_by(Vo2maxHistory.date)
        .all()
    )
    dm_rows = (
        db.query(DailyMetric)
        .filter(DailyMetric.vo2max.isnot(None))
        .order_by(DailyMetric.date)
        .all()
    )

    # DailyMetric first (daily readings), then Vo2maxHistory overwrites (authoritative snapshots)
    merged: dict[date, float] = {r.date: r.vo2max for r in dm_rows}
    for r in hist_rows:
        merged[r.date] = r.value

    sorted_dates = sorted(merged.keys())
    vo2_months = [d.isoformat() for d in sorted_dates]  # full YYYY-MM-DD strings
    vo2_values = [merged[d] for d in sorted_dates]

    delta = 0.0
    if len(vo2_values) >= 2:
        cutoff = today - timedelta(days=90)
        old = next((merged[d] for d in sorted_dates if d <= cutoff), vo2_values[0])
        delta = round(vo2_values[-1] - old, 1)

    latest_vo2 = vo2_values[-1] if vo2_values else None
    fit_age = _fitness_age(latest_vo2) if latest_vo2 is not None else None

    # ── PR lookup (deduplicated by inferred distance, best time wins) ─────────
    pr_by_dist: dict[str, tuple[float, str | None]] = {}
    for pr in db.query(PersonalRecord).filter(PersonalRecord.sport == "run").all():
        dist = pr.metric if pr.metric != "unknown" else _infer_metric(pr.value)
        if dist is None:
            continue
        prev = pr_by_dist.get(dist)
        if prev is None or pr.value < prev[0]:
            date_str = pr.achieved_at.isoformat() if pr.achieved_at else None
            pr_by_dist[dist] = (pr.value, date_str)

    # ── Race PRs (legacy section, kept for backwards compat) ─────────────────
    distance_order = ["5k", "10k", "half", "marathon", "1mi", "50k"]
    races = [
        RaceOut(
            distance=d,
            targetDisplay="--",
            prDisplay=_fmt_time(int(pr_by_dist[d][0])) if d in pr_by_dist else "--",
            prDate=pr_by_dist[d][1] or "--" if d in pr_by_dist else "--",
            featured=d in ("5k", "marathon"),
        )
        for d in distance_order
    ]

    # ── Race Predictions ──────────────────────────────────────────────────────
    latest_pred_date = db.query(func.max(RacePrediction.date)).scalar()
    pred_rows = (
        db.query(RacePrediction).filter(RacePrediction.date == latest_pred_date).all()
        if latest_pred_date
        else []
    )

    pred_display_order = ["time1Mile", "time5K", "time10K", "timeHalfMarathon", "timeMarathon"]
    pred_map = {r.distance: r for r in pred_rows}
    predictions: list[PredictionOut] = []
    for garmin_key in pred_display_order:
        if garmin_key not in _PRED_MAP:
            continue
        metric_key, dist_label = _PRED_MAP[garmin_key]
        row = pred_map.get(garmin_key)
        if row is None:
            continue
        pr_info = pr_by_dist.get(metric_key)
        pr_secs = int(pr_info[0]) if pr_info else None
        pr_date = pr_info[1] or "--" if pr_info else "--"
        if pr_secs:
            raw_delta = round((row.predicted_time_s - pr_secs) / pr_secs * 100, 1)
            # Discard PR if it implies an implausible delta (> 25% gap likely means
            # the inferred distance mapping is wrong, e.g. a 50k labelled as marathon)
            if abs(raw_delta) > 25:
                pr_secs = None
                pr_date = "--"
                delta_pct = None
            else:
                delta_pct: float | None = raw_delta
        else:
            delta_pct = None
        predictions.append(PredictionOut(
            distance=metric_key,
            distLabel=dist_label,
            predictedDisplay=_fmt_time(row.predicted_time_s),
            predictedSecs=row.predicted_time_s,
            prDisplay=_fmt_time(pr_secs) if pr_secs else "--",
            prSecs=pr_secs,
            prDate=pr_date,
            deltaPct=delta_pct,
            featured=metric_key in ("5k", "marathon"),
        ))

    # ── Courses ───────────────────────────────────────────────────────────────
    course_rows = db.query(CourseBest).order_by(CourseBest.achieved_at.desc()).all()
    courses = [
        CourseOut(
            name=c.name or c.course_slug,
            timeDisplay=_fmt_time(c.time_s) if c.time_s else "--",
            deltaDisplay=f"{c.delta_to_prev_s:+d}s" if c.delta_to_prev_s else "PR",
            dateLocal=c.achieved_at.isoformat() if c.achieved_at else "--",
            activityId=c.activity_id or 0,
        )
        for c in course_rows[:10]
    ]

    # ── Badges ────────────────────────────────────────────────────────────────
    badge_rows = db.query(Badge).all()
    badges = [
        BadgeOut(
            slug=b.slug,
            label=b.label,
            sport=b.sport or "run",
            earned=b.earned_at is not None,
            earnedAt=b.earned_at.isoformat() if b.earned_at else None,
        )
        for b in badge_rows
    ]

    # ── Highlights ────────────────────────────────────────────────────────────
    highlights: list[HighlightOut] = []
    week_ago = today - timedelta(days=7)
    pr_rows_recent = db.query(PersonalRecord).filter(
        PersonalRecord.sport == "run"
    ).order_by(PersonalRecord.achieved_at.desc()).all()
    for pr in pr_rows_recent:
        if pr.achieved_at and pr.achieved_at >= week_ago:
            dist = pr.metric if pr.metric != "unknown" else _infer_metric(pr.value)
            label = dist or pr.metric
            highlights.append(HighlightOut(
                kind="pr",
                body=f"New PR: {label} — {pr.display_value or ''}",
                dateLocal=pr.achieved_at.isoformat(),
            ))

    # Trending VO2max
    if delta > 0 and len(vo2_values) >= 2:
        highlights.append(HighlightOut(
            kind="trend",
            body=f"Trending up · +{delta} in 90d",
            dateLocal=today.isoformat(),
        ))

    return ProgressResponse(
        vo2max=Vo2maxOut(months=vo2_months, values=vo2_values, deltaLast90d=delta, fitnessAge=fit_age),
        races=races,
        predictions=predictions,
        courses=courses,
        badges=badges,
        highlights=highlights,
    )
