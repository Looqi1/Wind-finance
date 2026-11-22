"""Add customer-owned Bybit connections and spot purchase confirmations."""
from alembic import op
import sqlalchemy as sa

revision = "0010_bybit_broker"
down_revision = "0009_stars_payments"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("broker_accounts",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("integration", sa.String(64), nullable=False),
        sa.Column("state_hash", sa.String(64), unique=True),
        sa.Column("pin_hash", sa.String(64)), sa.Column("expires", sa.DateTime()),
        sa.Column("auth_code", sa.Text()), sa.Column("uid", sa.String(32)), sa.Column("credentials", sa.Text()))
    op.create_table("broker_buys",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("integration", sa.String(64), nullable=False), sa.Column("uid", sa.String(32), nullable=False),
        sa.Column("symbol", sa.String(16), nullable=False), sa.Column("budget", sa.Numeric(20, 2), nullable=False),
        sa.Column("ask", sa.Numeric(28, 12), nullable=False), sa.Column("created", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False), sa.Column("filled", sa.Numeric(28, 12), nullable=False),
        sa.Column("spent", sa.Numeric(28, 12), nullable=False), sa.Column("note", sa.String(180), nullable=False))
    op.create_index("ix_broker_buys_user_id", "broker_buys", ["user_id"])


def downgrade():
    op.drop_table("broker_buys")
    op.drop_table("broker_accounts")
