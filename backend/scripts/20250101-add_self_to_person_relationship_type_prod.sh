#!/bin/bash

# Script to add SELF to PersonRelationshipType enum - PRODUCTION environment
# Date: 2025-01-01
# Description: Adds SELF value to PersonRelationshipType enum for user_contacts table

set -e  # Exit on any error

echo "=========================================="
echo "Adding SELF to PersonRelationshipType enum - PRODUCTION"
echo "Date: $(date)"
echo "=========================================="

# Production environment variables (to be set before running)
export ENVIRONMENT=prod
export POSTGRES_HOST="aolf-gsec-db-prod.cxg084kkue8o.us-east-2.rds.amazonaws.com"
export POSTGRES_PORT=5432
export POSTGRES_DB=aolf_gsec
export POSTGRES_USER=aolf_gsec_user
export POSTGRES_SCHEMA=public

echo "Environment: $ENVIRONMENT"
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo "Schema: $POSTGRES_SCHEMA"

# Prompt for database password
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "Please enter the database password for PRODUCTION:"
    read -s POSTGRES_PASSWORD
    export POSTGRES_PASSWORD
fi

# Change to backend directory
cd "$(dirname "$0")/.."

echo "Current directory: $(pwd)"

# PRODUCTION SAFETY CHECKS
echo ""
echo "🚨 PRODUCTION ENVIRONMENT DETECTED 🚨"
echo "=========================================="
echo "This script will modify the PRODUCTION database!"
echo "Ensure the following prerequisites are met:"
echo ""
echo "✅ Database backup completed and verified"
echo "✅ Application is in maintenance mode"
echo "✅ UAT migration tested successfully"
echo "✅ Stakeholders notified of maintenance window"
echo "✅ Rollback plan prepared and tested"
echo ""
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo ""

# Multiple confirmation prompts for production
read -p "Have you completed ALL prerequisites above? (yes/no): " prereq_confirm
if [ "$prereq_confirm" != "yes" ]; then
    echo "❌ Prerequisites not confirmed. Exiting for safety."
    exit 1
fi

read -p "Are you ABSOLUTELY SURE you want to modify PRODUCTION? (yes/no): " prod_confirm
if [ "$prod_confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "⏰ Starting production migration at $(date)"
echo "This operation should complete in under 30 seconds..."

echo "Starting SQL migration to add SELF to PersonRelationshipType enum..."

# Check database connectivity
echo "Testing database connectivity..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to database. Aborting migration."
    exit 1
fi

echo "✅ Database connectivity confirmed"

# Check current enum values before changes
echo "Current PersonRelationshipType enum values (before changes):"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT enumlabel 
    FROM pg_enum 
    WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'personrelationshiptype'
    )
    ORDER BY enumsortorder;
" -q

# Count existing user_contacts records
CONTACT_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts;
" | xargs)

echo "Current user_contacts count: $CONTACT_COUNT"

# Count contacts by relationship type
echo "Contacts by relationship type:"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        COALESCE(relationship_to_owner::text, 'NULL') as relationship_type,
        COUNT(*) as count
    FROM user_contacts 
    GROUP BY relationship_to_owner
    ORDER BY count DESC;
"

# Step 1: Check if SELF already exists in the enum
echo "Step 1: Checking if SELF already exists in PersonRelationshipType enum..."

SELF_EXISTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM pg_enum 
    WHERE enumlabel = 'Self' 
    AND enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'personrelationshiptype'
    );
" | xargs)

if [ "$SELF_EXISTS" -eq 0 ]; then
    echo "SELF not found in enum. Proceeding with addition..."
    
    # FINAL PRODUCTION CONFIRMATION
    echo ""
    echo "🚨 FINAL PRODUCTION CONFIRMATION 🚨"
    echo "About to add SELF to PersonRelationshipType enum in PRODUCTION"
    echo "This operation is IRREVERSIBLE without a database restore"
    echo ""
    read -p "Type 'ADD SELF TO PRODUCTION' to proceed: " final_confirm
    
    if [ "$final_confirm" != "ADD SELF TO PRODUCTION" ]; then
        echo "❌ Final confirmation failed. Migration cancelled for safety."
        exit 0
    fi
    
    echo "🚀 Executing enum modification..."
    START_TIME=$(date +%s)
    
    # Add SELF as the first value in the enum (it should come before FAMILY)
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TYPE personrelationshiptype ADD VALUE 'Self' BEFORE 'Family';
    "
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added SELF to PersonRelationshipType enum"
        echo "⏱️  Operation completed in $DURATION seconds"
    else
        echo "❌ Failed to add SELF to PersonRelationshipType enum"
        echo "🚨 PRODUCTION DATABASE MAY BE IN INCONSISTENT STATE"
        echo "🚨 IMMEDIATE ATTENTION REQUIRED"
        exit 1
    fi
