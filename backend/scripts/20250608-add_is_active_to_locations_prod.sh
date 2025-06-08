#!/bin/bash

# Script to add is_active column to locations table - PRODUCTION environment
# Date: 2025-06-08
# Description: Adds is_active boolean column to locations table with default value True

set -e  # Exit on any error

echo "=========================================="
echo "Adding is_active column to locations table - PRODUCTION"
echo "Date: $(date)"
echo "=========================================="

# PRODUCTION SAFETY CHECKS
echo "🚨 PRODUCTION ENVIRONMENT DETECTED"
echo "This script will modify the PRODUCTION database"

# Check if running on production environment
if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "PROD" ]; then
    echo "⚠️  WARNING: This script is intended for PRODUCTION environment"
    echo "Current environment: $ENVIRONMENT"
    read -p "Are you sure you want to continue with PRODUCTION deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

# Set environment variables for PRODUCTION
export ENVIRONMENT=production
echo "Environment: $ENVIRONMENT"
export POSTGRES_HOST="aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com"
export POSTGRES_PORT=5432
export POSTGRES_DB=aolf_gsec
export POSTGRES_USER=aolf_gsec_admin
export POSTGRES_PASSWORD=''
export POSTGRES_SCHEMA=aolf_gsec_app


# Database connection should be set via environment variables
# These should already be configured in the PRODUCTION environment:
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

# PRODUCTION SAFETY CONFIRMATIONS
echo ""
echo "🔄 PRODUCTION DEPLOYMENT CHECKLIST:"
echo "   ✓ Code changes have been tested in DEV environment"
echo "   ✓ Code changes have been tested in UAT environment"
echo "   ✓ Database backup has been completed"
echo "   ✓ Application maintenance window is active"
echo "   ✓ Rollback plan is prepared"
echo ""

read -p "Confirm ALL checklist items are complete (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled - please complete all checklist items first"
    exit 1
fi

# Final confirmation
echo ""
echo "🚨 FINAL CONFIRMATION"
echo "You are about to modify the PRODUCTION locations table"
echo "This will add the 'is_active' column with default value TRUE"
echo "All existing locations will remain active (visible to users)"
echo ""
read -p "Type 'PROCEED' to continue with PRODUCTION deployment: " CONFIRMATION
if [ "$CONFIRMATION" != "PROCEED" ]; then
    echo "Operation cancelled - confirmation failed"
    exit 1
fi

# Pre-migration checks
echo "Performing pre-migration checks..."

# Check current table structure
echo "Current locations table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'locations' 
    ORDER BY ordinal_position;
" -q

# Count existing locations
LOCATION_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM aolf_gsec_app.locations;
" | xargs)

echo "Current location count: $LOCATION_COUNT"

if [ "$LOCATION_COUNT" -eq 0 ]; then
    echo "⚠️  WARNING: No locations found in the table"
    read -p "Continue with empty table? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

# Check if is_active column already exists
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
    
    echo "Current is_active value distribution:"
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        SELECT 
            is_active,
            COUNT(*) as count
        FROM aolf_gsec_app.locations 
        GROUP BY is_active
        ORDER BY is_active DESC;
    "
    
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
    echo "Skipping column creation and going to verification..."
