"""Add thumbnail support to appointment attachments

Revision ID: 2e633b702ec8
Revises: b8478fc3c187
Create Date: 2025-02-25 05:20:43.003683

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e633b702ec8'
down_revision: Union[str, None] = 'b8478fc3c187'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_image column with default value of False
    op.add_column('appointment_attachments', sa.Column('is_image', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add thumbnail_path column as nullable
    op.add_column('appointment_attachments', sa.Column('thumbnail_path', sa.String(), nullable=True))


def downgrade() -> None:
    # Drop the new columns
    op.drop_column('appointment_attachments', 'thumbnail_path')
    op.drop_column('appointment_attachments', 'is_image')
