#!/bin/bash

# Script to add engagement fields to user_contacts and appointment_contacts tables - PRODUCTION environment
# Date: 2025-06-14
# Description: Adds engagement and participation fields to track contact interactions with Gurudev and courses
# WARNING: This script modifies production database. Ensure proper backups and testing before execution.

set -e  # Exit on any error

echo "=========================================="
echo "Adding engagement fields to user_contacts and appointment_contacts tables - PRODUCTION"
echo "Date: $(date)"
echo "=========================================="

# Production safety checks
echo "⚠️  PRODUCTION ENVIRONMENT DETECTED ⚠️"
echo "This script will modify the production database."
echo "Ensure you have:"
echo "1. Recent database backup"
echo "2. Tested this script in UAT environment"
echo "3. Maintenance window scheduled"
echo "4. Rollback plan ready"
echo ""

# Require explicit confirmation for production
read -p "Are you sure you want to proceed with PRODUCTION migration? (type 'YES' to continue): " confirmation
if [ "$confirmation" != "YES" ]; then
    echo "Migration cancelled by user"
    exit 0
fi

# Check if required environment variables are set
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ Required environment variables not set:"
    echo "   POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD must be set"
    exit 1
fi

# Additional production environment validation
if [ -z "$POSTGRES_SSL_MODE" ]; then
    echo "⚠️  POSTGRES_SSL_MODE not set. Setting to 'require' for production"
    export POSTGRES_SSL_MODE=require
fi

# Set environment variables for PRODUCTION
export ENVIRONMENT=prod
export POSTGRES_PORT=${POSTGRES_PORT:-5432}
export POSTGRES_DB=${POSTGRES_DB:-aolf_gsec}
export POSTGRES_SCHEMA=${POSTGRES_SCHEMA:-public}

echo "Environment: $ENVIRONMENT"
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo "Schema: $POSTGRES_SCHEMA"
echo "SSL Mode: $POSTGRES_SSL_MODE"

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

# Verify this is actually production database
echo "Verifying production database..."
DB_SIZE=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));
" | xargs)

echo "Database size: $DB_SIZE"

# Additional confirmation for large databases
read -p "Confirm database name '$POSTGRES_DB' is correct for production (type 'CONFIRM'): " db_confirmation
if [ "$db_confirmation" != "CONFIRM" ]; then
    echo "Database confirmation failed"
    exit 0
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

# Final production warning
echo ""
echo "⚠️  FINAL PRODUCTION WARNING ⚠️"
echo "About to modify production tables with $USER_CONTACT_COUNT user_contacts and $APPOINTMENT_CONTACT_COUNT appointment_contacts"
read -p "Type 'EXECUTE' to proceed with production migration: " final_confirmation
if [ "$final_confirmation" != "EXECUTE" ]; then
    echo "Migration cancelled at final confirmation"
    exit 0
fi

# Create comprehensive backup tables for rollback capability
echo "Creating comprehensive backup tables for safety..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    -- Create backup tables with timestamp
    DROP TABLE IF EXISTS user_contacts_backup_$BACKUP_TIMESTAMP;
    CREATE TABLE user_contacts_backup_$BACKUP_TIMESTAMP AS SELECT * FROM user_contacts;
    
    DROP TABLE IF EXISTS appointment_contacts_backup_$BACKUP_TIMESTAMP;
    CREATE TABLE appointment_contacts_backup_$BACKUP_TIMESTAMP AS SELECT * FROM appointment_contacts;
    
    -- Create backup indexes
    CREATE INDEX idx_user_contacts_backup_${BACKUP_TIMESTAMP}_id ON user_contacts_backup_$BACKUP_TIMESTAMP (id);
    CREATE INDEX idx_appointment_contacts_backup_${BACKUP_TIMESTAMP}_id ON appointment_contacts_backup_$BACKUP_TIMESTAMP (id);
"

