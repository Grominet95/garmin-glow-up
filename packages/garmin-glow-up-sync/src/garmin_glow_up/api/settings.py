from __future__ import annotations

import tomllib
from pathlib import Path
from typing import Literal

import tomli_w
from fastapi import APIRouter
from pydantic import BaseModel

from garmin_glow_up.api.deps import TokenDep

router = APIRouter(prefix="/settings")

_CONFIG_PATH = Path.home() / ".garmin-glow-up" / "config.toml"


def _read_toml() -> dict:
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH, "rb") as f:
            return tomllib.load(f)
    return {}


def _write_toml(data: dict) -> None:
    _CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_CONFIG_PATH, "wb") as f:
        tomli_w.dump(data, f)


class AthleteOut(BaseModel):
    maxHr: int
    restingHr: int
    ftp: int | None


class SettingsOut(BaseModel):
    units: Literal["metric", "imperial"]
    syncIntervalHours: int
    athlete: AthleteOut


class AthleteIn(BaseModel):
    maxHr: int | None = None
    restingHr: int | None = None
    ftp: int | None = None


class SettingsPatch(BaseModel):
    units: Literal["metric", "imperial"] | None = None
    syncIntervalHours: int | None = None
    athlete: AthleteIn | None = None


def _current_settings_out() -> SettingsOut:
    import garmin_glow_up.settings as m
    m._settings = None
    s = m.get_settings()
    return SettingsOut(
        units=s.sync.units,
        syncIntervalHours=s.sync.interval_hours,
        athlete=AthleteOut(maxHr=s.athlete.max_hr, restingHr=s.athlete.resting_hr, ftp=s.athlete.ftp),
    )


@router.get("")
async def get_settings_endpoint(_token: TokenDep) -> SettingsOut:
    return _current_settings_out()


@router.patch("")
async def patch_settings(_token: TokenDep, body: SettingsPatch) -> SettingsOut:
    raw = _read_toml()

    if body.units is not None:
        raw.setdefault("sync", {})["units"] = body.units
    if body.syncIntervalHours is not None:
        raw.setdefault("sync", {})["interval_hours"] = body.syncIntervalHours
    if body.athlete is not None:
        athlete = raw.setdefault("athlete", {})
        if body.athlete.maxHr is not None:
            athlete["max_hr"] = body.athlete.maxHr
        if body.athlete.restingHr is not None:
            athlete["resting_hr"] = body.athlete.restingHr
        if body.athlete.ftp is not None:
            athlete["ftp"] = body.athlete.ftp

    _write_toml(raw)
    return _current_settings_out()


class ProfileOut(BaseModel):
    displayName: str | None
    fullName: str | None
    avatarUrl: str | None


@router.get("/profile")
async def get_profile(_token: TokenDep) -> ProfileOut:
    try:
        from garmin_glow_up.auth.tokens import TokenStore
        from garmin_glow_up.garmin.client import GarminClient

        client = GarminClient(TokenStore())
        if not client.resume():
            return ProfileOut(displayName=None, fullName=None, avatarUrl=None)
        p = client._require().client.connectapi("/userprofile-service/socialProfile")
        return ProfileOut(
            displayName=p.get("userName"),
            fullName=p.get("fullName") or p.get("userProfileFullName"),
            avatarUrl=p.get("profileImageUrlMedium"),
        )
    except Exception:
        return ProfileOut(displayName=None, fullName=None, avatarUrl=None)
