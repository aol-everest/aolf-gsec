#!/bin/bash

# Script to run SQL commands for adding access control attributes in PROD
# This should be executed after SSHing into the relevant instance using 'eb ssh'

# Variables - replace with actual values
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-db-prod.cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_user"
DB_NAME="aolf_gsec"

# Run SQL commands directly:
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO aolf_gsec_app, public;

-- Step 1: Add country_code columns as nullable first
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS country_code VARCHAR;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS country_code VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR;

-- Step 2: Update existing records with default value "US" (ISO 2-digit code)
UPDATE dignitaries SET country_code = 'US' WHERE country_code IS NULL;
UPDATE locations SET country_code = 'US' WHERE country_code IS NULL;
UPDATE users SET country_code = 'US' WHERE country_code IS NULL;

-- Step 3: Alter columns to be NOT NULL where needed
ALTER TABLE locations ALTER COLUMN country_code SET NOT NULL;
ALTER TABLE users ALTER COLUMN country_code SET NOT NULL;

-- Step 4: Add ADMIN role to UserRole enum
SET ROLE aolf_gsec_app_user;
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMIN';
RESET ROLE; -- Optional, resets back to your original role
EOF

PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
UPDATE users SET role = 'ADMIN' WHERE email IN ('amit.nair@artofliving.org', 'mrigank.nagar@artofliving.org');
EOF

echo "Access control attributes update completed in PROD!" 