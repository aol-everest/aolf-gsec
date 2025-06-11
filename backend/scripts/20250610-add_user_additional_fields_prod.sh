#!/bin/bash

# Script to add additional user fields to users table - PRODUCTION environment
# Date: 2025-06-10
# Description: Adds professional, location, and Art of Living teacher fields to users table

set -e  # Exit on any error

echo "=========================================="
echo "🚨 PRODUCTION MIGRATION - ADDITIONAL USER FIELDS 🚨"
echo "Date: $(date)"
echo "=========================================="

# PRODUCTION SAFETY CHECK
echo "⚠️  CRITICAL WARNING: This is a PRODUCTION environment script"
echo "This will modify the production database schema"

# Check if running on PROD environment
if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "PROD" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "⚠️  WARNING: This script is intended for PRODUCTION environment"
    echo "Current environment: $ENVIRONMENT"
    read -p "Are you sure you want to continue with PRODUCTION changes? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled"
        exit 1
    fi
fi

# PRODUCTION CHECKLIST
echo ""
echo "🔍 PRODUCTION DEPLOYMENT CHECKLIST:"
echo "Please confirm the following steps have been completed:"
echo ""
echo "1. ✅ Database backup has been taken and verified"
echo "2. ✅ Schema changes have been tested in UAT environment"
echo "3. ✅ Application code is ready to handle new columns"
echo "4. ✅ Rollback procedure is documented and ready"
echo "5. ✅ Team has been notified of the deployment"
echo "6. ✅ Maintenance window has been scheduled (if required)"
echo ""

read -p "Confirm ALL items above are complete (yes/NO): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Production checklist not complete. Exiting for safety."
    exit 1
fi

# Set environment variables for PROD
export ENVIRONMENT=prod
echo "Environment: $ENVIRONMENT"
export POSTGRES_HOST=aolf-gsec-prod.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com
export POSTGRES_PORT=5432
export POSTGRES_DB=aolf_gsec
export POSTGRES_USER=aolf_gsec_admin
export POSTGRES_PASSWORD=''
export POSTGRES_SCHEMA=aolf_gsec_app

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

# Final confirmation with explicit typing
echo ""
echo "🚨 FINAL PRODUCTION CONFIRMATION 🚨"
echo "You are about to modify the PRODUCTION database schema."
echo "This will add new columns to the users table."
echo ""
echo "Type 'PROCEED' in all caps to continue, or anything else to abort:"
read -r FINAL_CONFIRMATION

if [ "$FINAL_CONFIRMATION" != "PROCEED" ]; then
    echo "❌ Production deployment aborted by user"
    exit 1
fi

echo "Starting SQL migration to add additional user fields..."

# Check current table structure before changes
echo "Current users table structure (before changes):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = '$POSTGRES_SCHEMA'
    ORDER BY ordinal_position;
" -q

# Count existing users
USER_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM $POSTGRES_SCHEMA.users;
" | xargs)

echo "Current user count: $USER_COUNT"

# Step 1: Create AOLTeacherStatus enum if it doesn't exist (with schema prefix)
echo "Step 1: Creating AOLTeacherStatus enum if it doesn't exist..."

ENUM_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM pg_type t 
    JOIN pg_namespace n ON t.typnamespace = n.oid 
    WHERE t.typname = 'aolteacherstatus' AND n.nspname = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$ENUM_EXISTS" -eq 0 ]; then
    echo "Creating AOLTeacherStatus enum..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        CREATE TYPE $POSTGRES_SCHEMA.aolteacherstatus AS ENUM ('NOT_TEACHER', 'PART_TIME', 'FULL_TIME');
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created AOLTeacherStatus enum"
    else
        echo "❌ Failed to create AOLTeacherStatus enum"
        exit 1
    fi
else
    echo "AOLTeacherStatus enum already exists, checking values..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        SELECT enumlabel FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typname = 'aolteacherstatus' AND n.nspname = '$POSTGRES_SCHEMA'
        ORDER BY e.enumsortorder;
    "
fi

# Step 2: Add professional information fields
echo "Step 2: Adding professional information fields..."

# Check if title_in_organization column exists
TITLE_IN_ORG_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'title_in_organization' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$TITLE_IN_ORG_EXISTS" -eq 0 ]; then
    echo "Adding title_in_organization column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN title_in_organization VARCHAR;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added title_in_organization column"
    else
        echo "❌ Failed to add title_in_organization column"
        exit 1
    fi
else
    echo "title_in_organization column already exists"
fi

# Check if organization column exists
ORGANIZATION_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'organization' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$ORGANIZATION_EXISTS" -eq 0 ]; then
    echo "Adding organization column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN organization VARCHAR;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added organization column"
    else
        echo "❌ Failed to add organization column"
        exit 1
    fi
else
    echo "organization column already exists"
fi

# Step 3: Add enhanced location information fields
echo "Step 3: Adding enhanced location information fields..."

# Check if state_province column exists
STATE_PROVINCE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'state_province' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$STATE_PROVINCE_EXISTS" -eq 0 ]; then
    echo "Adding state_province column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN state_province VARCHAR;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added state_province column"
    else
        echo "❌ Failed to add state_province column"
        exit 1
    fi
