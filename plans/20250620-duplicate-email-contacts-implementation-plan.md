# Allow Duplicate Email Addresses in User Contacts - Implementation Plan

**Date**: June 20, 2025  
**Scope**: Enable users to add contacts with duplicate email addresses, including their own email for non-self relationships

## Executive Summary

This plan implements the ability for users to add multiple contacts with the same email address, addressing scenarios where:
- Parents use their own email for their children's contacts
- One email serves multiple family members  
- Adults share email addresses for communication

The implementation includes smart email consolidation to avoid sending duplicate notifications while maintaining individual contact management.

## Current State Analysis

### Database Constraints
- `userContact` table has `UniqueConstraint('owner_user_id', 'email')`
- Users cannot currently add contacts with duplicate emails
- System prevents adding own email for non-self relationships

### Frontend Validation
- `UserContactSelector.tsx` validates against duplicate emails
- `AppointmentRequestForm.tsx` uses contact validation
- Error messages prevent form submission with duplicates

### Backend Logic
- Contact creation endpoints enforce unique email per user
- Email notifications use unique email logic
- Self-record updates check for user's own email

### Email Notification System
- Sends one email per unique email address
- Uses contact email as primary recipient identifier
- No consolidation for multiple contacts with same email

## Requirements Confirmed

1. **Contact Display**: Show duplicate email contacts separately (different people)
2. **User Warning**: Show minor warning when using own email for non-self relationships
3. **Email Consolidation**: Send one email with all contact names for duplicate emails  
4. **Self Record Updates**: Only update self record when `relationship_to_owner = 'self'`
5. **Migration Scripts**: Create for DEV and UAT environments
6. **Independent Editing**: Each contact editable by its unique ID
7. **New Feature**: Forward-looking functionality, no existing data cleanup needed

## Implementation Plan

### Phase 1: Database Changes

#### 1.1 Create Migration Scripts

**Files to Create**:
- `backend/scripts/20250620-remove_unique_email_constraint_dev.sh`
- `backend/scripts/20250620-remove_unique_email_constraint_uat.sh`

**Migration Content**:
```bash
#!/bin/bash
# Remove unique constraint on (owner_user_id, email) from user_contacts table

# Connect to database and run:
ALTER TABLE user_contacts DROP CONSTRAINT IF EXISTS uq_user_contacts_owner_user_id_email;
ALTER TABLE user_contacts DROP CONSTRAINT IF EXISTS user_contacts_owner_user_id_email_key;

# Verify constraint is removed
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'user_contacts' AND constraint_type = 'UNIQUE';
```

#### 1.2 Update UserContact Model

**File**: `backend/models/userContact.py`

**Changes**:
- Remove `UniqueConstraint('owner_user_id', 'email')` 
- Keep all other constraints and relationships
- Update any related comments/documentation

### Phase 2: Backend API Changes

#### 2.1 Update Contact Validation Logic

**File**: `backend/routers/user/contacts.py`

**Key Changes**:

1. **Remove Email Uniqueness Validation**:
   ```python
   # Remove or modify validation that prevents duplicate emails
   # Allow multiple contacts with same email for same user
   ```

2. **Update Self-Record Logic**:
   ```python
   # Only update user's self record when relationship_to_owner == 'self'
   # Previously checked if email matched user's email regardless of relationship
   
   if contact_data.email == current_user.email and contact_data.relationship_to_owner == 'self':
       # Update user's self record
       update_user_profile_from_contact(current_user, contact_data)
   ```

