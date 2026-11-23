"""Guarantee one game bonus per user, game and week."""

import sqlalchemy as sa
from alembic import op

revision = "0012_unique_game_bonus_claims"
down_revision = "0011_password_reset_sessions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "game_bonus_claims",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("game", sa.String(20), primary_key=True),
        sa.Column("week", sa.String(10), primary_key=True),
    )


def downgrade():
    op.drop_table("game_bonus_claims")
