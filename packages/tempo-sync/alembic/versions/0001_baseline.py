"""baseline

Revision ID: 0001
Revises:
Create Date: 2026-05-15
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # All tables are created by SQLAlchemy metadata on first launch.
    # This migration just marks the baseline as applied.
    pass


def downgrade() -> None:
    pass
