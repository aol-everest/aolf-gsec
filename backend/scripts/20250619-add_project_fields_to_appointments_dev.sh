#!/bin/bash

# ========================================
# 20250619 - Add Project Fields to Appointments (DEV)
# ========================================
# This script adds two new columns to the appointments table:
# 1. objective - Meeting objective for project/team meetings
# 2. attachments_comment - Generic field for attachment-related comments/metadata
# 
# Environment: DEV
# Date: 2025-06-19
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
echo -e "${BLUE}20250619 - Add Project Fields to Appointments (DEV)${NC}"
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
    log_message "${YELLOW}Starting project fields addition process...${NC}"
    
    # Check if columns already exist
    log_message "${BLUE}Checking if columns already exist...${NC}"
    
    OBJECTIVE_EXISTS=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = '$POSTGRES_SCHEMA' 
        AND table_name = 'appointments' 
        AND column_name = 'objective';
    " | xargs)
    
    ATTACHMENTS_COMMENT_EXISTS=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = '$POSTGRES_SCHEMA' 
        AND table_name = 'appointments' 
        AND column_name = 'attachments_comment';
    " | xargs)
    
    if [[ "$OBJECTIVE_EXISTS" -gt 0 && "$ATTACHMENTS_COMMENT_EXISTS" -gt 0 ]]; then
        log_message "${YELLOW}Both columns already exist. Skipping addition.${NC}"
        return 0
    fi
    
    # Add objective column if it doesn't exist
    if [[ "$OBJECTIVE_EXISTS" -eq 0 ]]; then
        log_message "${BLUE}Adding 'objective' column...${NC}"
        if ! execute_sql "ALTER TABLE $POSTGRES_SCHEMA.appointments ADD COLUMN objective TEXT;"; then
            log_message "${RED}Failed to add 'objective' column${NC}"
            exit 1
        fi
        
        # Add comment to objective column
        execute_sql "COMMENT ON COLUMN $POSTGRES_SCHEMA.appointments.objective IS 'Meeting objective - what would you like to get out of the meeting? (expected outcome)';"
    else
        log_message "${YELLOW}'objective' column already exists, skipping...${NC}"
    fi
    
    # Add attachments_comment column if it doesn't exist
    if [[ "$ATTACHMENTS_COMMENT_EXISTS" -eq 0 ]]; then
        log_message "${BLUE}Adding 'attachments_comment' column...${NC}"
        if ! execute_sql "ALTER TABLE $POSTGRES_SCHEMA.appointments ADD COLUMN attachments_comment TEXT;"; then
            log_message "${RED}Failed to add 'attachments_comment' column${NC}"
            exit 1
        fi
        
        # Add comment to attachments_comment column
        execute_sql "COMMENT ON COLUMN $POSTGRES_SCHEMA.appointments.attachments_comment IS 'Generic field for attachment-related comments/metadata';"
    else
        log_message "${YELLOW}'attachments_comment' column already exists, skipping...${NC}"
    fi
    
    # Create indexes for better performance
    log_message "${BLUE}Creating indexes...${NC}"
    execute_sql "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_objective ON $POSTGRES_SCHEMA.appointments(objective) WHERE objective IS NOT NULL;"
    execute_sql "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_attachments_comment ON $POSTGRES_SCHEMA.appointments(attachments_comment) WHERE attachments_comment IS NOT NULL;"
    
    # Verify the changes
    log_message "${BLUE}Verifying changes...${NC}"
    execute_sql "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = '$POSTGRES_SCHEMA' AND table_name = 'appointments' AND column_name IN ('objective', 'attachments_comment') ORDER BY column_name;"
    
    log_message "${GREEN}✓ Project fields addition completed successfully!${NC}"
}

# Trap to handle script interruption
trap 'log_message "${RED}Script interrupted. Please check the database state.${NC}"; exit 1' INT TERM

# Execute main function
main "$@" 