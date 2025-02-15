"""Add appointment admin fields and status enum

Revision ID: edd54ad45525
Revises: 63fb21fa0c61
Create Date: 2025-02-14 01:04:06.653902

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'edd54ad45525'
down_revision: Union[str, None] = '63fb21fa0c61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type
    appointment_status = postgresql.ENUM('PENDING', 'APPROVED', 'REJECTED', 'FOLLOW_UP', name='appointmentstatus')
    appointment_status.create(op.get_bind())

    # Add new columns
    op.add_column('appointments', sa.Column('meeting_notes', sa.Text(), nullable=True))
    op.add_column('appointments', sa.Column('follow_up_actions', sa.Text(), nullable=True))
    op.add_column('appointments', sa.Column('secretariat_comments', sa.Text(), nullable=True))
    op.add_column('appointments', sa.Column('approved_date', sa.Date(), nullable=True))
    op.add_column('appointments', sa.Column('approved_time', sa.String(), nullable=True))
    op.add_column('appointments', sa.Column('last_updated_by', sa.Integer(), nullable=True))
    
    # Update existing status values to match enum values
    op.execute("UPDATE appointments SET status = 'PENDING' WHERE status = 'pending'")
    op.execute("UPDATE appointments SET status = 'APPROVED' WHERE status = 'approved'")
    op.execute("UPDATE appointments SET status = 'REJECTED' WHERE status = 'rejected'")
    
    # Alter status column to use enum type
    op.execute('ALTER TABLE appointments ALTER COLUMN status TYPE appointmentstatus USING status::appointmentstatus')
    op.alter_column('appointments', 'status',
                    existing_type=sa.VARCHAR(),
                    type_=appointment_status,
                    nullable=False,
                    postgresql_using='status::appointmentstatus')
    
    # Add foreign key constraint
    op.create_foreign_key(None, 'appointments', 'users', ['last_updated_by'], ['id'])


def downgrade() -> None:
    # Drop foreign key
    op.drop_constraint(None, 'appointments', type_='foreignkey')
    
    # Convert enum type back to varchar
    op.alter_column('appointments', 'status',
                    existing_type=postgresql.ENUM('PENDING', 'APPROVED', 'REJECTED', 'FOLLOW_UP', name='appointmentstatus'),
                    type_=sa.String(),
                    nullable=True,
                    postgresql_using='status::text')
    
    # Drop columns
    op.drop_column('appointments', 'last_updated_by')
    op.drop_column('appointments', 'approved_time')
    op.drop_column('appointments', 'approved_date')
    op.drop_column('appointments', 'secretariat_comments')
    op.drop_column('appointments', 'follow_up_actions')
    op.drop_column('appointments', 'meeting_notes')
    
    # Drop enum type
    op.execute('DROP TYPE appointmentstatus')
