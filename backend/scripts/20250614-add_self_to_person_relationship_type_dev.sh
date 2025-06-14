#!/bin/bash

# Script to add SELF to PersonRelationshipType enum - DEV environment
# Date: 2025-06-14
# Description: Adds SELF value to PersonRelationshipType enum for user_contacts table

set -e  # Exit on any error

echo "=========================================="
echo "Adding SELF to PersonRelationshipType enum - DEV"
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

echo "Starting SQL migration to add SELF to PersonRelationshipType enum..."

# Check current enum values before changes
echo "Current PersonRelationshipType enum values (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
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
CONTACT_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM user_contacts;
" | xargs)

echo "Current user_contacts count: $CONTACT_COUNT"

# Count contacts by relationship type
echo "Contacts by relationship type:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        COALESCE(relationship_to_owner::text, 'NULL') as relationship_type,
        COUNT(*) as count
    FROM user_contacts 
    GROUP BY relationship_to_owner
    ORDER BY count DESC;
"

# Step 1: Check if SELF already exists in the enum
echo "Step 1: Checking if SELF already exists in PersonRelationshipType enum..."

SELF_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM pg_enum 
    WHERE enumlabel = 'SELF' 
    AND enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'personrelationshiptype'
    );
" | xargs)

if [ "$SELF_EXISTS" -eq 0 ]; then
    echo "Adding SELF to PersonRelationshipType enum..."
    
    # Add SELF as the first value in the enum (it should come before FAMILY)
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TYPE personrelationshiptype ADD VALUE 'SELF' BEFORE 'FAMILY';
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added SELF to PersonRelationshipType enum"
    else
        echo "❌ Failed to add SELF to PersonRelationshipType enum"
        exit 1
    fi
else
    echo "SELF already exists in PersonRelationshipType enum"
fi

# Step 2: Verification
echo "Step 2: Verifying migration results..."

echo "Updated PersonRelationshipType enum values:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
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
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 'SELF'::personrelationshiptype as test_value;
"

if [ $? -eq 0 ]; then
    echo "✅ Enum can be used successfully in queries"
else
    echo "❌ Failed to use enum in queries"
    exit 1
fi

# Step 3: Test creating a contact with SELF relationship (optional verification)
echo "Step 3: Testing SELF relationship in user_contacts table..."

# Create a test contact with SELF relationship (we'll delete it immediately)
TEST_USER_ID=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT id FROM users LIMIT 1;
" | xargs)

if [ ! -z "$TEST_USER_ID" ]; then
    echo "Testing with user ID: $TEST_USER_ID"
    
    # Insert test record
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
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
            'SELF'::personrelationshiptype,
            NOW(),
            NOW()
        );
    " > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully inserted test record with SELF relationship"
        
        # Clean up test record
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            DELETE FROM user_contacts 
            WHERE owner_user_id = $TEST_USER_ID 
            AND first_name = 'Test' 
            AND last_name = 'Self' 
            AND relationship_to_owner = 'SELF'::personrelationshiptype;
        " > /dev/null 2>&1
        
        echo "✅ Test record cleaned up successfully"
    else
        echo "❌ Failed to insert test record with SELF relationship"
        exit 1
    fi
else
    echo "⚠️  No users found for testing, skipping SELF relationship test"
fi

echo ""
echo "=========================================="
echo "✅ Migration completed successfully!"
echo "=========================================="
echo "Summary:"
echo "- Added SELF to PersonRelationshipType enum"
echo "- Verified enum functionality"
echo "- Tested SELF relationship in user_contacts table"
echo ""
echo "The SELF relationship type is now available for use in:"
echo "- user_contacts.relationship_to_owner"
echo "- appointment_contacts (via user_contacts relationship)"
echo ""
echo "Next steps:"
echo "1. Update frontend to include SELF option in relationship dropdowns"
echo "2. Update API validation to accept SELF relationship type"
echo "3. Test appointment creation with SELF contacts"
echo "==========================================" 