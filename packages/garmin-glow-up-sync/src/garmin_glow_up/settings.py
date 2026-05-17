from __future__ import annotations

import tomllib
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_CONFIG_PATH = Path.home() / ".garmin-glow-up" / "config.toml"


def _load_toml() -> dict:
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH, "rb") as f:
            return tomllib.load(f)
    return {}


class SyncSettings(BaseSettings):
    interval_hours: int = 2
    units: Literal["metric", "imperial"] = "metric"
    locale: str = "en_US"


class AthleteSettings(BaseSettings):
    max_hr: int = 190
    resting_hr: int = 50
    ftp: int | None = None
    threshold_pace_s_per_km: int | None = None
    zones_method: Literal["lthr", "max-hr", "ltp"] = "max-hr"


class ApiSettings(BaseSettings):
    bind: str = "127.0.0.1:8765"
    log_level: str = "info"


class StorageSettings(BaseSettings):
    db_path: Path = Path.home() / ".garmin-glow-up" / "garmin-glow-up.db"
    fit_cache: Path = Path.home() / ".garmin-glow-up" / "fit"
    prune_days: int = 365


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GGU_", env_nested_delimiter="__")

    sync: SyncSettings = Field(default_factory=SyncSettings)
    athlete: AthleteSettings = Field(default_factory=AthleteSettings)
    api: ApiSettings = Field(default_factory=ApiSettings)
    storage: StorageSettings = Field(default_factory=StorageSettings)

    @property
    def api_host(self) -> str:
        return self.api.bind.split(":")[0]

    @property
    def api_port(self) -> int:
        parts = self.api.bind.split(":")
        return int(parts[1]) if len(parts) > 1 else 8765


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
