from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from tempo_sync.db.session import get_db

_api_token: str | None = None


def set_api_token(token: str) -> None:
    global _api_token
    _api_token = token


def require_token(
    x_tempo_token: Annotated[str | None, Header()] = None,
    token: Annotated[str | None, Query()] = None,
) -> None:
    # Accept token via header (fetch) or query param (EventSource which can't send headers)
    provided = x_tempo_token or token
    if _api_token and provided != _api_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def db_session() -> Session:
    db = get_db()
    try:
        yield db
    finally:
        db.close()


DbDep = Annotated[Session, Depends(db_session)]
TokenDep = Annotated[None, Depends(require_token)]
