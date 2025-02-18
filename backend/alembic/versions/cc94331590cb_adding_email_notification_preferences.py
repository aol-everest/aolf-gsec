"""Adding email notification preferences

Revision ID: cc94331590cb
Revises: 02c31310fa47
Create Date: 2025-02-17 22:17:38.891703

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision: str = 'cc94331590cb'
down_revision: Union[str, None] = '02c31310fa47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define default notification preferences
DEFAULT_EMAIL_NOTIFICATION_PREFERENCES = {
    "appointment_created": True,
    "appointment_updated": True,
    "new_appointment_request": False,
}

def upgrade() -> None:
    # Create users table reference
    users = table('users',
        column('email_notification_preferences', sa.JSON)
    )

    # Add the column as nullable first
    op.add_column('users', sa.Column('email_notification_preferences', sa.JSON(), nullable=True))
    
    # Update existing records with default value
    op.execute(
        users.update().values(
            email_notification_preferences=DEFAULT_EMAIL_NOTIFICATION_PREFERENCES
        )
    )
    
    # Now make it not nullable
    op.alter_column('users', 'email_notification_preferences',
                    existing_type=sa.JSON(),
                    nullable=False)

def downgrade() -> None:
    op.drop_column('users', 'email_notification_preferences')
