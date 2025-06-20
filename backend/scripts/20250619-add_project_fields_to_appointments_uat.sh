#!/bin/bash

# ========================================
# 20250619 - Add Project Fields to Appointments (UAT)
# ========================================
# This script adds two new columns to the appointments table:
# 1. objective - Meeting objective for project/team meetings
# 2. attachments_comment - Generic field for attachment-related comments/metadata
# 
# Environment: UAT
# Date: 2025-06-19
# ========================================

set -e  # Exit on any error

echo "=========================================="
echo "Adding project fields to appointments table - UAT"
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
export POSTGRES_SCHEMA=public

# Prompt for database password
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "Please enter the database password for UAT:"
    read -s POSTGRES_PASSWORD
    export POSTGRES_PASSWORD
fi

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

echo "Starting SQL migration to add project fields..."

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

# Step 1: Add objective column
echo "Step 1: Adding objective column..."

OBJECTIVE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'objective';
" | xargs)

if [ "$OBJECTIVE_EXISTS" -eq 0 ]; then
    echo "Adding objective column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointments ADD COLUMN objective TEXT;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added objective column"
    else
        echo "❌ Failed to add objective column"
        exit 1
    fi
else
    echo "objective column already exists"
fi

# Step 2: Add attachments_comment column
echo "Step 2: Adding attachments_comment column..."

ATTACHMENTS_COMMENT_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'attachments_comment';
" | xargs)

if [ "$ATTACHMENTS_COMMENT_EXISTS" -eq 0 ]; then
    echo "Adding attachments_comment column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE appointments ADD COLUMN attachments_comment TEXT;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added attachments_comment column"
    else
        echo "❌ Failed to add attachments_comment column"
        exit 1
    fi
else
    echo "attachments_comment column already exists"
fi

# Step 3: Add indexes for better query performance
echo "Step 3: Adding indexes for project fields..."

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX IF NOT EXISTS ix_appointments_objective ON appointments (objective);
    CREATE INDEX IF NOT EXISTS ix_appointments_attachments_comment ON appointments (attachments_comment);
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully added indexes"
else
    echo "❌ Failed to add indexes"
    exit 1
fi

# Step 4: Verification
echo "Step 4: Verifying migration results..."

echo "Updated appointments table structure:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name IN ('objective', 'attachments_comment')
    ORDER BY column_name;
"

# Verify record counts haven't changed
FINAL_APPOINTMENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM appointments;
" | xargs)

echo "Final appointment count: $FINAL_APPOINTMENT_COUNT"

if [ "$FINAL_APPOINTMENT_COUNT" -eq "$APPOINTMENT_COUNT" ]; then
    echo "✅ Record counts match (as expected)"
else
    echo "⚠️  WARNING: Record counts don't match expected values"
    echo "Expected appointments: $APPOINTMENT_COUNT, Got: $FINAL_APPOINTMENT_COUNT"
fi

echo "Sample appointments with new project fields:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, purpose, objective, attachments_comment, created_at
    FROM appointments 
    ORDER BY id DESC 
    LIMIT 5;
"

echo "✅ Migration completed successfully for UAT environment"
echo "Summary:"
echo "  - Added objective column to appointments table (TEXT, nullable)"
echo "  - Added attachments_comment column to appointments table (TEXT, nullable)"
echo "  - Added database indexes for performance"
echo "  - All existing records preserved"

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 