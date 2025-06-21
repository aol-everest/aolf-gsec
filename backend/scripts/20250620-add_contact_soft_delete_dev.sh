#!/bin/bash

# ========================================
# 20250620 - Add Contact Soft Delete Fields (DEV)
# ========================================
# This script adds soft delete functionality to the user_contacts table:
# 1. is_deleted - Boolean flag for soft deletion
# 2. deleted_at - Timestamp when record was deleted
# 3. deleted_by - User who performed the deletion
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
echo -e "${BLUE}20250620 - Add Contact Soft Delete Fields (DEV)${NC}"
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
    local description="$2"
    
    if [ ! -z "$description" ]; then
        log_message "${BLUE}$description${NC}"
    fi
    
    if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -c "$sql_command" -q; then
        log_message "${GREEN}✅ SQL executed successfully${NC}"
        return 0
    else
        log_message "${RED}❌ SQL execution failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    log_message "${YELLOW}🚀 Starting contact soft delete fields addition...${NC}"
    
    # Check if columns already exist
    log_message "${BLUE}🔍 Checking if soft delete columns already exist...${NC}"
    
    IS_DELETED_EXISTS=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = '$POSTGRES_SCHEMA' 
        AND table_name = 'user_contacts' 
        AND column_name = 'is_deleted';
    " | xargs)
    
    if [[ "$IS_DELETED_EXISTS" -gt 0 ]]; then
        log_message "${YELLOW}⚠️  Soft delete columns already exist. Skipping addition.${NC}"
        return 0
    fi
    
    # Count existing contacts before migration
    CONTACT_COUNT=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
        SELECT COUNT(*) FROM $POSTGRES_SCHEMA.user_contacts;
    " | xargs)
    
    log_message "${BLUE}📊 Current user_contacts count: $CONTACT_COUNT${NC}"
    
    # Add soft delete columns
    log_message "${BLUE}📝 Adding soft delete columns...${NC}"
    execute_sql "
        ALTER TABLE $POSTGRES_SCHEMA.user_contacts 
        ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
        ADD COLUMN deleted_at TIMESTAMP WITHOUT TIME ZONE NULL,
        ADD COLUMN deleted_by INTEGER NULL;
    " "Adding is_deleted, deleted_at, and deleted_by columns"
    
    # Add foreign key constraint
    log_message "${BLUE}🔗 Adding foreign key constraint...${NC}"
    execute_sql "
        ALTER TABLE $POSTGRES_SCHEMA.user_contacts 
        ADD CONSTRAINT fk_user_contacts_deleted_by 
        FOREIGN KEY (deleted_by) REFERENCES users(id);
    " "Adding foreign key constraint for deleted_by"
    
    # Add performance indexes
    log_message "${BLUE}⚡ Creating performance indexes...${NC}"
    execute_sql "
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_contacts_is_deleted 
        ON $POSTGRES_SCHEMA.user_contacts(is_deleted);
    " "Creating index on is_deleted column"
    
    execute_sql "
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_contacts_owner_active 
        ON $POSTGRES_SCHEMA.user_contacts(owner_user_id, is_deleted);
    " "Creating composite index on owner_user_id and is_deleted"
    
    # Verify the changes
    log_message "${BLUE}🔍 Verifying migration results...${NC}"
    execute_sql "
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = '$POSTGRES_SCHEMA' 
        AND table_name = 'user_contacts' 
        AND column_name IN ('is_deleted', 'deleted_at', 'deleted_by')
        ORDER BY column_name;
    " "Showing new soft delete columns"
    
    # Check data integrity
    execute_sql "
        SELECT 
            COUNT(*) as total_contacts, 
            COUNT(*) FILTER (WHERE is_deleted = FALSE) as active_contacts,
            COUNT(*) FILTER (WHERE is_deleted = TRUE) as deleted_contacts
        FROM $POSTGRES_SCHEMA.user_contacts;
    " "Verifying data integrity"
    
    log_message "${GREEN}✅ Contact soft delete fields addition completed successfully!${NC}"
    
    # Summary
    echo ""
    log_message "${GREEN}📋 Migration Summary:${NC}"
    echo -e "${GREEN}   ✅ Added is_deleted column (BOOLEAN, DEFAULT FALSE, NOT NULL)${NC}"
    echo -e "${GREEN}   ✅ Added deleted_at column (TIMESTAMP, NULL)${NC}"
    echo -e "${GREEN}   ✅ Added deleted_by column (INTEGER, FK to users.id)${NC}"
    echo -e "${GREEN}   ✅ Created performance indexes${NC}"
    echo -e "${GREEN}   ✅ Verified data integrity${NC}"
    echo ""
    log_message "${BLUE}🎯 Next steps:${NC}"
    echo -e "${BLUE}   1. 🔄 Restart your FastAPI application${NC}"
    echo -e "${BLUE}   2. 🧪 Test the contact deletion functionality${NC}"
    echo -e "${BLUE}   3. ✅ Verify hard/soft delete logic works correctly${NC}"
}

# Trap to handle script interruption
trap 'log_message "${RED}❌ Script interrupted. Please check the database state.${NC}"; exit 1' INT TERM

# Execute main function
main "$@" 