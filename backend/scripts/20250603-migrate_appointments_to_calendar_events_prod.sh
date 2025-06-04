#!/bin/bash

# Script to migrate approved appointments to calendar events in Production
# This script:
# 1. Updates existing appointments to add request_type (defaults to DIGNITARY)
# 2. Creates CalendarEvent records for existing approved appointments with timezone-aware datetimes
# This should be executed after SSHing into the PROD instance using 'eb ssh'

# Variables for Production environment
MASTER_PASSWORD=""
DB_HOST="aolf-gsec-prod-database.cluster-cxg084kkue8o.us-east-2.rds.amazonaws.com"
DB_USER="aolf_gsec_admin"
DB_NAME="aolf_gsec"

echo "=========================================="
echo "Migrating Appointments to Calendar Events (PRODUCTION)"
echo "=========================================="
echo "WARNING: This will modify production data!"
echo "Ensure you have a recent backup before proceeding."
echo "This script will:"
echo "1. Update existing appointments to set request_type = DIGNITARY"
echo "2. Create calendar events for approved appointments"
echo "=========================================="

# Check if password is provided
if [ -z "$MASTER_PASSWORD" ]; then
    echo "Please set MASTER_PASSWORD variable in this script before running"
    exit 1
fi

# Run SQL migration commands
PGPASSWORD="$MASTER_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'EOF'
SET search_path TO aolf_gsec_app, public;

-- Migration: Update request_type and create CalendarEvent records for existing appointments
-- Date: 2025-06-03
-- Environment: DEV

-- Step 1: Update existing appointments without request_type to DIGNITARY
\echo 'Step 1: Updating appointments without request_type to DIGNITARY...'

UPDATE appointments 
SET request_type = 'DIGNITARY'
WHERE request_type IS NULL;

\echo 'Step 1 completed. Updated appointments with request_type = DIGNITARY'

-- Step 2: Create calendar events for approved appointments without calendar events
\echo 'Step 2: Creating calendar events for approved appointments...'