3. **Add Structured Warning Code System**:
   ```python
   # Centralized warning/error code system in models/enums.py
   class SystemWarningCode(str, Enum):
       # 1xxx: Contact/User related warnings
       CONTACT_USING_OWN_EMAIL_FOR_NON_SELF = "1001"
       CONTACT_DUPLICATE_EMAIL_DIFFERENT_RELATIONSHIP = "1002"
       # 2xxx: Appointment warnings, 3xxx: Calendar warnings, etc.
   
   def generate_contact_warnings(email: str, relationship: str, user_email: str) -> List[SystemWarningCode]:
       warnings = []
       if email == user_email and relationship != 'self':
           warnings.append(SystemWarningCode.CONTACT_USING_OWN_EMAIL_FOR_NON_SELF)
       return warnings
   ```

#### 2.2 Update Response Schemas

**File**: `backend/schemas.py`

**Changes**:
```python
# Centralized error/warning code system (models/enums.py)
class SystemWarningCode(str, Enum):
    # 1xxx: Contact/User related warnings
    CONTACT_USING_OWN_EMAIL_FOR_NON_SELF = "1001"
    CONTACT_DUPLICATE_EMAIL_DIFFERENT_RELATIONSHIP = "1002"
    # 2xxx: Appointment, 3xxx: Calendar, 4xxx: Auth, 5xxx: System

class SystemErrorCode(str, Enum):
    # Similar structure for errors
    CONTACT_NOT_FOUND = "1001"
    CONTACT_CREATION_FAILED = "1002"

# Updated response schemas
class UserContactCreateResponse(BaseModel):
    contact: UserContactResponse
    warnings: Optional[List[SystemWarningCode]] = None  # Numeric warning codes

# Validation response schemas
class ContactValidationResponse(BaseModel):
    is_valid: bool
    errors: List[SystemErrorCode] = []
    warnings: List[SystemWarningCode] = []
```

### Phase 3: Email Notification Updates

#### 3.1 Update Email Logic

**File**: `backend/utils/email_notifications.py`

**Key Changes**:

1. **Skip Emails for User's Own Email (Non-Self Relationship)**:
   ```python
   def should_send_email_to_contact(contact: UserContact, user: User) -> bool:
       """
       Determine if we should send email to this contact.
       Skip if contact has user's email but relationship != 'self'
       """
       if contact.email == user.email and contact.relationship_to_owner != 'self':
           # This is likely their own child/dependent - don't send separate email
           return False
       return True
   ```

2. **Consolidate Duplicate Email Addresses**:
   ```python
   def consolidate_email_recipients(contacts: List[UserContact], user: User) -> Dict[str, List[str]]:
       """
       Group contacts by email address for consolidated sending.
       Returns: {email: [list_of_contact_names]}
       """
       email_to_names = {}
       
       for contact in contacts:
           if should_send_email_to_contact(contact, user):
               email = contact.email
               name = contact.name
               
               if email not in email_to_names:
                   email_to_names[email] = []
               email_to_names[email].append(name)
       
       return email_to_names
   ```

3. **Update Email Templates**:
   ```python
   # Modify email templates to handle multiple names per email
   # Template variables:
   # - recipient_names: List of names for this email address
   # - is_multiple_recipients: Boolean flag
   
   template_context = {
       'recipient_names': names_for_this_email,
       'is_multiple_recipients': len(names_for_this_email) > 1,
       'primary_recipient_name': names_for_this_email[0],
       'additional_names': names_for_this_email[1:] if len(names_for_this_email) > 1 else []
   }
   ```

#### 3.2 Update Email Templates

**Files**: All templates in `backend/email_templates/`

**Changes**:
- Update salutation to handle multiple names: "Dear {{ primary_recipient_name }}{% if is_multiple_recipients %} and {{ additional_names|join(', ') }}{% endif %}"
- Update content to reference multiple attendees when applicable
- Maintain backward compatibility for single-name emails

### Phase 4: Frontend Changes

#### 4.1 Update UserContactSelector Component

**File**: `frontend/src/components/UserContactSelector.tsx`

**Key Changes**:

