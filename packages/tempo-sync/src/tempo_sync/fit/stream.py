from __future__ import annotations

from datetime import datetime
from typing import TypedDict


class StreamPoint(TypedDict, total=False):
    t_offset_s: int
    latitude: float | None
    longitude: float | None
    altitude_m: float | None
    distance_m: float | None
    hr: int | None
    speed_mps: float | None
    cadence: int | None
    power_w: int | None
    temperature_c: float | None
    vertical_osc_cm: float | None
    ground_contact_ms: int | None
    stride_length_m: float | None
    balance_pct: float | None


def normalise(records: list[dict]) -> list[StreamPoint]:
    """Convert raw FIT records to normalised StreamPoints with t_offset_s from start."""
    if not records:
        return []

    # Find start timestamp
    first_ts = None
    for r in records:
        if r.get("timestamp"):
            first_ts = r["timestamp"]
            break
    if first_ts is None:
        return []

    points: list[StreamPoint] = []
    for r in records:
        ts = r.get("timestamp")
        if ts is None:
            continue
        if isinstance(ts, datetime):
            delta = int((ts - first_ts).total_seconds())
        else:
            delta = int(ts - first_ts)

        lat = r.get("position_lat")
        lon = r.get("position_long")
        if lat is not None:
            lat = lat * (180.0 / 2**31)
        if lon is not None:
            lon = lon * (180.0 / 2**31)

        speed = r.get("speed") or r.get("enhanced_speed")
        alt = r.get("altitude") or r.get("enhanced_altitude")

        points.append(
            StreamPoint(
                t_offset_s=delta,
                latitude=lat,
                longitude=lon,
                altitude_m=float(alt) if alt is not None else None,
                distance_m=float(r["distance"]) if r.get("distance") is not None else None,
                hr=int(r["heart_rate"]) if r.get("heart_rate") is not None else None,
                speed_mps=float(speed) if speed is not None else None,
                cadence=int(r["cadence"]) if r.get("cadence") is not None else None,
                power_w=int(r["power"]) if r.get("power") is not None else None,
                temperature_c=float(r["temperature"]) if r.get("temperature") is not None else None,
                vertical_osc_cm=float(r["vertical_oscillation"]) if r.get("vertical_oscillation") is not None else None,
                ground_contact_ms=int(r["stance_time"]) if r.get("stance_time") is not None else None,
                stride_length_m=float(r["stride_length"]) if r.get("stride_length") is not None else None,
                balance_pct=float(r["left_right_balance"]) if r.get("left_right_balance") is not None else None,
            )
        )
    return points


def lttb(data: list[float | None], target: int) -> list[float | None]:
    """Largest Triangle Three Buckets downsampling — preserves visual peaks."""
    n = len(data)
    if n <= target:
        return data

    # Replace None with linear interpolation for the algorithm, then put None back
    filled = _fill_nones(data)
    sampled_indices = _lttb_indices(filled, target)
    return [data[i] for i in sampled_indices]


def _fill_nones(data: list[float | None]) -> list[float]:
    result = [0.0] * len(data)
    last = 0.0
    for i, v in enumerate(data):
        result[i] = v if v is not None else last
        if v is not None:
            last = v
    return result


def _lttb_indices(data: list[float], target: int) -> list[int]:
    n = len(data)
    if n <= target:
        return list(range(n))

    indices = [0]
    bucket_size = (n - 2) / (target - 2)

    a = 0
    for i in range(1, target - 1):
        avg_range_start = int((i + 1) * bucket_size) + 1
        avg_range_end = min(int((i + 2) * bucket_size) + 1, n)
        avg_x = (avg_range_start + avg_range_end - 1) / 2.0
        avg_y = sum(data[avg_range_start:avg_range_end]) / (avg_range_end - avg_range_start)

        range_start = int(i * bucket_size) + 1
        range_end = min(int((i + 1) * bucket_size) + 1, n)

        point_ax = a
        point_ay = data[a]

        max_area = -1.0
        max_idx = range_start
        for j in range(range_start, range_end):
            area = abs(
                (point_ax - avg_x) * (data[j] - point_ay)
                - (point_ax - j) * (avg_y - point_ay)
            ) * 0.5
            if area > max_area:
                max_area = area
                max_idx = j

        indices.append(max_idx)
        a = max_idx

    indices.append(n - 1)
    return indices


def downsample(points: list[StreamPoint], target: int = 600) -> list[StreamPoint]:
    if len(points) <= target:
        return points
    indices = _lttb_indices(_fill_nones([p.get("hr") or 0.0 for p in points]), target)
    return [points[i] for i in indices]


def derive_hr_zone(hr: int, max_hr: int) -> int:
    pct = hr / max_hr
    if pct < 0.60:
        return 1
    elif pct < 0.70:
        return 2
    elif pct < 0.80:
        return 3
    elif pct < 0.90:
        return 4
    return 5
