from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, literal, select, union
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import get_session
from ..models import AdminAuthChallenge, ContractEvent, Dispute, EscrowContract, User
from ..schemas import AdminChallengeRequest, AdminMetricsRead, AdminSessionRequest
from ..services.admin_auth import as_utc, issue_admin_token, issue_challenge_message, new_nonce, require_admin, utc_now, verify_freighter_signature

router = APIRouter(prefix="/api/admin", tags=["admin"])


def ensure_admin_wallet(wallet_address: str) -> None:
    settings = get_settings()
    if not settings.admin_wallets:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin access is not configured. Set ADMIN_WALLET_ADDRESSES in Vercel.")
    if wallet_address not in settings.admin_wallets:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This Freighter wallet is not authorized to view Meridian operations.")


@router.post("/challenge")
async def create_challenge(payload: AdminChallengeRequest, response: Response, session: AsyncSession = Depends(get_session)) -> dict:
    ensure_admin_wallet(payload.wallet_address)
    expires_at = utc_now() + timedelta(minutes=5)
    challenge = AdminAuthChallenge(wallet_address=payload.wallet_address, nonce=new_nonce(), expires_at=expires_at)
    session.add(challenge)
    await session.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"challenge_id": challenge.id, "message": issue_challenge_message(challenge.wallet_address, challenge.nonce, expires_at), "expires_at": expires_at}


@router.post("/session")
async def create_session(payload: AdminSessionRequest, response: Response, session: AsyncSession = Depends(get_session)) -> dict:
    ensure_admin_wallet(payload.wallet_address)
    challenge = await session.get(AdminAuthChallenge, payload.challenge_id, with_for_update=True)
    if not challenge or challenge.wallet_address != payload.wallet_address or challenge.consumed_at or as_utc(challenge.expires_at) <= utc_now():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This admin challenge is invalid or has expired. Request a new one.")
    verify_freighter_signature(payload.wallet_address, issue_challenge_message(challenge.wallet_address, challenge.nonce, challenge.expires_at), payload.signature)
    challenge.consumed_at = utc_now()
    token, expires_at = issue_admin_token(payload.wallet_address)
    await session.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"access_token": token, "expires_at": expires_at}


@router.get("/metrics", response_model=AdminMetricsRead)
async def get_metrics(response: Response, limit: int = Query(default=12, ge=1, le=50), _: str = Depends(require_admin), session: AsyncSession = Depends(get_session)) -> dict:
    deployment_transactions = select(EscrowContract.deployment_transaction_hash.label("transaction_hash")).where(EscrowContract.deployment_transaction_hash.is_not(None))
    indexed_transactions = select(ContractEvent.transaction_hash.label("transaction_hash"))
    transaction_rows = union(deployment_transactions, indexed_transactions).subquery()
    activity_rows = union(
        select(
            ContractEvent.transaction_hash.label("transaction_hash"),
            ContractEvent.event_type.label("event_type"),
            ContractEvent.contract_address.label("contract_address"),
            literal(None).label("wallet_address"),
            ContractEvent.observed_at.label("occurred_at"),
        ),
        select(
            EscrowContract.deployment_transaction_hash.label("transaction_hash"),
            literal("escrow_deployed").label("event_type"),
            EscrowContract.chain_address.label("contract_address"),
            EscrowContract.client_address.label("wallet_address"),
            EscrowContract.created_at.label("occurred_at"),
        ).where(EscrowContract.deployment_transaction_hash.is_not(None)),
    ).subquery()
    metric_result = await session.execute(
        select(
            func.count(User.id),
            select(func.count()).select_from(transaction_rows).scalar_subquery(),
            select(func.count()).select_from(EscrowContract).where(EscrowContract.status == "active").scalar_subquery(),
            select(func.count()).select_from(Dispute).where(Dispute.status == "open").scalar_subquery(),
        )
    )
    registered_wallets, confirmed_transactions, active_escrows, open_disputes = metric_result.one()
    status_rows = (await session.execute(select(EscrowContract.status, func.count(EscrowContract.id)).group_by(EscrowContract.status).order_by(EscrowContract.status))).all()
    recent_activity = (await session.execute(select(activity_rows).order_by(activity_rows.c.occurred_at.desc()).limit(limit))).mappings().all()
    response.headers["Cache-Control"] = "no-store"
    return {
        "registered_wallets": registered_wallets,
        "confirmed_transactions": confirmed_transactions,
        "active_escrows": active_escrows,
        "open_disputes": open_disputes,
        "status_distribution": [{"status": item[0], "count": item[1]} for item in status_rows],
        "recent_activity": [dict(item) for item in recent_activity],
        "generated_at": utc_now(),
    }
