# Darshan Functionality - API Migration Plan

## Context and Background

This document is part of the darshan functionality implementation for the AOLF GSEC system. It complements the data model plan in `202505-adding-darshan-functionality.md` by detailing the API changes required to support the new calendar-based appointment system.

### Related Documents
- **Data Model Plan**: `202505-adding-darshan-functionality.md` - Defines the new tables and relationships
- **Current System**: The system was originally built for dignitary appointments only
- **New Requirements**: Support for darshan (bulk appointments), volunteer meetings, and other event types

## Executive Summary

This plan details how to migrate the existing appointment APIs to support:
1. **CalendarEvent table** - Time blocks on Gurudev's calendar
2. **Generic appointments** - Supporting multiple request types (dignitary, darshan, volunteer, other)
3. **Dual bridge tables** - AppointmentUser (for darshan) and AppointmentDignitary (existing)
4. **Backward compatibility** - Ensuring existing functionality continues to work

## Key Changes Overview

### Database Changes (from data model plan)
- **New Tables**: `calendar_events`, `appointment_users`
- **Modified Tables**: `appointments` (added `calendar_event_id`, `request_type`, `number_of_attendees`)
- **Time Management**: Date/time moves from `appointments` to `calendar_events`

### API Structure Changes
1. **New API Module**: `/admin/calendar-events` for managing time blocks
2. **Enhanced Appointments API**: Support for both dignitary and darshan requests
3. **New Darshan APIs**: `/darshan/*` for public darshan registration
4. **Updated Usher APIs**: Individual attendee check-in for darshan

## Current API Structure

### Admin APIs (`/admin/*`)
- `/admin/appointments` - Appointment management (dignitary-focused)
- `/admin/dignitaries` - Dignitary management
- `/admin/users` - User management
- `/admin/locations` - Location management
- `/admin/stats` - Statistics and reporting

### User APIs
- `/appointments` - User appointment requests (dignitary-focused)
- `/dignitaries` - User dignitary management
- `/profile` - User profile management
- `/locations` - Location viewing
- `/attachments` - File uploads

### Other APIs
- `/auth` - Authentication
- `/usher` - Check-in functionality (for dignitaries)
- `/enums` - Enum values
- `/metadata` - System metadata

## Migration Strategy

### Phase 1: Add CalendarEvent Support (Non-breaking)

#### 1.1 New CalendarEvent APIs
Create new router: `backend/routers/admin/calendar_events.py`

```python
# Admin Calendar Event APIs
POST   /admin/calendar-events                    # Create calendar event
GET    /admin/calendar-events                    # List with filters
GET    /admin/calendar-events/{id}              # Get details
PUT    /admin/calendar-events/{id}              # Update event
DELETE /admin/calendar-events/{id}              # Delete event
GET    /admin/calendar-events/{id}/availability # Check capacity
GET    /admin/calendar-events/{id}/appointments # List linked appointments

# Batch operations for creating recurring darshan sessions
POST   /admin/calendar-events/batch              # Create multiple events
PUT    /admin/calendar-events/batch              # Update multiple events
```

#### 1.2 Schema Updates
```python
# CalendarEventCreate
class CalendarEventCreate(BaseModel):
    event_type: EventType  # DARSHAN, DIGNITARY_APPOINTMENT, etc.
    title: str
    description: Optional[str]
    start_datetime: datetime
    duration: int  # minutes
    location_id: Optional[int]
    meeting_place_id: Optional[int]
    max_capacity: int = 1  # 1 for dignitary, 50-100+ for darshan
    is_open_for_booking: bool = True
    instructions: Optional[str]  # Special instructions for darshan
    status: EventStatus = EventStatus.DRAFT

# CalendarEventResponse
class CalendarEventResponse(CalendarEventCreate):
    id: int
    start_date: date
    start_time: str
    current_capacity: int  # Calculated field
    available_capacity: int  # max_capacity - current_capacity
    linked_appointments_count: int
    external_calendar_id: Optional[str]
    external_calendar_link: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by_user: UserBasicInfo
    location: Optional[LocationBasicInfo]
    meeting_place: Optional[MeetingPlaceBasicInfo]
```

### Phase 2: Update Appointment APIs

#### 2.1 Enhanced Appointment Creation
The appointment creation process now branches based on `request_type`:

