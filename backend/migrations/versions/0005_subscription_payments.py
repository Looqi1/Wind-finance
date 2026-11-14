"""track YooKassa subscription payments

Revision ID: 0005_subscription_payments
Revises: 0004_trade_orders
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_subscription_payments"
down_revision = "0004_trade_orders"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("payments", sa.Column("purpose", sa.String(length=20), nullable=False, server_default="topup"))
    op.add_column("payments", sa.Column("plan", sa.String(length=10), nullable=True))


def downgrade():
    op.drop_column("payments", "plan")
    op.drop_column("payments", "purpose")
