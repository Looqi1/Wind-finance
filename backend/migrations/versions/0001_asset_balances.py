"""add server-side asset balances

Revision ID: 0001_asset_balances
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_asset_balances"
down_revision = "0000_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "asset_balances",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("asset", sa.String(length=12), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=28, scale=12), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "asset", name="uq_asset_balance_user_asset"),
    )
    op.create_index("ix_asset_balances_user_id", "asset_balances", ["user_id"])


def downgrade():
    op.drop_index("ix_asset_balances_user_id", table_name="asset_balances")
    op.drop_table("asset_balances")
