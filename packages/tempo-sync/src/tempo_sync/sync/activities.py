from __future__ import annotations

import io
import json
import logging
import math
import zipfile
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from tempo_sync.db.models import Activity, ActivityLap, ActivityStream, ActivityZone
from tempo_sync.fit.parse import parse as parse_fit
from tempo_sync.fit.stream import derive_hr_zone, normalise
from tempo_sync.garmin.client import GarminClient
from tempo_sync.settings import get_settings

logger = logging.getLogger(__name__)

_THRESHOLD_HR: dict[str, int] = {
    "run": 167,
    "trail": 162,
    "bike": 160,
    "swim": 155,
    "row": 160,
    "walk": 140,
    "hike": 140,
    "lift": 150,
    "other": 160,
}
_RESTING_HR = 50


def _estimate_tss(
    duration_s: int | None,
    avg_hr: int | None,
    sport: str,
    aerobic_te: float | None,
) -> float | None:
    if not duration_s or not avg_hr:
        return None
    thr = _THRESHOLD_HR.get(sport, 160)
    denom = thr - _RESTING_HR
    if denom <= 0:
        return None
    intensity = max(0.0, (avg_hr - _RESTING_HR) / denom)
    tss = (duration_s / 3600.0) * (intensity ** 2) * 100.0
    # Sanity-cap: >400 TSS in one session is unrealistic
    return round(min(tss, 400.0), 1)


_SPORT_MAP = {
    "running": "run",
    "cycling": "bike",
    "swimming": "swim",
    "trail_running": "trail",
    "strength_training": "lift",
    "walking": "walk",
    "hiking": "hike",
    "rowing": "row",
}


def _map_sport(garmin_type: str | None) -> str:
    if not garmin_type:
        return "other"
    return _SPORT_MAP.get(garmin_type.lower(), "other")


def pull_recent(client: GarminClient, db: Session, days: int = 30, force: bool = False) -> int:
    settings = get_settings()
    cutoff = (datetime.now(tz=UTC) - timedelta(days=days)).replace(tzinfo=None)
    pulled = 0
    start = 0
    limit = 20

    while True:
        raw_acts = client.activities(start=start, limit=limit)
        if not raw_acts:
            break

        for raw in raw_acts:
            act_time_str = raw.get("startTimeGMT") or raw.get("beginTimestamp")
            if not act_time_str:
                continue
            try:
                act_time = datetime.fromisoformat(act_time_str.replace("Z", "+00:00"))
            except ValueError:
                continue

            if act_time < cutoff:
                return pulled

            act_id = raw.get("activityId")
            if not act_id:
                continue

            existing = db.get(Activity, act_id)
            if existing and not force:
                continue

            sport = _map_sport(raw.get("activityType", {}).get("typeKey"))
            distance = raw.get("distance")
            duration = raw.get("duration") or raw.get("movingDuration")
            avg_hr = raw.get("averageHR")
            max_hr = raw.get("maxHR")
            speed = raw.get("averageSpeed")
            pace = (1000.0 / speed) if speed and speed > 0 else None

            local_str = raw.get("startTimeLocal")
            act_time_local = None
            if local_str:
                try:
                    act_time_local = datetime.fromisoformat(local_str.replace("Z", ""))
                except ValueError:
                    pass

            act = existing or Activity(id=act_id)
            act.sport = sport
            act.start_time = act_time.replace(tzinfo=None)
            act.start_time_local = act_time_local
            act.title = raw.get("activityName")
            act.distance_m = float(distance) if distance else None
            act.duration_s = int(duration) if duration else None
            act.avg_hr = int(avg_hr) if avg_hr else None
            act.max_hr = int(max_hr) if max_hr else None
            act.avg_speed_mps = float(speed) if speed else None
            act.avg_pace_s_per_km = pace
            act.calories_kcal = raw.get("calories")
            act.elevation_gain_m = raw.get("elevationGain")
            act.training_effect_aerobic = raw.get("aerobicTrainingEffect")
            act.training_effect_anaerobic = raw.get("anaerobicTrainingEffect")
            act.training_effect_label = raw.get("trainingEffectLabel")
            act.tss = _estimate_tss(
                duration_s=act.duration_s,
                avg_hr=act.avg_hr,
                sport=act.sport,
                aerobic_te=act.training_effect_aerobic,
            )
            act.updated_at = datetime.utcnow()
            if not existing:
                act.created_at = datetime.utcnow()
                db.add(act)

            # Download FIT
            try:
                fit_cache: Path = settings.storage.fit_cache
                fit_cache.mkdir(parents=True, exist_ok=True)
                fit_path = fit_cache / f"{act_id}.fit"
                if not fit_path.exists() or force:
                    blob = client.activity_fit(act_id)
                    if zipfile.is_zipfile(io.BytesIO(blob)):
                        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
                            fit_names = [n for n in zf.namelist() if n.endswith(".fit")]
                            blob = zf.read(fit_names[0]) if fit_names else blob
                    fit_path.write_bytes(blob)
                    _ingest_fit(act, blob, db)
                    act.fit_path = str(fit_path.relative_to(fit_cache))
            except Exception as e:
                logger.warning("FIT download failed for %s: %s", act_id, e)

            db.flush()
            pulled += 1

        start += limit

    return pulled


