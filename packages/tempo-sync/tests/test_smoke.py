"""Smoke tests — import & instantiation only, no network."""


def test_settings_defaults():
    from tempo_sync.settings import Settings
    s = Settings()
    assert s.api_port == 8765
    assert s.sync.interval_hours == 2


def test_token_store_roundtrip(monkeypatch):
    """TokenStore uses keyring — monkeypatch to avoid touching the OS keychain."""
    stored: dict[str, str] = {}

    monkeypatch.setattr("keyring.set_password", lambda svc, key, val: stored.__setitem__(key, val))
    monkeypatch.setattr("keyring.get_password", lambda svc, key: stored.get(key))

    from tempo_sync.auth.tokens import TokenStore
    ts = TokenStore()
    ts.save({"access_token": "abc"})
    result = ts.load()
    assert result == {"access_token": "abc"}


def test_fit_parse_empty():
    """parse() on empty bytes raises — just check it imports cleanly."""
    from tempo_sync.fit import (
        parse,  # noqa: F401
        stream,  # noqa: F401
    )


def test_load_compute_no_crash(tmp_path, monkeypatch):
    """compute_load with no data should complete without error."""
    monkeypatch.setenv("TEMPO_STORAGE__DB_PATH", str(tmp_path / "test.db"))
    import tempo_sync.settings as settings_mod
    settings_mod._settings = None  # reset singleton

    # reset engine singleton
    import tempo_sync.db.session as sess_mod
    from tempo_sync.db.models import Base
    from tempo_sync.db.session import get_engine, get_session_factory
    sess_mod._engine = None
    sess_mod._SessionLocal = None

    engine = get_engine()
    Base.metadata.create_all(engine)
    db = get_session_factory()()
    try:
        from tempo_sync.sync.load import compute_load
        compute_load(db=db, days_back=7)
        db.commit()
    finally:
        db.close()
