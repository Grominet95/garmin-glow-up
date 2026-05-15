from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter
from pydantic import BaseModel

from tempo_sync.api.deps import DbDep, TokenDep
from tempo_sync.db.models import Badge, CourseBest, PersonalRecord, Vo2maxHistory

router = APIRouter()


class Vo2maxOut(BaseModel):
    months: list[str]
    values: list[float]
    deltaLast90d: float


class RaceOut(BaseModel):
    distance: str
    targetDisplay: str
    prDisplay: str
    prDate: str
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

    # VO2max history (last 24 months)
    vo2_rows = (
        db.query(Vo2maxHistory)
        .filter(Vo2maxHistory.sport == "run")
        .order_by(Vo2maxHistory.date)
        .all()
    )
    vo2_months = [r.date.strftime("%Y-%m") for r in vo2_rows]
    vo2_values = [r.value for r in vo2_rows]
    delta = 0.0
    if len(vo2_values) >= 2:
        cutoff = today - timedelta(days=90)
        old = next((r.value for r in vo2_rows if r.date <= cutoff), vo2_values[0])
        delta = round(vo2_values[-1] - old, 1)

    # PRs
    pr_rows = db.query(PersonalRecord).order_by(PersonalRecord.achieved_at.desc()).all()
    distance_order = ["5k", "10k", "half", "marathon", "1mi", "50k"]
    pr_map: dict[str, PersonalRecord] = {}
    for pr in pr_rows:
        if pr.metric not in pr_map:
            pr_map[pr.metric] = pr
    races = [
        RaceOut(
            distance=d,
            targetDisplay="--",
            prDisplay=pr_map[d].display_value or _fmt_time(int(pr_map[d].value)) if d in pr_map else "--",
            prDate=pr_map[d].achieved_at.isoformat() if d in pr_map and pr_map[d].achieved_at else "--",
            featured=d in ("5k", "marathon"),
        )
        for d in distance_order
    ]

    # Courses
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

    # Badges
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

    # Highlights
    highlights: list[HighlightOut] = []
    week_ago = today - timedelta(days=7)
    for pr in pr_rows:
        if pr.achieved_at and pr.achieved_at >= week_ago:
            highlights.append(HighlightOut(
                kind="pr",
                body=f"New PR: {pr.metric} — {pr.display_value or ''}",
                dateLocal=pr.achieved_at.isoformat(),
            ))

    return ProgressResponse(
        vo2max=Vo2maxOut(months=vo2_months, values=vo2_values, deltaLast90d=delta),
        races=races,
        courses=courses,
        badges=badges,
        highlights=highlights,
    )
