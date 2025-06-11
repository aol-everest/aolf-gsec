#!/bin/bash

# Script to add calendar-related fields to appointments and appointment_dignitaries tables - UAT environment
# Date: 2025-06-10
# Description: Adds calendar_event_id, request_type, number_of_attendees to appointments table
#              and checked_in_at, checked_in_by to appointment_dignitaries table

set -e  # Exit on any error

echo "=========================================="
echo "Adding calendar-related fields - UAT"
echo "Date: $(date)"
echo "=========================================="

# Check if running on UAT environment
if [ "$ENVIRONMENT" != "uat" ] && [ "$ENVIRONMENT" != "UAT" ]; then
    echo "⚠️  WARNING: This script is intended for UAT environment"
    echo "Current environment: $ENVIRONMENT"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

# Set environment variables for UAT
export ENVIRONMENT=uat
echo "Environment: $ENVIRONMENT"
export POSTGRES_HOST=aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com
export POSTGRES_PORT=5432
export POSTGRES_DB=aolf_gsec
export POSTGRES_USER=aolf_gsec_user
export POSTGRES_PASSWORD=''
export POSTGRES_SCHEMA=public

echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo "Schema: $POSTGRES_SCHEMA"

# Verify required environment variables
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
    echo "❌ Error: Required database environment variables not set"
    echo "Please ensure the following are set:"
    echo "  - POSTGRES_HOST"
    echo "  - POSTGRES_DB" 
    echo "  - POSTGRES_USER"
    echo "  - POSTGRES_PASSWORD"
    echo "  - POSTGRES_SCHEMA"
    exit 1
fi

# Change to backend directory
cd "$(dirname "$0")/.."

echo "Current directory: $(pwd)"

# Backup notification
echo "🔄 IMPORTANT: Ensure database backup is completed before proceeding"
read -p "Confirm that database backup is complete (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled - please complete backup first"
    exit 1
fi

echo "Starting SQL migration to add calendar-related fields..."

# Check current table structure before changes
echo "Current appointments table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    ORDER BY ordinal_position;
" -q

echo "Current appointment_dignitaries table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_dignitaries' 
    ORDER BY ordinal_position;
" -q

# Count existing records
APPOINTMENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointments;
" | xargs)

APPOINTMENT_DIGNITARY_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointment_dignitaries;
" | xargs)

echo "Current appointment count: $APPOINTMENT_COUNT"
echo "Current appointment_dignitary count: $APPOINTMENT_DIGNITARY_COUNT"

# Step 1: Create RequestType enum if it doesn't exist
echo "Step 1: Creating RequestType enum if it doesn't exist..."

ENUM_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM pg_type WHERE typname = 'requesttype';
" | xargs)

if [ "$ENUM_EXISTS" -eq 0 ]; then
    echo "Creating RequestType enum..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        CREATE TYPE requesttype AS ENUM ('DIGNITARY', 'DARSHAN', 'PROJECT_TEAM_MEETING', 'OTHER');
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created RequestType enum"
    else
        echo "❌ Failed to create RequestType enum"
        exit 1
    fi
else
    echo "RequestType enum already exists, checking values..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        SELECT enumlabel FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'requesttype' 
        ORDER BY e.enumsortorder;
    "
fi

# Step 2: Add columns to appointments table
echo "Step 2: Adding columns to appointments table..."

# Check if calendar_event_id column exists
CALENDAR_EVENT_ID_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'calendar_event_id';
" | xargs)

if [ "$CALENDAR_EVENT_ID_EXISTS" -eq 0 ]; then
    echo "Adding calendar_event_id column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointments ADD COLUMN calendar_event_id INTEGER;
        ALTER TABLE appointments ADD CONSTRAINT fk_appointments_calendar_event_id 
            FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id);
        CREATE INDEX ix_appointments_calendar_event_id ON appointments (calendar_event_id);
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added calendar_event_id column"
    else
        echo "❌ Failed to add calendar_event_id column"
        exit 1
    fi
else
    echo "calendar_event_id column already exists"
fi

# Check if request_type column exists
REQUEST_TYPE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'request_type';
" | xargs)

if [ "$REQUEST_TYPE_EXISTS" -eq 0 ]; then
    echo "Adding request_type column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointments ADD COLUMN request_type requesttype DEFAULT 'DIGNITARY';
        CREATE INDEX ix_appointments_request_type ON appointments (request_type);
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added request_type column"
        
        # Update existing appointments to have DIGNITARY as request_type
        echo "Updating existing appointments to have DIGNITARY request_type..."
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            UPDATE appointments SET request_type = 'DIGNITARY' WHERE request_type IS NULL;
        "
    else
        echo "❌ Failed to add request_type column"
        exit 1
    fi
