from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from garmin_glow_up.db.models import DailyMetric, SleepStage
from garmin_glow_up.garmin.client import GarminClient

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
            first_keys = list((stages[0] if stages else {}).keys())
            logger.debug("sleepLevels for %s: %d segments, keys=%s", date_str, len(stages or []), first_keys)
            db.query(SleepStage).filter(SleepStage.date == d).delete()
            _str_stage = {"deep": "deep", "light": "light", "rem": "rem", "awake": "awake"}
            # Garmin may return activityLevel as a numeric code instead of a string
            _num_stage = {0: "deep", 1: "light", 2: "rem", 3: "awake"}
            sleep_start_ms = sleep.get("dailySleepDTO", {}).get("sleepStartTimestampGMT")
            if stages and sleep_start_ms:
                sleep_start_epoch = sleep_start_ms / 1000
                for seg in stages:
                    raw = seg.get("activityLevel")
                    if raw is None:
                        continue
                    if isinstance(raw, (int, float)):
                        stage_name = _num_stage.get(int(raw))
                    else:
                        stage_name = _str_stage.get(str(raw).lower())
                    if not stage_name:
                        continue
                    start_ts = seg.get("startGMT")
                    if not start_ts:
                        continue
                    try:
                        # startGMT is a UTC string — use epoch arithmetic to avoid tz confusion
                        start_epoch = datetime.fromisoformat(str(start_ts)).replace(tzinfo=timezone.utc).timestamp()  # noqa: UP017
                        offset_min = int((start_epoch - sleep_start_epoch) / 60)
                        if offset_min >= 0:
                            db.add(SleepStage(date=d, t_offset_min=offset_min, stage=stage_name))
                    except (ValueError, TypeError):
                        pass
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
            #   "bodyBatteryValueDescriptorDTOList": [
            #     {"bodyBatteryValueDescriptorIndex":0,"bodyBatteryValueDescriptorKey":"timestamp"},
            #     {"bodyBatteryValueDescriptorIndex":1,"bodyBatteryValueDescriptorKey":"bodyBatteryLevel"}
            #   ]}
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

            # Store intraday series as [[minute_of_day, level], ...] for 24H chart
            intraday_pts: list[list[int]] = []
            for row in values_array:
                if len(row) > level_idx and row[level_idx] is not None and row[level_idx] >= 0:
                    ts_ms = row[0]
                    level_val = row[level_idx]
                    local_dt = datetime.fromtimestamp(ts_ms / 1000)
                    minute_of_day = local_dt.hour * 60 + local_dt.minute
                    intraday_pts.append([minute_of_day, level_val])
            if intraday_pts:
                metric.body_battery_intraday = json.dumps(intraday_pts)
    except Exception as e:
        logger.debug("Body battery fetch error: %s", e)

    try:
        summary = client.user_summary(date_str)
        if summary:
            rhr_val = summary.get("restingHeartRate")
            if rhr_val:
                metric.resting_hr = int(rhr_val)
            stress_val = summary.get("averageStressLevel")
            if stress_val and int(stress_val) > 0:
                metric.stress_avg = int(stress_val)
            # Stress breakdown (seconds per category)
            def _s(key: str) -> int | None:
                v = summary.get(key)
                return int(v) if v is not None and int(v) >= 0 else None
            metric.stress_rest_s = _s("restStressDuration")
            metric.stress_low_s = _s("lowStressDuration")
            metric.stress_med_s = _s("mediumStressDuration")
            metric.stress_high_s = _s("highStressDuration")
            updated = True
    except Exception as e:
        logger.debug("User summary fetch error: %s", e)

    try:
        spo2 = client.spo2_data(date_str)
        if spo2:
            avg = (spo2.get("spO2SleepSummary") or {}).get("averageSpO2")
            if avg is None:
                avg = spo2.get("averageSpO2")
            if avg is not None:
                metric.spo2_avg = round(float(avg))
            updated = True
    except Exception as e:
        logger.debug("SpO2 fetch error: %s", e)

    try:
        status = client.training_status(date_str)
        generic = (status.get("mostRecentVO2Max") or {}).get("generic") or {}
        vo2 = generic.get("vo2MaxPreciseValue") or generic.get("vo2MaxValue")
        if vo2 is not None:
            metric.vo2max = float(vo2)
            updated = True
    except Exception as e:
        logger.debug("Training status fetch error: %s", e)

    if updated or db.get(DailyMetric, d) is None:
        db.merge(metric)