else
    echo "state_province column already exists"
fi

# Check if state_province_code column exists
STATE_PROVINCE_CODE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'state_province_code' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$STATE_PROVINCE_CODE_EXISTS" -eq 0 ]; then
    echo "Adding state_province_code column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN state_province_code VARCHAR;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added state_province_code column"
    else
        echo "❌ Failed to add state_province_code column"
        exit 1
    fi
else
    echo "state_province_code column already exists"
fi

# Check if city column exists
CITY_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'city' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$CITY_EXISTS" -eq 0 ]; then
    echo "Adding city column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN city VARCHAR;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added city column"
    else
        echo "❌ Failed to add city column"
        exit 1
    fi
else
    echo "city column already exists"
fi

# Step 4: Add Art of Living teacher information fields
echo "Step 4: Adding Art of Living teacher information fields..."

# Check if teacher_status column exists
TEACHER_STATUS_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'teacher_status' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$TEACHER_STATUS_EXISTS" -eq 0 ]; then
    echo "Adding teacher_status column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN teacher_status $POSTGRES_SCHEMA.aolteacherstatus DEFAULT 'NOT_TEACHER';
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added teacher_status column"
    else
        echo "❌ Failed to add teacher_status column"
        exit 1
    fi
else
    echo "teacher_status column already exists"
fi

# Check if teacher_code column exists
TEACHER_CODE_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'teacher_code' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$TEACHER_CODE_EXISTS" -eq 0 ]; then
    echo "Adding teacher_code column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN teacher_code VARCHAR;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added teacher_code column"
    else
        echo "❌ Failed to add teacher_code column"
        exit 1
    fi
else
    echo "teacher_code column already exists"
fi

# Check if programs_taught column exists
PROGRAMS_TAUGHT_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'programs_taught' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$PROGRAMS_TAUGHT_EXISTS" -eq 0 ]; then
    echo "Adding programs_taught column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN programs_taught JSON;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added programs_taught column"
    else
        echo "❌ Failed to add programs_taught column"
        exit 1
    fi
else
    echo "programs_taught column already exists"
fi

# Check if aol_affiliations column exists
AOL_AFFILIATIONS_EXISTS=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'aol_affiliations' AND table_schema = '$POSTGRES_SCHEMA';
" | xargs)

if [ "$AOL_AFFILIATIONS_EXISTS" -eq 0 ]; then
    echo "Adding aol_affiliations column..."
    psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
        ALTER TABLE $POSTGRES_SCHEMA.users ADD COLUMN aol_affiliations JSON;
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully added aol_affiliations column"
    else
        echo "❌ Failed to add aol_affiliations column"
        exit 1
    fi
else
    echo "aol_affiliations column already exists"
fi

# Step 5: Verify final table structure
echo "Step 5: Verifying final table structure..."

echo "Final users table structure (new columns only):"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = '$POSTGRES_SCHEMA'
    AND column_name IN ('title_in_organization', 'organization', 'state_province', 'state_province_code', 'city', 'teacher_status', 'teacher_code', 'programs_taught', 'aol_affiliations')
    ORDER BY ordinal_position;
"

# Step 6: Verify record counts haven't changed
echo "Step 6: Verifying record counts..."

FINAL_USER_COUNT=$(psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "
    SELECT COUNT(*) FROM $POSTGRES_SCHEMA.users;
" | xargs)

echo "Final user count: $FINAL_USER_COUNT"

if [ "$FINAL_USER_COUNT" -eq "$USER_COUNT" ]; then
    echo "✅ Record counts match (as expected)"
else
    echo "⚠️  WARNING: Record counts don't match expected values"
    echo "Expected users: $USER_COUNT, Got: $FINAL_USER_COUNT"
fi

# Step 7: Show sample data with new columns
echo "Step 7: Sample data with new columns..."

echo "Sample users with new columns:"
psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
    SELECT id, title_in_organization, organization, state_province, city, teacher_status, created_at
    FROM $POSTGRES_SCHEMA.users 
    ORDER BY id DESC 
    LIMIT 5;
"

echo ""
echo "=========================================="
echo "✅ PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!"
echo "Summary of changes:"
echo "  - Added title_in_organization column to users"
echo "  - Added organization column to users"
echo "  - Added state_province column to users"
echo "  - Added state_province_code column to users"
echo "  - Added city column to users"
echo "  - Added teacher_status column to users (with enum and default 'NOT_TEACHER')"
echo "  - Added teacher_code column to users"
echo "  - Added programs_taught column to users (JSON)"
echo "  - Added aol_affiliations column to users (JSON)"
echo "  - Created AOLTeacherStatus enum if it didn't exist"
echo "Date: $(date)"
echo "Schema: $POSTGRES_SCHEMA"
echo "=========================================="

echo ""
echo "📋 POST-DEPLOYMENT CHECKLIST:"
echo "□ Verify application functionality with new columns"
echo "□ Monitor application logs for any issues"
echo "□ Test user profile updates with new fields"
echo "□ Update documentation with new field descriptions"
echo "□ Notify development team of successful deployment" 