#!/bin/bash

# Script to add preferred date range columns to appointments table - UAT environment
# Date: 2025-06-13
# Description: Adds preferred_start_date and preferred_end_date columns to appointments table
#              Migrates existing preferred_date data for non-dignitary appointments

set -e  # Exit on any error

echo "=========================================="
echo "Adding preferred date range columns to appointments table - UAT"
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

echo "Starting SQL migration to add preferred date range columns..."

# Check current table structure before changes
echo "Current appointments table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    ORDER BY ordinal_position;
" -q

# Count existing records
APPOINTMENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointments;
" | xargs)

echo "Current appointment count: $APPOINTMENT_COUNT"

# Count appointments by request type
echo "Appointments by request type:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        COALESCE(request_type::text, 'NULL') as request_type,
        COUNT(*) as count
    FROM appointments 
    GROUP BY request_type
    ORDER BY count DESC;
"

# Step 1: Add preferred_start_date column
echo "Step 1: Adding preferred_start_date column..."

PREFERRED_START_DATE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'preferred_start_date';
" | xargs)

if [ "$PREFERRED_START_DATE_EXISTS" -eq 0 ]; then
    echo "Adding preferred_start_date column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointments ADD COLUMN preferred_start_date DATE;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added preferred_start_date column"
    else
        echo "❌ Failed to add preferred_start_date column"
        exit 1
    fi
else
    echo "preferred_start_date column already exists"
fi

# Step 2: Add preferred_end_date column
echo "Step 2: Adding preferred_end_date column..."

PREFERRED_END_DATE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'preferred_end_date';
" | xargs)

if [ "$PREFERRED_END_DATE_EXISTS" -eq 0 ]; then
    echo "Adding preferred_end_date column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointments ADD COLUMN preferred_end_date DATE;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added preferred_end_date column"
    else
        echo "❌ Failed to add preferred_end_date column"
        exit 1
    fi
else
    echo "preferred_end_date column already exists"
fi

# Step 3: Migrate existing data for non-dignitary appointments
echo "Step 3: Migrating existing preferred_date data for non-dignitary appointments..."

# Count non-dignitary appointments with preferred_date
NON_DIGNITARY_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM appointments 
    WHERE request_type IN ('DARSHAN', 'PROJECT_TEAM_MEETING', 'OTHER') 
    AND preferred_date IS NOT NULL;
" | xargs)

echo "Non-dignitary appointments with preferred_date to migrate: $NON_DIGNITARY_COUNT"

if [ "$NON_DIGNITARY_COUNT" -gt 0 ]; then
    echo "Migrating $NON_DIGNITARY_COUNT non-dignitary appointments..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        UPDATE appointments 
        SET 
            preferred_start_date = preferred_date,
            preferred_end_date = preferred_date
        WHERE request_type IN ('DARSHAN', 'PROJECT_TEAM_MEETING', 'OTHER') 
        AND preferred_date IS NOT NULL
        AND (preferred_start_date IS NULL OR preferred_end_date IS NULL);
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully migrated preferred_date data for non-dignitary appointments"
    else
        echo "❌ Failed to migrate preferred_date data"
        exit 1
    fi
else
    echo "No non-dignitary appointments with preferred_date found to migrate"
fi

# Step 4: Add database constraints and indexes
echo "Step 4: Adding constraints and indexes..."

# Add check constraint to ensure end_date >= start_date
echo "Adding date range validation constraint..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DO \$\$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE c.conname = 'chk_preferred_date_range'
            AND t.relname = 'appointments'
        ) THEN
            ALTER TABLE appointments 
            ADD CONSTRAINT chk_preferred_date_range 
            CHECK (preferred_end_date >= preferred_start_date);
        END IF;
    END\$\$;
"

# Add index for preferred date range queries
echo "Adding indexes for date range queries..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX IF NOT EXISTS ix_appointments_preferred_start_date ON appointments (preferred_start_date);
    CREATE INDEX IF NOT EXISTS ix_appointments_preferred_end_date ON appointments (preferred_end_date);
    CREATE INDEX IF NOT EXISTS ix_appointments_preferred_date_range ON appointments (preferred_start_date, preferred_end_date);
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully added constraints and indexes"
else
    echo "❌ Failed to add constraints and indexes"
    exit 1
fi

# Step 5: Verification
echo "Step 5: Verifying migration results..."

echo "Updated appointments table structure:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name IN ('preferred_date', 'preferred_start_date', 'preferred_end_date')
    ORDER BY column_name;
"

echo "Verification: Date range data summary..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        request_type,
        COUNT(*) as total_appointments,
        COUNT(preferred_date) as has_preferred_date,
        COUNT(preferred_start_date) as has_preferred_start_date,
        COUNT(preferred_end_date) as has_preferred_end_date
    FROM appointments 
    GROUP BY request_type
    ORDER BY total_appointments DESC;
"

echo "Sample of migrated appointments (non-dignitary with date ranges):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        id, 
        request_type,
        preferred_date,
        preferred_start_date,
        preferred_end_date
    FROM appointments 
    WHERE request_type IN ('DARSHAN', 'PROJECT_TEAM_MEETING', 'OTHER')
    AND preferred_start_date IS NOT NULL
    ORDER BY id 
    LIMIT 5;
"

echo "Checking constraints..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        constraint_name, 
        constraint_type 
    FROM information_schema.table_constraints 
    WHERE table_name = 'appointments' 
    AND constraint_name LIKE '%preferred%';
"

echo "✅ Migration completed successfully for UAT environment"
echo "Summary:"
echo "  - Added preferred_start_date and preferred_end_date columns"
echo "  - Migrated $NON_DIGNITARY_COUNT non-dignitary appointments"
echo "  - Added date range validation constraints"
echo "  - Added database indexes for performance"

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 