```python
class AppointmentCreateBase(BaseModel):
    purpose: str
    requester_notes_to_secretariat: Optional[str]
    request_type: RequestType = RequestType.DIGNITARY  # NEW FIELD
    
    # Option 1: Link to existing calendar event (for darshan/group events)
    calendar_event_id: Optional[int]
    
    # Option 2: Request specific time (creates calendar event automatically)
    preferred_date: Optional[date]
    preferred_time_of_day: Optional[AppointmentTimeOfDay]
    location_id: Optional[int]
    duration: Optional[int] = 15
    
    # For dignitary appointments (when request_type = DIGNITARY)
    dignitary_id: Optional[int]  # If existing dignitary
    dignitary_info: Optional[DignitaryCreate]  # If new dignitary
    additional_dignitaries: Optional[List[int]]  # Additional dignitary IDs
    
    # For darshan/other appointments (when request_type = DARSHAN)
    attendees: Optional[List[AppointmentUserCreate]]  # NEW FIELD
    
    class Config:
        @validator('attendees', 'dignitary_id')
        def validate_exclusive_fields(cls, v, values):
            # Ensure only one of dignitary_id/attendees is provided
            if 'request_type' in values:
                if values['request_type'] == RequestType.DIGNITARY:
                    if v and 'attendees' in values and values['attendees']:
                        raise ValueError("Cannot have both dignitary and attendees")
                elif values['request_type'] == RequestType.DARSHAN:
                    if v and 'dignitary_id' in values and values['dignitary_id']:
                        raise ValueError("Darshan appointments cannot have dignitaries")
            return v

class AppointmentUserCreate(BaseModel):
    attendee_name: str
    attendee_email: Optional[str]
    attendee_phone: Optional[str]
    relationship_to_requester: Optional[RelationshipType]  # SPOUSE, CHILD, etc.
    comments: Optional[str]  # Special requirements
```

#### 2.2 Appointment Response Updates
```python
class AppointmentResponse(BaseModel):
    id: int
    requester: UserBasicInfo
    purpose: str
    status: AppointmentStatus
    sub_status: Optional[AppointmentSubStatus]
    request_type: RequestType  # NEW: dignitary, darshan, volunteer, other
    number_of_attendees: int  # NEW: total attendees
    
    # Calendar event info (NEW - replaces direct date/time fields)
    calendar_event: Optional[CalendarEventBasicInfo]
    
    # Conditional fields based on request_type
    dignitary: Optional[DignitaryBasicInfo]  # If dignitary appointment
    appointment_dignitaries: Optional[List[AppointmentDignitaryInfo]]
    appointment_users: Optional[List[AppointmentUserInfo]]  # NEW: If darshan/other
    
    # Legacy fields (populated from calendar_event for backward compatibility)
    appointment_date: Optional[date]  # From calendar_event.start_date
    appointment_time: Optional[str]   # From calendar_event.start_time
    location: Optional[LocationBasicInfo]
    
    created_at: datetime
    updated_at: datetime
```

### Phase 3: Usher/Check-in Updates

Enhanced usher functionality for darshan:

```python
# Existing endpoint enhancement
GET    /usher/appointments/today
  - Now includes appointment_users for darshan
  - Shows individual check-in status for all attendees
  
# New endpoints for darshan check-in
POST   /usher/appointment-users/{id}/check-in  # Check in individual attendee
POST   /usher/appointments/{id}/check-in-all   # Check in all attendees
GET    /usher/calendar-events/today            # Today's events with capacity info

# Response includes both dignitary and darshan attendees
class AppointmentUsherView(BaseModel):
    id: int
    appointment_type: AppointmentType
    request_type: RequestType
    
    # For dignitary appointments
    appointment_dignitaries: Optional[List[AppointmentDignitaryCheckIn]]
    
    # For darshan appointments
    appointment_users: Optional[List[AppointmentUserCheckIn]]
    
    total_expected: int
    total_checked_in: int
```

## Data Migration Strategy

### Migration Steps
1. **Add new fields** to appointments table (non-breaking)
2. **Create CalendarEvent records** for all existing appointments
3. **Set request_type = DIGNITARY** for all existing appointments
4. **Populate appointment_date/time** from calendar_events (dual write)
5. **Update frontend** to use new fields
6. **Remove legacy fields** (final phase)

### Migration Script
```python
# For each existing appointment without calendar_event_id:
1. Create CalendarEvent with:
   - event_type = DIGNITARY_APPOINTMENT
   - start_datetime from appointment_date + appointment_time
   - max_capacity = 1
   - is_open_for_booking = False
   
2. Update appointment:
   - calendar_event_id = new_event.id
   - request_type = DIGNITARY
   - number_of_attendees = count(appointment_dignitaries)
```

## Access Control

### Calendar Event Permissions
- **ADMIN/SECRETARIAT**: Full CRUD access
- **USHER**: Read access for check-in
- **GENERAL**: Read available darshan slots only

### Appointment Permissions by Request Type
- **Dignitary Appointments**: Existing permissions apply
- **Darshan Appointments**: 
  - GENERAL users can register/cancel their own
  - USHER can check-in attendees
  - ADMIN/SECRETARIAT can manage all

## Key Benefits

1. **Unified Calendar Management**: All events on Gurudev's calendar in one place
2. **Flexible Appointment Types**: Easy to add new types beyond darshan
3. **Capacity Management**: Built-in support for group events
4. **Individual Tracking**: Each darshan attendee tracked separately
5. **Backward Compatible**: Existing dignitary functionality unchanged

## Success Criteria

1. All existing dignitary appointments continue to work
2. Users can register for darshan with multiple attendees
3. Admins can create and manage darshan time slots
4. Ushers can check in individual darshan attendees
5. Calendar shows all event types in a unified view

## Next Steps

1. Implement CalendarEvent model and APIs
2. Update appointment APIs to support request_type
3. Create darshan registration flow
4. Update usher interface for bulk check-ins
5. Migrate existing appointments to use calendar events

---

*This document is part of the darshan functionality implementation. For data model details, see `202505-adding-darshan-functionality.md`* 