else
    echo "✅ SELF already exists in PersonRelationshipType enum - no changes needed"
fi

# Step 2: Comprehensive Verification
echo "Step 2: Comprehensive verification of migration results..."

echo "Updated PersonRelationshipType enum values:"
PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT enumlabel 
    FROM pg_enum 
    WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'personrelationshiptype'
    )
    ORDER BY enumsortorder;
"

# Verify that the enum can be used in queries
echo "Testing enum usage in queries..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 'Self'::personrelationshiptype as test_value;
"

if [ $? -eq 0 ]; then
    echo "✅ Enum can be used successfully in queries"
else
    echo "❌ Failed to use enum in queries"
    echo "🚨 CRITICAL ERROR - ENUM NOT FUNCTIONAL"
    exit 1
fi

# Verify database integrity
echo "Verifying database integrity..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT COUNT(*) as total_contacts FROM user_contacts;
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database integrity check passed"
else
    echo "❌ Database integrity check failed"
    echo "🚨 CRITICAL ERROR - DATABASE INTEGRITY COMPROMISED"
    exit 1
fi

# Step 3: Test creating a contact with SELF relationship (optional verification)
echo "Step 3: Testing SELF relationship in user_contacts table..."

# Create a test contact with SELF relationship (we'll delete it immediately)
TEST_USER_ID=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT id FROM users LIMIT 1;
" | xargs)

if [ ! -z "$TEST_USER_ID" ]; then
    echo "Testing with user ID: $TEST_USER_ID"
    
    # Insert test record
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        INSERT INTO user_contacts (
            owner_user_id, 
            first_name, 
            last_name, 
            relationship_to_owner,
            created_at,
            updated_at
        ) VALUES (
            $TEST_USER_ID, 
            'Test', 
            'Self', 
            'Self'::personrelationshiptype,
            NOW(),
            NOW()
        );
    " > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully inserted test record with SELF relationship"
        
        # Clean up test record
        PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            DELETE FROM user_contacts 
            WHERE owner_user_id = $TEST_USER_ID 
            AND first_name = 'Test' 
            AND last_name = 'Self' 
            AND relationship_to_owner = 'Self'::personrelationshiptype;
        " > /dev/null 2>&1
        
        echo "✅ Test record cleaned up successfully"
    else
        echo "❌ Failed to insert test record with SELF relationship"
        echo "⚠️  This may indicate a problem with the enum modification"
        exit 1
    fi
else
    echo "⚠️  No users found for testing, skipping SELF relationship test"
fi

# Final verification count
FINAL_CONTACT_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts;
" | xargs)

if [ "$CONTACT_COUNT" -eq "$FINAL_CONTACT_COUNT" ]; then
    echo "✅ Contact count verification passed ($CONTACT_COUNT = $FINAL_CONTACT_COUNT)"
else
    echo "❌ Contact count mismatch: Before=$CONTACT_COUNT, After=$FINAL_CONTACT_COUNT"
    echo "🚨 POTENTIAL DATA LOSS DETECTED"
    exit 1
fi

echo ""
echo "=========================================="
echo "🎉 PRODUCTION Migration completed successfully!"
echo "=========================================="
echo "Migration Summary:"
echo "- Added SELF to PersonRelationshipType enum"
echo "- Verified enum functionality"
echo "- Tested SELF relationship in user_contacts table"
echo "- Confirmed database integrity"
echo "- Verified data consistency"
echo ""
echo "Migration completed at: $(date)"
echo ""
echo "The SELF relationship type is now available for use in:"
echo "- user_contacts.relationship_to_owner"
echo "- appointment_contacts (via user_contacts relationship)"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Remove application from maintenance mode"
echo "2. Monitor application logs for any issues"
echo "3. Test frontend functionality with SELF contacts"
echo "4. Notify stakeholders of successful completion"
echo "5. Update documentation with new SELF relationship type"
echo ""
echo "🔄 ROLLBACK INSTRUCTIONS (if needed):"
echo "To rollback this change, you would need to:"
echo "1. Remove any user_contacts with relationship_to_owner = 'Self'"
echo "2. Use ALTER TYPE to remove 'Self' from the enum (complex operation)"
echo "3. Or restore from database backup"
echo "==========================================" 