from __future__ import annotations

import os
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from garmin_glow_up.api import deps
from garmin_glow_up.api.activities import router as activities_router
from garmin_glow_up.api.auth import router as auth_router
from garmin_glow_up.api.calendar import router as calendar_router
from garmin_glow_up.api.dashboard import router as dashboard_router
from garmin_glow_up.api.health import router as health_router
from garmin_glow_up.api.load import router as load_router
from garmin_glow_up.api.progress import router as progress_router
from garmin_glow_up.api.settings import router as settings_router
from garmin_glow_up.api.sync import router as sync_router
from garmin_glow_up.db.models import Base
from garmin_glow_up.db.session import get_engine
from garmin_glow_up.scheduler import start_scheduler, stop_scheduler

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

    app = FastAPI(title="garmin-glow-up", version="0.1.0", lifespan=lifespan)

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
        auth_router,
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
