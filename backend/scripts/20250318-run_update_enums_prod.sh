#!/bin/bash

# Script to run SQL commands for updating appointment enums in Production
# This should be executed after SSHing into the relevant instance using 'eb ssh'

# Variables - replace with actual values
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_admin"
DB_NAME="aolf_gsec"

# Run SQL commands directly:
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
SET search_path TO aolf_gsec_app, public;

-- 1. Create new enum types with versioned names
CREATE TYPE appointmenttype_v2 AS ENUM (
    'EXCLUSIVE_APPOINTMENT', 'SHARED_APPOINTMENT', 'DARSHAN_LINE', 'PRIVATE_EVENT'
);

CREATE TYPE appointmentsubstatus_v2 AS ENUM (
    'CANCELLED', 'FOLLOW_UP_REQUIRED', 'LOW_PRIORITY', 'MET_GURUDEV', 'NEED_MORE_INFO', 'NEED_RESCHEDULE', 'NO_FURTHER_ACTION', 'NOT_REVIEWED', 'SHORTLISTED', 'UNDER_CONSIDERATION', 'UNSCHEDULED', 'SCHEDULED'
);

-- 2. Add new columns with the versioned enum types
ALTER TABLE appointments ADD COLUMN appointment_type_new appointmenttype_v2;
ALTER TABLE appointments ADD COLUMN sub_status_new appointmentsubstatus_v2;

-- 3. Update the new columns with appropriate values from old columns
UPDATE appointments
SET 
    appointment_type_new = CASE 
        WHEN appointment_type::TEXT = 'PRIVATE' THEN 'EXCLUSIVE_APPOINTMENT'::appointmenttype_v2
        WHEN appointment_type::TEXT = 'SMALL_GROUP' THEN 'SHARED_APPOINTMENT'::appointmenttype_v2
        WHEN sub_status::TEXT = 'DARSHAN_LINE' THEN 'DARSHAN_LINE'::appointmenttype_v2
        ELSE appointment_type::TEXT::appointmenttype_v2
    END,
    sub_status_new = CASE
        WHEN sub_status::TEXT = 'DARSHAN_LINE' AND status::TEXT = 'APPROVED' THEN 'SCHEDULED'::appointmentsubstatus_v2  
        WHEN sub_status::TEXT = 'DARSHAN_LINE' THEN 'UNDER_CONSIDERATION'::appointmentsubstatus_v2
        ELSE sub_status::TEXT::appointmentsubstatus_v2
    END;

-- Make the new columns NOT NULL after data is populated
ALTER TABLE appointments ALTER COLUMN sub_status_new SET NOT NULL;

-- 4. Drop the old columns
ALTER TABLE appointments DROP COLUMN appointment_type;
ALTER TABLE appointments DROP COLUMN sub_status;

-- 5. Rename the new columns to the original names
ALTER TABLE appointments RENAME COLUMN appointment_type_new TO appointment_type;
ALTER TABLE appointments RENAME COLUMN sub_status_new TO sub_status;

-- 6. Clean up the old enum types (they are no longer referenced)
DROP TYPE appointmenttype;
DROP TYPE appointmentsubstatus;

-- 7. Rename the enum types to the original names
ALTER TYPE appointmenttype_v2 RENAME TO appointmenttype;
ALTER TYPE appointmentsubstatus_v2 RENAME TO appointmentsubstatus;
EOF

echo "Database enum update completed in Production!" 