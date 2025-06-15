#!/bin/bash

# Script to add engagement fields to user_contacts and appointment_contacts tables - UAT environment
# Date: 2025-06-14
# Description: Adds engagement and participation fields to track contact interactions with Gurudev and courses

set -e  # Exit on any error

echo "=========================================="
echo "Adding engagement fields to user_contacts and appointment_contacts tables - UAT"
echo "Date: $(date)"
echo "=========================================="

# Check if required environment variables are set
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ Required environment variables not set:"
    echo "   POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD must be set"
    exit 1
fi

# Set environment variables for UAT
export ENVIRONMENT=uat
export POSTGRES_PORT=${POSTGRES_PORT:-5432}
export POSTGRES_DB=${POSTGRES_DB:-aolf_gsec}
export POSTGRES_SCHEMA=${POSTGRES_SCHEMA:-public}

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

echo "Starting SQL migration to add engagement fields..."

# Check current table structures before changes
echo "Current user_contacts table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'user_contacts' 
    ORDER BY ordinal_position;
" -q

echo "Current appointment_contacts table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_contacts' 
    ORDER BY ordinal_position;
" -q

# Count existing records
USER_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts;
" | xargs)

APPOINTMENT_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointment_contacts;
" | xargs)

echo "Current user_contacts count: $USER_CONTACT_COUNT"
echo "Current appointment_contacts count: $APPOINTMENT_CONTACT_COUNT"

# Create backup tables for rollback capability
echo "Creating backup tables for safety..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DROP TABLE IF EXISTS user_contacts_backup_$(date +%Y%m%d);
    CREATE TABLE user_contacts_backup_$(date +%Y%m%d) AS SELECT * FROM user_contacts;
    
    DROP TABLE IF EXISTS appointment_contacts_backup_$(date +%Y%m%d);
    CREATE TABLE appointment_contacts_backup_$(date +%Y%m%d) AS SELECT * FROM appointment_contacts;
"

if [ $? -eq 0 ]; then
    echo "✅ Backup tables created successfully"
else
    echo "❌ Failed to create backup tables"
    exit 1
fi

# Step 1: Create ENUM types for CourseType and SevaType
echo "Step 1: Creating ENUM types..."

echo "Creating CourseType ENUM..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coursetype') THEN
            CREATE TYPE CourseType AS ENUM (
                'SKY',
                'Sahaj',
                'Silence',
                'Wisdom Series',
                'Kids/Teens Course',
                'Other Course'
            );
        END IF;
    END\$\$;
"

echo "Creating SevaType ENUM..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sevatype') THEN
            CREATE TYPE SevaType AS ENUM (
                'Part Time',
                'Full Time'
            );
        END IF;
    END\$\$;
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully created ENUM types"
else
    echo "❌ Failed to create ENUM types"
    exit 1
fi

# Step 2: Add engagement fields to user_contacts table
echo "Step 2: Adding engagement fields to user_contacts table..."

# Check if columns already exist and add them if not
FIELDS=(
    "has_met_gurudev_recently:BOOLEAN"
    "is_attending_course:BOOLEAN" 
    "course_attending:CourseType"
    "is_doing_seva:BOOLEAN"
    "seva_type:SevaType"
)

for field_info in "${FIELDS[@]}"; do
    field_name=$(echo $field_info | cut -d':' -f1)
    field_type=$(echo $field_info | cut -d':' -f2)
    
    COLUMN_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'user_contacts' AND column_name = '$field_name';
    " | xargs)
    
    if [ "$COLUMN_EXISTS" -eq 0 ]; then
        echo "Adding $field_name column to user_contacts..."
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            ALTER TABLE user_contacts ADD COLUMN $field_name $field_type;
        "
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully added $field_name column"
        else
            echo "❌ Failed to add $field_name column"
            echo "Rolling back changes..."
            psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
                TRUNCATE user_contacts;
                INSERT INTO user_contacts SELECT * FROM user_contacts_backup_$(date +%Y%m%d);
            "
            exit 1
        fi
    else
        echo "$field_name column already exists in user_contacts"
    fi
done

# Step 3: Add engagement fields to appointment_contacts table
echo "Step 3: Adding engagement fields to appointment_contacts table..."

