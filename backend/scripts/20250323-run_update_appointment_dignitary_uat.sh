#!/bin/bash

# Script to run SQL commands for updating appointment table for dignitary insert in UAT
# This should be executed after SSHing into the relevant instance using 'eb ssh'

# Variables - replace with actual values
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_user"
DB_NAME="aolf_gsec"

# Run SQL commands directly:
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO public;

-- Add created_by column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by INTEGER;

-- Make requester_id nullable
ALTER TABLE appointments ALTER COLUMN requester_id DROP NOT NULL;

-- Make preferred_date nullable
ALTER TABLE appointments ALTER COLUMN preferred_date DROP NOT NULL;

-- Make preferred_time_of_day nullable
ALTER TABLE appointments ALTER COLUMN preferred_time_of_day DROP NOT NULL;

-- Make purpose nullable
ALTER TABLE appointments ALTER COLUMN purpose DROP NOT NULL;

-- Add foreign key constraint
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_created_by_users
    FOREIGN KEY (created_by) REFERENCES users(id);
EOF

echo "Appointment table update completed in UAT!" 
