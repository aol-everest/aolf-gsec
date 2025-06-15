#!/bin/bash

# Script to add SELF to PersonRelationshipType enum - UAT environment
# Date: 2025-06-14
# Description: Adds SELF value to PersonRelationshipType enum for user_contacts table

set -e  # Exit on any error

echo "=========================================="
echo "Adding SELF to PersonRelationshipType enum - UAT"
echo "Date: $(date)"
echo "=========================================="

# UAT environment variables (to be set before running)
export ENVIRONMENT=uat
export POSTGRES_HOST="aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com"
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
    echo "Please enter the database password for UAT:"
    read -s POSTGRES_PASSWORD
    export POSTGRES_PASSWORD
fi

# Change to backend directory
cd "$(dirname "$0")/.."

echo "Current directory: $(pwd)"

# Confirmation prompt for UAT
echo ""
echo "⚠️  WARNING: You are about to modify the UAT database!"
echo "This will add SELF to the PersonRelationshipType enum."
echo ""
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo "Starting SQL migration to add SELF to PersonRelationshipType enum..."

# Step 0: Grant ownership of the enum to current user (admin permissions)
echo "Step 0: Granting ownership of PersonRelationshipType enum to current user..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    ALTER TYPE personrelationshiptype OWNER TO $POSTGRES_USER;
" -q

if [ $? -eq 0 ]; then
    echo "✅ Successfully granted ownership of PersonRelationshipType enum"
else
    echo "❌ Failed to grant ownership - checking if already owned..."
    # Check if we're already the owner
    CURRENT_OWNER=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT u.usename 
        FROM pg_type t
        JOIN pg_user u ON t.typowner = u.usesysid
        WHERE t.typname = 'personrelationshiptype';
    " | xargs)
    
    if [ "$CURRENT_OWNER" = "$POSTGRES_USER" ]; then
        echo "✅ Current user already owns the enum"
    else
        echo "❌ Current owner is: $CURRENT_OWNER"
        echo "❌ Cannot proceed without ownership. Please run as database admin or contact DBA."
        exit 1
    fi
fi

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
    WHERE enumlabel = 'SELF' 
    AND enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'personrelationshiptype'
    );
" | xargs)

if [ "$SELF_EXISTS" -eq 0 ]; then
    echo "Adding SELF to PersonRelationshipType enum..."
    
    # Final confirmation before making changes
    echo ""
    echo "⚠️  FINAL CONFIRMATION: About to add SELF to PersonRelationshipType enum"
    read -p "Proceed with enum modification? (yes/no): " final_confirm
    
    if [ "$final_confirm" != "yes" ]; then
        echo "Migration cancelled at final confirmation."
        exit 0
    fi
    
    # Add SELF as the first value in the enum (it should come before FAMILY)
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
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
        exit 1
    fi
else
    echo "⚠️  No users found for testing, skipping SELF relationship test"
fi

echo ""
echo "=========================================="
echo "✅ UAT Migration completed successfully!"
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
echo "1. Test frontend changes in UAT environment"
echo "2. Verify appointment creation with SELF contacts"
echo "3. Run production migration after UAT validation"
echo "==========================================" 