-- Create a temporary function for timezone mapping based on US states
CREATE OR REPLACE FUNCTION get_timezone_for_location(country_code TEXT, state_code TEXT, location_timezone TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
    -- If location already has timezone, use it
    IF location_timezone IS NOT NULL AND location_timezone != '' THEN
        RETURN location_timezone;
    END IF;
    
    -- Handle US states with hardcoded timezone mapping
    IF country_code = 'US' AND state_code IS NOT NULL THEN
        CASE UPPER(state_code)
            -- Eastern Time Zone
            WHEN 'CT', 'DE', 'FL', 'GA', 'ME', 'MD', 'MA', 'NH', 'NJ', 'NY', 'NC', 'OH', 'PA', 'RI', 'SC', 'VT', 'VA', 'WV', 'DC' THEN
                RETURN 'America/New_York';
            WHEN 'IN', 'KY', 'MI', 'TN' THEN  -- These states have split timezones, defaulting to Eastern
                RETURN 'America/New_York';
            
            -- Central Time Zone  
            WHEN 'AL', 'AR', 'IL', 'IA', 'LA', 'MN', 'MS', 'MO', 'OK', 'WI' THEN
                RETURN 'America/Chicago';
            WHEN 'KS', 'NE', 'ND', 'SD', 'TX' THEN  -- These states have split timezones, defaulting to Central
                RETURN 'America/Chicago';
                
            -- Mountain Time Zone
            WHEN 'CO', 'ID', 'MT', 'NM', 'UT', 'WY' THEN
                RETURN 'America/Denver';
            WHEN 'AZ' THEN
                RETURN 'America/Phoenix';  -- Arizona doesn't observe DST
            WHEN 'NV' THEN  -- Nevada is mostly Pacific, but some areas are Mountain
                RETURN 'America/Los_Angeles';
                
            -- Pacific Time Zone
            WHEN 'CA', 'OR', 'WA' THEN
                RETURN 'America/Los_Angeles';
                
            -- Alaska Time Zone
            WHEN 'AK' THEN
                RETURN 'America/Anchorage';
                
            -- Hawaii Time Zone
            WHEN 'HI' THEN
                RETURN 'Pacific/Honolulu';
                
            ELSE
                RETURN 'America/New_York';  -- Default fallback for unknown US states
        END CASE;
    END IF;
    
    -- Default fallback for non-US or unknown locations
    RETURN 'America/New_York';
END;
$$ LANGUAGE plpgsql;

-- Insert calendar events for approved appointments without calendar events
INSERT INTO calendar_events (
    event_type,
    title,
    description,
    start_datetime,
    start_date,
    start_time,
    duration,
    location_id,
    meeting_place_id,
    max_capacity,
    is_open_for_booking,
    status,
    creation_context,
    creation_context_id,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT 
    -- Determine event type based on request type
    'DIGNITARY_APPOINTMENT'::eventtype as event_type,
    
    -- Create title
    CONCAT(
        CASE a.request_type
            WHEN 'DIGNITARY' THEN 'DIGNITARY_APPOINTMENT'
            WHEN 'DARSHAN' THEN 'DARSHAN'
            WHEN 'PROJECT_TEAM_MEETING' THEN 'VOLUNTEER_MEETING'
            ELSE 'OTHER'
        END,
        ' - ',
        COALESCE(LEFT(a.purpose, 50), '')
    ) as title,
    
    -- Description
    COALESCE(a.purpose, '') as description,
    
    -- Create timezone-aware datetime using location-based timezone
    (a.appointment_date + CASE WHEN a.appointment_time LIKE '%:%' THEN a.appointment_time::TIME ELSE '12:00:00'::TIME END) 
    AT TIME ZONE get_timezone_for_location(l.country_code, l.state_code, l.timezone) 
    AT TIME ZONE 'UTC' as start_datetime,
    
    -- Original date and time
    a.appointment_date as start_date,
    COALESCE(a.appointment_time, '12:00') as start_time,
    
    -- Duration
    COALESCE(a.duration, 30) as duration,
    
    -- Location details
    a.location_id,
    a.meeting_place_id,
    
    -- Capacity and booking settings
    1 as max_capacity,  -- Individual appointments
    false as is_open_for_booking,  -- Not open for booking
    
    -- Status and context
    'CONFIRMED' as status,
    'APPOINTMENT' as creation_context,
    a.id::TEXT as creation_context_id,
    
    -- Audit fields
    a.created_by,
    COALESCE(a.last_updated_by, a.created_by) as updated_by,
    a.created_at,
    COALESCE(a.updated_at, a.created_at) as updated_at

FROM appointments a
LEFT JOIN locations l ON a.location_id = l.id
WHERE a.status = 'APPROVED'
  AND a.appointment_date IS NOT NULL
  AND a.calendar_event_id IS NULL;

-- Get the count of inserted calendar events
\echo 'Step 2: Calendar events created'

-- Step 3: Link appointments to their new calendar events
\echo 'Step 3: Linking appointments to calendar events...'

UPDATE appointments 
SET calendar_event_id = ce.id
FROM calendar_events ce
WHERE appointments.status = 'APPROVED'
  AND appointments.appointment_date IS NOT NULL
  AND appointments.calendar_event_id IS NULL
  AND ce.creation_context = 'APPOINTMENT'
  AND ce.creation_context_id = appointments.id::TEXT;

\echo 'Step 3: Appointments linked to calendar events'

-- Clean up the temporary function
DROP FUNCTION IF EXISTS get_timezone_for_location(TEXT, TEXT, TEXT);

-- Show final summary
\echo 'Migration Summary:'
SELECT 
    'Total appointments with request_type' as metric,
    COUNT(*) as count
FROM appointments 
WHERE request_type IS NOT NULL
UNION ALL
SELECT 
    'Total appointments with calendar events' as metric,
    COUNT(*) as count
FROM appointments 
WHERE calendar_event_id IS NOT NULL
UNION ALL
SELECT 
    'Total calendar events from appointments' as metric,
    COUNT(*) as count
FROM calendar_events 
WHERE creation_context = 'APPOINTMENT';

\echo 'Migration completed successfully!'

EOF

echo "Migration completed for DEV environment!"
echo "Check the output above for migration summary and any errors." 