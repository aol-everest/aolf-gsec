# Add Engagement Fields Migration Summary

**Date:** 2025-06-14  
**Migration Scripts:**
- `20250614-add_engagement_fields_dev.sh`
- `20250614-add_engagement_fields_uat.sh`
- `20250614-add_engagement_fields_prod.sh`

## Overview

This migration adds engagement and participation tracking fields to the `appointment_contacts` table to capture contact interactions with Gurudev and course participation.

## Changes Made

### Database Schema Changes

1. **New ENUM Types:**
   - `CourseType`: SKY, Sahaj, Silence, Wisdom Series, Kids/Teens Course, Other Course
   - `SevaType`: Part Time, Full Time

2. **New Fields Added to appointment_contacts Table:**
   - `has_met_gurudev_recently` (BOOLEAN, nullable)
   - `is_attending_course` (BOOLEAN, nullable)
   - `course_attending` (CourseType ENUM, nullable)
   - `is_doing_seva` (BOOLEAN, nullable)
   - `seva_type` (SevaType ENUM, nullable)

3. **Database Indexes:**
   - Performance indexes added for all new fields on appointment_contacts table
   - Production uses `CREATE INDEX CONCURRENTLY` to avoid locking

### Application Changes

1. **Backend Models:**
   - Updated `backend/models/enums.py` with new CourseType and SevaType enums
   - Updated `backend/models/appointmentContact.py` with engagement fields

2. **Frontend Types:**
   - Updated `frontend/src/models/types.ts` with new fields in AppointmentContact interface
   - Updated PersonalAttendeeFormData interface in AppointmentRequestForm

3. **Frontend Forms:**
   - Updated `frontend/src/components/AppointmentRequestForm.tsx` with new engagement form fields
   - Added conditional logic: seva questions only shown if not attending course
   - Added subtext "in last 2 weeks" for Gurudev meeting question

4. **Frontend Display:**
   - Updated `frontend/src/components/appointment-sections/ContactsSection.tsx` to display engagement information
   - Shows course information, seva status, and recent Gurudev meetings

## Business Logic

### Form Behavior
- Engagement questions are asked only for non-dignitary appointments
- Seva questions are conditionally displayed only if the contact is not attending a course
- All new fields are optional and default to NULL/empty

### Display Logic
- ContactsSection shows engagement information in a structured format
- Course information displayed with type and attendance status
- Seva information shown with type (Part Time/Full Time)
- Recent Gurudev meetings indicated with "in last 2 weeks" context

## Migration Execution Order

1. **Development:** Run `20250614-add_engagement_fields_dev.sh`
2. **UAT:** Run `20250614-add_engagement_fields_uat.sh` (requires environment variables)
3. **Production:** Run `20250614-add_engagement_fields_prod.sh` (requires confirmations and backups)

## Safety Features

### Development
- Basic error handling and verification
- Simple column existence checks

### UAT
- Environment variable validation
- Database connection testing
- Backup table creation with timestamp
- Record count verification
- Basic rollback capability

### Production
- Multiple confirmation prompts
- Comprehensive backup strategy with timestamps
- Atomic transactions for each column addition
- `CREATE INDEX CONCURRENTLY` to avoid table locking
- Extensive verification and health checks
- Detailed rollback instructions provided

## Rollback Strategy

### Immediate Rollback (Production)
If migration fails during execution, automatic rollback is attempted.

### Manual Rollback (Post-Migration)
```sql
-- Restore from backup tables
TRUNCATE user_contacts;
INSERT INTO user_contacts SELECT * FROM user_contacts_backup_YYYYMMDD_HHMMSS;

TRUNCATE appointment_contacts;
INSERT INTO appointment_contacts SELECT * FROM appointment_contacts_backup_YYYYMMDD_HHMMSS;

-- Drop new ENUM types (optional)
DROP TYPE IF EXISTS CourseType;
DROP TYPE IF EXISTS SevaType;
```

## Verification Steps

1. **Column Existence:** Verify all 5 fields exist in both tables
2. **ENUM Types:** Confirm CourseType and SevaType are created with correct values
3. **Indexes:** Verify all performance indexes are created
4. **Record Counts:** Ensure no data loss during migration
5. **Default Values:** Confirm all new fields are NULL by default
6. **Application Testing:** Test form submission and display functionality

## Dependencies

- PostgreSQL database with existing `user_contacts` and `appointment_contacts` tables
- React frontend with existing AppointmentRequestForm component
- Backend models with SQLAlchemy

## Performance Impact

- **Minimal:** New columns are nullable and won't affect existing queries
- **Indexes:** Added for optimal performance on engagement field queries
- **Production:** Uses CONCURRENTLY to avoid locking during index creation

## Post-Migration Tasks

1. Deploy updated application code
2. Test engagement form functionality
3. Verify contact information display
4. Monitor application performance
5. Clean up backup tables after verification period

## Notes

- All engagement fields are optional and nullable
- Existing data is preserved - no data migration required
- Forms will gracefully handle NULL values
- Backward compatibility maintained for existing API endpoints 