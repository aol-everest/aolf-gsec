#!/bin/bash

# ========================================
# 20250619 - Add Project Fields to Appointments (PRODUCTION)
# ========================================
# This script adds two new columns to the appointments table:
# 1. objective - Meeting objective for project/team meetings
# 2. attachments_comment - Generic field for attachment-related comments/metadata
# 
# Environment: PRODUCTION
# Date: 2025-06-19
# 
# CRITICAL: This script includes comprehensive safety checks and backups
# ========================================

set -e  # Exit on any error

echo "=========================================="
echo "Adding project fields to appointments table - PRODUCTION"
echo "Date: $(date)"
echo "=========================================="

# PRODUCTION SAFETY CHECKS
echo "🚨 PRODUCTION ENVIRONMENT DETECTED"
echo "This script will modify the PRODUCTION database"

# Check if running on production environment
if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "PROD" ]; then
    echo "⚠️  WARNING: This script is intended for PRODUCTION environment"
    echo "Current environment: $ENVIRONMENT"
    read -p "Are you sure you want to continue with PRODUCTION deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

# Set environment variables for PRODUCTION
export ENVIRONMENT=production
echo "Environment: $ENVIRONMENT"
export POSTGRES_HOST="aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com"
export POSTGRES_PORT=5432
export POSTGRES_DB=aolf_gsec
export POSTGRES_USER=aolf_gsec_admin
export POSTGRES_SCHEMA=aolf_gsec_app

# Prompt for database password
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "Please enter the database password for PRODUCTION:"
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

# PRODUCTION SAFETY CONFIRMATIONS
echo ""
echo "🔄 PRODUCTION DEPLOYMENT CHECKLIST:"
echo "   ✓ Code changes have been tested in DEV environment"
echo "   ✓ Code changes have been tested in UAT environment"
echo "   ✓ Database backup has been completed"
echo "   ✓ Application maintenance window is active"
echo "   ✓ Rollback plan is prepared"
echo "   ✓ Project fields functionality has been verified in lower environments"
echo ""

read -p "Confirm ALL checklist items are complete (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled - please complete all checklist items first"
    exit 1
fi

# Final confirmation
echo ""
echo "🚨 FINAL CONFIRMATION"
echo "You are about to modify the PRODUCTION appointments table"
echo "This will add objective and attachments_comment columns"
echo "All existing data will be preserved"
echo ""
read -p "Type 'PROCEED' to continue with PRODUCTION deployment: " CONFIRMATION
if [ "$CONFIRMATION" != "PROCEED" ]; then
    echo "Operation cancelled - confirmation failed"
    exit 1
fi

# Pre-migration checks
echo "Performing pre-migration checks..."

# Check current table structure
echo "Current appointments table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    ORDER BY ordinal_position;
" -q

# Count existing records
APPOINTMENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM $POSTGRES_SCHEMA.appointments;
" | xargs)

echo "Current appointment count: $APPOINTMENT_COUNT"

if [ "$APPOINTMENT_COUNT" -eq 0 ]; then
    echo "⚠️  WARNING: No appointments found in the table"
    read -p "Continue with empty table? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

echo "Starting SQL migration to add project fields..."

# Create comprehensive backup table for rollback capability
echo "Creating comprehensive backup table for safety..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    -- Create backup table with timestamp
    DROP TABLE IF EXISTS $POSTGRES_SCHEMA.appointments_backup_$BACKUP_TIMESTAMP;
    CREATE TABLE $POSTGRES_SCHEMA.appointments_backup_$BACKUP_TIMESTAMP AS SELECT * FROM $POSTGRES_SCHEMA.appointments;
    
    -- Create backup index
    CREATE INDEX idx_appointments_backup_${BACKUP_TIMESTAMP}_id ON $POSTGRES_SCHEMA.appointments_backup_$BACKUP_TIMESTAMP (id);
"

if [ $? -eq 0 ]; then
    echo "✅ Backup table created successfully with timestamp: $BACKUP_TIMESTAMP"
    
    # Verify backup table record count
    BACKUP_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT COUNT(*) FROM $POSTGRES_SCHEMA.appointments_backup_$BACKUP_TIMESTAMP;
    " | xargs)
    
    echo "Backup verification - appointments: $BACKUP_COUNT"
    
    if [ "$APPOINTMENT_COUNT" -ne "$BACKUP_COUNT" ]; then
        echo "❌ Backup verification failed! Record count mismatch"
        exit 1
    fi
else
    echo "❌ Failed to create backup table"
    exit 1
fi

# Step 1: Add objective column
echo "Step 1: Adding objective column..."

OBJECTIVE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'objective';
" | xargs)

