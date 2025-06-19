#!/bin/bash

# Script to rename CourseType.OTHER_COURSE to OTHER and add course_attending_other field
# Date: 2025-06-19
# Purpose: Rename OTHER_COURSE to OTHER in CourseType enum and add text field for "other" course values
# Environment: DEV only

set -e  # Exit on any error

echo "=========================================="
echo "Renaming CourseType.OTHER_COURSE to OTHER and adding course_attending_other field - DEV"
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

echo "Starting SQL migration to rename CourseType enum value and add field..."

# Function to execute SQL with error handling
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "Executing: $description"
    
    if psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "$sql" -q; then
        echo "✅ Success: $description"
        echo ""
    else
        echo "❌ Failed: $description"
        echo "Exiting..."
        exit 1
    fi
}

# Step 0: Grant ownership of the enum to current user (admin permissions)
echo "Step 0: Granting ownership of coursetype enum to current user..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    ALTER TYPE coursetype OWNER TO $POSTGRES_USER;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully granted ownership of coursetype enum"
else
    echo "❌ Failed to grant ownership - checking if already owned..."
    # Check if we're already the owner
    CURRENT_OWNER=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT u.usename 
        FROM pg_type t
        JOIN pg_user u ON t.typowner = u.usesysid
        WHERE t.typname = 'coursetype';
    " | xargs)
    
    if [ "$CURRENT_OWNER" = "$POSTGRES_USER" ]; then
        echo "✅ Current user already owns the enum"
    else
        echo "❌ Current owner is: $CURRENT_OWNER"
        echo "❌ Cannot proceed without ownership. Please run as database admin or contact DBA."
        exit 1
    fi
fi

echo "Step 1: Checking current CourseType enum values..."
echo "Current CourseType enum values (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT enumlabel as current_values, enumsortorder
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'coursetype'
    ORDER BY e.enumsortorder;
" -q

echo "Step 2: Checking for existing records with course_attending..."
# Count existing records in appointment_contacts only (course_attending field doesn't exist in user_contacts)
APPOINTMENT_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointment_contacts WHERE course_attending IS NOT NULL;
" | xargs)

echo "Current appointment_contacts with course_attending: $APPOINTMENT_CONTACT_COUNT"

# Count records by course type in appointment_contacts only
echo "Records by course type in appointment_contacts:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT course_attending, COUNT(*) as count
    FROM appointment_contacts
    WHERE course_attending IS NOT NULL
    GROUP BY course_attending
    ORDER BY course_attending;
"

echo "Step 3: Convert course_attending column to text to remove enum dependency..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    ALTER TABLE appointment_contacts 
    ALTER COLUMN course_attending TYPE text 
    USING course_attending::text;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully converted course_attending column to text"
else
    echo "❌ Failed to convert course_attending column to text"
    exit 1
fi

echo "Step 4: Drop old CourseType enum..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DROP TYPE coursetype;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully dropped old CourseType enum"
else
    echo "❌ Failed to drop old CourseType enum"
    exit 1
fi

echo "Step 5: Create new CourseType enum with renamed OTHER value..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE TYPE coursetype AS ENUM (
        'SKY',
        'SAHAJ',
        'SILENCE',
        'WISDOM_SERIES',
        'KIDS_TEENS_COURSE',
        'OTHER'
    );
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully created new CourseType enum"
else
    echo "❌ Failed to create new CourseType enum"
    exit 1
fi

echo "Step 6: Migrate OTHER_COURSE values to OTHER..."

# Note: course_attending field only exists in appointment_contacts, not in user_contacts

# Migrate OTHER_COURSE to OTHER in appointment_contacts
OTHER_COURSE_APPOINTMENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointment_contacts WHERE course_attending = 'OTHER_COURSE';
" | xargs)

if [ "$OTHER_COURSE_APPOINTMENT_COUNT" -gt 0 ]; then
    echo "Migrating $OTHER_COURSE_APPOINTMENT_COUNT OTHER_COURSE values to OTHER in appointment_contacts..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        UPDATE appointment_contacts 
        SET course_attending = 'OTHER'
        WHERE course_attending = 'OTHER_COURSE';
    " -q
    echo "✅ Successfully migrated OTHER_COURSE values in appointment_contacts"
else
    echo "No OTHER_COURSE values to migrate in appointment_contacts"
fi

echo "Step 7: Add course_attending_other and role fields to appointment_contacts..."

# Add course_attending_other field
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    ALTER TABLE appointment_contacts 
    ADD COLUMN IF NOT EXISTS course_attending_other VARCHAR(255);
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully added course_attending_other field to appointment_contacts"
else
    echo "❌ Failed to add course_attending_other field to appointment_contacts"
    exit 1
