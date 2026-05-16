"""Add body_battery_intraday to daily_metrics

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("daily_metrics", sa.Column("body_battery_intraday", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("daily_metrics", "body_battery_intraday")
