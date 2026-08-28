from datetime import datetime
from pydantic import BaseModel, Field


class AdminChallengeRequest(BaseModel):
    wallet_address: str = Field(pattern=r"^G[A-Z2-7]{55}$")


class AdminSessionRequest(BaseModel):
    challenge_id: str = Field(min_length=36, max_length=36)
    wallet_address: str = Field(pattern=r"^G[A-Z2-7]{55}$")
    signature: str = Field(min_length=80, max_length=256)


class AdminActivityRead(BaseModel):
    transaction_hash: str
    event_type: str
    contract_address: str
    wallet_address: str | None
    occurred_at: datetime


class AdminStatusRead(BaseModel):
    status: str
    count: int


class AdminMetricsRead(BaseModel):
    registered_wallets: int
    confirmed_transactions: int
    active_escrows: int
    open_disputes: int
    status_distribution: list[AdminStatusRead]
    recent_activity: list[AdminActivityRead]
    generated_at: datetime
