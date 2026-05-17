"""Add stress breakdown fields to daily_metrics

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-16
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("daily_metrics", sa.Column("stress_rest_s", sa.Integer(), nullable=True))
    op.add_column("daily_metrics", sa.Column("stress_low_s", sa.Integer(), nullable=True))
    op.add_column("daily_metrics", sa.Column("stress_med_s", sa.Integer(), nullable=True))
    op.add_column("daily_metrics", sa.Column("stress_high_s", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("daily_metrics", "stress_high_s")
    op.drop_column("daily_metrics", "stress_med_s")
    op.drop_column("daily_metrics", "stress_low_s")
    op.drop_column("daily_metrics", "stress_rest_s")
