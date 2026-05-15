from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from tempo_sync.db.models import DailyMetric, SleepStage
from tempo_sync.garmin.client import GarminClient

logger = logging.getLogger(__name__)


def pull_health(client: GarminClient, db: Session, days: int = 30) -> None:
    today = date.today()
    for i in range(days):
        d = today - timedelta(days=i)
        date_str = d.isoformat()
        try:
            _pull_day(client, db, d, date_str)
        except Exception as e:
            logger.warning("Health pull failed for %s: %s", date_str, e)


def _pull_day(client: GarminClient, db: Session, d: date, date_str: str) -> None:
    metric = db.get(DailyMetric, d) or DailyMetric(date=d)
    updated = False

    try:
        sleep = client.sleep_data(date_str)
        if sleep:
            overall = sleep.get("dailySleepDTO", {}).get("sleepScores", {}).get("overall")
            metric.sleep_score = overall.get("value") if isinstance(overall, dict) else overall
            total = sleep.get("dailySleepDTO", {}).get("sleepTimeSeconds")
            metric.sleep_seconds = total
            metric.sleep_deep_s = sleep.get("dailySleepDTO", {}).get("deepSleepSeconds")
            metric.sleep_rem_s = sleep.get("dailySleepDTO", {}).get("remSleepSeconds")
            metric.sleep_light_s = sleep.get("dailySleepDTO", {}).get("lightSleepSeconds")
            metric.sleep_awake_s = sleep.get("dailySleepDTO", {}).get("awakeSleepSeconds")

            start_gmt = sleep.get("dailySleepDTO", {}).get("sleepStartTimestampGMT")
            end_gmt = sleep.get("dailySleepDTO", {}).get("sleepEndTimestampGMT")
            if start_gmt:
                metric.sleep_start = datetime.fromtimestamp(start_gmt / 1000)
            if end_gmt:
                metric.sleep_end = datetime.fromtimestamp(end_gmt / 1000)

            stages = sleep.get("sleepLevels", [])
            db.query(SleepStage).filter(SleepStage.date == d).delete()
            stage_map = {"deep": "deep", "light": "light", "rem": "rem", "awake": "awake"}
            if stages and metric.sleep_start:
                for seg in stages:
                    stage_name = seg.get("activityLevel", "").lower()
                    if stage_name not in stage_map:
                        continue
                    start_ts = seg.get("startGMT")
                    end_ts = seg.get("endGMT")
                    if start_ts and end_ts:
                        offset_min = int((datetime.fromisoformat(start_ts) - metric.sleep_start).total_seconds() / 60)
                        db.add(SleepStage(date=d, t_offset_min=offset_min, stage=stage_map[stage_name]))
            updated = True
    except Exception as e:
        logger.debug("Sleep fetch error: %s", e)

    try:
        hrv = client.hrv_data(date_str)
        if hrv:
            metric.hrv_overnight = hrv.get("hrvSummary", {}).get("lastNight")
    except Exception:
        pass

    try:
        bb_list = client.body_battery(date_str, date_str)
        if bb_list:
            # Each entry: {"date": ..., "charged": int, "drained": int, "bodyBatteryStatList": [...]}
            entry = bb_list[0] if isinstance(bb_list, list) else bb_list
            stat_list = entry.get("bodyBatteryStatList") or []
            values = [s.get("bodyBatteryLevel") for s in stat_list if s.get("bodyBatteryLevel") is not None]
            if values:
                metric.body_battery_high = max(values)
                metric.body_battery_low = min(values)
            elif entry.get("charged") is not None:
                metric.body_battery_high = entry.get("charged")
    except Exception as e:
        logger.debug("Body battery fetch error: %s", e)

    if updated or db.get(DailyMetric, d) is None:
        db.merge(metric)
