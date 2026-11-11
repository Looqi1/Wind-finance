"""store market rate snapshots

Revision ID: 0003_rate_snapshots
Revises: 0002_protect_totp_secrets
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_rate_snapshots"
down_revision = "0002_protect_totp_secrets"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rate_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("asset", sa.String(length=12), nullable=False),
        sa.Column("rub_rate", sa.Numeric(precision=28, scale=12), nullable=False),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("fetched_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rate_snapshots_asset", "rate_snapshots", ["asset"])
    op.create_index("ix_rate_snapshots_fetched_at", "rate_snapshots", ["fetched_at"])


def downgrade():
    op.drop_index("ix_rate_snapshots_fetched_at", table_name="rate_snapshots")
    op.drop_index("ix_rate_snapshots_asset", table_name="rate_snapshots")
    op.drop_table("rate_snapshots")
