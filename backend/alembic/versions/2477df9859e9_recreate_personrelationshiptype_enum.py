"""recreate_personrelationshiptype_enum

Revision ID: 2477df9859e9
Revises: 14e225dacef3
Create Date: 2025-06-05 00:52:12.583728

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2477df9859e9'
down_revision: Union[str, None] = '14e225dacef3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Update existing data to match new enum values where possible
    # Map old values to new values where there's a logical mapping
    connection = op.get_bind()
    
    # Step 2: Change columns to text temporarily
    op.execute("ALTER TABLE user_contacts ALTER COLUMN relationship_to_owner TYPE text")
    
    # Step 3: Drop the old enum type
    op.execute("DROP TYPE IF EXISTS personrelationshiptype CASCADE")
    
    # Step 4: Create the new enum type with updated values
    op.execute("""
        CREATE TYPE personrelationshiptype AS ENUM (
            'FAMILY', 'FRIEND', 'PROFESSIONAL', 'OTHER'
        )
    """)
    
    # Step 5: Convert columns back to the new enum type
    op.execute("""
        ALTER TABLE user_contacts 
        ALTER COLUMN relationship_to_owner TYPE personrelationshiptype 
        USING relationship_to_owner::personrelationshiptype
    """)
    

def downgrade() -> None:
    # Step 1: Convert columns to text temporarily
    connection = op.get_bind()
    
    op.execute("ALTER TABLE user_contacts ALTER COLUMN relationship_to_owner TYPE text")
