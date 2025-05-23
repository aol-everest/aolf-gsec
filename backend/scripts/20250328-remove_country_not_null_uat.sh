#!/bin/bash

# Script to run SQL commands for removing country_code not null constraint in UAT
# This should be executed after SSHing into the relevant instance using 'eb ssh'

# Variables - replace with actual values
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_user"
DB_NAME="aolf_gsec"

# Run SQL commands directly:
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO public;

-- Remove country_code not null constraint
ALTER TABLE users ALTER COLUMN country_code DROP NOT NULL;
EOF

echo "country_code not null constraint removed in UAT!" 