def _ingest_fit(act: Activity, blob: bytes, db: Session) -> None:
    parsed = parse_fit(blob)
    points = normalise(parsed.records)  # downsample happens on read, not on write

    # Delete old streams
    db.query(ActivityStream).filter(ActivityStream.activity_id == act.id).delete()
    db.query(ActivityLap).filter(ActivityLap.activity_id == act.id).delete()
    db.query(ActivityZone).filter(ActivityZone.activity_id == act.id).delete()

    # Insert streams
    for p in points:
        db.add(ActivityStream(
            activity_id=act.id,
            t_offset_s=p["t_offset_s"],
            latitude=p.get("latitude"),
            longitude=p.get("longitude"),
            altitude_m=p.get("altitude_m"),
            distance_m=p.get("distance_m"),
            hr=p.get("hr"),
            speed_mps=p.get("speed_mps"),
            cadence=p.get("cadence"),
            power_w=p.get("power_w"),
            temperature_c=p.get("temperature_c"),
            vertical_osc_cm=p.get("vertical_osc_cm"),
            ground_contact_ms=p.get("ground_contact_ms"),
            stride_length_m=p.get("stride_length_m"),
            balance_pct=p.get("balance_pct"),
        ))

    # Simplified route polyline (max 120 points, aspect-ratio-aware)
    geo = [(p["latitude"], p["longitude"]) for p in points if p.get("latitude") is not None and p.get("longitude") is not None]
    if len(geo) >= 2:
        step = max(1, len(geo) // 120)
        sampled = geo[::step]
        if sampled[-1] != geo[-1]:
            sampled.append(geo[-1])
        act.route_polyline = json.dumps([[round(lat, 5), round(lon, 5)] for lat, lon in sampled])
    else:
        act.route_polyline = None

    # Check for dynamics / power
    has_dyn = any(p.get("vertical_osc_cm") is not None for p in points)
    has_pwr = any(p.get("power_w") is not None for p in points)
    act.has_dynamics = has_dyn
    act.has_power = has_pwr

    # Laps
    athlete_max_hr = 190
    for i, lap in enumerate(parsed.laps):
        speed = lap.get("avg_speed") or lap.get("enhanced_avg_speed")
        avg_pace = (1000.0 / speed) if speed and speed > 0 else None
        avg_hr = lap.get("avg_heart_rate")
        zone = derive_hr_zone(avg_hr, athlete_max_hr) if avg_hr else None
        db.add(ActivityLap(
            activity_id=act.id,
            idx=i,
            label=f"Lap {i + 1}",
            duration_s=int(lap.get("total_elapsed_time") or 0),
            distance_m=lap.get("total_distance"),
            avg_hr=avg_hr,
            avg_pace_s_per_km=avg_pace,
            avg_cadence=lap.get("avg_cadence"),
            avg_power_w=lap.get("avg_power"),
            elev_gain_m=lap.get("total_ascent"),
            elev_loss_m=lap.get("total_descent"),
            hr_zone=zone,
        ))

    # Zone time aggregation
    if points and act.avg_hr:
        from collections import Counter
        zone_counts: Counter[int] = Counter()
        for p in points:
            if p.get("hr"):
                z = derive_hr_zone(p["hr"], athlete_max_hr)
                zone_counts[z] += 1
        for z, count in zone_counts.items():
            db.add(ActivityZone(
                activity_id=act.id,
                zone_type="hr",
                zone=z,
                seconds=count,
            ))
