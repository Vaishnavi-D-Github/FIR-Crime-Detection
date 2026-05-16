"""add fir metadata fields

Revision ID: 2d0d9c2f4f11
Revises: ebb0c9015b65
Create Date: 2026-05-15 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "2d0d9c2f4f11"
down_revision = "ebb0c9015b65"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("firs", recreate="always") as batch_op:
        batch_op.add_column(sa.Column("phone_number", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("fir_type", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("incident_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("incident_time", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("incident_location", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("confidence_score", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("confidence_band", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("upload_filename", sa.String(length=255), nullable=True))

    op.execute("UPDATE firs SET phone_number = 'Not Provided' WHERE phone_number IS NULL")
    op.execute("UPDATE firs SET fir_type = 'Cognizable FIR' WHERE fir_type IS NULL")
    op.execute("UPDATE firs SET incident_date = date WHERE incident_date IS NULL")
    op.execute("UPDATE firs SET incident_location = area WHERE incident_location IS NULL")
    op.execute("UPDATE firs SET confidence_score = 0.0 WHERE confidence_score IS NULL")
    op.execute("UPDATE firs SET confidence_band = 'Low' WHERE confidence_band IS NULL")

    with op.batch_alter_table("firs", recreate="always") as batch_op:
        batch_op.alter_column("phone_number", existing_type=sa.String(length=20), nullable=False)
        batch_op.alter_column("fir_type", existing_type=sa.String(length=50), nullable=False)
        batch_op.alter_column("incident_date", existing_type=sa.Date(), nullable=False)
        batch_op.alter_column("incident_location", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("confidence_score", existing_type=sa.Float(), nullable=False)
        batch_op.alter_column("confidence_band", existing_type=sa.String(length=20), nullable=False)


def downgrade():
    with op.batch_alter_table("firs", recreate="always") as batch_op:
        batch_op.drop_column("upload_filename")
        batch_op.drop_column("confidence_band")
        batch_op.drop_column("confidence_score")
        batch_op.drop_column("incident_location")
        batch_op.drop_column("incident_time")
        batch_op.drop_column("incident_date")
        batch_op.drop_column("fir_type")
        batch_op.drop_column("phone_number")
