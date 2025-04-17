#!/bin/bash

# Script to run SQL commands for adding timezone and state_code columns to locations table in Production
# This should be executed after SSHing into the relevant instance using 'eb ssh'

# Variables - replace with actual values
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_user"
DB_NAME="aolf_gsec"

# Run SQL commands directly:
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF

-- Add duration column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 15;

-- Update existing records to set the default value
UPDATE appointments SET duration = 15;

-- Change the type of duration to the enum type
-- 1. Drop the default
ALTER TABLE appointments 
ALTER COLUMN duration SET NOT NULL;

EOF

echo "Duration added to appointments in UAT!" 