else
    echo "request_type column already exists"
fi

# Check if number_of_attendees column exists
NUMBER_OF_ATTENDEES_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'number_of_attendees';
" | xargs)

if [ "$NUMBER_OF_ATTENDEES_EXISTS" -eq 0 ]; then
    echo "Adding number_of_attendees column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointments ADD COLUMN number_of_attendees INTEGER DEFAULT 1;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added number_of_attendees column"
    else
        echo "❌ Failed to add number_of_attendees column"
        exit 1
    fi
else
    echo "number_of_attendees column already exists"
fi

# Step 3: Add columns to appointment_dignitaries table
echo "Step 3: Adding columns to appointment_dignitaries table..."

# Check if checked_in_at column exists
CHECKED_IN_AT_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_dignitaries' AND column_name = 'checked_in_at';
" | xargs)

if [ "$CHECKED_IN_AT_EXISTS" -eq 0 ]; then
    echo "Adding checked_in_at column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointment_dignitaries ADD COLUMN checked_in_at TIMESTAMP;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added checked_in_at column"
    else
        echo "❌ Failed to add checked_in_at column"
        exit 1
    fi
else
    echo "checked_in_at column already exists"
fi

# Check if checked_in_by column exists
CHECKED_IN_BY_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_dignitaries' AND column_name = 'checked_in_by';
" | xargs)

if [ "$CHECKED_IN_BY_EXISTS" -eq 0 ]; then
    echo "Adding checked_in_by column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointment_dignitaries ADD COLUMN checked_in_by INTEGER;
        ALTER TABLE appointment_dignitaries ADD CONSTRAINT fk_appointment_dignitaries_checked_in_by 
            FOREIGN KEY (checked_in_by) REFERENCES users(id);
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added checked_in_by column"
    else
        echo "❌ Failed to add checked_in_by column"
        exit 1
    fi
else
    echo "checked_in_by column already exists"
fi

# Step 4: Verify final table structures
echo "Step 4: Verifying final table structures..."

echo "Final appointments table structure:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name IN ('calendar_event_id', 'request_type', 'number_of_attendees')
    ORDER BY ordinal_position;
"

echo "Final appointment_dignitaries table structure:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointment_dignitaries' 
    AND column_name IN ('checked_in_at', 'checked_in_by')
    ORDER BY ordinal_position;
"

# Step 5: Verify record counts haven't changed
echo "Step 5: Verifying record counts..."

FINAL_APPOINTMENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointments;
" | xargs)

FINAL_APPOINTMENT_DIGNITARY_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointment_dignitaries;
" | xargs)

echo "Final appointment count: $FINAL_APPOINTMENT_COUNT"
echo "Final appointment_dignitary count: $FINAL_APPOINTMENT_DIGNITARY_COUNT"

if [ "$FINAL_APPOINTMENT_COUNT" -eq "$APPOINTMENT_COUNT" ] && [ "$FINAL_APPOINTMENT_DIGNITARY_COUNT" -eq "$APPOINTMENT_DIGNITARY_COUNT" ]; then
    echo "✅ Record counts match (as expected)"
else
    echo "⚠️  WARNING: Record counts don't match expected values"
    echo "Expected appointments: $APPOINTMENT_COUNT, Got: $FINAL_APPOINTMENT_COUNT"
    echo "Expected appointment_dignitaries: $APPOINTMENT_DIGNITARY_COUNT, Got: $FINAL_APPOINTMENT_DIGNITARY_COUNT"
fi

# Step 6: Show sample data with new columns
echo "Step 6: Sample data with new columns..."

echo "Sample appointments with new columns:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, calendar_event_id, request_type, number_of_attendees, created_at
    FROM appointments 
    ORDER BY id DESC 
    LIMIT 5;
"

echo "Sample appointment_dignitaries with new columns:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, appointment_id, dignitary_id, checked_in_at, checked_in_by, created_at
    FROM appointment_dignitaries 
    ORDER BY id DESC 
    LIMIT 5;
"

echo ""
echo "=========================================="
echo "✅ Migration completed successfully!"
echo "Summary of changes:"
echo "  - Added calendar_event_id column to appointments (with FK and index)"
echo "  - Added request_type column to appointments (with enum and index)"
echo "  - Added number_of_attendees column to appointments (default 1)"
echo "  - Added checked_in_at column to appointment_dignitaries"
echo "  - Added checked_in_by column to appointment_dignitaries (with FK)"
echo "  - Created RequestType enum if it didn't exist"
echo "Date: $(date)"
echo "==========================================" 