1. **Remove Duplicate Email Validation**:
   ```typescript
   // Remove or modify validateEmailForDuplicates function
   // Allow multiple contacts with same email
   
   const validateContactData = (contact: ContactFormData): string[] => {
     const errors: string[] = [];
     
     // Keep other validations (required fields, format, etc.)
     // Remove: if (isDuplicateEmail(contact.email)) errors.push("Email already exists");
     
     return errors;
   };
   ```

2. **Add Structured Warning Code Handling**:
   ```typescript
   // Define system warning codes to match backend numeric system
   enum SystemWarningCode {
     // 1xxx: Contact/User warnings
     CONTACT_USING_OWN_EMAIL_FOR_NON_SELF = "1001",
     CONTACT_DUPLICATE_EMAIL_DIFFERENT_RELATIONSHIP = "1002",
     // Future codes follow same pattern
   }
   
   // Warning message mapping with localization support
   const getWarningMessage = (code: SystemWarningCode): string => {
     const warningMessages = {
       [SystemWarningCode.CONTACT_USING_OWN_EMAIL_FOR_NON_SELF]: 
         "You're using your own email for a non-self contact. We recommend using correct emails for other adults and it should be used only in case of children.",
       [SystemWarningCode.CONTACT_DUPLICATE_EMAIL_DIFFERENT_RELATIONSHIP]:
         "This email is used for another contact with a different relationship."
     };
     return warningMessages[code] || "Unknown warning";
   };
   
   // Handle warnings from API response  
   const [contactWarnings, setContactWarnings] = useState<SystemWarningCode[]>([]);
   
   // Process warnings from backend response
   const handleApiWarnings = (warnings: SystemWarningCode[]) => {
     setContactWarnings(warnings);
   };
   ```

3. **Update Contact Display Logic**:
   ```typescript
   // Display contacts individually even with duplicate emails
   // Show contact ID for each contact for unique identification
   // Add indicators for duplicate emails if helpful for users
   
   const ContactListItem = ({ contact }: { contact: UserContact }) => {
     const hasDuplicateEmail = contacts.filter(c => c.email === contact.email).length > 1;
     
     return (
       <div className="contact-item">
         <span className="contact-name">{contact.name}</span>
         <span className="contact-email">
           {contact.email}
           {hasDuplicateEmail && <Icon name="duplicate" tooltip="Shared email address" />}
         </span>
         {/* Other contact details */}
       </div>
     );
   };
   ```

#### 4.2 Update AppointmentRequestForm Component

**File**: `frontend/src/components/AppointmentRequestForm.tsx`

**Key Changes**:

1. **Handle Duplicate Email Contacts**:
   ```typescript
   // Update contact selection to work with non-unique emails
   // Use contact IDs instead of emails for identification
   
   const handleContactSelection = (selectedContactIds: number[]) => {
     const selectedContacts = contacts.filter(c => selectedContactIds.includes(c.id));
     setSelectedContacts(selectedContacts);
   };
   ```

2. **Update Validation Logic**:
   ```typescript
   // Remove email uniqueness validation
   // Keep other contact validations
   
   const validateContacts = (selectedContacts: UserContact[]): ValidationResult => {
     // Validate required fields, contact completeness, etc.
     // Don't validate email uniqueness
     
     return {
       isValid: true, // Based on other validations
       errors: [], // Other validation errors
       warnings: contactWarnings // Email warnings from UserContactSelector
     };
   };
   ```

3. **Display Warnings to User**:
   ```typescript
   // Show warnings in form without blocking submission
   {contactWarnings.length > 0 && (
     <Alert severity="warning" sx={{ mb: 2 }}>
       <ul>
         {contactWarnings.map((warning, index) => (
           <li key={index}>{warning.message}</li>
         ))}
       </ul>
     </Alert>
   )}
   ```

### Phase 5: Testing & Validation

#### 5.1 Database Testing

**Test Cases**:
- Verify unique constraint is removed
- Test creating multiple contacts with same email
- Verify other constraints still work (required fields, foreign keys)
- Test relationship_to_owner validation

