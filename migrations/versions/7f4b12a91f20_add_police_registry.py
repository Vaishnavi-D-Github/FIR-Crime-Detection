"""add police registry

Revision ID: 7f4b12a91f20
Revises: 2d0d9c2f4f11
Create Date: 2026-05-15 11:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "7f4b12a91f20"
down_revision = "2d0d9c2f4f11"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "police_officers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("officer_userid", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("station_name", sa.String(length=150), nullable=False),
        sa.Column("secret_key_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("officer_userid"),
    )

    with op.batch_alter_table("firs", recreate="always") as batch_op:
        batch_op.add_column(sa.Column("document_text", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("document_hash", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("source", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("officer_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_firs_officer_id_police_officers", "police_officers", ["officer_id"], ["id"])

    op.execute("UPDATE firs SET source = 'police' WHERE source IS NULL")

    with op.batch_alter_table("firs", recreate="always") as batch_op:
        batch_op.alter_column("source", existing_type=sa.String(length=30), nullable=False)


def downgrade():
    with op.batch_alter_table("firs", recreate="always") as batch_op:
        batch_op.drop_constraint("fk_firs_officer_id_police_officers", type_="foreignkey")
        batch_op.drop_column("officer_id")
        batch_op.drop_column("source")
        batch_op.drop_column("document_hash")
        batch_op.drop_column("document_text")

    op.drop_table("police_officers")
