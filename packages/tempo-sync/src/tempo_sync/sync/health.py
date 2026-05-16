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
        readiness_list = client.training_readiness(date_str)
        if readiness_list:
            # Take the most recent entry (list ordered newest-first)
            r = readiness_list[0]
            metric.readiness_score = r.get("score")
            metric.readiness_level = r.get("level")
            metric.readiness_sleep_pct = r.get("sleepScoreFactorPercent")
            metric.readiness_hrv_pct = r.get("hrvFactorPercent")
            metric.readiness_load_pct = r.get("acwrFactorPercent")
            metric.readiness_recovery_pct = r.get("recoveryTimeFactorPercent")
            metric.readiness_stress_pct = r.get("stressHistoryFactorPercent")
            updated = True
    except Exception as e:
        logger.debug("Training readiness fetch error: %s", e)

    try:
        bb_list = client.body_battery(date_str, date_str)
        if bb_list:
            # Response: {"date":…, "charged":int, "drained":int,
            #   "bodyBatteryValuesArray": [[timestamp_ms, level], …],
            #   "bodyBatteryValueDescriptorDTOList": [{"bodyBatteryValueDescriptorIndex":0,"bodyBatteryValueDescriptorKey":"timestamp"},
            #                                         {"bodyBatteryValueDescriptorIndex":1,"bodyBatteryValueDescriptorKey":"bodyBatteryLevel"}]}
            entry = bb_list[0] if isinstance(bb_list, list) else bb_list
            values_array = entry.get("bodyBatteryValuesArray") or []
            # Determine which column holds the level (default 1)
            level_idx = 1
            for d in (entry.get("bodyBatteryValueDescriptorDTOList") or []):
                if d.get("bodyBatteryValueDescriptorKey") == "bodyBatteryLevel":
                    level_idx = d.get("bodyBatteryValueDescriptorIndex", 1)
                    break
            values = [
                row[level_idx]
                for row in values_array
                if len(row) > level_idx and row[level_idx] is not None and row[level_idx] >= 0
            ]
            if values:
                metric.body_battery_high = values[-1]  # most recent reading = current level
                metric.body_battery_low = min(values)
                metric.body_battery_charged = entry.get("charged")  # overnight recovery delta
            else:
                # No readings: clear stale value so dashboard falls back to previous day
                metric.body_battery_high = None
                metric.body_battery_charged = entry.get("charged") or metric.body_battery_charged
    except Exception as e:
        logger.debug("Body battery fetch error: %s", e)

    if updated or db.get(DailyMetric, d) is None:
        db.merge(metric)
