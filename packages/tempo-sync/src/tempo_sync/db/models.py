from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Athlete(Base):
    __tablename__ = "athlete"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    garmin_user_id: Mapped[str | None] = mapped_column(Text)
    max_hr: Mapped[int | None] = mapped_column(Integer)
    resting_hr: Mapped[int | None] = mapped_column(Integer)
    ftp: Mapped[int | None] = mapped_column(Integer)
    threshold_pace_s_per_km: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    birth_date: Mapped[date | None] = mapped_column(Date)
    sex: Mapped[str | None] = mapped_column(String(1))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        Index("idx_activities_start", "start_time"),
        Index("idx_activities_sport_start", "sport", "start_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sport: Mapped[str] = mapped_column(String(20))
    sub_sport: Mapped[str | None] = mapped_column(String(40))
    start_time: Mapped[datetime] = mapped_column(DateTime)
    start_time_local: Mapped[datetime | None] = mapped_column(DateTime)
    timezone: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    distance_m: Mapped[float | None] = mapped_column(Float)
    duration_s: Mapped[int | None] = mapped_column(Integer)
    elapsed_s: Mapped[int | None] = mapped_column(Integer)
    avg_hr: Mapped[int | None] = mapped_column(Integer)
    max_hr: Mapped[int | None] = mapped_column(Integer)
    avg_pace_s_per_km: Mapped[float | None] = mapped_column(Float)
    avg_speed_mps: Mapped[float | None] = mapped_column(Float)
    avg_cadence: Mapped[int | None] = mapped_column(Integer)
    avg_power_w: Mapped[int | None] = mapped_column(Integer)
    np_w: Mapped[int | None] = mapped_column(Integer)
    tss: Mapped[float | None] = mapped_column(Float)
    intensity_factor: Mapped[float | None] = mapped_column(Float)
    elevation_gain_m: Mapped[float | None] = mapped_column(Float)
    elevation_loss_m: Mapped[float | None] = mapped_column(Float)
    calories_kcal: Mapped[int | None] = mapped_column(Integer)
    training_effect_aerobic: Mapped[float | None] = mapped_column(Float)
    training_effect_anaerobic: Mapped[float | None] = mapped_column(Float)
    training_effect_label: Mapped[str | None] = mapped_column(Text)
    epoc: Mapped[float | None] = mapped_column(Float)
    recovery_time_h: Mapped[int | None] = mapped_column(Integer)
    route_polyline: Mapped[str | None] = mapped_column(Text)
    start_lat: Mapped[float | None] = mapped_column(Float)
    start_lon: Mapped[float | None] = mapped_column(Float)
    weather_temp_c: Mapped[float | None] = mapped_column(Float)
    weather_wind_kph: Mapped[float | None] = mapped_column(Float)
    weather_label: Mapped[str | None] = mapped_column(Text)
    device: Mapped[str | None] = mapped_column(Text)
    has_dynamics: Mapped[bool] = mapped_column(Boolean, default=False)
    has_power: Mapped[bool] = mapped_column(Boolean, default=False)
    fit_path: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    streams: Mapped[list[ActivityStream]] = relationship(
        back_populates="activity", cascade="all, delete-orphan"
    )
    laps: Mapped[list[ActivityLap]] = relationship(
        back_populates="activity", cascade="all, delete-orphan"
    )
    zones: Mapped[list[ActivityZone]] = relationship(
        back_populates="activity", cascade="all, delete-orphan"
    )


class ActivityStream(Base):
    __tablename__ = "activity_streams"
    __table_args__ = (
        Index("idx_streams_activity", "activity_id"),
        {"sqlite_with_rowid": False},
    )

    activity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True
    )
    t_offset_s: Mapped[int] = mapped_column(Integer, primary_key=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    altitude_m: Mapped[float | None] = mapped_column(Float)
    distance_m: Mapped[float | None] = mapped_column(Float)
    hr: Mapped[int | None] = mapped_column(Integer)
    speed_mps: Mapped[float | None] = mapped_column(Float)
    cadence: Mapped[int | None] = mapped_column(Integer)
    power_w: Mapped[int | None] = mapped_column(Integer)
    temperature_c: Mapped[float | None] = mapped_column(Float)
    vertical_osc_cm: Mapped[float | None] = mapped_column(Float)
    ground_contact_ms: Mapped[int | None] = mapped_column(Integer)
    stride_length_m: Mapped[float | None] = mapped_column(Float)
    balance_pct: Mapped[float | None] = mapped_column(Float)

    activity: Mapped[Activity] = relationship(back_populates="streams")


class ActivityLap(Base):
    __tablename__ = "activity_laps"
    __table_args__ = (Index("idx_laps_activity", "activity_id", "idx"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("activities.id", ondelete="CASCADE")
    )
    idx: Mapped[int] = mapped_column(Integer)
    label: Mapped[str | None] = mapped_column(Text)
    t_offset_s: Mapped[int | None] = mapped_column(Integer)
    duration_s: Mapped[int | None] = mapped_column(Integer)
    distance_m: Mapped[float | None] = mapped_column(Float)
    avg_hr: Mapped[int | None] = mapped_column(Integer)
    avg_pace_s_per_km: Mapped[float | None] = mapped_column(Float)
    avg_cadence: Mapped[int | None] = mapped_column(Integer)
    avg_power_w: Mapped[int | None] = mapped_column(Integer)
    elev_gain_m: Mapped[float | None] = mapped_column(Float)
    elev_loss_m: Mapped[float | None] = mapped_column(Float)
    hr_zone: Mapped[int | None] = mapped_column(Integer)

    activity: Mapped[Activity] = relationship(back_populates="laps")


class ActivityZone(Base):
    __tablename__ = "activity_zones"
    __table_args__ = (Index("idx_zones_activity", "activity_id"),)

    activity_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True
    )
    zone_type: Mapped[str] = mapped_column(String(10), primary_key=True)
    zone: Mapped[int] = mapped_column(Integer, primary_key=True)
    seconds: Mapped[int] = mapped_column(Integer)

    activity: Mapped[Activity] = relationship(back_populates="zones")


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    resting_hr: Mapped[int | None] = mapped_column(Integer)
    hrv_overnight: Mapped[int | None] = mapped_column(Integer)
    sleep_score: Mapped[int | None] = mapped_column(Integer)
    sleep_seconds: Mapped[int | None] = mapped_column(Integer)
    sleep_deep_s: Mapped[int | None] = mapped_column(Integer)
    sleep_rem_s: Mapped[int | None] = mapped_column(Integer)
    sleep_light_s: Mapped[int | None] = mapped_column(Integer)
    sleep_awake_s: Mapped[int | None] = mapped_column(Integer)
    sleep_start: Mapped[datetime | None] = mapped_column(DateTime)
    sleep_end: Mapped[datetime | None] = mapped_column(DateTime)
    body_battery_high: Mapped[int | None] = mapped_column(Integer)
    body_battery_low: Mapped[int | None] = mapped_column(Integer)
    body_battery_charged: Mapped[int | None] = mapped_column(Integer)
    stress_avg: Mapped[int | None] = mapped_column(Integer)
    spo2_avg: Mapped[int | None] = mapped_column(Integer)
    steps: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    vo2max: Mapped[float | None] = mapped_column(Float)
    vibe_word: Mapped[str | None] = mapped_column(Text)
    readiness_score: Mapped[int | None] = mapped_column(Integer)
    readiness_level: Mapped[str | None] = mapped_column(String(20))
    readiness_sleep_pct: Mapped[int | None] = mapped_column(Integer)
    readiness_hrv_pct: Mapped[int | None] = mapped_column(Integer)
    readiness_load_pct: Mapped[int | None] = mapped_column(Integer)
    readiness_recovery_pct: Mapped[int | None] = mapped_column(Integer)
    readiness_stress_pct: Mapped[int | None] = mapped_column(Integer)


class DailyLoad(Base):
    __tablename__ = "daily_load"
    __table_args__ = (Index("idx_daily_load_date", "date"),)

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    daily_tss: Mapped[float] = mapped_column(Float, default=0.0)
    ctl: Mapped[float] = mapped_column(Float, default=0.0)
    atl: Mapped[float] = mapped_column(Float, default=0.0)
    tsb: Mapped[float] = mapped_column(Float, default=0.0)
    ramp_rate_pct: Mapped[float | None] = mapped_column(Float)


class SleepStage(Base):
    __tablename__ = "sleep_stages"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    t_offset_min: Mapped[int] = mapped_column(Integer, primary_key=True)
    stage: Mapped[str] = mapped_column(String(10))


class PersonalRecord(Base):
    __tablename__ = "personal_records"
    __table_args__ = (Index("idx_records_metric", "metric", "achieved_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sport: Mapped[str] = mapped_column(String(20))
    metric: Mapped[str] = mapped_column(Text)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))
    activity_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("activities.id", ondelete="SET NULL")
    )
    achieved_at: Mapped[date | None] = mapped_column(Date)
    display_value: Mapped[str | None] = mapped_column(Text)


class CourseBest(Base):
    __tablename__ = "course_bests"

    course_slug: Mapped[str] = mapped_column(Text, primary_key=True)
    activity_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("activities.id", ondelete="SET NULL")
    )
    time_s: Mapped[int | None] = mapped_column(Integer)
    delta_to_prev_s: Mapped[int | None] = mapped_column(Integer)
    achieved_at: Mapped[date | None] = mapped_column(Date)
    name: Mapped[str | None] = mapped_column(Text)


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(Text, unique=True)
    label: Mapped[str] = mapped_column(Text)
    sport: Mapped[str | None] = mapped_column(String(20))
    earned_at: Mapped[date | None] = mapped_column(Date)


class Vo2maxHistory(Base):
    __tablename__ = "vo2max_history"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    sport: Mapped[str] = mapped_column(String(10), primary_key=True)
    value: Mapped[float] = mapped_column(Float)


class RacePrediction(Base):
    __tablename__ = "race_predictions"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    distance: Mapped[str] = mapped_column(String(20), primary_key=True)
    predicted_time_s: Mapped[int] = mapped_column(Integer)


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="running")
    pulled_activities: Mapped[int] = mapped_column(Integer, default=0)
    error_msg: Mapped[str | None] = mapped_column(Text)
