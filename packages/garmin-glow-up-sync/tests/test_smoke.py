"""Smoke tests — import & instantiation only, no network."""


def test_settings_defaults():
    from garmin_glow_up.settings import Settings
    s = Settings()
    assert s.api_port == 8765
    assert s.sync.interval_hours == 2


def test_token_store_roundtrip(monkeypatch):
    """TokenStore uses keyring — monkeypatch to avoid touching the OS keychain."""
    stored: dict[str, str] = {}

    monkeypatch.setattr("keyring.set_password", lambda svc, key, val: stored.__setitem__(key, val))
    monkeypatch.setattr("keyring.get_password", lambda svc, key: stored.get(key))

    from garmin_glow_up.auth.tokens import TokenStore
    ts = TokenStore()
    ts.save({"access_token": "abc"})
    result = ts.load()
    assert result == {"access_token": "abc"}


def test_fit_parse_empty():
    """parse() on empty bytes raises — just check it imports cleanly."""
    from garmin_glow_up.fit import (
        parse,  # noqa: F401
        stream,  # noqa: F401
    )


def test_load_compute_no_crash(tmp_path, monkeypatch):
    """compute_load with no data should complete without error."""
    monkeypatch.setenv("TEMPO_STORAGE__DB_PATH", str(tmp_path / "test.db"))
    import garmin_glow_up.settings as settings_mod
    settings_mod._settings = None  # reset singleton

    # reset engine singleton
    import garmin_glow_up.db.session as sess_mod
    from garmin_glow_up.db.models import Base
    from garmin_glow_up.db.session import get_engine, get_session_factory
    sess_mod._engine = None
    sess_mod._SessionLocal = None

    engine = get_engine()
    Base.metadata.create_all(engine)
    db = get_session_factory()()
    try:
        from garmin_glow_up.sync.load import compute_load
        compute_load(db=db, days_back=7)
        db.commit()
    finally:
        db.close()
