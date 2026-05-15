"""Add readiness fields to daily_metrics

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-15
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("daily_metrics", sa.Column("readiness_score", sa.Integer(), nullable=True))
    op.add_column("daily_metrics", sa.Column("readiness_level", sa.String(20), nullable=True))
    op.add_column("daily_metrics", sa.Column("readiness_sleep_pct", sa.Integer(), nullable=True))
    op.add_column("daily_metrics", sa.Column("readiness_hrv_pct", sa.Integer(), nullable=True))
    op.add_column("daily_metrics", sa.Column("readiness_load_pct", sa.Integer(), nullable=True))
    op.add_column("daily_metrics", sa.Column("readiness_recovery_pct", sa.Integer(), nullable=True))
    op.add_column("daily_metrics", sa.Column("readiness_stress_pct", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("daily_metrics", "readiness_stress_pct")
    op.drop_column("daily_metrics", "readiness_recovery_pct")
    op.drop_column("daily_metrics", "readiness_load_pct")
    op.drop_column("daily_metrics", "readiness_hrv_pct")
    op.drop_column("daily_metrics", "readiness_sleep_pct")
    op.drop_column("daily_metrics", "readiness_level")
    op.drop_column("daily_metrics", "readiness_score")
