"""Create one-time Freighter admin authentication challenges.

Revision ID: 20260828_0004
Revises: 20260827_0003
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = "20260828_0004"
down_revision = "20260827_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_auth_challenges",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("wallet_address", sa.String(64), nullable=False),
        sa.Column("nonce", sa.String(128), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_admin_auth_challenges_wallet_address", "admin_auth_challenges", ["wallet_address"])
    op.create_index("ix_admin_auth_challenges_nonce", "admin_auth_challenges", ["nonce"], unique=True)
    op.create_index("ix_admin_auth_challenges_expires_at", "admin_auth_challenges", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_admin_auth_challenges_expires_at", table_name="admin_auth_challenges")
    op.drop_index("ix_admin_auth_challenges_nonce", table_name="admin_auth_challenges")
    op.drop_index("ix_admin_auth_challenges_wallet_address", table_name="admin_auth_challenges")
    op.drop_table("admin_auth_challenges")
