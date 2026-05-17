from __future__ import annotations

import os
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tempo_sync.api import deps
from tempo_sync.api.activities import router as activities_router
from tempo_sync.api.calendar import router as calendar_router
from tempo_sync.api.dashboard import router as dashboard_router
from tempo_sync.api.health import router as health_router
from tempo_sync.api.load import router as load_router
from tempo_sync.api.progress import router as progress_router
from tempo_sync.api.settings import router as settings_router
from tempo_sync.api.sync import router as sync_router
from tempo_sync.db.models import Base
from tempo_sync.db.session import get_engine
from tempo_sync.scheduler import start_scheduler, stop_scheduler

_DEV_TOKEN = "dev-token"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=get_engine())
    start_scheduler()
    yield
    stop_scheduler()


def create_app() -> tuple[FastAPI, str]:
    dev_mode = os.environ.get("TEMPO_DEV_SIDECAR") == "external"
    token = _DEV_TOKEN if dev_mode else secrets.token_hex(16)
    if not dev_mode:
        deps.set_api_token(token)

    app = FastAPI(title="tempo-sync", version="0.1.0", lifespan=lifespan)

    origins = (
        ["*"] if dev_mode
        else ["tauri://localhost", "https://tauri.localhost"]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=not dev_mode,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in [
        dashboard_router,
        activities_router,
        load_router,
        calendar_router,
        health_router,
        progress_router,
        settings_router,
        sync_router,
    ]:
        app.include_router(router)

    return app, token
