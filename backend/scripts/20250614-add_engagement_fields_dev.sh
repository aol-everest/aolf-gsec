#!/bin/bash

# Script to add engagement fields to user_contacts and appointment_contacts tables - DEV environment
# Date: 2025-06-14
# Description: Adds engagement and participation fields to track contact interactions with Gurudev and courses

set -e  # Exit on any error

echo "=========================================="
echo "Adding engagement fields to user_contacts and appointment_contacts tables - DEV"
echo "Date: $(date)"
echo "=========================================="

# Set environment variables for DEV
export ENVIRONMENT=dev
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=aolf_gsec
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_SCHEMA=public

echo "Environment: $ENVIRONMENT"
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo "Schema: $POSTGRES_SCHEMA"

# Change to backend directory
cd "$(dirname "$0")/.."

echo "Current directory: $(pwd)"

echo "Starting SQL migration to add engagement fields..."

# Check current table structure before changes
echo "Current appointment_contacts table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_contacts' 
    ORDER BY ordinal_position;
" -q

# Count existing records
APPOINTMENT_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointment_contacts;
" | xargs)

echo "Current appointment_contacts count: $APPOINTMENT_CONTACT_COUNT"

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

# Step 2: Add engagement fields to appointment_contacts table
echo "Step 2: Adding engagement fields to appointment_contacts table..."

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
            exit 1
        fi
    else
        echo "$field_name column already exists in appointment_contacts"
    fi
done

# Step 3: Add indexes for better query performance
echo "Step 3: Adding indexes for engagement fields..."

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
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

# Step 4: Verification
echo "Step 4: Verifying migration results..."

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
    WHERE tablename = 'appointment_contacts'
    AND (indexname LIKE '%course%' OR indexname LIKE '%seva%' OR indexname LIKE '%gurudev%')
    ORDER BY tablename, indexname;
"

echo "Sample data check (should show NULL values for new fields):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        id,
        appointment_id,
        contact_id,
        has_met_gurudev_recently,
        is_attending_course,
        course_attending,
        is_doing_seva,
        seva_type
    FROM appointment_contacts 
    ORDER BY id 
    LIMIT 5;
"

echo "✅ Migration completed successfully for DEV environment"
echo "Summary:"
echo "  - Created CourseType and SevaType ENUM types"
echo "  - Added 5 engagement fields to appointment_contacts table"
echo "  - Added database indexes for performance"
echo "  - All new fields are nullable and default to NULL"

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 