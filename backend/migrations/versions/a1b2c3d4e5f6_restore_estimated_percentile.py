"""restore_estimated_percentile

Revision ID: a1b2c3d4e5f6
Revises: ffc9450cbab4
Create Date: 2026-07-04

Re-adds the estimated_percentile column that was dropped in ffc9450cbab4.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'ffc9450cbab4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add estimated_percentile column back to analytics_results."""
    op.add_column(
        'analytics_results',
        sa.Column(
            'estimated_percentile',
            sa.Float(),
            nullable=True,
            server_default=sa.text('0.0'),
        )
    )


def downgrade() -> None:
    """Remove estimated_percentile column."""
    op.drop_column('analytics_results', 'estimated_percentile')
