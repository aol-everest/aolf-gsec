"""update appointment enums

Revision ID: update_appointment_enums
Revises: 9809011132d4
Create Date: 2023-12-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'update_appointment_enums'
down_revision = '9809011132d4'  # Updated to point to the existing head
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create new enum types with versioned names
    appointment_type_enum_v2 = postgresql.ENUM(
        'EXCLUSIVE_APPOINTMENT', 'SHARED_APPOINTMENT', 'DARSHAN_LINE', 'PRIVATE_EVENT',
        name='appointmenttype_v2', create_type=True
    )
    appointment_type_enum_v2.create(op.get_bind())
    
    appointment_sub_status_enum_v2 = postgresql.ENUM(
        'CANCELLED', 'FOLLOW_UP_REQUIRED', 'LOW_PRIORITY', 'MET_GURUDEV', 'NEED_MORE_INFO', 'NEED_RESCHEDULE', 'NO_FURTHER_ACTION', 'NOT_REVIEWED', 'SHORTLISTED', 'UNDER_CONSIDERATION', 'UNSCHEDULED', 'SCHEDULED',
        name='appointmentsubstatus_v2', create_type=True
    )
    appointment_sub_status_enum_v2.create(op.get_bind())
    
    # 2. Add new columns with the versioned enum types
    op.add_column('appointments', sa.Column('appointment_type_new', 
                                           postgresql.ENUM('EXCLUSIVE_APPOINTMENT', 'SHARED_APPOINTMENT', 
                                                          'DARSHAN_LINE', 'PRIVATE_EVENT', 
                                                          name='appointmenttype_v2'),
                                           nullable=True))
    
    op.add_column('appointments', sa.Column('sub_status_new', 
                                           postgresql.ENUM('APPROVED', 'PENDING', 'REJECTED', 
                                                          'CANCELED', 'COMPLETED', 
                                                          name='appointmentsubstatus_v2'),
                                           nullable=True))
    
    # 3. Update the new columns with appropriate values from old columns
    op.execute("""
        UPDATE appointments
        SET 
            appointment_type_new = CASE 
                WHEN appointment_type = 'PRIVATE' THEN 'EXCLUSIVE_APPOINTMENT'::appointmenttype_v2
                WHEN appointment_type = 'SMALL_GROUP' THEN 'SHARED_APPOINTMENT'::appointmenttype_v2
                WHEN sub_status = 'DARSHAN_LINE' THEN 'DARSHAN_LINE'::appointmenttype_v2
                ELSE appointment_type::text::appointmenttype_v2
            END,
            sub_status_new = CASE
                WHEN sub_status = 'DARSHAN_LINE' AND status = 'APPROVED' THEN 'SCHEDULED'::appointmentsubstatus_v2  
                WHEN sub_status = 'DARSHAN_LINE' THEN 'UNDER_CONSIDERATION'::appointmentsubstatus_v2
                ELSE sub_status::text::appointmentsubstatus_v2
            END
    """)
    
    # Make the new columns NOT NULL once populated
    op.alter_column('appointments', 'sub_status_new', nullable=False)
    
    # 4. Drop the old columns
    op.drop_column('appointments', 'appointment_type')
    op.drop_column('appointments', 'sub_status')
    
    # 5. Rename the new columns to the original names
    op.execute("ALTER TABLE appointments RENAME COLUMN appointment_type_new TO appointment_type")
    op.execute("ALTER TABLE appointments RENAME COLUMN sub_status_new TO sub_status")
    
    # 6. Clean up the old enum types (they are no longer referenced)
    op.execute("DROP TYPE appointmenttype")
    op.execute("DROP TYPE appointmentsubstatus")
    
    # 7. Rename the enum types to the original names
    op.execute("ALTER TYPE appointmenttype_v2 RENAME TO appointmenttype")
    op.execute("ALTER TYPE appointmentsubstatus_v2 RENAME TO appointmentsubstatus")


def downgrade():
    # 1. Create old enum types with versioned names
    appointment_type_enum_v1 = postgresql.ENUM(
        'PRIVATE', 'SMALL_GROUP',
        name='appointmenttype_v1', create_type=True
    )
    appointment_type_enum_v1.create(op.get_bind())
    
    appointment_sub_status_enum_v1 = postgresql.ENUM(
        'CANCELLED', 'FOLLOW_UP_REQUIRED', 'LOW_PRIORITY', 'MET_GURUDEV', 'NEED_MORE_INFO', 'NEED_RESCHEDULE', 'NO_FURTHER_ACTION', 'NOT_REVIEWED', 'SHORTLISTED', 'UNDER_CONSIDERATION', 'UNSCHEDULED', 'SCHEDULED', 'DARSHAN_LINE',
        name='appointmentsubstatus_v1', create_type=True
    )
    appointment_sub_status_enum_v1.create(op.get_bind())
    
    # 2. Add new columns with the old enum types
    op.add_column('appointments', sa.Column('appointment_type_old', 
                                           postgresql.ENUM('PRIVATE', 'SMALL_GROUP',
                                                         name='appointmenttype_v1'),
                                           nullable=True))
    
    op.add_column('appointments', sa.Column('sub_status_old', 
                                           postgresql.ENUM('CANCELLED', 'FOLLOW_UP_REQUIRED', 'LOW_PRIORITY', 'MET_GURUDEV', 'NEED_MORE_INFO', 'NEED_RESCHEDULE', 'NO_FURTHER_ACTION', 'NOT_REVIEWED', 'SHORTLISTED', 'UNDER_CONSIDERATION', 'UNSCHEDULED', 'SCHEDULED',
                                                         name='appointmentsubstatus_v1'),
                                           nullable=True))
    
    # 3. Update the temporary columns with values from current columns
    op.execute("""
        UPDATE appointments
        SET 
            appointment_type_old = CASE 
                WHEN appointment_type = 'EXCLUSIVE_APPOINTMENT' THEN 'PRIVATE'::appointmenttype_v1
                WHEN appointment_type = 'SHARED_APPOINTMENT' THEN 'SMALL_GROUP'::appointmenttype_v1
                ELSE NULL
            END,
            sub_status_old = CASE
                WHEN appointment_type = 'DARSHAN_LINE' THEN 'DARSHAN_LINE'::appointmentsubstatus_v1  
                ELSE sub_status::text::appointmentsubstatus_v1
            END
    """)
    
    # Make the temporary columns NOT NULL
    op.alter_column('appointments', 'appointment_type_old', nullable=False)
    op.alter_column('appointments', 'sub_status_old', nullable=False)
    
    # 4. Drop the current columns
    op.drop_column('appointments', 'appointment_type')
    op.drop_column('appointments', 'sub_status')
    
    # 5. Rename the columns back to their original names
    op.execute("ALTER TABLE appointments RENAME COLUMN appointment_type_old TO appointment_type")
    op.execute("ALTER TABLE appointments RENAME COLUMN sub_status_old TO sub_status")
    
    # 6. Clean up the current enum types
    op.execute("DROP TYPE appointmenttype")
    op.execute("DROP TYPE appointmentsubstatus")
    
    # 7. Rename the versioned enum types back to original names
    op.execute("ALTER TYPE appointmenttype_v1 RENAME TO appointmenttype")
    op.execute("ALTER TYPE appointmentsubstatus_v1 RENAME TO appointmentsubstatus") 