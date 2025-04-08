#!/bin/bash

# Script to run SQL commands for adding timezone and state_code columns to locations table in Production
# This should be executed after SSHing into the relevant instance using 'eb ssh'

# Variables - replace with actual values
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_admin"
DB_NAME="aolf_gsec"

# Run SQL commands directly:
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO aolf_gsec_app, public;

-- Create the new enum type
CREATE TYPE attendancestatus AS ENUM (
    'PENDING', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'
);

-- Add attendance_status column to appointment_dignitaries
ALTER TABLE appointment_dignitaries ADD COLUMN IF NOT EXISTS attendance_status attendancestatus DEFAULT 'PENDING';

-- Update existing records to set the default value
UPDATE appointment_dignitaries SET attendance_status = 'PENDING';

-- Add created_at and updated_at columns to appointment_dignitaries
ALTER TABLE appointment_dignitaries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE appointment_dignitaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to set the default value
UPDATE appointment_dignitaries SET updated_at = created_at;

-- Add created_by and updated_by columns to appointment_dignitaries
ALTER TABLE appointment_dignitaries ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE appointment_dignitaries ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Add foreign key constraints
ALTER TABLE appointment_dignitaries ADD CONSTRAINT fk_appointment_dignitaries_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE appointment_dignitaries ADD CONSTRAINT fk_appointment_dignitaries_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- Update existing records to set the default value
UPDATE appointment_dignitaries SET created_by = (SELECT COALESCE(created_by, requester_id) FROM appointments WHERE appointments.id = appointment_dignitaries.appointment_id);
UPDATE appointment_dignitaries SET updated_by = (SELECT COALESCE(created_by, requester_id) FROM appointments WHERE appointments.id = appointment_dignitaries.appointment_id);

-- Make created_by and updated_by NOT NULL
ALTER TABLE appointment_dignitaries ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE appointment_dignitaries ALTER COLUMN updated_by SET NOT NULL;

EOF

echo "Dignitary attendance status added to appointment_dignitaries in Production!" 
