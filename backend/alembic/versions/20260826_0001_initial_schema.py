"""Create Meridian's application tables.

Revision ID: 20260826_0001
Revises:
Create Date: 2026-08-26
"""
from alembic import op
import sqlalchemy as sa

revision = "20260826_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.String(36), primary_key=True), sa.Column("wallet_address", sa.String(64), nullable=False, unique=True), sa.Column("display_name", sa.String(120)), sa.Column("reputation_score", sa.Integer(), nullable=False, server_default="0"), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_table("escrow_contracts", sa.Column("id", sa.String(36), primary_key=True), sa.Column("chain_address", sa.String(64), nullable=False, unique=True), sa.Column("client_address", sa.String(64), nullable=False), sa.Column("freelancer_address", sa.String(64), nullable=False), sa.Column("token_address", sa.String(64), nullable=False), sa.Column("title", sa.String(180), nullable=False), sa.Column("network", sa.String(30), nullable=False), sa.Column("status", sa.String(30), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_table("milestones", sa.Column("id", sa.String(36), primary_key=True), sa.Column("contract_id", sa.String(36), sa.ForeignKey("escrow_contracts.id"), nullable=False), sa.Column("chain_milestone_id", sa.Integer(), nullable=False), sa.Column("description", sa.Text(), nullable=False), sa.Column("amount", sa.Numeric(18, 7), nullable=False), sa.Column("status", sa.String(30), nullable=False), sa.Column("deliverable_hash", sa.String(64)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_table("contract_events", sa.Column("id", sa.String(36), primary_key=True), sa.Column("event_id", sa.String(180), nullable=False, unique=True), sa.Column("contract_address", sa.String(64), nullable=False), sa.Column("transaction_hash", sa.String(64), nullable=False), sa.Column("event_type", sa.String(64), nullable=False), sa.Column("payload", sa.JSON(), nullable=False), sa.Column("ledger", sa.Integer()), sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_table("ai_reviews", sa.Column("id", sa.String(36), primary_key=True), sa.Column("milestone_id", sa.String(36), sa.ForeignKey("milestones.id"), nullable=False), sa.Column("completeness_score", sa.Integer(), nullable=False), sa.Column("risk_flags", sa.JSON(), nullable=False), sa.Column("suggested_questions", sa.JSON(), nullable=False), sa.Column("summary", sa.Text(), nullable=False), sa.Column("raw_response", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_table("disputes", sa.Column("id", sa.String(36), primary_key=True), sa.Column("contract_id", sa.String(36), sa.ForeignKey("escrow_contracts.id"), nullable=False), sa.Column("chain_case_id", sa.Integer()), sa.Column("status", sa.String(30), nullable=False), sa.Column("summary", sa.Text()), sa.Column("resolved_to_freelancer", sa.Boolean()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_table("evidence", sa.Column("id", sa.String(36), primary_key=True), sa.Column("dispute_id", sa.String(36), sa.ForeignKey("disputes.id"), nullable=False), sa.Column("party_address", sa.String(64), nullable=False), sa.Column("evidence_hash", sa.String(64)), sa.Column("body", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")))


def downgrade() -> None:
    for table in ["evidence", "disputes", "ai_reviews", "contract_events", "milestones", "escrow_contracts", "users"]:
        op.drop_table(table)
