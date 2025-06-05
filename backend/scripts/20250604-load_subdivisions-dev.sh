#!/bin/bash

# Script to load subdivisions data to the Dev database from CSV file
# Usage: ./load_subdivisions-dev.sh

# Variables - Dev environment
DB_PASSWORD="postgres"
DB_HOST="localhost"  # Default for local development
DB_USER="postgres"
DB_NAME="aolf_gsec"

# Set the schema
SCHEMA="public"

# Path to the CSV file - default to looking in the static data directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSV_FILE="${SCRIPT_DIR}/../static_data/geo/loc242csv/2024-2 SubdivisionCodes.csv"

# Check if CSV file exists
if [ ! -f "$CSV_FILE" ]; then
    echo "Error: Subdivisions CSV file not found at $CSV_FILE"
    exit 1
fi

echo "Found subdivisions CSV file at $CSV_FILE"
echo "Connecting to Dev database: $DB_HOST"
echo "Checking if subdivisions already exist in the database..."

# Check if subdivisions already exist
COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ${SCHEMA}.geo_subdivisions;" 2>/dev/null)
DB_ACCESSIBLE=$?

if [ $DB_ACCESSIBLE -ne 0 ]; then
    echo "Error: Unable to connect to Dev database. Please check your database credentials and connection."
    echo "Current settings:"
    echo "  Host: $DB_HOST"
    echo "  User: $DB_USER" 
    echo "  Database: $DB_NAME"
    echo "  Schema: $SCHEMA"
    exit 1
fi

COUNT=$(echo $COUNT | xargs) # Trim whitespace

if [ "$COUNT" -gt "0" ]; then
    echo "Subdivisions table already has $COUNT records."
    read -p "Do you want to reload all subdivisions? (y/n): " RELOAD
    if [[ $RELOAD != "y" ]]; then
        echo "Aborting operation."
        exit 0
    fi
    
    echo "Deleting existing subdivision records..."
    PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "DELETE FROM ${SCHEMA}.geo_subdivisions;"
fi

# Check if countries table has data (subdivisions depend on countries)
COUNTRY_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ${SCHEMA}.geo_countries;")
COUNTRY_COUNT=$(echo $COUNTRY_COUNT | xargs) # Trim whitespace

if [ "$COUNTRY_COUNT" -eq "0" ]; then
    echo "Warning: Countries table is empty. Subdivisions require countries to exist first."
    read -p "Do you want to continue anyway? (y/n): " CONTINUE
    if [[ $CONTINUE != "y" ]]; then
        echo "Please load countries data first, then run this script."
        exit 0
    fi
else
    echo "Found $COUNTRY_COUNT countries in database."
fi

echo "Loading subdivisions data from CSV file..."

# Create a temporary SQL file
TEMP_SQL_FILE=$(mktemp)

# Generate SQL from CSV using the Python helper script
python3 "${SCRIPT_DIR}/20250604-load_subdivisions_csv_to_sql.py" "$CSV_FILE" > "$TEMP_SQL_FILE"

# Check if SQL generation was successful
if [ $? -ne 0 ]; then
    echo "Error generating SQL from CSV file"
    rm -f "$TEMP_SQL_FILE"
    exit 1
fi

echo "Generated SQL file with $(wc -l < "$TEMP_SQL_FILE") lines"

# Load the SQL into the database
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO ${SCHEMA}, public;
\i $TEMP_SQL_FILE
EOF

# Check if the SQL execution was successful
if [ $? -ne 0 ]; then
    echo "Error executing SQL statements"
    rm -f "$TEMP_SQL_FILE"
    exit 1
fi

# Clean up the temporary file
rm -f "$TEMP_SQL_FILE"

# Get the count of loaded subdivisions
FINAL_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ${SCHEMA}.geo_subdivisions;")
FINAL_COUNT=$(echo $FINAL_COUNT | xargs) # Trim whitespace

echo "Successfully loaded $FINAL_COUNT subdivisions."

# Show a sample of loaded data
echo ""
echo "Sample of loaded subdivisions:"
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SET search_path TO ${SCHEMA}, public;
SELECT country_code, subdivision_code, name, subdivision_type 
FROM geo_subdivisions 
ORDER BY country_code, subdivision_code 
LIMIT 10;
"

# Show subdivision types summary
echo ""
echo "Subdivision types summary:"
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SET search_path TO ${SCHEMA}, public;
SELECT subdivision_type, COUNT(*) as count 
FROM geo_subdivisions 
GROUP BY subdivision_type 
ORDER BY count DESC;
"

# Show countries with most subdivisions
echo ""
echo "Top 10 countries by subdivision count:"
PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SET search_path TO ${SCHEMA}, public;
SELECT s.country_code, c.name as country_name, COUNT(*) as subdivision_count
FROM geo_subdivisions s
LEFT JOIN geo_countries c ON s.country_code = c.iso2_code
GROUP BY s.country_code, c.name
ORDER BY subdivision_count DESC
LIMIT 10;
" 