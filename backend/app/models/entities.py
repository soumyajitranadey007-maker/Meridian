from datetime import datetime
from decimal import Decimal
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, IdMixin, TimestampMixin


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"
    wallet_address: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(120))
    reputation_score: Mapped[int] = mapped_column(Integer, default=0)


class EscrowContract(IdMixin, TimestampMixin, Base):
    __tablename__ = "escrow_contracts"
    chain_address: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    client_address: Mapped[str] = mapped_column(String(64), index=True)
    freelancer_address: Mapped[str] = mapped_column(String(64), index=True)
    token_address: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(180), default="Untitled contract")
    network: Mapped[str] = mapped_column(String(30), default="testnet")
    status: Mapped[str] = mapped_column(String(30), default="active")
    deployment_transaction_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="contract", cascade="all, delete-orphan")


class Milestone(IdMixin, TimestampMixin, Base):
    __tablename__ = "milestones"
    contract_id: Mapped[str] = mapped_column(ForeignKey("escrow_contracts.id"), index=True)
    chain_milestone_id: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 7))
    status: Mapped[str] = mapped_column(String(30), default="Draft")
    deliverable_hash: Mapped[str | None] = mapped_column(String(64))
    contract: Mapped[EscrowContract] = relationship(back_populates="milestones")


class ContractEvent(IdMixin, TimestampMixin, Base):
    __tablename__ = "contract_events"
    event_id: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    contract_address: Mapped[str] = mapped_column(String(64), index=True)
    transaction_hash: Mapped[str] = mapped_column(String(64), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    ledger: Mapped[int | None] = mapped_column(Integer)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AIReview(IdMixin, TimestampMixin, Base):
    __tablename__ = "ai_reviews"
    milestone_id: Mapped[str] = mapped_column(ForeignKey("milestones.id"), index=True)
    completeness_score: Mapped[int] = mapped_column(Integer)
    risk_flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    suggested_questions: Mapped[list[str]] = mapped_column(JSON, default=list)
    summary: Mapped[str] = mapped_column(Text)
    raw_response: Mapped[dict] = mapped_column(JSON, default=dict)


class Dispute(IdMixin, TimestampMixin, Base):
    __tablename__ = "disputes"
    contract_id: Mapped[str] = mapped_column(ForeignKey("escrow_contracts.id"), index=True)
    chain_case_id: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="open")
    summary: Mapped[str | None] = mapped_column(Text)
    resolved_to_freelancer: Mapped[bool | None] = mapped_column(Boolean)


class Evidence(IdMixin, TimestampMixin, Base):
    __tablename__ = "evidence"
    dispute_id: Mapped[str] = mapped_column(ForeignKey("disputes.id"), index=True)
    party_address: Mapped[str] = mapped_column(String(64))
    evidence_hash: Mapped[str | None] = mapped_column(String(64))
    body: Mapped[str] = mapped_column(Text)


class AdminAuthChallenge(IdMixin, TimestampMixin, Base):
    __tablename__ = "admin_auth_challenges"
    wallet_address: Mapped[str] = mapped_column(String(64), index=True)
    nonce: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
