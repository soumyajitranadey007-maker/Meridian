import asyncio
import base64
from datetime import datetime, timezone
import hashlib

import pytest
from fastapi import HTTPException, Response
from stellar_sdk import Keypair

from app.config import get_settings
from app.db import get_engine, get_session_factory
from app.api.routes_admin import get_metrics
from app.models import Base, ContractEvent, Dispute, EscrowContract, User
from app.services.admin_auth import MESSAGE_PREFIX, issue_admin_token, issue_challenge_message, require_admin, verify_freighter_signature


def test_freighter_message_signature_is_verified() -> None:
    wallet = Keypair.random()
    message = issue_challenge_message(wallet.public_key, "test-nonce", datetime.now(timezone.utc))
    signature = wallet.sign(hashlib.sha256(MESSAGE_PREFIX + message.encode("utf-8")).digest())

    verify_freighter_signature(wallet.public_key, message, base64.b64encode(signature).decode("ascii"))

    with pytest.raises(HTTPException, match="could not be verified"):
        verify_freighter_signature(wallet.public_key, message, base64.b64encode(b"invalid").decode("ascii"))


def test_admin_token_requires_an_allowed_wallet(monkeypatch: pytest.MonkeyPatch) -> None:
    wallet = Keypair.random().public_key
    monkeypatch.setenv("ADMIN_AUTH_SECRET", "t" * 48)
    monkeypatch.setenv("ADMIN_WALLET_ADDRESSES", wallet)
    get_settings.cache_clear()
    token, _ = issue_admin_token(wallet)

    assert asyncio.run(require_admin(f"Bearer {token}")) == wallet

    get_settings.cache_clear()


def test_metrics_aggregate_only_persisted_records() -> None:
    async def exercise() -> dict:
        async with get_engine().begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with get_session_factory()() as session:
            contract = EscrowContract(chain_address="C" + "C" * 55, client_address="G" + "A" * 55, freelancer_address="G" + "B" * 55, token_address="C" + "D" * 55, title="Persisted escrow", network="testnet", status="active", deployment_transaction_hash="d" * 64)
            session.add_all([User(wallet_address="G" + "A" * 55), User(wallet_address="G" + "B" * 55), contract])
            await session.flush()
            session.add_all([
                ContractEvent(event_id="event-1", contract_address=contract.chain_address, transaction_hash="e" * 64, event_type="milestone_funded", payload={}, ledger=1, observed_at=datetime.now(timezone.utc)),
                Dispute(contract_id=contract.id, status="open"),
            ])
            await session.commit()
        async with get_session_factory()() as session:
            return await get_metrics(Response(), 12, "G" + "A" * 55, session)

    payload = asyncio.run(exercise())
    assert payload["registered_wallets"] == 2
    assert payload["confirmed_transactions"] == 2
    assert payload["active_escrows"] == 1
    assert payload["open_disputes"] == 1
