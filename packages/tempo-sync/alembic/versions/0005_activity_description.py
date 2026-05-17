"""Add description to activities

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-17
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("activities", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("activities", "description")
