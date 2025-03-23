#!/bin/bash

# Script to load countries data to the database
# Usage: ./20250321-load_countries.sh

# Variables - replace with actual values
DB_PASSWORD=""
DB_HOST="aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_user"
DB_NAME="aolf_gsec"

# Set the schema
SCHEMA="aolf_gsec_app"

echo "Checking if countries already exist in the database..."

# Check if countries already exist
COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ${SCHEMA}.countries;")
COUNT=$(echo $COUNT | xargs) # Trim whitespace

if [ "$COUNT" -gt "0" ]; then
    echo "Countries table already has $COUNT records."
    read -p "Do you want to reload all countries? (y/n): " RELOAD
    if [[ $RELOAD != "y" ]]; then
        echo "Aborting operation."
        exit 0
    fi
    
    echo "Deleting existing country records..."
    PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "DELETE FROM ${SCHEMA}.countries;"
fi

echo "Loading countries data into database..."

# Load the countries data
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO ${SCHEMA}, public;

-- Insert countries data
-- Using sample data for US and CA, you should replace with all your countries data
INSERT INTO countries (iso2_code, name, iso3_code, region, sub_region, intermediate_region, country_groups, alt_names, is_enabled)
VALUES 
('US', 'United States of America', 'USA', 'Americas', 'Northern America', null, ARRAY[]::VARCHAR[], ARRAY['United States', 'USA']::VARCHAR[], true),
('CA', 'Canada', 'CAN', 'Americas', 'Northern America', null, ARRAY[]::VARCHAR[], ARRAY['Canada']::VARCHAR[], true);

-- Insert additional countries here...
-- For example:
-- ('IN', 'India', 'IND', 'Asia', 'Southern Asia', null, ARRAY[]::VARCHAR[], ARRAY['Republic of India']::VARCHAR[], false),
-- ('GB', 'United Kingdom', 'GBR', 'Europe', 'Northern Europe', null, ARRAY[]::VARCHAR[], ARRAY['UK', 'Great Britain']::VARCHAR[], false),
-- ...

EOF

# Get the count of loaded countries
FINAL_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ${SCHEMA}.countries;")
FINAL_COUNT=$(echo $FINAL_COUNT | xargs) # Trim whitespace

echo "Successfully loaded $FINAL_COUNT countries." 