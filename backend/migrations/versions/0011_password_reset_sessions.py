"""Invalidate existing account sessions when their password is reset."""

import sqlalchemy as sa
from alembic import op

revision = "0011_password_reset_sessions"
down_revision = "0010_bybit_broker"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("session_version", sa.Integer(), nullable=False, server_default="0"))


def downgrade():
    op.drop_column("users", "session_version")
