from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import Dispute, EscrowContract, Evidence
from ..schemas import DisputeSummaryResponse, EvidenceCreate
from ..services.gemini_service import gemini_service

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/disputes", tags=["disputes"])


def read_dispute(dispute: Dispute) -> dict:
    return {
        "id": dispute.id,
        "contract_id": dispute.contract_id,
        "chain_case_id": dispute.chain_case_id,
        "status": dispute.status,
        "summary": dispute.summary,
        "resolved_to_freelancer": dispute.resolved_to_freelancer,
        "created_at": dispute.created_at,
    }


@router.get("")
async def list_disputes(wallet_address: str | None = Query(default=None), session: AsyncSession = Depends(get_session)) -> list[dict]:
    statement = select(Dispute).join(EscrowContract).order_by(Dispute.created_at.desc())
    if wallet_address:
        statement = statement.where(or_(EscrowContract.client_address == wallet_address, EscrowContract.freelancer_address == wallet_address))
    return [read_dispute(item) for item in (await session.scalars(statement)).all()]


@router.post("/{dispute_id}/evidence", status_code=201)
async def add_evidence(dispute_id: str, payload: EvidenceCreate, session: AsyncSession = Depends(get_session)) -> dict:
    dispute = await session.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(404, "Dispute not found")
    contract = await session.get(EscrowContract, dispute.contract_id)
    if not contract or payload.party_address not in (contract.client_address, contract.freelancer_address):
        raise HTTPException(403, "Only a contract party can submit evidence for this dispute.")
    evidence = Evidence(dispute_id=dispute.id, party_address=payload.party_address, body=payload.body)
    session.add(evidence)
    await session.commit()
    return {"id": evidence.id, "dispute_id": evidence.dispute_id, "party_address": evidence.party_address, "body": evidence.body}


@router.post("/{dispute_id}/summary", response_model=DisputeSummaryResponse)
@limiter.limit("10/minute")
async def summarize_dispute(request: Request, dispute_id: str, session: AsyncSession = Depends(get_session)) -> DisputeSummaryResponse:
    dispute = await session.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(404, "Dispute not found")
    contract = await session.get(EscrowContract, dispute.contract_id)
    if not contract:
        raise HTTPException(409, "Dispute has no associated contract record.")
    evidence = list((await session.scalars(select(Evidence).where(Evidence.dispute_id == dispute_id))).all())
    client = [item.body for item in evidence if item.party_address == contract.client_address]
    freelancer = [item.body for item in evidence if item.party_address == contract.freelancer_address]
    try:
        summary = await gemini_service.summarize_dispute(client, freelancer)
    except Exception as exc:
        raise HTTPException(503, "AI dispute summarization is temporarily unavailable. No summary was generated.") from exc
    dispute.summary = summary
    await session.commit()
    return DisputeSummaryResponse(summary=summary)
