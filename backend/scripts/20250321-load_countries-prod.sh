#!/bin/bash

# Script to load countries data to the database from JSON file
# Usage: ./20250321-load_countries.sh

# Variables - replace with actual values
DB_PASSWORD=""
DB_HOST="aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_user"
DB_NAME="aolf_gsec"

# Set the schema
SCHEMA="aolf_gsec_app"

# Path to the JSON file - default to looking in the same directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_FILE="${SCRIPT_DIR}/countries.json"

# Check if JSON file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: Countries JSON file not found at $JSON_FILE"
    exit 1
fi

echo "Found countries JSON file at $JSON_FILE"
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

echo "Loading countries data from JSON file..."

# Create a temporary SQL file
TEMP_SQL_FILE=$(mktemp)

# Generate SQL from JSON using the Python helper script
python3 "${SCRIPT_DIR}/20250321-load_countries-json_to_sql.py" "$JSON_FILE" > "$TEMP_SQL_FILE"

# Check if SQL generation was successful
if [ $? -ne 0 ]; then
    echo "Error generating SQL from JSON file"
    rm -f "$TEMP_SQL_FILE"
    exit 1
fi

# Load the SQL into the database
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO ${SCHEMA}, public;
\i $TEMP_SQL_FILE
EOF

# Clean up the temporary file
rm -f "$TEMP_SQL_FILE"

# Get the count of loaded countries
FINAL_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ${SCHEMA}.countries;")
FINAL_COUNT=$(echo $FINAL_COUNT | xargs) # Trim whitespace

echo "Successfully loaded $FINAL_COUNT countries." 
