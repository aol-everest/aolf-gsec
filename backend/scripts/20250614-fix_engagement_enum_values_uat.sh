#!/bin/bash

# Script to fix engagement ENUM values in UAT environment
# Date: 2025-06-14
# Description: Fixes CourseType and SevaType ENUM values to use correct database values instead of display values

set -e  # Exit on any error

echo "=========================================="
echo "Fixing engagement ENUM values in UAT environment"
echo "Date: $(date)"
echo "=========================================="

# Set environment variables for UAT
export ENVIRONMENT=uat
echo "Environment: $ENVIRONMENT"
export POSTGRES_HOST=aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com
export POSTGRES_PORT=5432
export POSTGRES_DB=aolf_gsec
export POSTGRES_USER=aolf_gsec_user
export POSTGRES_PASSWORD=''
export POSTGRES_SCHEMA=public

# Check if required environment variables are set
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_USER" ]; then
    echo "❌ Required environment variables not set:"
    echo "   POSTGRES_HOST, POSTGRES_USER must be set"
    exit 1
fi

echo "Environment: $ENVIRONMENT"
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo "Schema: $POSTGRES_SCHEMA"

# Change to backend directory
cd "$(dirname "$0")/.."

echo "Current directory: $(pwd)"

# Test database connection
echo "Testing database connection..."
export PGPASSWORD=$POSTGRES_PASSWORD
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT version();" -q

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

echo "Starting SQL migration to fix ENUM values..."

# Check current ENUM values
echo "Current ENUM values (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT typname, typtype, enumlabel
    FROM pg_type t
    LEFT JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE typname IN ('coursetype', 'sevatype')
    ORDER BY typname, enumsortorder;
" -q

# Count current records in both tables to ensure we don't lose data
USER_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts;
" | xargs)

APPOINTMENT_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointment_contacts;
" | xargs)

echo "Current record counts:"
echo "  user_contacts: $USER_CONTACT_COUNT"
echo "  appointment_contacts: $APPOINTMENT_CONTACT_COUNT"

# Check if any records actually use the ENUM values
COURSE_USAGE=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts WHERE course_attending IS NOT NULL 
    UNION ALL 
    SELECT COUNT(*) FROM appointment_contacts WHERE course_attending IS NOT NULL;
" | xargs | tr '\n' ' ')

SEVA_USAGE=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts WHERE seva_type IS NOT NULL 
    UNION ALL 
    SELECT COUNT(*) FROM appointment_contacts WHERE seva_type IS NOT NULL;
" | xargs | tr '\n' ' ')

echo "Current ENUM usage:"
echo "  CourseType usage in user_contacts | appointment_contacts: $COURSE_USAGE"
echo "  SevaType usage in user_contacts | appointment_contacts: $SEVA_USAGE"

# Create backup tables for safety
echo "Creating backup tables for safety..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DROP TABLE IF EXISTS user_contacts_enum_backup_$(date +%Y%m%d);
    CREATE TABLE user_contacts_enum_backup_$(date +%Y%m%d) AS SELECT * FROM user_contacts;
    
    DROP TABLE IF EXISTS appointment_contacts_enum_backup_$(date +%Y%m%d);
    CREATE TABLE appointment_contacts_enum_backup_$(date +%Y%m%d) AS SELECT * FROM appointment_contacts;
"

if [ $? -eq 0 ]; then
    echo "✅ Backup tables created successfully"
else
    echo "❌ Failed to create backup tables"
    exit 1
fi

# Step 1: Convert ENUM columns to VARCHAR and migrate existing data
echo "Step 1: Converting ENUM columns to VARCHAR and migrating data..."

# Check if ENUM columns exist before attempting conversion
COURSE_ATTENDING_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'user_contacts' AND column_name = 'course_attending';
" | xargs)

SEVA_TYPE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'user_contacts' AND column_name = 'seva_type';
" | xargs)

