#!/bin/bash

# Script to add is_active column to locations table - DEV environment
# Date: 2025-06-08
# Description: Adds is_active boolean column to locations table with default value True

set -e  # Exit on any error

echo "=========================================="
echo "Adding is_active column to locations table - DEV"
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

echo "Starting SQL migration to add is_active column..."

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
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        UPDATE locations SET is_active = true WHERE is_active IS NULL;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully updated all locations to active"
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

echo "Step 5: Showing location status summary..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        is_active,
        COUNT(*) as count
    FROM locations 
    GROUP BY is_active
    ORDER BY is_active DESC;
"

echo "Step 6: Showing sample of locations with new column..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, name, is_active 
    FROM locations 
    ORDER BY id 
    LIMIT 5;
"

echo "✅ Migration completed successfully for DEV environment"

echo "=========================================="
echo "Script completed: $(date)"
echo "==========================================" 