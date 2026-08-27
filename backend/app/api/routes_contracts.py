import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ..config import get_settings
from ..db import get_session
from ..models import ContractEvent, EscrowContract, Milestone, User
from ..schemas import ContractCreate, ContractDetailRead, ContractEventRead, ContractRead, MilestoneRead

router = APIRouter(prefix="/api/contracts", tags=["contracts"])


async def confirmed_transaction(transaction_hash: str) -> bool:
    settings = get_settings()
    payload = {"jsonrpc": "2.0", "id": "meridian-contract-verification", "method": "getTransaction", "params": {"hash": transaction_hash}}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(settings.soroban_rpc_url, json=payload)
            response.raise_for_status()
        return response.json().get("result", {}).get("status") == "SUCCESS"
    except httpx.HTTPError as exc:
        raise HTTPException(503, "Unable to verify the Stellar transaction. Try again after the network is reachable.") from exc


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
async def create_contract(payload: ContractCreate, session: AsyncSession = Depends(get_session)) -> EscrowContract:
    if not await confirmed_transaction(payload.transaction_hash):
        raise HTTPException(422, "The supplied Stellar transaction has not confirmed successfully.")
    contract = EscrowContract(
        chain_address=payload.chain_address,
        client_address=payload.client_address,
        freelancer_address=payload.freelancer_address,
        token_address=payload.token_address,
        title=payload.title,
        network=payload.network,
        deployment_transaction_hash=payload.transaction_hash,
    )
    contract.milestones = [Milestone(chain_milestone_id=item.chain_milestone_id, description=item.description, amount=item.amount, status="Funded") for item in payload.milestones]
    for address in (payload.client_address, payload.freelancer_address):
        if not await session.scalar(select(User).where(User.wallet_address == address)):
            session.add(User(wallet_address=address))
    session.add(contract)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(409, "This contract or deployment transaction has already been recorded.") from exc
    await session.refresh(contract)
    return contract


@router.get("", response_model=list[ContractRead])
async def list_contracts(wallet_address: str | None = Query(default=None), session: AsyncSession = Depends(get_session)) -> list[EscrowContract]:
    statement = select(EscrowContract).order_by(EscrowContract.created_at.desc())
    if wallet_address:
        statement = statement.where(or_(EscrowContract.client_address == wallet_address, EscrowContract.freelancer_address == wallet_address))
    return list((await session.scalars(statement)).all())


@router.get("/events", response_model=list[ContractEventRead])
async def list_events(wallet_address: str | None = Query(default=None), session: AsyncSession = Depends(get_session)) -> list[ContractEvent]:
    statement = select(ContractEvent).order_by(ContractEvent.observed_at.desc()).limit(100)
    if wallet_address:
        addresses = select(EscrowContract.chain_address).where(or_(EscrowContract.client_address == wallet_address, EscrowContract.freelancer_address == wallet_address))
        statement = statement.where(ContractEvent.contract_address.in_(addresses))
    return list((await session.scalars(statement)).all())


@router.get("/{contract_id}", response_model=ContractDetailRead)
async def get_contract(contract_id: str, session: AsyncSession = Depends(get_session)) -> EscrowContract:
    contract = await session.scalar(select(EscrowContract).options(selectinload(EscrowContract.milestones)).where(EscrowContract.id == contract_id))
    if not contract:
        raise HTTPException(404, "Contract not found")
    return contract


@router.get("/{contract_id}/milestones", response_model=list[MilestoneRead])
async def get_milestones(contract_id: str, session: AsyncSession = Depends(get_session)) -> list[Milestone]:
    contract = await session.get(EscrowContract, contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    return list((await session.scalars(select(Milestone).where(Milestone.contract_id == contract_id).order_by(Milestone.chain_milestone_id))).all())
