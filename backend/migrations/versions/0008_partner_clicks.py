"""Bybit partner link clicks

Revision ID: 0008_partner_clicks
Revises: 0007_growth_features
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_partner_clicks"
down_revision = "0007_growth_features"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "partner_clicks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("partner", sa.String(20), nullable=False, server_default="bybit"),
        sa.Column("kind", sa.String(12), nullable=False, server_default="signup"),
        sa.Column("placement", sa.String(30), nullable=False, server_default=""),
        sa.Column("symbol", sa.String(20), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_partner_clicks_user_id", "partner_clicks", ["user_id"])
    op.create_index("ix_partner_clicks_created_at", "partner_clicks", ["created_at"])


def downgrade():
    op.drop_index("ix_partner_clicks_created_at", "partner_clicks")
    op.drop_index("ix_partner_clicks_user_id", "partner_clicks")
    op.drop_table("partner_clicks")
