# Phase 1: Database Migration for Preferred Date Range Support

**Date:** June 13, 2025  
**Migration Scripts:** 20250613-add_preferred_date_range_*

## Overview

This migration adds support for preferred date ranges for non-dignitary appointment requests (DARSHAN, PROJECT_TEAM_MEETING, OTHER). Dignitary appointments continue to use the existing single `preferred_date` field.

## Database Changes

### New Columns Added to `appointments` table:
- `preferred_start_date` (DATE, nullable) - Start of the preferred date range for non-dignitary appointments
- `preferred_end_date` (DATE, nullable) - End of the preferred date range for non-dignitary appointments

### Constraints Added:
- `chk_preferred_date_range` - Ensures `preferred_end_date >= preferred_start_date`

### Indexes Added:
- `ix_appointments_preferred_start_date` - For efficient start date queries
- `ix_appointments_preferred_end_date` - For efficient end date queries  
- `ix_appointments_preferred_date_range` - For efficient range queries

## Data Migration

### Existing Data Handling:
- **Non-dignitary appointments** (DARSHAN, PROJECT_TEAM_MEETING, OTHER):
  - `preferred_start_date` = existing `preferred_date`
  - `preferred_end_date` = existing `preferred_date`
  - This creates single-day ranges from existing single dates

- **Dignitary appointments** (DIGNITARY):
  - Continue using existing `preferred_date` field
  - No changes to existing behavior

## Scripts Available

1. **DEV**: `20250613-add_preferred_date_range_dev.sh`
   - For local development environment
   - Uses localhost PostgreSQL connection

2. **UAT**: `20250613-add_preferred_date_range_uat.sh`  
   - For UAT environment
   - Includes backup confirmation prompts

3. **PROD**: `20250613-add_preferred_date_range_prod.sh`
   - For production environment
   - Extensive safety checks and confirmations
   - Comprehensive verification steps

## Running the Migration

### Prerequisites:
- Database backup completed
- Application in maintenance mode (for production)
- Environment variables configured

### Execution Order:
1. **DEV** - Test the migration locally
2. **UAT** - Validate migration in UAT environment  
3. **PROD** - Deploy to production with all safety checks

### Verification:
Each script includes comprehensive verification steps:
- Column structure validation
- Data migration verification
- Constraint and index verification
- Data integrity checks

## Model Changes

Updated `backend/models/appointment.py`:
```python
# Date range fields for non-dignitary appointments (DARSHAN, PROJECT_TEAM_MEETING, OTHER)
preferred_start_date = Column(Date, nullable=True)
preferred_end_date = Column(Date, nullable=True)
```

## Next Steps (Phase 2)

After successful migration:
1. Update backend schemas (`schemas.py`)
2. Update API endpoints to handle date ranges
3. Update frontend components for date range input
4. Update admin interfaces with range validation
5. Update email templates and notifications

## Rollback Plan

If rollback is needed:
1. Remove the new columns:
   ```sql
   ALTER TABLE appointments DROP COLUMN preferred_start_date;
   ALTER TABLE appointments DROP COLUMN preferred_end_date;
   ```
2. Drop the constraint:
   ```sql
   ALTER TABLE appointments DROP CONSTRAINT chk_preferred_date_range;
   ```
3. Drop the indexes:
   ```sql
   DROP INDEX ix_appointments_preferred_start_date;
   DROP INDEX ix_appointments_preferred_end_date;
   DROP INDEX ix_appointments_preferred_date_range;
   ```

## Testing Checklist

- [ ] DEV migration runs successfully
- [ ] UAT migration runs successfully  
- [ ] Data integrity verified in UAT
- [ ] Application still functions with new columns (null values)
- [ ] Performance impact assessed
- [ ] PROD migration completed
- [ ] Post-migration verification passed 