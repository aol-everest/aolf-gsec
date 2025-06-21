#!/bin/bash

# ========================================
# YYYYMMDD - Migration Description (DEV)
# ========================================
# Brief description of what this migration does:
# 1. First change
# 2. Second change  
# 3. Third change
# 
# Environment: DEV
# Date: YYYY-MM-DD
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
echo -e "${BLUE}YYYYMMDD - Migration Description (DEV)${NC}"
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
    log_message "${YELLOW}🚀 Starting [MIGRATION_NAME] migration...${NC}"
    
    # Check if migration already applied
    log_message "${BLUE}🔍 Checking if migration already applied...${NC}"
    
    # MIGRATION_EXISTS=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
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
    # RECORD_COUNT=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -U "$POSTGRES_USER" -t -c "
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
    echo -e "${BLUE}   1. 🔄 Restart your application if needed${NC}"
    echo -e "${BLUE}   2. 🧪 Test the new functionality${NC}"
    echo -e "${BLUE}   3. ✅ Verify the changes work as expected${NC}"
}

# Trap to handle script interruption
trap 'log_message "${RED}❌ Script interrupted. Please check the database state.${NC}"; exit 1' INT TERM

# Execute main function
main "$@" 