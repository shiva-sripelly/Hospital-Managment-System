"""initial schema

Revision ID: 20260520_0001
Revises:
Create Date: 2026-05-20
"""
from collections.abc import Sequence

from alembic import op

from app import models  # noqa: F401 - load SQLAlchemy metadata
from app.database import Base


revision: str = "20260520_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
