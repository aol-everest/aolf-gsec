"""Add role column to users table

Revision ID: 6c8829ea42ff
Revises: 
Create Date: 2024-03-21 12:34:56.789012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM
from models.user import UserRole


# revision identifiers, used by Alembic.
revision: str = '6c8829ea42ff'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Try to create enum type if it doesn't exist
    try:
        userrole = ENUM('SECRETARIAT', 'GENERAL', 'USHER', name='userrole')
        userrole.create(op.get_bind(), checkfirst=True)
    except Exception:
        pass  # Enum type already exists
    
    # Add role column with a default value
    op.add_column('users', sa.Column('role', sa.Enum('SECRETARIAT', 'GENERAL', 'USHER', name='userrole'), nullable=False, server_default='GENERAL'))


def downgrade() -> None:
    # Remove the role column
    op.drop_column('users', 'role')
    
    # Try to drop the enum type
    try:
        userrole = ENUM('SECRETARIAT', 'GENERAL', 'USHER', name='userrole')
        userrole.drop(op.get_bind())
    except Exception:
        pass  # Enum type might be in use by other tables