else
    echo "Starting SQL migration to add is_active column..."
    
    echo "Step 1: Adding is_active column as nullable..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE aolf_gsec_app.locations ADD COLUMN is_active BOOLEAN;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added is_active column as nullable"
        
        # Immediate verification that column was added
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'locations' AND column_name = 'is_active';
        "
    else
        echo "❌ Failed to add is_active column"
        exit 1
    fi
    
    echo "Step 2: Setting all existing locations to active (true)..."
    
    # Show NULL count before update
    NULL_COUNT_BEFORE=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
        SELECT COUNT(*) FROM aolf_gsec_app.locations WHERE is_active IS NULL;
    " | xargs)
    echo "Locations with NULL is_active before update: $NULL_COUNT_BEFORE"
    
    # Update all NULL values to true
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        UPDATE aolf_gsec_app.locations SET is_active = true WHERE is_active IS NULL;
    "
    
    if [ $? -eq 0 ]; then
        # Verify update was successful
        UPDATED_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
            SELECT COUNT(*) FROM aolf_gsec_app.locations WHERE is_active = true;
        " | xargs)
        
        NULL_COUNT_AFTER=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
            SELECT COUNT(*) FROM aolf_gsec_app.locations WHERE is_active IS NULL;
        " | xargs)
        
        echo "✅ Successfully updated locations to active"
        echo "Locations now active: $UPDATED_COUNT"
        echo "Locations still NULL: $NULL_COUNT_AFTER"
        
        # Ensure no NULL values remain
        if [ "$NULL_COUNT_AFTER" -gt 0 ]; then
            echo "❌ ERROR: $NULL_COUNT_AFTER locations still have NULL is_active values"
            echo "Cannot proceed with making column NOT NULL"
            exit 1
        fi
        
        # Verify count matches expectations
        if [ "$UPDATED_COUNT" -ne "$LOCATION_COUNT" ]; then
            echo "⚠️  WARNING: Updated count ($UPDATED_COUNT) doesn't match expected count ($LOCATION_COUNT)"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Operation cancelled"
                exit 1
            fi
        fi
    else
        echo "❌ Failed to update locations to active"
        exit 1
    fi
    
    echo "Step 3: Making is_active column NOT NULL with default value..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE aolf_gsec_app.locations ALTER COLUMN is_active SET NOT NULL;
        ALTER TABLE aolf_gsec_app.locations ALTER COLUMN is_active SET DEFAULT true;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully made is_active column NOT NULL with default true"
        
        # Verify column constraints
        psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'locations' AND column_name = 'is_active';
        "
    else
        echo "❌ Failed to make is_active column NOT NULL"
        exit 1
    fi
fi

echo "Step 4: Final verification and validation..."

# Verify final column structure
echo "Final column structure:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'is_active';
"

# Verify all locations are active
FINAL_ACTIVE_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM aolf_gsec_app.locations WHERE is_active = true;
" | xargs)

FINAL_TOTAL_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM aolf_gsec_app.locations;
" | xargs)

FINAL_FALSE_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM aolf_gsec_app.locations WHERE is_active = false;
" | xargs)

FINAL_NULL_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM aolf_gsec_app.locations WHERE is_active IS NULL;
" | xargs)

echo "Final counts:"
echo "  Active locations: $FINAL_ACTIVE_COUNT"
echo "  Inactive locations: $FINAL_FALSE_COUNT"
echo "  NULL locations: $FINAL_NULL_COUNT"
echo "  Total locations: $FINAL_TOTAL_COUNT"
echo "  Original count: $LOCATION_COUNT"

# Validate results
if [ "$FINAL_NULL_COUNT" -gt 0 ]; then
    echo "❌ CRITICAL ERROR: $FINAL_NULL_COUNT locations have NULL is_active values"
    exit 1
elif [ "$FINAL_TOTAL_COUNT" -ne "$LOCATION_COUNT" ]; then
    echo "❌ CRITICAL ERROR: Location count changed during migration"
    echo "Expected: $LOCATION_COUNT, Got: $FINAL_TOTAL_COUNT"
    exit 1
elif [ "$FINAL_ACTIVE_COUNT" -ne "$FINAL_TOTAL_COUNT" ]; then
    echo "⚠️  WARNING: Not all locations are active"
    echo "Active: $FINAL_ACTIVE_COUNT, Total: $FINAL_TOTAL_COUNT"
    echo "This might be expected if some locations were manually set to inactive"
else
    echo "✅ All validation checks passed"
fi

echo "Step 5: Final status summary..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT 
        is_active,
        COUNT(*) as count
    FROM aolf_gsec_app.locations 
    GROUP BY is_active
    ORDER BY is_active DESC;
"

echo "Step 6: Sample of locations with new column..."
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, name, is_active 
    FROM aolf_gsec_app.locations 
    ORDER BY id 
    LIMIT 10;
"

echo "✅ PRODUCTION migration completed successfully"
echo "📋 Post-deployment verification steps:"
echo "   1. Test admin interface - verify is_active toggle works"
echo "   2. Test user endpoints - ensure all locations are visible"
echo "   3. Test location disable/enable functionality"
echo "   4. Monitor application logs for any errors"
echo "   5. Verify meeting places work correctly"
echo "   6. Check that existing appointments still reference locations correctly"
echo "   7. Perform smoke test of core application functionality"

echo "=========================================="
echo "PRODUCTION script completed: $(date)"
echo "==========================================" 