#!/bin/bash

# Script to run SQL commands for adding timezone and state_code columns to locations table in Production
# This should be executed after SSHing into the relevant instance using 'eb ssh'

# Variables - replace with actual values
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_admin"
DB_NAME="aolf_gsec"

# Run SQL commands directly:
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO aolf_gsec_app, public;

-- Add timezone column to locations if it doesn't exist
ALTER TABLE locations ADD COLUMN IF NOT EXISTS timezone VARCHAR;

-- Add state_code column to locations if it doesn't exist
ALTER TABLE locations ADD COLUMN IF NOT EXISTS state_code VARCHAR;

-- Add lat and lng columns to locations if they don't exist
ALTER TABLE locations ADD COLUMN IF NOT EXISTS lat FLOAT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS lng FLOAT;

-- Add timezones column to countries if it doesn't exist
ALTER TABLE countries ADD COLUMN IF NOT EXISTS timezones VARCHAR[] DEFAULT '{}';

-- Add default_timezone column to countries if it doesn't exist
ALTER TABLE countries ADD COLUMN IF NOT EXISTS default_timezone VARCHAR;

-- Update state_code for US states based on the state name
UPDATE locations
SET state_code = CASE state
    WHEN 'Alabama' THEN 'AL'
    WHEN 'Alaska' THEN 'AK'
    WHEN 'Arizona' THEN 'AZ'
    WHEN 'Arkansas' THEN 'AR'
    WHEN 'California' THEN 'CA'
    WHEN 'Colorado' THEN 'CO'
    WHEN 'Connecticut' THEN 'CT'
    WHEN 'Delaware' THEN 'DE'
    WHEN 'District of Columbia' THEN 'DC'
    WHEN 'Florida' THEN 'FL'
    WHEN 'Georgia' THEN 'GA'
    WHEN 'Hawaii' THEN 'HI'
    WHEN 'Idaho' THEN 'ID'
    WHEN 'Illinois' THEN 'IL'
    WHEN 'Indiana' THEN 'IN'
    WHEN 'Iowa' THEN 'IA'
    WHEN 'Kansas' THEN 'KS'
    WHEN 'Kentucky' THEN 'KY'
    WHEN 'Louisiana' THEN 'LA'
    WHEN 'Maine' THEN 'ME'
    WHEN 'Maryland' THEN 'MD'
    WHEN 'Massachusetts' THEN 'MA'
    WHEN 'Michigan' THEN 'MI'
    WHEN 'Minnesota' THEN 'MN'
    WHEN 'Mississippi' THEN 'MS'
    WHEN 'Missouri' THEN 'MO'
    WHEN 'Montana' THEN 'MT'
    WHEN 'Nebraska' THEN 'NE'
    WHEN 'Nevada' THEN 'NV'
    WHEN 'New Hampshire' THEN 'NH'
    WHEN 'New Jersey' THEN 'NJ'
    WHEN 'New Mexico' THEN 'NM'
    WHEN 'New York' THEN 'NY'
    WHEN 'North Carolina' THEN 'NC'
    WHEN 'North Dakota' THEN 'ND'
    WHEN 'Ohio' THEN 'OH'
    WHEN 'Oklahoma' THEN 'OK'
    WHEN 'Oregon' THEN 'OR'
    WHEN 'Pennsylvania' THEN 'PA'
    WHEN 'Rhode Island' THEN 'RI'
    WHEN 'South Carolina' THEN 'SC'
    WHEN 'South Dakota' THEN 'SD'
    WHEN 'Tennessee' THEN 'TN'
    WHEN 'Texas' THEN 'TX'
    WHEN 'Utah' THEN 'UT'
    WHEN 'Vermont' THEN 'VT'
    WHEN 'Virginia' THEN 'VA'
    WHEN 'Washington' THEN 'WA'
    WHEN 'West Virginia' THEN 'WV'
    WHEN 'Wisconsin' THEN 'WI'
    WHEN 'Wyoming' THEN 'WY'
    ELSE state_code
END
WHERE country_code = 'US' AND (state_code IS NULL OR state_code = '');

EOF

echo "Location table update completed in Production!" 