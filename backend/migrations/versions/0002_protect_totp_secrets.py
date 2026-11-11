"""allow encrypted TOTP secrets

Revision ID: 0002_protect_totp_secrets
Revises: 0001_asset_balances
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_protect_totp_secrets"
down_revision = "0001_asset_balances"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as batch:
        batch.alter_column("totp_secret", existing_type=sa.String(length=64), type_=sa.String(length=255))


def downgrade():
    with op.batch_alter_table("users") as batch:
        batch.alter_column("totp_secret", existing_type=sa.String(length=255), type_=sa.String(length=64))
