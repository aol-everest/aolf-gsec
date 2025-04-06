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
CREATE TYPE dignitary_attendance_status AS ENUM (
    'PENDING', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'
);

-- Add attendance_status column to appointment_dignitaries
ALTER TABLE appointment_dignitaries ADD COLUMN IF NOT EXISTS attendance_status dignitary_attendance_status DEFAULT 'PENDING';

-- Update existing records to set the default value
UPDATE appointment_dignitaries SET attendance_status = 'PENDING';

EOF

echo "Dignitary attendance status added to appointment_dignitaries in Production!" 
