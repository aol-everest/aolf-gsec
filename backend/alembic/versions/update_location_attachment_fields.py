"""update location attachment fields

Revision ID: 3f4a5b6c7d8e
Revises: 2e633b702ec8
Create Date: 2023-06-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '3f4a5b6c7d8e'
down_revision = '2e633b702ec8'
branch_labels = None
depends_on = None


def upgrade():
    # Get inspector to check existing columns
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [column['name'] for column in inspector.get_columns('locations')]
    
    # Add attachment_file_type column if it doesn't exist
    if 'attachment_file_type' not in columns:
        op.add_column('locations', sa.Column('attachment_file_type', sa.String(length=255), nullable=True))
    
    # Rename attachment_url to attachment_path if attachment_url exists and attachment_path doesn't
    if 'attachment_url' in columns and 'attachment_path' not in columns:
        op.alter_column('locations', 'attachment_url', new_column_name='attachment_path')


def downgrade():
    # Get inspector to check existing columns
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [column['name'] for column in inspector.get_columns('locations')]
    
    # Rename attachment_path back to attachment_url if attachment_path exists
    if 'attachment_path' in columns and 'attachment_url' not in columns:
        op.alter_column('locations', 'attachment_path', new_column_name='attachment_url')
    
    # Drop attachment_file_type column if it exists
    if 'attachment_file_type' in columns:
        op.drop_column('locations', 'attachment_file_type') 