fi

# Check if role_in_team_project field exists, if not add it
ROLE_FIELD_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_contacts' 
    AND column_name = 'role_in_team_project';
" | xargs)

if [ "$ROLE_FIELD_EXISTS" -eq 0 ]; then
    echo "Adding role_in_team_project field to appointment_contacts..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointment_contacts 
        ADD COLUMN role_in_team_project roleinteamproject;
    " -q
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added role_in_team_project field to appointment_contacts"
    else
        echo "❌ Failed to add role_in_team_project field to appointment_contacts"
        exit 1
    fi
else
    echo "✅ role_in_team_project field already exists in appointment_contacts"
fi

# Check if role_in_team_project_other field exists, if not add it
ROLE_OTHER_FIELD_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_contacts' 
    AND column_name = 'role_in_team_project_other';
" | xargs)

if [ "$ROLE_OTHER_FIELD_EXISTS" -eq 0 ]; then
    echo "Adding role_in_team_project_other field to appointment_contacts..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointment_contacts 
        ADD COLUMN role_in_team_project_other VARCHAR(255);
    " -q
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added role_in_team_project_other field to appointment_contacts"
    else
        echo "❌ Failed to add role_in_team_project_other field to appointment_contacts"
        exit 1
    fi
else
    echo "✅ role_in_team_project_other field already exists in appointment_contacts"
fi

echo "Step 8: Convert course_attending column back to enum..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    ALTER TABLE appointment_contacts 
    ALTER COLUMN course_attending TYPE coursetype 
    USING course_attending::coursetype;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully converted course_attending column back to enum"
else
    echo "❌ Failed to convert course_attending column back to enum"
    exit 1
fi

echo "Step 9: Verify the new enum values..."
echo "Updated CourseType enum values:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT enumlabel as new_values, enumsortorder
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'coursetype'
    ORDER BY e.enumsortorder;
"

echo "Step 10: Verify appointment_contacts table structure..."
echo "appointment_contacts table columns related to course_attending and role fields:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'appointment_contacts' 
    AND column_name IN ('course_attending', 'course_attending_other', 'role_in_team_project', 'role_in_team_project_other')
    ORDER BY column_name;
"

echo "Step 11: Test all enum values..."
echo "Testing enum usage in queries..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 'SKY'::coursetype as test1,
           'SAHAJ'::coursetype as test2,
           'SILENCE'::coursetype as test3,
           'WISDOM_SERIES'::coursetype as test4,
           'KIDS_TEENS_COURSE'::coursetype as test5,
           'OTHER'::coursetype as test6;
"

if [ $? -eq 0 ]; then
    echo "✅ All enum values can be used successfully in queries"
else
    echo "❌ Failed to use enum values in queries"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Migration completed successfully!"
echo "=========================================="
echo "Summary:"
echo "- Renamed CourseType.OTHER_COURSE to OTHER"
echo "- Added course_attending_other field to appointment_contacts table"
echo "- Migrated existing OTHER_COURSE values to OTHER"
echo "- Verified enum functionality"
echo ""
echo "📋 Current enum values (in order):"
echo "   1. SKY"
echo "   2. SAHAJ"
echo "   3. SILENCE"
echo "   4. WISDOM_SERIES"
echo "   5. KIDS_TEENS_COURSE"
echo "   6. OTHER (renamed from OTHER_COURSE)"
echo ""
echo "🔄 Changes made:"
echo "   📝 Renamed: OTHER_COURSE → OTHER"
echo "   ➕ Added: course_attending_other field to appointment_contacts"
echo "   📝 Migrated: All OTHER_COURSE values → OTHER"
echo ""
echo "📋 New appointment_contacts fields:"
echo "   - course_attending (enum): CourseType enum value"
echo "   - course_attending_other (varchar): Text value when OTHER is selected"
echo "   - role_in_team_project (enum): RoleInTeamProject enum value"
echo "   - role_in_team_project_other (varchar): Text value when OTHER is selected"
echo ""
echo "The CourseType enum is now available for use in:"
echo "- appointment_contacts.course_attending"
echo "- Course type API filtering"
echo "- Frontend course selection dropdowns"
echo ""
echo "Next steps:"
echo "1. Update Python enum definition to match (OTHER_COURSE → OTHER)"
echo "2. Restart your FastAPI application"
echo "3. Test the course type API endpoints"
echo "4. Verify that OTHER course selection with text input works"
echo "5. Test ContactForm with OTHER course type functionality"
echo "==========================================" 
