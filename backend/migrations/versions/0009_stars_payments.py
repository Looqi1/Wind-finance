"""Store Telegram Stars payment metadata.

Revision ID: 0009_stars_payments
Revises: 0008_partner_clicks
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_stars_payments"
down_revision = "0008_partner_clicks"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("payments") as batch:
        batch.add_column(sa.Column("stars_amount", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("stars_payer_id", sa.BigInteger(), nullable=True))
        batch.add_column(sa.Column("stars_checkout_id", sa.String(128), nullable=True))
        batch.add_column(sa.Column("stars_charge_id", sa.String(255), nullable=True))
        batch.create_unique_constraint("uq_payments_stars_charge_id", ["stars_charge_id"])


def downgrade():
    with op.batch_alter_table("payments") as batch:
        batch.drop_constraint("uq_payments_stars_charge_id", type_="unique")
        batch.drop_column("stars_charge_id")
        batch.drop_column("stars_checkout_id")
        batch.drop_column("stars_payer_id")
        batch.drop_column("stars_amount")
