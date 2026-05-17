from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from garmin_glow_up.settings import get_settings

_engine = None
_SessionLocal = None


def _apply_pragmas(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode = WAL")
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.execute("PRAGMA synchronous = NORMAL")
    cursor.execute("PRAGMA temp_store = MEMORY")
    cursor.execute("PRAGMA mmap_size = 268435456")
    cursor.execute("PRAGMA cache_size = -32000")
    cursor.close()


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        db_path: Path = settings.storage.db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(f"sqlite:///{db_path}", echo=False)
        event.listen(_engine, "connect", _apply_pragmas)
        from garmin_glow_up.db.models import Base
        Base.metadata.create_all(_engine)
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), class_=Session)
    return _SessionLocal


def get_db() -> Session:
    factory = get_session_factory()
    return factory()
