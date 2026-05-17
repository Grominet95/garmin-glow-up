from __future__ import annotations

from fastapi import APIRouter

from tempo_sync.api.deps import TokenDep
from tempo_sync.auth.tokens import TokenStore

router = APIRouter(prefix="/auth")


@router.post("/logout", status_code=204)
def logout(_token: TokenDep) -> None:
    TokenStore().clear()
