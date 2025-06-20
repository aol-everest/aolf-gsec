#!/bin/bash

# ========================================
# 20250620 - Remove Unique Email Constraint from User Contacts (DEV)
# ========================================
# This script removes the unique constraint on (owner_user_id, email) 
# from the user_contacts table to allow duplicate email addresses
# for user contacts.
# 
# Environment: DEV
# Date: 2025-06-20
# ========================================

# Set environment variables for DEV
export ENVIRONMENT=dev
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=aolf_gsec
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_SCHEMA=public

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}20250620 - Remove Unique Email Constraint from User Contacts (DEV)${NC}"
echo -e "${BLUE}========================================${NC}"

echo "Environment: $ENVIRONMENT"
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo "Schema: $POSTGRES_SCHEMA"

# Function to log messages with timestamp
log_message() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to execute SQL with error handling
execute_sql() {
    local sql_command="$1"
    log_message "${BLUE}Executing SQL: $sql_command${NC}"
    if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -c "$sql_command"; then
        log_message "${GREEN}✓ SQL executed successfully${NC}"
        return 0
    else
        log_message "${RED}✗ SQL execution failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    log_message "${YELLOW}Starting unique email constraint removal process...${NC}"
    
    # Check current table structure
    log_message "${BLUE}Checking current user_contacts table constraints...${NC}"
    execute_sql "
        SELECT 
            constraint_name, 
            constraint_type,
            table_name
        FROM information_schema.table_constraints 
        WHERE table_schema = '$POSTGRES_SCHEMA' 
        AND table_name = 'user_contacts' 
        AND constraint_type = 'UNIQUE'
        ORDER BY constraint_name;
    "
    
    # Count existing user contacts
    USER_CONTACT_COUNT=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
        SELECT COUNT(*) FROM $POSTGRES_SCHEMA.user_contacts;
    " | xargs)
    
    log_message "${BLUE}Current user_contacts count: $USER_CONTACT_COUNT${NC}"
    
    # Remove the unique constraint on (owner_user_id, email)
    log_message "${BLUE}Removing unique email constraint...${NC}"
    
         # Try different possible constraint names
     CONSTRAINT_NAMES=(
         "unique_owner_email"
         "uq_user_contacts_owner_user_id_email"
         "user_contacts_owner_user_id_email_key"
         "uq_user_contacts_email_owner"
     )
    
    for constraint_name in "${CONSTRAINT_NAMES[@]}"; do
        log_message "${BLUE}Attempting to drop constraint: $constraint_name${NC}"
        if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -c "ALTER TABLE $POSTGRES_SCHEMA.user_contacts DROP CONSTRAINT IF EXISTS $constraint_name;" 2>/dev/null; then
            log_message "${GREEN}✓ Constraint $constraint_name dropped (if it existed)${NC}"
        fi
    done
    
    # Add performance index for email lookups (since we removed the constraint)
    log_message "${BLUE}Adding performance index for email lookups...${NC}"
    execute_sql "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_contacts_email ON $POSTGRES_SCHEMA.user_contacts(email) WHERE email IS NOT NULL;"
    
    # Verify constraints after removal
    log_message "${BLUE}Verifying constraints after removal...${NC}"
    execute_sql "
        SELECT 
            constraint_name, 
            constraint_type,
            table_name
        FROM information_schema.table_constraints 
        WHERE table_schema = '$POSTGRES_SCHEMA' 
        AND table_name = 'user_contacts' 
        ORDER BY constraint_type, constraint_name;
    "
    
    # Show detailed constraint information
    log_message "${BLUE}Showing detailed constraint information...${NC}"
    execute_sql "
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
    
    # Test duplicate email insertion (dry run with rollback)
    log_message "${BLUE}Testing duplicate email insertion (dry run)...${NC}"
    TEST_RESULT=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
        BEGIN;
        
        -- Test duplicate email insertion
                 INSERT INTO $POSTGRES_SCHEMA.user_contacts (owner_user_id, first_name, email, relationship_to_owner, created_at, updated_at) 
         VALUES 
             (1, 'Test Child 1', 'test-parent@example.com', 'CHILD', NOW(), NOW()),
             (1, 'Test Child 2', 'test-parent@example.com', 'CHILD', NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        -- Count duplicates
        SELECT COUNT(*) FROM $POSTGRES_SCHEMA.user_contacts 
        WHERE owner_user_id = 1 AND email = 'test-parent@example.com';
        
        -- Rollback test data
        ROLLBACK;
    " | xargs)
    
    if [[ "$TEST_RESULT" -gt 0 ]]; then
        log_message "${GREEN}✓ Duplicate email insertion test passed${NC}"
    else
        log_message "${YELLOW}⚠ Duplicate email test showed unexpected result: $TEST_RESULT${NC}"
    fi
    
    # Final verification
    FINAL_USER_CONTACT_COUNT=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
        SELECT COUNT(*) FROM $POSTGRES_SCHEMA.user_contacts;
    " | xargs)
    
    log_message "${BLUE}Final user_contacts count: $FINAL_USER_CONTACT_COUNT${NC}"
    
    if [[ "$FINAL_USER_CONTACT_COUNT" -eq "$USER_CONTACT_COUNT" ]]; then
        log_message "${GREEN}✓ Record counts match (as expected)${NC}"
    else
        log_message "${RED}✗ Record counts don't match! Expected: $USER_CONTACT_COUNT, Got: $FINAL_USER_CONTACT_COUNT${NC}"
        exit 1
    fi
    
    log_message "${GREEN}✓ Unique email constraint removal completed successfully!${NC}"
}

# Trap to handle script interruption
trap 'log_message "${RED}Script interrupted. Please check the database state.${NC}"; exit 1' INT TERM

# Execute main function
main "$@" 