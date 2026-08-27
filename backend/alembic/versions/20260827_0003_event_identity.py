"""Preserve every contract event, even when transactions emit several events.

Revision ID: 20260827_0003
Revises: 20260827_0002
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa

revision = "20260827_0003"
down_revision = "20260827_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contract_events", sa.Column("event_id", sa.String(180), nullable=True))
    op.execute("UPDATE contract_events SET event_id = id WHERE event_id IS NULL")
    op.alter_column("contract_events", "event_id", nullable=False)
    op.create_index("ix_contract_events_event_id", "contract_events", ["event_id"], unique=True)
    # The initial migration used a unique transaction hash. New installations
    # receive the corrected schema; existing Neon databases need this named
    # Postgres constraint removed before multiple events per transaction persist.
    op.drop_constraint("contract_events_transaction_hash_key", "contract_events", type_="unique")
    op.create_index("ix_contract_events_transaction_hash", "contract_events", ["transaction_hash"])


def downgrade() -> None:
    op.drop_index("ix_contract_events_transaction_hash", table_name="contract_events")
    op.create_unique_constraint("contract_events_transaction_hash_key", "contract_events", ["transaction_hash"])
    op.drop_index("ix_contract_events_event_id", table_name="contract_events")
    op.drop_column("contract_events", "event_id")
