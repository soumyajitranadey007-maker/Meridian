import asyncio
from datetime import datetime, timezone
import logging
import httpx
from sqlalchemy import select
from tenacity import retry, stop_after_attempt, wait_exponential
from stellar_sdk import xdr
from stellar_sdk.scval import to_native
from ..config import get_settings
from ..models import ContractEvent, Dispute, EscrowContract, Milestone, User
from .websocket_manager import manager

logger = logging.getLogger(__name__)
MILESTONE_EVENT_STATUS = {
    "milestone_created": "Draft",
    "milestone_funded": "Funded",
    "milestone_submitted": "Submitted",
    "milestone_approved": "Approved",
    "milestone_resolved": "Released",
    "dispute_raised": "Disputed",
}


class SorobanIndexer:
    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.settings = get_settings()
        self.cursor: str | None = None
        self.running = False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    async def _get_events(self, addresses: list[str]) -> dict:
        if not addresses:
            return {"events": []}
        params = {"startLedger": 0, "filters": [{"type": "contract", "contractIds": addresses}]}
        if self.cursor:
            params["pagination"] = {"cursor": self.cursor}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(self.settings.soroban_rpc_url, json={"jsonrpc": "2.0", "id": 1, "method": "getEvents", "params": params})
            response.raise_for_status()
        return response.json().get("result", {})

    @staticmethod
    def _decode_topic(value: object) -> object | None:
        if not isinstance(value, str):
            return None
        try:
            return to_native(xdr.SCVal.from_xdr(value))
        except Exception:
            return None

    def _event_name_and_milestone(self, event: dict) -> tuple[str, int | None]:
        topics = event.get("topic")
        if not isinstance(topics, list):
            return "contract_event", None
        decoded = [self._decode_topic(topic) for topic in topics]
        # Contract events emit fixed topics ["meridian", event_name] before
        # their indexed field. Never infer a name from an undecodable payload.
        event_name = decoded[1] if len(decoded) > 1 and isinstance(decoded[1], str) else "contract_event"
        milestone_id = decoded[2] if len(decoded) > 2 and isinstance(decoded[2], int) else None
        return event_name, milestone_id

    async def _tracked_addresses(self) -> list[str]:
        configured = [address for address in [self.settings.arbitration_contract_address, self.settings.reputation_contract_address, self.settings.factory_contract_address] if address]
        async with self.session_factory() as session:
            recorded = list((await session.scalars(select(EscrowContract.chain_address))).all())
        return list(dict.fromkeys([*configured, *recorded]))

    async def _apply_event(self, session, contract_address: str, event_type: str, milestone_id: int | None, event: dict) -> None:
        if event_type == "reputation_updated":
            topics = event.get("topic")
            data = self._decode_topic(event.get("value"))
            if isinstance(topics, list) and len(topics) > 2:
                wallet_address = self._decode_topic(topics[2])
                score = data.get("score") if isinstance(data, dict) else None
                if isinstance(wallet_address, str) and isinstance(score, int):
                    user = await session.scalar(select(User).where(User.wallet_address == wallet_address))
                    if user:
                        user.reputation_score = score
            return
        if event_type not in MILESTONE_EVENT_STATUS or milestone_id is None:
            return
        contract = await session.scalar(select(EscrowContract).where(EscrowContract.chain_address == contract_address))
        if not contract:
            return
        milestone = await session.scalar(select(Milestone).where(Milestone.contract_id == contract.id, Milestone.chain_milestone_id == milestone_id))
        if milestone:
            milestone.status = MILESTONE_EVENT_STATUS[event_type]
        if event_type == "dispute_raised" and not await session.scalar(select(Dispute).where(Dispute.contract_id == contract.id, Dispute.status == "open")):
            session.add(Dispute(contract_id=contract.id, status="open"))

    async def poll_once(self) -> int:
        result = await self._get_events(await self._tracked_addresses())
        self.cursor = result.get("cursor") or self.cursor
        stored = 0
        async with self.session_factory() as session:
            for event in result.get("events", []):
                event_id = str(event.get("id") or event.get("pagingToken") or "")
                if not event_id:
                    logger.warning("soroban_event_missing_identifier", extra={"event": event})
                    continue
                if await session.scalar(select(ContractEvent).where(ContractEvent.event_id == event_id)):
                    continue
                transaction_hash = event.get("txHash")
                contract_address = event.get("contractId")
                if not transaction_hash or not contract_address:
                    logger.warning("soroban_event_missing_contract_or_transaction", extra={"event_id": event_id})
                    continue
                event_type, milestone_id = self._event_name_and_milestone(event)
                record = ContractEvent(event_id=event_id, contract_address=contract_address, transaction_hash=transaction_hash, event_type=event_type, payload=event, ledger=event.get("ledger"), observed_at=datetime.now(timezone.utc))
                session.add(record)
                await self._apply_event(session, contract_address, event_type, milestone_id, event)
                await manager.broadcast({"id": event_id, "kind": event_type, "contractAddress": contract_address, "transactionHash": transaction_hash, "payload": event})
                stored += 1
            await session.commit()
        return stored

    async def run(self) -> None:
        self.running = True
        while self.running:
            try:
                await self.poll_once()
            except Exception as exc:
                logger.warning("soroban_event_poll_failed", exc_info=exc)
            await asyncio.sleep(self.settings.indexer_poll_interval_seconds)

    def stop(self) -> None:
        self.running = False
