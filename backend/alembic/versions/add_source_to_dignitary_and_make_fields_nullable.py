"""add_source_to_dignitary_and_make_fields_nullable

Revision ID: add_source_to_dignitary
Revises: d16962760db2
Create Date: 2023-02-26 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'add_source_to_dignitary'
down_revision = 'd16962760db2'
branch_labels = None
depends_on = None


def upgrade():
    # Create DignitarySource enum type if it doesn't exist
    connection = op.get_bind()
    result = connection.execute(text("SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'dignitarysource')"))
    exists = result.scalar()
    
    if not exists:
        op.execute(text("CREATE TYPE dignitarysource AS ENUM ('MANUAL', 'BUSINESS_CARD')"))
    
    # Add source column with default value 'MANUAL'
    op.add_column('dignitaries', sa.Column('source', sa.Enum('MANUAL', 'BUSINESS_CARD', name='dignitarysource'), 
                                          server_default='MANUAL', nullable=False))
    
    # Add source_appointment_id column
    op.add_column('dignitaries', sa.Column('source_appointment_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key('fk_dignitaries_source_appointment', 'dignitaries', 'appointments', 
                         ['source_appointment_id'], ['id'], ondelete='SET NULL')
    
    # Make fields nullable
    op.alter_column('dignitaries', 'honorific_title', nullable=True)
    op.alter_column('dignitaries', 'email', nullable=True)
    op.alter_column('dignitaries', 'primary_domain', nullable=True)
    op.alter_column('dignitaries', 'title_in_organization', nullable=True)
    op.alter_column('dignitaries', 'organization', nullable=True)
    op.alter_column('dignitaries', 'country', nullable=True)
    op.alter_column('dignitaries', 'state', nullable=True)
    op.alter_column('dignitaries', 'city', nullable=True)


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_dignitaries_source_appointment', 'dignitaries', type_='foreignkey')
    
    # Remove columns
    op.drop_column('dignitaries', 'source_appointment_id')
    op.drop_column('dignitaries', 'source')
    
    # Make fields non-nullable again
    op.alter_column('dignitaries', 'honorific_title', nullable=False)
    op.alter_column('dignitaries', 'email', nullable=False)
    op.alter_column('dignitaries', 'primary_domain', nullable=False)
    op.alter_column('dignitaries', 'title_in_organization', nullable=False)
    op.alter_column('dignitaries', 'organization', nullable=False)
    op.alter_column('dignitaries', 'country', nullable=False)
    op.alter_column('dignitaries', 'state', nullable=False)
    op.alter_column('dignitaries', 'city', nullable=False)
    
    # We don't drop the enum type in downgrade as it might be used elsewhere
    # op.execute("DROP TYPE dignitarysource") 