if [ $? -eq 0 ]; then
    echo "✅ Backup tables created successfully with timestamp: $BACKUP_TIMESTAMP"
    
    # Verify backup table record counts
    BACKUP_USER_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT COUNT(*) FROM user_contacts_backup_$BACKUP_TIMESTAMP;
    " | xargs)
    
    BACKUP_APPOINTMENT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT COUNT(*) FROM appointment_contacts_backup_$BACKUP_TIMESTAMP;
    " | xargs)
    
    echo "Backup verification - user_contacts: $BACKUP_USER_COUNT, appointment_contacts: $BACKUP_APPOINTMENT_COUNT"
    
    if [ "$USER_CONTACT_COUNT" -ne "$BACKUP_USER_COUNT" ] || [ "$APPOINTMENT_CONTACT_COUNT" -ne "$BACKUP_APPOINTMENT_COUNT" ]; then
        echo "❌ Backup verification failed! Record count mismatch"
        exit 1
    fi
else
    echo "❌ Failed to create backup tables"
    exit 1
fi

# Step 1: Create ENUM types for CourseType and SevaType
echo "Step 1: Creating ENUM types..."

echo "Creating CourseType ENUM with correct database values..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coursetype') THEN
            CREATE TYPE CourseType AS ENUM (
                'SKY',
                'SAHAJ',
                'SILENCE',
                'WISDOM_SERIES',
                'KIDS_TEENS_COURSE',
                'OTHER_COURSE'
            );
            RAISE NOTICE 'Created CourseType ENUM with database values';
        ELSE
            RAISE NOTICE 'CourseType ENUM already exists';
        END IF;
    END\$\$;
"

echo "Creating SevaType ENUM with correct database values..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sevatype') THEN
            CREATE TYPE SevaType AS ENUM (
                'PART_TIME',
                'FULL_TIME'
            );
            RAISE NOTICE 'Created SevaType ENUM with database values';
        ELSE
            RAISE NOTICE 'SevaType ENUM already exists';
        END IF;
    END\$\$;
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully created ENUM types"
else
    echo "❌ Failed to create ENUM types"
    echo "Rolling back..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        DROP TYPE IF EXISTS CourseType;
        DROP TYPE IF EXISTS SevaType;
    "
    exit 1
fi

# Step 1.5: Grant necessary permissions on ENUM types
echo "Step 1.5: Granting permissions on ENUM types..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    GRANT USAGE ON TYPE CourseType TO aolf_gsec_app_user;
    GRANT USAGE ON TYPE SevaType TO aolf_gsec_app_user;
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully granted permissions on ENUM types"
else
    echo "❌ Failed to grant permissions on ENUM types"
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
        
        # Start transaction for atomic operation
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            BEGIN;
            ALTER TABLE user_contacts ADD COLUMN $field_name $field_type;
            COMMIT;
        "
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully added $field_name column"
            
            # Verify column was added
            VERIFY_COLUMN=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'user_contacts' AND column_name = '$field_name';
            " | xargs)
            
            if [ "$VERIFY_COLUMN" -ne 1 ]; then
                echo "❌ Column verification failed for $field_name"
                exit 1
            fi
        else
            echo "❌ Failed to add $field_name column"
            echo "Rolling back changes..."
            psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
                BEGIN;
                DROP TABLE IF EXISTS user_contacts_temp;
                CREATE TABLE user_contacts_temp AS SELECT * FROM user_contacts_backup_$BACKUP_TIMESTAMP;
                TRUNCATE user_contacts;
                INSERT INTO user_contacts SELECT * FROM user_contacts_temp;
                DROP TABLE user_contacts_temp;
                COMMIT;
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
        
        # Start transaction for atomic operation
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            BEGIN;
            ALTER TABLE appointment_contacts ADD COLUMN $field_name $field_type;
            COMMIT;
        "
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully added $field_name column"
            
            # Verify column was added
            VERIFY_COLUMN=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'appointment_contacts' AND column_name = '$field_name';
            " | xargs)
            
            if [ "$VERIFY_COLUMN" -ne 1 ]; then
                echo "❌ Column verification failed for $field_name"
                exit 1
            fi
        else
            echo "❌ Failed to add $field_name column"
            echo "Rolling back changes..."
            psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
                BEGIN;
                DROP TABLE IF EXISTS appointment_contacts_temp;
                CREATE TABLE appointment_contacts_temp AS SELECT * FROM appointment_contacts_backup_$BACKUP_TIMESTAMP;
                TRUNCATE appointment_contacts;
                INSERT INTO appointment_contacts SELECT * FROM appointment_contacts_temp;
                DROP TABLE appointment_contacts_temp;
                COMMIT;
            "
            exit 1
        fi
    else
        echo "$field_name column already exists in appointment_contacts"
    fi