#### 5.2 Backend API Testing

**Test Cases**:
- Create contacts with duplicate emails (should succeed)
- Update user's self record (only when relationship = 'self')
- Email notification logic (consolidation, skipping user's own email)
- Warning generation for own email + non-self relationship

#### 5.3 Frontend Testing

**Test Cases**:
- Contact creation with duplicate emails
- Warning display for own email + non-self relationship  
- Contact editing (independent editing by ID)
- Appointment form with duplicate email contacts
- Email consolidation display in UI

#### 5.4 Integration Testing

**Test Scenarios**:
1. **Parent-Child Scenario**: Parent adds child with parent's email, verifies warning and email behavior
2. **Multiple Children**: Parent adds multiple children with same email, verifies consolidation
3. **Mixed Contacts**: User has mix of unique and duplicate email contacts
4. **Self Record Update**: User updates own contact with relationship='self', verifies profile update

### Phase 6: Deployment & Monitoring

#### 6.1 Deployment Sequence

1. **Database Migration**: Run migration scripts on DEV, then UAT
2. **Backend Deployment**: Deploy API changes
3. **Frontend Deployment**: Deploy UI updates
4. **Validation**: Test all functionality in each environment

#### 6.2 Monitoring

**Key Metrics**:
- Contact creation success rate
- Email delivery rates
- Warning display rates
- User behavior with duplicate emails

**Alerts**:
- Failed contact creations
- Email delivery failures
- Database constraint violations

## Risk Assessment & Mitigation

### High Risk Items

1. **Data Integrity**: Removing unique constraint could allow invalid data
   - **Mitigation**: Maintain other validations, comprehensive testing

2. **Email Delivery Issues**: Consolidation logic could cause missed emails
   - **Mitigation**: Thorough testing, gradual rollout, monitoring

### Medium Risk Items

1. **User Confusion**: Users might not understand warning messages
   - **Mitigation**: Clear warning text, user education

2. **Performance Impact**: Email consolidation adds processing overhead
   - **Mitigation**: Optimize consolidation logic, monitor performance

### Low Risk Items

1. **UI Complexity**: Duplicate contacts might confuse contact management
   - **Mitigation**: Clear visual indicators, intuitive interface

## Success Criteria

### Functional Requirements
- [ ] Users can create contacts with duplicate emails
- [ ] Warnings appear for own email + non-self relationship
- [ ] Email consolidation works correctly
- [ ] Self record updates only for relationship='self'
- [ ] Independent contact editing works
- [ ] No disruption to existing functionality

### Technical Requirements
- [ ] Database migration completed successfully
- [ ] All API endpoints handle duplicate emails correctly
- [ ] Frontend validation updated appropriately
- [ ] Email templates support multiple recipients
- [ ] Comprehensive test coverage

### User Experience Requirements
- [ ] Clear warning messages for email reuse
- [ ] Intuitive contact management interface
- [ ] No breaking changes to existing workflows
- [ ] Responsive design maintained

## Timeline Estimate

- **Phase 1 (Database)**: 1 day
- **Phase 2 (Backend APIs)**: 2-3 days
- **Phase 3 (Email Logic)**: 2-3 days
- **Phase 4 (Frontend)**: 3-4 days
- **Phase 5 (Testing)**: 2-3 days
- **Phase 6 (Deployment)**: 1 day

**Total Estimated Time**: 11-15 days

## Implementation Notes

### Key Assumptions
- Users understand that using their own email for children is acceptable
- Email consolidation improves rather than complicates user experience
- Database migration can be performed during maintenance windows

### Dependencies
- Database access for constraint removal
- Email template update capability
- Frontend deployment coordination

### Future Enhancements
- Contact grouping by email address in UI
- Bulk contact operations for shared emails
- Advanced email preference management per contact

---

**Next Steps**: Begin Phase 1 implementation with database migration scripts and model updates. 