for field_info in "${FIELDS[@]}"; do
    field_name=$(echo $field_info | cut -d':' -f1)
    field_type=$(echo $field_info | cut -d':' -f2)
    
    COLUMN_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'appointment_contacts' AND column_name = '$field_name';
    " | xargs)
    
    if [ "$COLUMN_EXISTS" -eq 0 ]; then
        echo "Adding $field_name column to appointment_contacts..."
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            ALTER TABLE appointment_contacts ADD COLUMN $field_name $field_type;
        "
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully added $field_name column"
        else
            echo "❌ Failed to add $field_name column"
            echo "Rolling back changes..."
            psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
                TRUNCATE appointment_contacts;
                INSERT INTO appointment_contacts SELECT * FROM appointment_contacts_backup_$(date +%Y%m%d);
            "
            exit 1
        fi
    else
        echo "$field_name column already exists in appointment_contacts"
    fi
done

# Step 4: Add indexes for better query performance
echo "Step 4: Adding indexes for engagement fields..."

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX IF NOT EXISTS ix_user_contacts_has_met_gurudev_recently ON user_contacts (has_met_gurudev_recently);
    CREATE INDEX IF NOT EXISTS ix_user_contacts_is_attending_course ON user_contacts (is_attending_course);
    CREATE INDEX IF NOT EXISTS ix_user_contacts_course_attending ON user_contacts (course_attending);
    CREATE INDEX IF NOT EXISTS ix_user_contacts_is_doing_seva ON user_contacts (is_doing_seva);
    CREATE INDEX IF NOT EXISTS ix_user_contacts_seva_type ON user_contacts (seva_type);
    
    CREATE INDEX IF NOT EXISTS ix_appointment_contacts_has_met_gurudev_recently ON appointment_contacts (has_met_gurudev_recently);
    CREATE INDEX IF NOT EXISTS ix_appointment_contacts_is_attending_course ON appointment_contacts (is_attending_course);
    CREATE INDEX IF NOT EXISTS ix_appointment_contacts_course_attending ON appointment_contacts (course_attending);
    CREATE INDEX IF NOT EXISTS ix_appointment_contacts_is_doing_seva ON appointment_contacts (is_doing_seva);
    CREATE INDEX IF NOT EXISTS ix_appointment_contacts_seva_type ON appointment_contacts (seva_type);
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully added indexes"
else
    echo "❌ Failed to add indexes"
    exit 1
fi

# Step 5: Verification
echo "Step 5: Verifying migration results..."

echo "Updated user_contacts table structure:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'user_contacts' 
    AND column_name IN ('has_met_gurudev_recently', 'is_attending_course', 'course_attending', 'is_doing_seva', 'seva_type')
    ORDER BY column_name;
"

echo "Updated appointment_contacts table structure:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_contacts' 
    AND column_name IN ('has_met_gurudev_recently', 'is_attending_course', 'course_attending', 'is_doing_seva', 'seva_type')
    ORDER BY column_name;
"

echo "Checking ENUM types..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT typname, typtype, enumlabel
    FROM pg_type t
    LEFT JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE typname IN ('coursetype', 'sevatype')
    ORDER BY typname, enumsortorder;
"

echo "Checking indexes..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        indexname, 
        tablename
    FROM pg_indexes 
    WHERE tablename IN ('user_contacts', 'appointment_contacts')
    AND (indexname LIKE '%engagement%' OR indexname LIKE '%course%' OR indexname LIKE '%seva%' OR indexname LIKE '%gurudev%')
    ORDER BY tablename, indexname;
"

echo "Sample data check (should show NULL values for new fields):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        id,
        first_name,
        last_name,
        has_met_gurudev_recently,
        is_attending_course,
        course_attending,
        is_doing_seva,
        seva_type
    FROM user_contacts 
    ORDER BY id 
    LIMIT 5;
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

echo "✅ Migration completed successfully for UAT environment"
echo "Summary:"
echo "  - Created CourseType and SevaType ENUM types"
echo "  - Added 5 engagement fields to appointment_contacts table"
echo "  - Added database indexes for performance"
echo "  - All new fields are nullable and default to NULL"
echo "  - Backup tables created: appointment_contacts_backup_$(date +%Y%m%d)"

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 