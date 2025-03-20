#!/bin/bash

# Script to run SQL commands for adding new dignitary fields in UAT
# This should be executed after SSHing into the relevant instance using 'eb ssh'

# Variables - replace with actual values
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-db-uat.cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_user"
DB_NAME="aolf_gsec"

# Run SQL commands directly:
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
-- Add dignitary additional fields
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS other_phone VARCHAR;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS fax VARCHAR;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS street_address VARCHAR;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS social_media JSONB;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS additional_info JSONB;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS secretariat_notes TEXT;

-- Add business card fields
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS business_card_file_name VARCHAR;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS business_card_file_path VARCHAR;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS business_card_file_type VARCHAR;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS business_card_is_image BOOLEAN DEFAULT FALSE;
ALTER TABLE dignitaries ADD COLUMN IF NOT EXISTS business_card_thumbnail_path VARCHAR;
EOF

echo "Dignitary fields update completed in UAT!" 