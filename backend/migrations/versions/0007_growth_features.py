"""trades, portfolio history, savings goals, server price alerts, password reset, Plus trial

Revision ID: 0007_growth_features
Revises: 0006_holdings
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_growth_features"
down_revision = "0006_holdings"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("trial_used_at", sa.DateTime(), nullable=True))
    op.create_table(
        "invest_trades",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("asset", sa.String(12), nullable=False),
        sa.Column("side", sa.String(4), nullable=False),
        sa.Column("quantity", sa.Numeric(28, 12), nullable=False),
        sa.Column("price", sa.Numeric(28, 8), nullable=False),
        sa.Column("amount_kop", sa.BigInteger(), nullable=False),
        sa.Column("cost_kop", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("pnl_kop", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_invest_trades_user_id", "invest_trades", ["user_id"])
    op.create_index("ix_invest_trades_created_at", "invest_trades", ["created_at"])
    op.create_table(
        "portfolio_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("day", sa.String(10), nullable=False),
        sa.Column("invested_kop", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("cost_kop", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("cash_kop", sa.BigInteger(), nullable=False, server_default="0"),
        sa.UniqueConstraint("user_id", "day", name="uq_snapshot_user_day"),
    )
    op.create_index("ix_portfolio_snapshots_user_id", "portfolio_snapshots", ["user_id"])
    op.create_table(
        "savings_goals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(60), nullable=False),
        sa.Column("target_kop", sa.BigInteger(), nullable=False),
        sa.Column("saved_kop", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("deadline", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_savings_goals_user_id", "savings_goals", ["user_id"])
    op.create_table(
        "price_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("symbol", sa.String(20), nullable=False),
        sa.Column("direction", sa.String(5), nullable=False),
        sa.Column("price", sa.Numeric(28, 8), nullable=False),
        sa.Column("start_price", sa.Numeric(28, 8), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("triggered_at", sa.DateTime(), nullable=True),
        sa.Column("triggered_price", sa.Numeric(28, 8), nullable=True),
        sa.Column("notified_via", sa.String(20), nullable=True),
    )
    op.create_index("ix_price_alerts_user_id", "price_alerts", ["user_id"])
    op.create_index("ix_price_alerts_triggered_at", "price_alerts", ["triggered_at"])
    op.create_table(
        "password_resets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_password_resets_user_id", "password_resets", ["user_id"])
    op.create_index("ix_password_resets_token_hash", "password_resets", ["token_hash"])


def downgrade():
    for table in ("password_resets", "price_alerts", "savings_goals", "portfolio_snapshots", "invest_trades"):
        op.drop_table(table)
    op.drop_column("users", "trial_used_at")
