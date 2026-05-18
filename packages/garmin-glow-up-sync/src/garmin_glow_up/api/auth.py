from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from garmin_glow_up.api.deps import TokenDep
from garmin_glow_up.api.sync import broadcast_mfa_required
from garmin_glow_up.auth.login import login
from garmin_glow_up.auth.mfa import AsyncMfaGate
from garmin_glow_up.auth.tokens import TokenStore

router = APIRouter(prefix="/auth")

_mfa_gate: AsyncMfaGate | None = None


class LoginBody(BaseModel):
    email: str
    password: str


class MfaBody(BaseModel):
    code: str


@router.get("/status")
def auth_status(_token: TokenDep):
    return {"authenticated": TokenStore().load() is not None}


@router.post("/login")
async def garmin_login(body: LoginBody, _token: TokenDep):
    global _mfa_gate

    loop = asyncio.get_running_loop()
    gate = AsyncMfaGate(loop)
    _mfa_gate = gate

    def on_mfa_waiting():
        asyncio.run_coroutine_threadsafe(broadcast_mfa_required(), loop)

    callback = gate.make_callback(on_waiting=on_mfa_waiting)

    try:
        await loop.run_in_executor(
            None,
            lambda: login(body.email, body.password, mfa_callback=callback),
        )
    except Exception as e:
        _mfa_gate = None
        raise HTTPException(status_code=400, detail=str(e))

    _mfa_gate = None
    return {"status": "ok"}


@router.post("/mfa")
async def submit_mfa(body: MfaBody, _token: TokenDep):
    if _mfa_gate is None:
        raise HTTPException(status_code=400, detail="No MFA challenge in progress")
    _mfa_gate.submit(body.code)
    return {"status": "ok"}


@router.post("/logout", status_code=204)
def logout(_token: TokenDep) -> None:
    TokenStore().clear()
