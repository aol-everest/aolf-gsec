"""Adding and updating enums

Revision ID: 46bedfb53e75
Revises: 0739f0332cfd
Create Date: 2025-02-18 16:19:09.237118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision: str = '46bedfb53e75'
down_revision: Union[str, None] = '0739f0332cfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create temp table references for data migration
    appointments = table('appointments',
        column('status', sa.String)
    )
    dignitary_contacts = table('dignitary_point_of_contacts',
        column('relationship_type', sa.String)
    )

    # First change the column to varchar to remove enum dependency
    op.execute("ALTER TABLE appointments ALTER COLUMN status TYPE varchar USING status::varchar")
    
    # Drop the existing enum type if it exists
    op.execute("DROP TYPE IF EXISTS appointmentstatus")
    
    # Create the new enum type
    op.execute("CREATE TYPE appointmentstatus AS ENUM ('Pending', 'Need More Info', 'Approved', 'Rejected', 'Completed', 'Follow Up', 'Cancelled')")

    # Update existing appointment status values to proper case
    status_mapping = {
        'PENDING': 'Pending',
        'NEED_MORE_INFO': 'Need More Info',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected',
        'COMPLETED': 'Completed',
        'FOLLOW_UP': 'Follow Up',
        'CANCELLED': 'Cancelled'
    }

    # Update each status value
    connection = op.get_bind()
    for old_status, new_status in status_mapping.items():
        connection.execute(
            appointments.update().where(
                appointments.c.status == old_status
            ).values(
                status = new_status
            )
        )

    # Alter the column to use the new enum type with explicit cast
    op.execute("""
        ALTER TABLE appointments 
        ALTER COLUMN status TYPE appointmentstatus 
        USING status::appointmentstatus
    """)

    # Create and handle dignitaryhonorifictitle enum
    op.execute("DROP TYPE IF EXISTS dignitaryhonorifictitle")
    op.execute("""
        CREATE TYPE dignitaryhonorifictitle AS ENUM (
            'Mr.', 'Mrs.', 'Ms.', 'Admiral', 'Air Chief Marshal', 'Ambassador', 'Apostle', 
            'Bishop', 'Brigadier General', 'Chancellor', 'Chief', 'Colonel', 'Commissioner', 
            'Counsellor', 'Dr.', 'Elder', 'General', 'General (Retd.)', 'H.E.', 
            'Her Excellency the Right Honourable', 'Her Majesty', 'Her Worship', 
            'His Eminence', 'His Majesty', 'His Worship', 'Imam', 'Justice', 'Kami', 
            'Lt. Col', 'Pastor', 'Priest', 'Prof.', 'Rabbi', 'Right Honourable', 'Sadhvi', 
            'Sergeant', 'Sheriff', 'Shri', 'Sir', 'Smt.', 'Sushri', 'Swami', 
            'The Honorable', 'The Honourable', 'The Reverend', 'Sheikh'
        )
    """)
    op.execute("""
        ALTER TABLE dignitaries 
        ALTER COLUMN honorific_title TYPE dignitaryhonorifictitle 
        USING honorific_title::dignitaryhonorifictitle
    """)

    # Create and handle dignitaryprimarydomain enum
    op.execute("DROP TYPE IF EXISTS dignitaryprimarydomain")
    op.execute("""
        CREATE TYPE dignitaryprimarydomain AS ENUM (
            'Business', 'Government', 'Religious / Spiritual', 'Sports', 
            'Entertainment & Media', 'Education', 'Healthcare'
        )
    """)
    op.execute("""
        ALTER TABLE dignitaries 
        ALTER COLUMN primary_domain TYPE dignitaryprimarydomain 
        USING primary_domain::dignitaryprimarydomain
    """)

    # Update relationship_type data before creating enum
    connection.execute(
        dignitary_contacts.update().where(
            dignitary_contacts.c.relationship_type == 'POC'
        ).values(
            relationship_type = 'Direct'
        )
    )

    # Create and handle relationshiptype enum
    op.execute("DROP TYPE IF EXISTS relationshiptype")
    op.execute("CREATE TYPE relationshiptype AS ENUM ('Direct', 'Indirect')")
    op.execute("""
        ALTER TABLE dignitary_point_of_contacts 
        ALTER COLUMN relationship_type TYPE relationshiptype 
        USING relationship_type::relationshiptype
    """)


def downgrade() -> None:
    # Create a temp table reference for data migration
    appointments = table('appointments',
        column('status', sa.String)
    )

    # First change back to varchar
    op.execute("ALTER TABLE appointments ALTER COLUMN status TYPE varchar USING status::varchar")

    # Revert appointment status values to uppercase
    status_mapping = {
        'Pending': 'PENDING',
        'Need More Info': 'NEED_MORE_INFO',
        'Approved': 'APPROVED',
        'Rejected': 'REJECTED',
        'Completed': 'COMPLETED',
        'Follow Up': 'FOLLOW_UP',
        'Cancelled': 'CANCELLED'
    }

    # Update each status value back to uppercase
    connection = op.get_bind()
    for new_status, old_status in status_mapping.items():
        connection.execute(
            appointments.update().where(
                appointments.c.status == new_status
            ).values(
                status = old_status
            )
        )

    # Convert all enum columns back to varchar
    op.execute("ALTER TABLE dignitaries ALTER COLUMN honorific_title TYPE varchar USING honorific_title::varchar")
    op.execute("ALTER TABLE dignitaries ALTER COLUMN primary_domain TYPE varchar USING primary_domain::varchar")
    op.execute("ALTER TABLE dignitary_point_of_contacts ALTER COLUMN relationship_type TYPE varchar USING relationship_type::varchar")

    # Drop all enum types
    op.execute("DROP TYPE IF EXISTS appointmentstatus")
    op.execute("DROP TYPE IF EXISTS dignitaryhonorifictitle")
    op.execute("DROP TYPE IF EXISTS dignitaryprimarydomain")
    op.execute("DROP TYPE IF EXISTS relationshiptype")
