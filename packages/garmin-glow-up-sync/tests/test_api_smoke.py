"""API smoke — create_app() and hit a few endpoints with an in-memory DB."""
import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def tmp_db(tmp_path, monkeypatch):
    monkeypatch.setenv("TEMPO_STORAGE__DB_PATH", str(tmp_path / "test.db"))
    import garmin_glow_up.db.session as sess_mod
    import garmin_glow_up.settings as settings_mod
    sess_mod._engine = None
    sess_mod._SessionLocal = None
    settings_mod._settings = None
    yield
    sess_mod._engine = None
    sess_mod._SessionLocal = None
    settings_mod._settings = None


@pytest.fixture
async def client(tmp_db):
    from garmin_glow_up.api.app import create_app
    from garmin_glow_up.db.models import Base
    from garmin_glow_up.db.session import get_engine

    app, token = create_app()
    Base.metadata.create_all(bind=get_engine())

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        c.headers["X-Tempo-Token"] = token
        yield c


@pytest.mark.asyncio
async def test_dashboard_empty(client):
    r = await client.get("/dashboard")
    assert r.status_code == 200
    body = r.json()
    assert body["state"] == "empty"


@pytest.mark.asyncio
async def test_activities_empty(client):
    r = await client.get("/activities")
    assert r.status_code == 200
    assert r.json()["items"] == []


@pytest.mark.asyncio
async def test_calendar_empty(client):
    r = await client.get("/calendar")
    assert r.status_code == 200
    assert r.json()["cells"] == []
