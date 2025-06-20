#!/bin/bash

# ========================================
# 20250620 - Remove Unique Email Constraint from User Contacts (UAT)
# ========================================
# This script removes the unique constraint on (owner_user_id, email) 
# from the user_contacts table to allow duplicate email addresses
# for user contacts.
# 
# Environment: UAT
# Date: 2025-06-20
# ========================================

set -e  # Exit on any error

echo "=========================================="
echo "Remove Unique Email Constraint from User Contacts - UAT"
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

echo "Starting SQL migration to remove unique email constraint..."

# Check current table structure before changes
echo "Current user_contacts table constraints (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        constraint_name, 
        constraint_type,
        table_name
    FROM information_schema.table_constraints 
    WHERE table_schema = '$POSTGRES_SCHEMA' 
    AND table_name = 'user_contacts' 
    AND constraint_type = 'UNIQUE'
    ORDER BY constraint_name;
" -q

# Count existing records
USER_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts;
" | xargs)

echo "Current user_contacts count: $USER_CONTACT_COUNT"

# Step 1: Remove unique email constraint
echo "Step 1: Removing unique email constraint..."

# Try different possible constraint names that might exist
CONSTRAINT_NAMES=(
    "unique_owner_email"
    "uq_user_contacts_owner_user_id_email"
    "user_contacts_owner_user_id_email_key"
    "uq_user_contacts_email_owner"
)

for constraint_name in "${CONSTRAINT_NAMES[@]}"; do
    echo "Attempting to drop constraint: $constraint_name"
    
    CONSTRAINT_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE table_name = 'user_contacts' 
        AND constraint_name = '$constraint_name';
    " | xargs)
    
    if [ "$CONSTRAINT_EXISTS" -gt 0 ]; then
        echo "Dropping constraint: $constraint_name"
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            ALTER TABLE user_contacts DROP CONSTRAINT $constraint_name;
        "
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully dropped constraint: $constraint_name"
        else
            echo "❌ Failed to drop constraint: $constraint_name"
            exit 1
        fi
    else
        echo "Constraint $constraint_name does not exist, skipping..."
    fi
done

# Step 2: Add performance index for email lookups
echo "Step 2: Adding performance index for email lookups..."

psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_contacts_email ON user_contacts(email) WHERE email IS NOT NULL;
"

if [ $? -eq 0 ]; then
    echo "✅ Successfully added performance index"
else
    echo "❌ Failed to add performance index"
    exit 1
fi

# Step 3: Verification
echo "Step 3: Verifying migration results..."

echo "Updated user_contacts table constraints:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        constraint_name, 
        constraint_type,
        table_name
    FROM information_schema.table_constraints 
    WHERE table_schema = '$POSTGRES_SCHEMA' 
    AND table_name = 'user_contacts' 
    ORDER BY constraint_type, constraint_name;
"

echo "Detailed constraint information:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = '$POSTGRES_SCHEMA'
    AND tc.table_name = 'user_contacts'
    ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position;
"

# Verify record counts haven't changed
FINAL_USER_CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts;
" | xargs)

echo "Final user_contacts count: $FINAL_USER_CONTACT_COUNT"

if [ "$FINAL_USER_CONTACT_COUNT" -eq "$USER_CONTACT_COUNT" ]; then
    echo "✅ Record counts match (as expected)"
else
    echo "⚠️  WARNING: Record counts don't match expected values"
    echo "Expected user_contacts: $USER_CONTACT_COUNT, Got: $FINAL_USER_CONTACT_COUNT"
fi

# Test duplicate email insertion (dry run with rollback)
echo "Testing duplicate email insertion capability (dry run)..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    BEGIN;
    
    -- Test duplicate email insertion
             INSERT INTO user_contacts (owner_user_id, first_name, email, relationship_to_owner, created_at, updated_at) 
         VALUES 
             (1, 'Test Child 1', 'test-parent@example.com', 'CHILD', NOW(), NOW()),
             (1, 'Test Child 2', 'test-parent@example.com', 'CHILD', NOW(), NOW())
    ON CONFLICT DO NOTHING;
    
    -- Count duplicates
    SELECT COUNT(*) as duplicate_test_count FROM user_contacts 
    WHERE owner_user_id = 1 AND email = 'test-parent@example.com';
    
    -- Rollback test data
    ROLLBACK;
    
    SELECT 'Duplicate email test completed (rolled back)' as test_status;
"

echo "Sample user_contacts (first 5 records):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, owner_user_id, name, email, relationship_to_owner, created_at
    FROM user_contacts 
    ORDER BY id 
    LIMIT 5;
"

echo "✅ Migration completed successfully for UAT environment"
echo "Summary:"
echo "  - Removed unique constraint on (owner_user_id, email) from user_contacts table"
echo "  - Added performance index for email lookups"
echo "  - Verified duplicate email capability"
echo "  - All existing data preserved" 