if [ "$OBJECTIVE_EXISTS" -eq 0 ]; then
    echo "🔄 CRITICAL PRODUCTION OPERATION"
    echo "About to add objective column to appointments table"
    read -p "Confirm adding objective column (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
    
    echo "Adding objective column..."
    # Start transaction for atomic operation
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        BEGIN;
        ALTER TABLE $POSTGRES_SCHEMA.appointments ADD COLUMN objective TEXT;
        COMMIT;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added objective column"
        
        # Verify column was added
        VERIFY_OBJECTIVE=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'objective';
        " | xargs)
        
        if [ "$VERIFY_OBJECTIVE" -ne 1 ]; then
            echo "❌ Column verification failed for objective"
            exit 1
        fi
    else
        echo "❌ Failed to add objective column"
        echo "Rolling back changes..."
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            BEGIN;
            DROP TABLE IF EXISTS $POSTGRES_SCHEMA.appointments_temp;
            CREATE TABLE $POSTGRES_SCHEMA.appointments_temp AS SELECT * FROM $POSTGRES_SCHEMA.appointments_backup_$BACKUP_TIMESTAMP;
            TRUNCATE $POSTGRES_SCHEMA.appointments;
            INSERT INTO $POSTGRES_SCHEMA.appointments SELECT * FROM $POSTGRES_SCHEMA.appointments_temp;
            DROP TABLE $POSTGRES_SCHEMA.appointments_temp;
            COMMIT;
        "
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
    echo "🔄 CRITICAL PRODUCTION OPERATION"
    echo "About to add attachments_comment column to appointments table"
    read -p "Confirm adding attachments_comment column (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
    
    echo "Adding attachments_comment column..."
    # Start transaction for atomic operation
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        BEGIN;
        ALTER TABLE $POSTGRES_SCHEMA.appointments ADD COLUMN attachments_comment TEXT;
        COMMIT;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added attachments_comment column"
        
        # Verify column was added
        VERIFY_ATTACHMENTS_COMMENT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'appointments' AND column_name = 'attachments_comment';
        " | xargs)
        
        if [ "$VERIFY_ATTACHMENTS_COMMENT" -ne 1 ]; then
            echo "❌ Column verification failed for attachments_comment"
            exit 1
        fi
    else
        echo "❌ Failed to add attachments_comment column"
        echo "Rolling back changes..."
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            BEGIN;
            DROP TABLE IF EXISTS $POSTGRES_SCHEMA.appointments_temp;
            CREATE TABLE $POSTGRES_SCHEMA.appointments_temp AS SELECT * FROM $POSTGRES_SCHEMA.appointments_backup_$BACKUP_TIMESTAMP;
            TRUNCATE $POSTGRES_SCHEMA.appointments;
            INSERT INTO $POSTGRES_SCHEMA.appointments SELECT * FROM $POSTGRES_SCHEMA.appointments_temp;
            DROP TABLE $POSTGRES_SCHEMA.appointments_temp;
            COMMIT;
        "
        exit 1
    fi
else
    echo "attachments_comment column already exists"
fi

# Step 3: Add indexes for better query performance (with production-safe approach)
echo "Step 3: Adding indexes for project fields..."

# Create indexes concurrently to avoid locking in production
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_appointments_objective ON $POSTGRES_SCHEMA.appointments (objective);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_appointments_attachments_comment ON $POSTGRES_SCHEMA.appointments (attachments_comment);
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully added indexes using CONCURRENTLY"
else
    echo "❌ Failed to add indexes (this may be non-critical)"
fi

# Step 4: Comprehensive Verification
echo "Step 4: Performing comprehensive verification..."

echo "Updated appointments table structure:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' 
    AND column_name IN ('objective', 'attachments_comment')
    ORDER BY column_name;
"

echo "Checking indexes..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        indexname, 
        tablename,
        indexdef
    FROM pg_indexes 
    WHERE tablename = 'appointments'
    AND (indexname LIKE '%objective%' OR indexname LIKE '%attachments_comment%')
    ORDER BY tablename, indexname;
"

# Verify record counts haven't changed
FINAL_APPOINTMENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM $POSTGRES_SCHEMA.appointments;
" | xargs)

echo "Record count verification:"
echo "  appointments: $APPOINTMENT_COUNT -> $FINAL_APPOINTMENT_COUNT"

if [ "$APPOINTMENT_COUNT" -eq "$FINAL_APPOINTMENT_COUNT" ]; then
    echo "✅ Record counts preserved correctly"
else
    echo "❌ Record count mismatch detected!"
    echo "This indicates potential data loss!"
    exit 1
fi

# Verify required columns exist
OBJECTIVE_COLUMN_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'objective';
" | xargs)

ATTACHMENTS_COMMENT_COLUMN_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'attachments_comment';
" | xargs)

if [ "$OBJECTIVE_COLUMN_EXISTS" -ne 1 ] || [ "$ATTACHMENTS_COMMENT_COLUMN_EXISTS" -ne 1 ]; then
    echo "❌ Required columns missing from appointments"
    exit 1
fi

echo "✅ Required columns verified successfully"

echo "Sample appointments with new project fields:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, purpose, objective, attachments_comment, created_at
    FROM $POSTGRES_SCHEMA.appointments 
    ORDER BY id DESC 
    LIMIT 5;
"

# Database health check
echo "Performing database health check..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
    FROM pg_stats 
    WHERE tablename = 'appointments'
    AND attname IN ('objective', 'attachments_comment')
    ORDER BY tablename, attname;
"

echo "✅ Migration completed successfully for PRODUCTION environment"
echo ""
echo "🎉 PRODUCTION MIGRATION SUMMARY 🎉"
echo "  - Added objective column to appointments table ($APPOINTMENT_COUNT records)"
echo "  - Added attachments_comment column to appointments table ($APPOINTMENT_COUNT records)"
echo "  - Added database indexes for performance (using CONCURRENTLY)"
echo "  - All new fields are nullable and default to NULL"
echo "  - Comprehensive backup created: appointments_backup_$BACKUP_TIMESTAMP"
echo "  - Database integrity verified"

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 