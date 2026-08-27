from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import User

router = APIRouter(prefix="/api/reputation", tags=["reputation"])


@router.get("/{address}")
async def get_reputation(address: str, session: AsyncSession = Depends(get_session)) -> dict:
    user = await session.scalar(select(User).where(User.wallet_address == address))
    if not user:
        raise HTTPException(404, "Reputation profile not found")
    return {"address": user.wallet_address, "score": user.reputation_score, "display_name": user.display_name}
