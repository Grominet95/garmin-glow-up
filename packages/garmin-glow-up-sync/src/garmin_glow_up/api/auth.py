from __future__ import annotations

from fastapi import APIRouter

from garmin_glow_up.api.deps import TokenDep
from garmin_glow_up.auth.tokens import TokenStore

router = APIRouter(prefix="/auth")


@router.post("/logout", status_code=204)
def logout(_token: TokenDep) -> None:
    TokenStore().clear()
