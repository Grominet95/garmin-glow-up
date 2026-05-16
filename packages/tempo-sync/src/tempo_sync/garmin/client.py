from __future__ import annotations

import json
from collections.abc import Callable

from garminconnect import Garmin

from tempo_sync.auth.tokens import TokenStore


class GarminClient:
    """The ONLY file that imports python-garminconnect. Swap the lib here in < 50 LOC."""

    def __init__(self, store: TokenStore) -> None:
        self._store = store
        self._api: Garmin | None = None

    def login(self, email: str, password: str, mfa: Callable[[], str] | None = None) -> None:
        api = Garmin(email, password, prompt_mfa=mfa or (lambda: ""))
        api.login()
        self._store.save(json.loads(api.client.dumps()))
        self._api = api

    def resume(self) -> bool:
        tokens = self._store.load()
        if not tokens:
            return False
        self._api = Garmin()
        self._api.login(tokenstore=json.dumps(tokens))
        return True

    def _require(self) -> Garmin:
        if self._api is None:
            if not self.resume():
                raise RuntimeError("Not authenticated. Run `tempo-sync auth login` first.")
        return self._api  # type: ignore[return-value]

    def activities(self, start: int = 0, limit: int = 20) -> list[dict]:
        return self._require().get_activities(start, limit)

    def activity_details(self, activity_id: int) -> dict:
        return self._require().get_activity(activity_id)

    def activity_fit(self, activity_id: int) -> bytes:
        return self._require().download_activity(
            activity_id, dl_fmt=Garmin.ActivityDownloadFormat.ORIGINAL
        )

    def sleep_data(self, date_str: str) -> dict:
        return self._require().get_sleep_data(date_str)

    def hrv_data(self, date_str: str) -> dict:
        return self._require().get_hrv_data(date_str)

    def body_battery(self, start_date: str, end_date: str) -> list[dict]:
        return self._require().get_body_battery(start_date, end_date)

    def body_composition(self, start_date: str, end_date: str) -> dict:
        return self._require().get_body_composition(start_date, end_date)

    def user_profile(self) -> dict:
        return self._require().get_user_profile()

    def race_predictions(self) -> dict:
        return self._require().get_race_predictions()

    def training_readiness(self, date_str: str) -> list[dict]:
        return self._require().get_training_readiness(date_str) or []

    def personal_records(self) -> list[dict]:
        return self._require().get_personal_record()

    def user_summary(self, date_str: str) -> dict:
        return self._require().get_user_summary(date_str)

    def spo2_data(self, date_str: str) -> dict:
        return self._require().get_spo2_data(date_str)

    def training_status(self, date_str: str) -> dict:
        return self._require().get_training_status(date_str) or {}
