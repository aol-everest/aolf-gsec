#!/bin/bash

# Script to add is_active column to locations table - UAT environment
# Date: 2025-06-08
# Description: Adds is_active boolean column to locations table with default value True

set -e  # Exit on any error

echo "=========================================="
echo "Adding is_active column to locations table - UAT"
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

# Database connection should be set via environment variables
# These should already be configured in the UAT environment:
# POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_SCHEMA

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

echo "Starting SQL migration to add is_active column..."

# Check current table structure before changes
echo "Current locations table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'locations' 
    ORDER BY ordinal_position;
" -q

# Count existing locations
LOCATION_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM locations;
" | xargs)

echo "Current location count: $LOCATION_COUNT"

# Check if column already exists
COLUMN_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'is_active';
" | xargs)

if [ "$COLUMN_EXISTS" -gt 0 ]; then
    echo "⚠️  WARNING: is_active column already exists in locations table"
    echo "Current is_active column details:"
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'locations' AND column_name = 'is_active';
    "
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
    echo "Skipping column creation..."
else
    echo "Step 1: Adding is_active column as nullable..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE locations ADD COLUMN is_active BOOLEAN;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added is_active column as nullable"
    else
        echo "❌ Failed to add is_active column"
        exit 1
    fi
    
    echo "Step 2: Setting all existing locations to active (true)..."
    # Show before update
    echo "Before update - NULL values:"
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        SELECT COUNT(*) as null_count FROM locations WHERE is_active IS NULL;
    "
    
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        UPDATE locations SET is_active = true WHERE is_active IS NULL;
    "
    
    if [ $? -eq 0 ]; then
        # Verify update
        UPDATED_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
            SELECT COUNT(*) FROM locations WHERE is_active = true;
        " | xargs)
        echo "✅ Successfully updated $UPDATED_COUNT locations to active"
        
        # Check for any remaining NULL values
        NULL_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
            SELECT COUNT(*) FROM locations WHERE is_active IS NULL;
        " | xargs)
        
        if [ "$NULL_COUNT" -gt 0 ]; then
            echo "⚠️  WARNING: $NULL_COUNT locations still have NULL is_active values"
            exit 1
        fi
    else
        echo "❌ Failed to update locations to active"
        exit 1
    fi
    
    echo "Step 3: Making is_active column NOT NULL with default value..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE locations ALTER COLUMN is_active SET NOT NULL;
        ALTER TABLE locations ALTER COLUMN is_active SET DEFAULT true;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully made is_active column NOT NULL with default true"
    else
        echo "❌ Failed to make is_active column NOT NULL"
        exit 1
    fi
fi

echo "Step 4: Verifying final column structure..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'is_active';
"

echo "Step 5: Verifying all locations are active..."
FINAL_ACTIVE_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM locations WHERE is_active = true;
" | xargs)

FINAL_TOTAL_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM locations;
" | xargs)

echo "Active locations: $FINAL_ACTIVE_COUNT"
echo "Total locations: $FINAL_TOTAL_COUNT"

if [ "$FINAL_ACTIVE_COUNT" -eq "$FINAL_TOTAL_COUNT" ] && [ "$FINAL_TOTAL_COUNT" -eq "$LOCATION_COUNT" ]; then
    echo "✅ All locations are active and count matches (as expected)"
else
    echo "⚠️  WARNING: Location counts don't match expected values"
    echo "Expected: $LOCATION_COUNT, Got: $FINAL_TOTAL_COUNT active"
fi

echo "Step 6: Final location status summary..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        is_active,
        COUNT(*) as count
    FROM locations 
    GROUP BY is_active
    ORDER BY is_active DESC;
"

echo "Step 7: Sample of locations with new column..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, name, is_active 
    FROM locations 
    ORDER BY id 
    LIMIT 5;
"

echo "✅ Migration completed successfully for UAT environment"
echo "📋 Next steps:"
echo "   1. Test the admin interface to verify is_active toggle works"
echo "   2. Test user endpoints to ensure all locations are visible"
echo "   3. Test location disable/enable functionality"
echo "   4. Verify meeting places work correctly with inactive locations"

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 