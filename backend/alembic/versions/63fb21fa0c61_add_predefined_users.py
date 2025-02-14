"""Add predefined users

Revision ID: 63fb21fa0c61
Revises: 6c8829ea42ff
Create Date: 2024-03-21 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision: str = '63fb21fa0c61'
down_revision: Union[str, None] = '6c8829ea42ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Define the predefined users
    users = [
        {
            'google_id': None,
            'email': 'amit.nair@artofliving.org',
            'first_name': 'Amit',
            'last_name': 'Nair',
            'role': 'SECRETARIAT',
            'created_at': datetime.utcnow()
        },
        {
            'google_id': None,
            'email': 'secretariat@artofliving.org',
            'first_name': 'Secretariat',
            'last_name': '',
            'role': 'SECRETARIAT',
            'created_at': datetime.utcnow()
        },
        {
            'google_id': None,
            'email': 'ajay@artofliving.org',
            'first_name': 'Ajay',
            'last_name': 'Tejasvi',
            'role': 'SECRETARIAT',
            'created_at': datetime.utcnow()
        },
        {
            'google_id': None,
            'email': 'bhushan@artofliving.org',
            'first_name': 'Bhushan',
            'last_name': 'Deodhar',
            'role': 'SECRETARIAT',
            'created_at': datetime.utcnow()
        },
        {
            'google_id': None,
            'email': 'mrigank.nagar@artofliving.org',
            'first_name': 'Mrigank',
            'last_name': 'Nagar',
            'role': 'SECRETARIAT',
            'created_at': datetime.utcnow()
        },
        {
            'google_id': None,
            'email': 'tri.taurus@gmail.com',
            'first_name': 'Amit',
            'last_name': 'Nair',
            'role': 'USHER',
            'created_at': datetime.utcnow()
        }
    ]

    # Get the users table
    users_table = sa.table('users',
        sa.column('google_id', sa.String),
        sa.column('email', sa.String),
        sa.column('first_name', sa.String),
        sa.column('last_name', sa.String),
        sa.column('role', sa.Enum('SECRETARIAT', 'GENERAL', 'USHER', name='userrole')),
        sa.column('created_at', sa.DateTime)
    )

    # Insert the predefined users
    op.bulk_insert(users_table, users)


def downgrade() -> None:
    # Remove the predefined users
    op.execute("""
        DELETE FROM users 
        WHERE email IN (
            'amit.nair@artofliving.org',
            'secretariat@artofliving.org',
            'ajay@artofliving.org',
            'bhushan@artofliving.org',
            'mrigank.nagar@artofliving.org',
            'tri.taurus@gmail.com'
        )
    """)
