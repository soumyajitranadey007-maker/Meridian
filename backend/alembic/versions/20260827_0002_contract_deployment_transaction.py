"""Track the confirmed deployment transaction for every escrow contract.

Revision ID: 20260827_0002
Revises: 20260826_0001
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa

revision = "20260827_0002"
down_revision = "20260826_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("escrow_contracts", sa.Column("deployment_transaction_hash", sa.String(64), nullable=True))
    op.create_index("ix_escrow_contracts_deployment_transaction_hash", "escrow_contracts", ["deployment_transaction_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_escrow_contracts_deployment_transaction_hash", table_name="escrow_contracts")
    op.drop_column("escrow_contracts", "deployment_transaction_hash")
