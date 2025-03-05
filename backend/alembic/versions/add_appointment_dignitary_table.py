"""Add appointment_dignitaries table

Revision ID: add_appointment_dignitary_table
Revises: REPLACE_WITH_PREVIOUS_REVISION_ID
Create Date: 2023-12-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'add_appointment_dignitary_table'
down_revision = '3f4a5b6c7d8e'  # Revision ID from update_location_attachment_fields.py
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if table already exists
    if 'appointment_dignitaries' not in inspector.get_table_names():
        # Create the appointment_dignitaries table
        op.create_table(
            'appointment_dignitaries',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
            sa.Column('appointment_id', sa.Integer(), nullable=False),
            sa.Column('dignitary_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
            sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['dignitary_id'], ['dignitaries.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        
        # Create index on appointment_id and dignitary_id
        op.create_index(
            op.f('ix_appointment_dignitaries_appointment_id'), 
            'appointment_dignitaries', 
            ['appointment_id'], 
            unique=False
        )
        op.create_index(
            op.f('ix_appointment_dignitaries_dignitary_id'), 
            'appointment_dignitaries', 
            ['dignitary_id'], 
            unique=False
        )
        
        # Migrate existing data to the new table
        op.execute("""
        INSERT INTO appointment_dignitaries (appointment_id, dignitary_id, created_at)
        SELECT id, dignitary_id, created_at FROM appointments WHERE dignitary_id IS NOT NULL
        """)
    
    # Check if dignitary_id column in appointments is nullable
    columns = {c['name']: c for c in inspector.get_columns('appointments')}
    if 'dignitary_id' in columns and not columns['dignitary_id']['nullable']:
        # Make the dignitary_id column in appointments table nullable
        op.alter_column('appointments', 'dignitary_id', nullable=True)


def downgrade():
    # First, ensure there's only one dignitary per appointment
    op.execute("""
    UPDATE appointments a
    SET dignitary_id = (
        SELECT dignitary_id 
        FROM appointment_dignitaries ad
        WHERE ad.appointment_id = a.id
        LIMIT 1
    )
    WHERE a.dignitary_id IS NULL
    """)
    
    # Make the dignitary_id column in appointments table non-nullable
    op.alter_column('appointments', 'dignitary_id', nullable=False)
    
    # Drop the appointment_dignitaries table
    op.drop_index(op.f('ix_appointment_dignitaries_dignitary_id'), table_name='appointment_dignitaries')
    op.drop_index(op.f('ix_appointment_dignitaries_appointment_id'), table_name='appointment_dignitaries')
    op.drop_table('appointment_dignitaries') 