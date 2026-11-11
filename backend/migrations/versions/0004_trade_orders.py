"""add restricted Bybit trade order journal

Revision ID: 0004_trade_orders
Revises: 0003_rate_snapshots
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_trade_orders"
down_revision = "0003_rate_snapshots"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "trade_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("provider_order_id", sa.String(length=80), nullable=True),
        sa.Column("client_order_id", sa.String(length=36), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("side", sa.String(length=4), nullable=False),
        sa.Column("order_type", sa.String(length=10), nullable=False),
        sa.Column("qty", sa.Numeric(precision=28, scale=12), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_order_id"),
    )
    op.create_index("ix_trade_orders_user_id", "trade_orders", ["user_id"])
    op.create_index("ix_trade_orders_provider_order_id", "trade_orders", ["provider_order_id"])
    op.create_index("ix_trade_orders_status", "trade_orders", ["status"])
    op.create_index("ix_trade_orders_created_at", "trade_orders", ["created_at"])


def downgrade():
    for name in ("ix_trade_orders_created_at", "ix_trade_orders_status", "ix_trade_orders_provider_order_id", "ix_trade_orders_user_id"):
        op.drop_index(name, table_name="trade_orders")
    op.drop_table("trade_orders")
