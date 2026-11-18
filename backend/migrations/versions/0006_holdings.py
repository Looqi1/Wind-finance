"""investment simulator holdings

Revision ID: 0006_holdings
Revises: 0005_subscription_payments
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_holdings"
down_revision = "0005_subscription_payments"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "holdings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("asset", sa.String(length=12), nullable=False),
        sa.Column("quantity", sa.Numeric(28, 12), nullable=False, server_default="0"),
        sa.Column("cost_kop", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "asset", name="uq_holding_user_asset"),
    )
    op.create_index("ix_holdings_user_id", "holdings", ["user_id"])


def downgrade():
    op.drop_index("ix_holdings_user_id", table_name="holdings")
    op.drop_table("holdings")
