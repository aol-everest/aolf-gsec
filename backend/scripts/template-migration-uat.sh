#!/bin/bash

# ========================================
# YYYYMMDD - Migration Description (UAT)
# ========================================
# Brief description of what this migration does:
# 1. First change
# 2. Second change  
# 3. Third change
# 
# Environment: UAT
# Date: YYYY-MM-DD
# ========================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}YYYYMMDD - Migration Description (UAT)${NC}"
echo -e "${BLUE}========================================${NC}"

# Set environment variables for UAT
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
    echo ""
    echo -e "${YELLOW}🔐 Please enter the UAT database password:${NC}"
    read -s POSTGRES_PASSWORD
    export POSTGRES_PASSWORD
    echo ""
fi

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
    
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -c "$sql_command" -q; then
        log_message "${GREEN}✅ SQL executed successfully${NC}"
        return 0
    else
        log_message "${RED}❌ SQL execution failed${NC}"
        return 1
    fi
}

# Confirmation prompt for UAT
echo ""
echo -e "${YELLOW}⚠️  WARNING: You are about to modify the UAT database!${NC}"
echo -e "${YELLOW}This migration will: [BRIEF_DESCRIPTION]${NC}"
echo ""
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST"
echo ""
read -p "🚨 Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Migration cancelled.${NC}"
    exit 0
fi

# Main execution
main() {
    log_message "${YELLOW}🚀 Starting [MIGRATION_NAME] migration for UAT...${NC}"
    
    # Check if migration already applied
    log_message "${BLUE}🔍 Checking if migration already applied...${NC}"
    
    # MIGRATION_EXISTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
    #     SELECT COUNT(*) 
    #     FROM information_schema.columns 
    #     WHERE table_schema = '$POSTGRES_SCHEMA' 
    #     AND table_name = 'your_table' 
    #     AND column_name = 'your_column';
    # " | xargs)
    
    # if [[ "$MIGRATION_EXISTS" -gt 0 ]]; then
    #     log_message "${YELLOW}⚠️  Migration already applied. Skipping.${NC}"
    #     return 0
    # fi
    
    # Count existing records before migration
    # RECORD_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
    #     SELECT COUNT(*) FROM $POSTGRES_SCHEMA.your_table;
    # " | xargs)
    
    # log_message "${BLUE}📊 Current record count: $RECORD_COUNT${NC}"
    
    # Step 1: Your first migration step
    log_message "${BLUE}📝 Performing migration step 1...${NC}"
    # execute_sql "
    #     ALTER TABLE $POSTGRES_SCHEMA.your_table 
    #     ADD COLUMN your_column TYPE DEFAULT value;
    # " "Adding your_column to your_table"
    
    # Step 2: Your second migration step
    log_message "${BLUE}📝 Performing migration step 2...${NC}"
    # execute_sql "
    #     CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_your_table_your_column 
    #     ON $POSTGRES_SCHEMA.your_table(your_column);
    # " "Creating index on your_column"
    
    # Verify the changes
    log_message "${BLUE}🔍 Verifying migration results...${NC}"
    # execute_sql "
    #     SELECT column_name, data_type, is_nullable, column_default
    #     FROM information_schema.columns 
    #     WHERE table_schema = '$POSTGRES_SCHEMA' 
    #     AND table_name = 'your_table' 
    #     AND column_name IN ('your_column')
    #     ORDER BY column_name;
    # " "Showing migration results"
    
    log_message "${GREEN}✅ Migration completed successfully!${NC}"
    
    # Summary
    echo ""
    log_message "${GREEN}📋 Migration Summary:${NC}"
    echo -e "${GREEN}   ✅ Step 1 completed${NC}"
    echo -e "${GREEN}   ✅ Step 2 completed${NC}"
    echo -e "${GREEN}   ✅ Verification passed${NC}"
    echo ""
    log_message "${BLUE}🎯 Next steps:${NC}"
    echo -e "${BLUE}   1. 🧪 Test the functionality in UAT${NC}"
    echo -e "${BLUE}   2. ✅ Verify the changes work as expected${NC}"
    echo -e "${BLUE}   3. 🚀 Run production migration after UAT validation${NC}"
}

# Trap to handle script interruption
trap 'log_message "${RED}❌ Script interrupted. Please check the database state.${NC}"; exit 1' INT TERM

# Execute main function
main "$@" 