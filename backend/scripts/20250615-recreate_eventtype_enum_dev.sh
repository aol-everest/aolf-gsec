#!/bin/bash

# Script to sync EventType enum in dev database with Python definition
# Date: 2025-06-15
# Purpose: Sync EventType enum to match current Python enum definition
# Environment: DEV only

set -e  # Exit on any error

echo "=========================================="
echo "Syncing EventType enum with Python definition - DEV"
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

echo "Starting SQL migration to sync EventType enum..."

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
echo "Step 0: Granting ownership of eventtype enum to current user..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    ALTER TYPE eventtype OWNER TO $POSTGRES_USER;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully granted ownership of eventtype enum"
else
    echo "❌ Failed to grant ownership - checking if already owned..."
    # Check if we're already the owner
    CURRENT_OWNER=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT u.usename 
        FROM pg_type t
        JOIN pg_user u ON t.typowner = u.usesysid
        WHERE t.typname = 'eventtype';
    " | xargs)
    
    if [ "$CURRENT_OWNER" = "$POSTGRES_USER" ]; then
        echo "✅ Current user already owns the enum"
    else
        echo "❌ Current owner is: $CURRENT_OWNER"
        echo "❌ Cannot proceed without ownership. Please run as database admin or contact DBA."
        exit 1
    fi
fi

echo "Step 1: Checking current EventType enum values..."
echo "Current EventType enum values (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT enumlabel as current_values, enumsortorder
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'eventtype'
    ORDER BY e.enumsortorder;
" -q

echo "Step 2: Checking for existing calendar events..."
# Count existing calendar_events records
EVENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM calendar_events;
" | xargs)

echo "Current calendar_events count: $EVENT_COUNT"

# Count events by type
echo "Events by type:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT event_type, COUNT(*) as count
    FROM calendar_events
    GROUP BY event_type
    ORDER BY event_type;
"

echo "Step 3: Convert event_type column to text to remove enum dependency..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    ALTER TABLE calendar_events 
    ALTER COLUMN event_type TYPE text 
    USING event_type::text;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully converted event_type column to text"
else
    echo "❌ Failed to convert event_type column to text"
    exit 1
fi

echo "Step 4: Drop old EventType enum..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DROP TYPE eventtype;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully dropped old EventType enum"
else
    echo "❌ Failed to drop old EventType enum"
    exit 1
fi

echo "Step 5: Create new EventType enum with current Python definition..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE TYPE eventtype AS ENUM (
        'DIGNITARY_APPOINTMENT',
        'DARSHAN',
        'VOLUNTEER_MEETING',
        'PROJECT_TEAM_MEETING',
        'PRIVATE_EVENT',
        'OTHER'
    );
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully created new EventType enum"
else
    echo "❌ Failed to create new EventType enum"
    exit 1
fi

echo "Step 6: Migrate non-compliant values in calendar_events..."

# Migrate TEACHER_MEETING to VOLUNTEER_MEETING (if any exist)
TEACHER_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM calendar_events WHERE event_type = 'TEACHER_MEETING';
" | xargs)

if [ "$TEACHER_COUNT" -gt 0 ]; then
    echo "Migrating $TEACHER_COUNT TEACHER_MEETING events to VOLUNTEER_MEETING..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        UPDATE calendar_events 
        SET event_type = 'VOLUNTEER_MEETING'
        WHERE event_type = 'TEACHER_MEETING';
    " -q
    echo "✅ Successfully migrated TEACHER_MEETING events"
else
    echo "No TEACHER_MEETING events to migrate"
fi

# Migrate PLACEHOLDER to OTHER (if any exist)
PLACEHOLDER_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM calendar_events WHERE event_type = 'PLACEHOLDER';
" | xargs)

if [ "$PLACEHOLDER_COUNT" -gt 0 ]; then
    echo "Migrating $PLACEHOLDER_COUNT PLACEHOLDER events to OTHER..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        UPDATE calendar_events 
        SET event_type = 'OTHER'
        WHERE event_type = 'PLACEHOLDER';
    " -q
    echo "✅ Successfully migrated PLACEHOLDER events"
else
    echo "No PLACEHOLDER events to migrate"
fi

# Migrate TRAVEL to OTHER (if any exist)
TRAVEL_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM calendar_events WHERE event_type = 'TRAVEL';
" | xargs)

if [ "$TRAVEL_COUNT" -gt 0 ]; then
    echo "Migrating $TRAVEL_COUNT TRAVEL events to OTHER..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        UPDATE calendar_events 
        SET event_type = 'OTHER'
        WHERE event_type = 'TRAVEL';
    " -q
    echo "✅ Successfully migrated TRAVEL events"
else
    echo "No TRAVEL events to migrate"
fi

echo "Step 7: Convert event_type column back to enum..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    ALTER TABLE calendar_events 
    ALTER COLUMN event_type TYPE eventtype 
    USING event_type::eventtype;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully converted event_type column back to enum"
else
    echo "❌ Failed to convert event_type column back to enum"
    exit 1
fi

echo "Step 6: Verify the new enum values..."
echo "Updated EventType enum values:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT enumlabel as new_values, enumsortorder
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'eventtype'
    ORDER BY e.enumsortorder;
"

echo "Step 7: Verify calendar events after migration..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT event_type, COUNT(*) as count
    FROM calendar_events
    GROUP BY event_type
    ORDER BY event_type;
"

echo "Step 8: Test all enum values..."
echo "Testing enum usage in queries..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 'DIGNITARY_APPOINTMENT'::eventtype as test1,
           'DARSHAN'::eventtype as test2,
           'VOLUNTEER_MEETING'::eventtype as test3,
           'PROJECT_TEAM_MEETING'::eventtype as test4,
           'PRIVATE_EVENT'::eventtype as test5,
           'OTHER'::eventtype as test6;
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
echo "- Synced EventType enum with Python definition"
echo "- Added PROJECT_TEAM_MEETING enum value"
echo "- Migrated outdated enum values to current equivalents"
echo "- Verified enum functionality"
echo ""
echo "📋 Current enum values (in order):"
echo "   1. DIGNITARY_APPOINTMENT"
echo "   2. DARSHAN"
echo "   3. VOLUNTEER_MEETING"
echo "   4. PROJECT_TEAM_MEETING (added)"
echo "   5. PRIVATE_EVENT"
echo "   6. OTHER"
echo ""
echo "🔄 Changes made:"
echo "   ➕ Added: PROJECT_TEAM_MEETING"
echo "   ➖ Removed: TEACHER_MEETING, PLACEHOLDER, TRAVEL"
echo "   📝 Migrated: TEACHER_MEETING → VOLUNTEER_MEETING"
echo "   📝 Migrated: PLACEHOLDER → OTHER"
echo "   📝 Migrated: TRAVEL → OTHER"
echo ""
echo "The EventType enum is now available for use in:"
echo "- calendar_events.event_type"
echo "- Calendar events API filtering"
echo "- Frontend appointment type dropdowns"
echo ""
echo "Next steps:"
echo "1. Restart your FastAPI application"
echo "2. Test the calendar events API endpoints"
echo "3. Verify that PROJECT_TEAM_MEETING filtering works"
echo "4. Test appointment type dropdown functionality"
echo "==========================================" 