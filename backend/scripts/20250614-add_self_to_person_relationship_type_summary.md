# Migration: Add SELF to PersonRelationshipType Enum

**Date:** June 14, 2025  
**Migration Scripts:** 20250614-add_self_to_person_relationship_type_*

## Overview

This migration adds the "Self" value to the PersonRelationshipType enum to support users adding themselves as contacts in appointment requests. This enables the "I am attending" functionality in the appointment request form.

## Database Changes

### Enum Modification:
- **Table Affected:** `user_contacts`
- **Column:** `relationship_to_owner` (PersonRelationshipType enum)
- **Change:** Add "Self" as the first value in the enum (before "Family")

### New Enum Values (in order):
1. **Self** ← NEW
2. Family
3. Friend
4. Professional
5. Other

## Business Requirements Addressed

1. **Self-Selection:** Users can indicate they are attending the appointment themselves
2. **Contact Management:** Users can add themselves to their contact list with relationship "Self"
3. **Email Validation:** Support for same email validation (user's own email)
4. **Backend API:** Create self-contact when user selects "I am attending"

## Technical Implementation

### Backend Changes:
- Updated `PersonRelationshipType` enum in `backend/models/enums.py`
- Added "Self" value to enum using `ALTER TYPE` SQL command
- No data migration required (new enum value only)

### Frontend Changes (to be implemented):
- Add radio button for "I am attending" in appointment request form
- Make email mandatory for all contacts
- Add validation warnings for duplicate emails
- Auto-create self-contact when user selects self-attendance

## Scripts Available

1. **DEV**: `20250614-add_self_to_person_relationship_type_dev.sh`
   - For local development environment
   - Uses localhost PostgreSQL connection
   - Includes comprehensive testing

2. **UAT**: `20250614-add_self_to_person_relationship_type_uat.sh`  
   - For UAT environment
   - Includes confirmation prompts
   - Uses UAT RDS connection

3. **PROD**: `20250614-add_self_to_person_relationship_type_prod.sh`
   - For production environment
   - Extensive safety checks and confirmations
   - Multiple verification steps
   - Comprehensive error handling

## Running the Migration

### Prerequisites:
- Database backup completed (for UAT/PROD)
- Application tested with new enum value
- Frontend changes ready for deployment

### Execution Order:
1. **DEV** - Test the migration locally
2. **UAT** - Validate migration in UAT environment  
3. **PROD** - Deploy to production with all safety checks

### Verification Steps:
Each script includes verification:
- Enum value existence check
- Query functionality test
- Insert/delete test with new enum value
- Database integrity verification

## Impact Assessment

### Risk Level: **LOW**
- Adding enum values is a safe operation
- No existing data is modified
- Backward compatible change
- No application downtime required

### Performance Impact: **MINIMAL**
- Enum modification is instantaneous
- No index rebuilds required
- No table locks on data

### Application Impact: **NONE** (until frontend changes deployed)
- Existing functionality unaffected
- New enum value available but not used until frontend updated

## Testing Checklist

- [ ] DEV migration runs successfully
- [ ] Enum can be queried with new "Self" value
- [ ] Test contact creation with "Self" relationship
- [ ] UAT migration runs successfully  
- [ ] Frontend changes tested with new enum value
- [ ] PROD migration completed
- [ ] Post-migration verification passed

## Frontend Integration Plan

After successful database migration:

1. **Update PersonRelationshipType enum** in frontend types
2. **Add "I am attending" radio button** to appointment request form
3. **Implement email validation** with duplicate warnings
4. **Add self-contact creation logic** in API calls
5. **Update form validation** to require email for all contacts

## API Changes Required

### Contact Creation Endpoint:
```typescript
// When user selects "I am attending"
const selfContact: UserContactCreateData = {
  first_name: "Self",
  last_name: "Self", 
  email: userInfo.email,
  relationship_to_owner: "Self"
};
```

### Validation Updates:
- Accept "Self" as valid relationship type
- Handle duplicate email scenarios
- Support self-contact creation

## Rollback Plan

If rollback is needed:

### Option 1: Remove enum value (complex)
```sql
-- Remove any contacts with Self relationship first
DELETE FROM user_contacts WHERE relationship_to_owner = 'Self';

-- Remove enum value (requires recreating enum)
-- This is complex and may require application downtime
```

### Option 2: Database restore (recommended)
- Restore from backup taken before migration
- Simpler and safer approach

## Success Criteria

✅ **Database Migration:**
- SELF enum value added successfully
- All verification tests pass
- No data corruption or loss

✅ **Application Integration:**
- Frontend can use new enum value
- Self-contact creation works
- Email validation functions properly
- Appointment creation with self-contacts succeeds

## Next Steps (Post-Migration)

1. **Deploy frontend changes** with self-attendance feature
2. **Update API documentation** with new relationship type
3. **Test end-to-end workflow** in each environment
4. **Monitor application logs** for any enum-related issues
5. **Update user documentation** with new self-selection feature

## Support Information

**Migration Author:** Development Team  
**Review Date:** June 14, 2025  
**Estimated Duration:** < 30 seconds per environment  
**Rollback Time:** < 5 minutes (via restore)

For issues or questions, contact the development team. 