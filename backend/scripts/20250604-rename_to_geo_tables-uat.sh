#!/bin/bash

# Script to rename tables to geo_ prefix in UAT environment
# Usage: ./rename_to_geo_tables-uat.sh

# Variables - UAT environment
DB_PASSWORD=""
DB_HOST="aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_user"
DB_NAME="aolf_gsec"

# Set the schema
SCHEMA="public"

echo "Renaming tables to geo_ prefix in UAT environment..."
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo "Schema: $SCHEMA"

# Check database connectivity
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Unable to connect to UAT database. Please check your database credentials."
    exit 1
fi

echo "Connected to UAT database successfully."

# Function to check if table exists
table_exists() {
    local table_name=$1
    local exists=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '${SCHEMA}' 
            AND table_name = '${table_name}'
        );
    " | xargs)
    echo $exists
}

echo ""
echo "Step 1: Checking existing tables..."

# Check which tables exist
countries_exists=$(table_exists "countries")
subdivisions_exists=$(table_exists "subdivisions")
geo_countries_exists=$(table_exists "geo_countries")
geo_subdivisions_exists=$(table_exists "geo_subdivisions")

echo "countries table exists: $countries_exists"
echo "subdivisions table exists: $subdivisions_exists"
echo "geo_countries table exists: $geo_countries_exists"
echo "geo_subdivisions table exists: $geo_subdivisions_exists"

# Rename countries table
echo ""
echo "Step 2: Renaming countries table..."
if [ "$countries_exists" = "t" ]; then
    if [ "$geo_countries_exists" = "t" ]; then
        echo "Warning: geo_countries table already exists. Skipping countries rename."
    else
        echo "Renaming countries to geo_countries..."
        PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
            ALTER TABLE ${SCHEMA}.countries RENAME TO geo_countries;
        "
        if [ $? -eq 0 ]; then
            echo "Successfully renamed countries to geo_countries"
        else
            echo "Error renaming countries table"
            exit 1
        fi
    fi
else
    echo "countries table does not exist, nothing to rename"
fi

# Rename subdivisions table
echo ""
echo "Step 3: Renaming subdivisions table..."
if [ "$subdivisions_exists" = "t" ]; then
    if [ "$geo_subdivisions_exists" = "t" ]; then
        echo "Warning: geo_subdivisions table already exists. Skipping subdivisions rename."
    else
        echo "Renaming subdivisions to geo_subdivisions..."
        PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
            ALTER TABLE ${SCHEMA}.subdivisions RENAME TO geo_subdivisions;
        "
        if [ $? -eq 0 ]; then
            echo "Successfully renamed subdivisions to geo_subdivisions"
        else
            echo "Error renaming subdivisions table"
            exit 1
        fi
    fi
else
    echo "subdivisions table does not exist, nothing to rename"
fi

# Update foreign key constraint if it exists
echo ""
echo "Step 4: Updating foreign key constraints..."
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
    DO \$\$
    DECLARE
        constraint_name text;
    BEGIN
        -- Find the foreign key constraint name
        SELECT conname INTO constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = '${SCHEMA}'
        AND t.relname = 'geo_subdivisions'
        AND c.contype = 'f'
        AND c.confrelid = (
            SELECT oid FROM pg_class 
            WHERE relname = 'geo_countries' 
            AND relnamespace = n.oid
        );
        
        -- If constraint exists and doesn't match expected pattern, update it
        IF constraint_name IS NOT NULL AND constraint_name NOT LIKE '%geo_%' THEN
            EXECUTE 'ALTER TABLE ${SCHEMA}.geo_subdivisions DROP CONSTRAINT ' || constraint_name;
            EXECUTE 'ALTER TABLE ${SCHEMA}.geo_subdivisions ADD CONSTRAINT geo_subdivisions_country_code_fkey 
                     FOREIGN KEY (country_code) REFERENCES ${SCHEMA}.geo_countries(iso2_code)';
            RAISE NOTICE 'Updated foreign key constraint from % to geo_subdivisions_country_code_fkey', constraint_name;
        END IF;
    END
    \$\$;
"

echo ""
echo "Table rename completed successfully!"
echo ""
echo "Final table status:"
countries_final=$(table_exists "countries")
subdivisions_final=$(table_exists "subdivisions")
geo_countries_final=$(table_exists "geo_countries")
geo_subdivisions_final=$(table_exists "geo_subdivisions")

echo "countries: $countries_final"
echo "subdivisions: $subdivisions_final"
echo "geo_countries: $geo_countries_final"
echo "geo_subdivisions: $geo_subdivisions_final" 