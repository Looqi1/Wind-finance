"""create the initial application schema

Revision ID: 0000_initial_schema
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0000_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("accepted_terms_at", sa.DateTime(), nullable=True),
        sa.Column("balance_kop", sa.Integer(), nullable=False),
        sa.Column("plus_plan", sa.String(length=10), nullable=True),
        sa.Column("plus_until", sa.DateTime(), nullable=True),
        sa.Column("totp_secret", sa.String(length=255), nullable=True),
        sa.Column("totp_enabled", sa.Boolean(), nullable=False),
        sa.Column("tg_id", sa.BigInteger(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("tg_id"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])
    for table, columns in (
        ("transactions", [
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("kind", sa.String(length=3), nullable=False),
            sa.Column("title", sa.String(length=80), nullable=False),
            sa.Column("amount_kop", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        ]),
        ("payments", [
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("provider_id", sa.String(length=80), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("amount_kop", sa.Integer(), nullable=False),
            sa.Column("method", sa.String(length=20), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("paid_at", sa.DateTime(), nullable=True),
        ]),
        ("game_scores", [
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("game", sa.String(length=20), nullable=False),
            sa.Column("week", sa.String(length=10), nullable=False),
            sa.Column("score", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        ]),
        ("feedback", [
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("contact", sa.String(length=120), nullable=False),
            sa.Column("page", sa.String(length=60), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        ]),
    ):
        constraints = [sa.PrimaryKeyConstraint("id")]
        if table != "feedback":
            constraints.append(sa.ForeignKeyConstraint(["user_id"], ["users.id"]))
        else:
            constraints.append(sa.ForeignKeyConstraint(["user_id"], ["users.id"]))
        if table == "payments":
            constraints.append(sa.UniqueConstraint("provider_id"))
        op.create_table(table, *columns, *constraints)
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])


def downgrade():
    for table in ("feedback", "game_scores", "payments", "transactions"):
        op.drop_table(table)
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