if [ "$COURSE_ATTENDING_EXISTS" -gt 0 ] || [ "$SEVA_TYPE_EXISTS" -gt 0 ]; then
    echo "Converting existing ENUM columns to VARCHAR..."
    
    # Convert ENUM columns to VARCHAR to preserve data
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        -- Convert course_attending columns to VARCHAR
        ALTER TABLE user_contacts ALTER COLUMN course_attending TYPE VARCHAR USING course_attending::VARCHAR;
        ALTER TABLE appointment_contacts ALTER COLUMN course_attending TYPE VARCHAR USING course_attending::VARCHAR;
        
        -- Convert seva_type columns to VARCHAR  
        ALTER TABLE user_contacts ALTER COLUMN seva_type TYPE VARCHAR USING seva_type::VARCHAR;
        ALTER TABLE appointment_contacts ALTER COLUMN seva_type TYPE VARCHAR USING seva_type::VARCHAR;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully converted ENUM columns to VARCHAR"
    else
        echo "❌ Failed to convert ENUM columns to VARCHAR"
        exit 1
    fi
    
    # Update existing data from old values to new values
    echo "Migrating existing data to new ENUM values..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        -- Update CourseType values in user_contacts
        UPDATE user_contacts SET course_attending = 'SKY' WHERE course_attending = 'SKY';
        UPDATE user_contacts SET course_attending = 'SAHAJ' WHERE course_attending = 'Sahaj';
        UPDATE user_contacts SET course_attending = 'SILENCE' WHERE course_attending = 'Silence';
        UPDATE user_contacts SET course_attending = 'WISDOM_SERIES' WHERE course_attending = 'Wisdom Series';
        UPDATE user_contacts SET course_attending = 'KIDS_TEENS_COURSE' WHERE course_attending = 'Kids/Teens Course';
        UPDATE user_contacts SET course_attending = 'OTHER_COURSE' WHERE course_attending = 'Other Course';
        
        -- Update SevaType values in user_contacts
        UPDATE user_contacts SET seva_type = 'PART_TIME' WHERE seva_type = 'Part Time';
        UPDATE user_contacts SET seva_type = 'FULL_TIME' WHERE seva_type = 'Full Time';
        
        -- Update CourseType values in appointment_contacts
        UPDATE appointment_contacts SET course_attending = 'SKY' WHERE course_attending = 'SKY';
        UPDATE appointment_contacts SET course_attending = 'SAHAJ' WHERE course_attending = 'Sahaj';
        UPDATE appointment_contacts SET course_attending = 'SILENCE' WHERE course_attending = 'Silence';
        UPDATE appointment_contacts SET course_attending = 'WISDOM_SERIES' WHERE course_attending = 'Wisdom Series';
        UPDATE appointment_contacts SET course_attending = 'KIDS_TEENS_COURSE' WHERE course_attending = 'Kids/Teens Course';
        UPDATE appointment_contacts SET course_attending = 'OTHER_COURSE' WHERE course_attending = 'Other Course';
        
        -- Update SevaType values in appointment_contacts
        UPDATE appointment_contacts SET seva_type = 'PART_TIME' WHERE seva_type = 'Part Time';
        UPDATE appointment_contacts SET seva_type = 'FULL_TIME' WHERE seva_type = 'Full Time';
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully migrated existing data to new values"
    else
        echo "❌ Failed to migrate existing data"
        exit 1
    fi
else
    echo "No existing ENUM columns found, proceeding with fresh creation..."
fi

# Step 2: Drop and recreate the ENUM types with correct values
echo "Step 2: Dropping and recreating ENUM types with correct database values..."

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DROP TYPE IF EXISTS CourseType CASCADE;
    DROP TYPE IF EXISTS SevaType CASCADE;
"

echo "Creating CourseType ENUM with correct database values..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE TYPE CourseType AS ENUM (
        'SKY',
        'SAHAJ',
        'SILENCE',
        'WISDOM_SERIES',
        'KIDS_TEENS_COURSE',
        'OTHER_COURSE'
    );
"

echo "Creating SevaType ENUM with correct database values..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE TYPE SevaType AS ENUM (
        'PART_TIME',
        'FULL_TIME'
    );
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully recreated ENUM types with correct values"
else
    echo "❌ Failed to recreate ENUM types"
    echo "Rolling back changes..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        TRUNCATE user_contacts;
        INSERT INTO user_contacts SELECT * FROM user_contacts_enum_backup_$(date +%Y%m%d);
        
        TRUNCATE appointment_contacts;
        INSERT INTO appointment_contacts SELECT * FROM appointment_contacts_enum_backup_$(date +%Y%m%d);
    "
    exit 1
fi

# Step 3: Convert VARCHAR columns back to ENUM types or add new ENUM columns
echo "Step 3: Converting columns to new ENUM types..."