done

# Step 4: Add indexes for better query performance (with production-safe approach)
echo "Step 4: Adding indexes for engagement fields..."

# Create indexes concurrently to avoid locking in production
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_contacts_has_met_gurudev_recently ON user_contacts (has_met_gurudev_recently);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_contacts_is_attending_course ON user_contacts (is_attending_course);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_contacts_course_attending ON user_contacts (course_attending);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_contacts_is_doing_seva ON user_contacts (is_doing_seva);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_user_contacts_seva_type ON user_contacts (seva_type);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_appointment_contacts_has_met_gurudev_recently ON appointment_contacts (has_met_gurudev_recently);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_appointment_contacts_is_attending_course ON appointment_contacts (is_attending_course);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_appointment_contacts_course_attending ON appointment_contacts (course_attending);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_appointment_contacts_is_doing_seva ON appointment_contacts (is_doing_seva);
"

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_appointment_contacts_seva_type ON appointment_contacts (seva_type);
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully added indexes using CONCURRENTLY"
else
    echo "❌ Failed to add some indexes (this may be non-critical)"
fi

# Step 5: Comprehensive Verification
echo "Step 5: Performing comprehensive verification..."

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
        tablename,
        indexdef
    FROM pg_indexes 
    WHERE tablename IN ('user_contacts', 'appointment_contacts')
    AND (indexname LIKE '%course%' OR indexname LIKE '%seva%' OR indexname LIKE '%gurudev%')
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
    LIMIT 3;
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
    echo "This indicates potential data loss!"
    exit 1
fi

# Verify all required columns exist
REQUIRED_COLUMNS=("has_met_gurudev_recently" "is_attending_course" "course_attending" "is_doing_seva" "seva_type")
for table in "user_contacts" "appointment_contacts"; do
    for column in "${REQUIRED_COLUMNS[@]}"; do
        COLUMN_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = '$table' AND column_name = '$column';
        " | xargs)
        
        if [ "$COLUMN_EXISTS" -ne 1 ]; then
            echo "❌ Required column $column missing from $table"
            exit 1
        fi
    done
done

echo "✅ All required columns verified successfully"

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
    WHERE tablename IN ('user_contacts', 'appointment_contacts')
    AND attname IN ('has_met_gurudev_recently', 'is_attending_course', 'course_attending', 'is_doing_seva', 'seva_type')
    ORDER BY tablename, attname;
"

echo "✅ Migration completed successfully for PRODUCTION environment"
echo ""
echo "🎉 PRODUCTION MIGRATION SUMMARY 🎉"
echo "  - Created CourseType and SevaType ENUM types"
echo "  - Added 5 engagement fields to user_contacts table ($USER_CONTACT_COUNT records)"
echo "  - Added 5 engagement fields to appointment_contacts table ($APPOINTMENT_CONTACT_COUNT records)"
echo "  - Added database indexes for performance (using CONCURRENTLY)"
echo "  - All new fields are nullable and default to NULL"
echo "  - Comprehensive backup created: user_contacts_backup_$BACKUP_TIMESTAMP, appointment_contacts_backup_$BACKUP_TIMESTAMP"
echo "  - Database integrity verified"
echo ""
echo "📋 ROLLBACK INSTRUCTIONS (if needed):"
echo "  To rollback this migration, run:"
echo "  psql -c \"TRUNCATE user_contacts; INSERT INTO user_contacts SELECT * FROM user_contacts_backup_$BACKUP_TIMESTAMP;\""
echo "  psql -c \"TRUNCATE appointment_contacts; INSERT INTO appointment_contacts SELECT * FROM appointment_contacts_backup_$BACKUP_TIMESTAMP;\""
echo "  psql -c \"DROP TYPE IF EXISTS CourseType; DROP TYPE IF EXISTS SevaType;\""

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 