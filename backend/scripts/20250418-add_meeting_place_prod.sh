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

-- Add meeting_place_id column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meeting_place_id INTEGER;

-- Add foreign key constraint
ALTER TABLE appointments 
ADD CONSTRAINT fk_appointments_meeting_place 
FOREIGN KEY (meeting_place_id) 
REFERENCES meeting_places(id);
EOF

echo "Meeting place added to appointments in Production!" 