if [ "$COURSE_ATTENDING_EXISTS" -gt 0 ] || [ "$SEVA_TYPE_EXISTS" -gt 0 ]; then
    # Convert existing VARCHAR columns back to new ENUM types
    echo "Converting existing VARCHAR columns to new ENUM types..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        -- Convert course_attending columns from VARCHAR to new ENUM
        ALTER TABLE user_contacts ALTER COLUMN course_attending TYPE CourseType USING course_attending::CourseType;
        ALTER TABLE appointment_contacts ALTER COLUMN course_attending TYPE CourseType USING course_attending::CourseType;
        
        -- Convert seva_type columns from VARCHAR to new ENUM
        ALTER TABLE user_contacts ALTER COLUMN seva_type TYPE SevaType USING seva_type::SevaType;
        ALTER TABLE appointment_contacts ALTER COLUMN seva_type TYPE SevaType USING seva_type::SevaType;
    "
else
    # Add new ENUM columns if they didn't exist before
    echo "Adding new ENUM columns..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE user_contacts ADD COLUMN course_attending CourseType;
        ALTER TABLE user_contacts ADD COLUMN seva_type SevaType;
        
        ALTER TABLE appointment_contacts ADD COLUMN course_attending CourseType;
        ALTER TABLE appointment_contacts ADD COLUMN seva_type SevaType;
    "
fi

if [ $? -eq 0 ]; then
    echo "✅ Successfully converted columns to new ENUM types"
else
    echo "❌ Failed to convert columns to ENUM types"
    exit 1
fi

# Step 4: Recreate indexes for the ENUM fields
echo "Step 4: Recreating indexes for ENUM fields..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX IF NOT EXISTS ix_user_contacts_course_attending ON user_contacts (course_attending);
    CREATE INDEX IF NOT EXISTS ix_user_contacts_seva_type ON user_contacts (seva_type);
    
    CREATE INDEX IF NOT EXISTS ix_appointment_contacts_course_attending ON appointment_contacts (course_attending);
    CREATE INDEX IF NOT EXISTS ix_appointment_contacts_seva_type ON appointment_contacts (seva_type);
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully recreated indexes"
else
    echo "❌ Failed to recreate indexes"
    exit 1
fi

# Step 5: Grant necessary permissions
echo "Step 5: Granting necessary permissions..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    GRANT USAGE ON TYPE CourseType TO aolf_gsec_app_user;
    GRANT USAGE ON TYPE SevaType TO aolf_gsec_app_user;
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully granted permissions"
else
    echo "❌ Failed to grant permissions"
    exit 1
fi

# Step 6: Verification
echo "Step 6: Verifying the fix..."

echo "Updated ENUM values:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT typname, typtype, enumlabel
    FROM pg_type t
    LEFT JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE typname IN ('coursetype', 'sevatype')
    ORDER BY typname, enumsortorder;
"

echo "Verifying table structures:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'user_contacts' 
    AND column_name IN ('course_attending', 'seva_type')
    ORDER BY column_name;
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_contacts' 
    AND column_name IN ('course_attending', 'seva_type')
    ORDER BY column_name;
"

# Verify record counts haven't changed
FINAL_USER_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts;
" | xargs)

FINAL_APPOINTMENT_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointment_contacts;
" | xargs)

echo "Record count verification:"
echo "  user_contacts: $USER_CONTACT_COUNT -> $FINAL_USER_CONTACT_COUNT"
echo "  appointment_contacts: $APPOINTMENT_CONTACT_COUNT -> $FINAL_APPOINTMENT_CONTACT_COUNT"

if [ "$USER_CONTACT_COUNT" -eq "$FINAL_USER_CONTACT_COUNT" ] && [ "$APPOINTMENT_CONTACT_COUNT" -eq "$FINAL_APPOINTMENT_CONTACT_COUNT" ]; then
    echo "✅ Record counts preserved correctly"
else
    echo "❌ Record count mismatch detected!"
    exit 1
fi

echo "✅ ENUM values fix completed successfully for UAT environment"
echo "Summary:"
echo "  - Fixed CourseType ENUM values: SKY, SAHAJ, SILENCE, WISDOM_SERIES, KIDS_TEENS_COURSE, OTHER_COURSE"
echo "  - Fixed SevaType ENUM values: PART_TIME, FULL_TIME"
echo "  - Recreated columns and indexes"
echo "  - Granted necessary permissions"
echo "  - All new fields remain nullable and default to NULL"
echo "  - Backup tables created: user_contacts_enum_backup_$(date +%Y%m%d), appointment_contacts_enum_backup_$(date +%Y%m%d)"

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 