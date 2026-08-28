"""Vercel-scheduled maintenance endpoints. These are never browser-facing."""

import hmac

from fastapi import APIRouter, Header, HTTPException, status

from ..config import get_settings
from ..db import get_session_factory
from ..services.soroban_indexer import SorobanIndexer

router = APIRouter(prefix="/api/internal", tags=["internal"])


@router.get("/index-events")
async def index_events(authorization: str | None = Header(default=None)) -> dict:
    secret = get_settings().cron_secret
    expected = f"Bearer {secret}" if secret else None
    if not expected or not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized scheduled task.")
    indexer = SorobanIndexer(get_session_factory())
    stored = await indexer.poll_once()
    return {"status": "ok", "stored_events": stored}
