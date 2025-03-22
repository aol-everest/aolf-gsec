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

-- Step 4: Create Access Level enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accesslevel') THEN
        CREATE TYPE accesslevel AS ENUM ('Read', 'ReadWrite', 'Admin');
    END IF;
END
$$;

-- Step 5: Create Entity Type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entitytype') THEN
        CREATE TYPE entitytype AS ENUM ('Appointment', 'Appointment and Dignitary');
    END IF;
END
$$;

-- Step 6: Create user_access table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    country_code VARCHAR NOT NULL,
    location_id INTEGER REFERENCES locations(id),
    access_level accesslevel NOT NULL DEFAULT 'Read',
    entity_type entitytype NOT NULL DEFAULT 'Appointment',
    expiry_date DATE,
    reason TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id)
);

-- Step 7: Create indexes for user_access table
CREATE INDEX IF NOT EXISTS user_access_user_id_idx ON user_access(user_id);
CREATE INDEX IF NOT EXISTS user_access_country_code_idx ON user_access(country_code);
CREATE INDEX IF NOT EXISTS user_access_location_id_idx ON user_access(location_id);
EOF

echo "Access control attributes update completed in PROD!" 