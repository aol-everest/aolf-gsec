# Adding Darshan Functionality

## Executive Summary

This document outlines the implementation of darshan functionality to the AOLF GSEC appointment system, expanding it from a dignitary-focused system to a comprehensive calendar management system for Gurudev. The new system supports multiple request types including:
- Dignitary appointments (existing)
- Darshan sessions (bulk appointments)
- Teacher meetings  
- Volunteer meetings
- Private events, travel, placeholders, and other event types

## Current State Analysis

### Existing Data Model
- **Appointment**: Currently designed primarily for dignitary appointments
- **Dignitary**: Stores information about dignitaries
- **AppointmentDignitary**: Many-to-many relationship between appointments and dignitaries
- **Location/MeetingPlace**: Hierarchical location structure
- **User**: System users with role-based access

### Current Limitations
1. Appointment table was tightly coupled to dignitary concept
2. No support for bulk time slots (needed for Darshan)
3. Limited flexibility for different appointment types with different workflows
4. No concept of calendar blocks or time slot management

## Implemented Data Model

Based on the actual code implementation, the following models have been created:

### 1. CalendarEvent (Implemented)

The `CalendarEvent` model represents time blocks on Gurudev's calendar:

```python
class EventType(str, enum.Enum):
    DIGNITARY_APPOINTMENT = "Dignitary Appointment"
    DARSHAN = "Darshan"
    TEACHER_MEETING = "Teacher Meeting"
    VOLUNTEER_MEETING = "Volunteer Meeting"
    PRIVATE_EVENT = "Private Event"
    PLACEHOLDER = "Placeholder"
    TRAVEL = "Travel"
    OTHER = "Other"

class EventStatus(str, enum.Enum):
    DRAFT = "Draft"
    CONFIRMED = "Confirmed"
    CANCELLED = "Cancelled"
    COMPLETED = "Completed"

class CalendarEvent(Base):
    # Core fields
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(Enum(EventType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Time fields
    start_datetime = Column(DateTime, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    
    # Location
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    meeting_place_id = Column(Integer, ForeignKey("meeting_places.id"), nullable=True)
    
    # Capacity management
    max_capacity = Column(Integer, default=1)
    is_open_for_booking = Column(Boolean, default=True)
    
    # Instructions for attendees
    instructions = Column(Text, nullable=True)
    
    # Event status
    status = Column(Enum(EventStatus), default=EventStatus.DRAFT, index=True)
    
    # Calendar sync
    external_calendar_id = Column(String(255), nullable=True)
    external_calendar_link = Column(Text, nullable=True)
```

**Key Features:**
- **Flexible Event Types**: Supports dignitary appointments, darshan, teacher meetings, volunteer meetings, etc.
- **Time Management**: Separate fields for datetime, date, time, and duration
- **Capacity Management**: `max_capacity` for events like darshan (current capacity calculated dynamically)
- **Status Tracking**: Draft, confirmed, cancelled, completed states
- **Calendar Integration**: Fields for external calendar sync

### 2. Appointment (Modified)

The existing `Appointment` model has been enhanced:

```python
class RequestType(str, enum.Enum):
    DIGNITARY = "dignitary"
    DARSHAN = "darshan"
    VOLUNTEER = "volunteer"
    OTHER = "other"

# New fields added to Appointment:
calendar_event_id = Column(Integer, ForeignKey("calendar_events.id"), nullable=True, index=True)
request_type = Column(Enum(RequestType), default=RequestType.DIGNITARY, index=True)
number_of_attendees = Column(Integer, default=1)

# New relationship
calendar_event = relationship("CalendarEvent", back_populates="appointments")
appointment_users = relationship("AppointmentUser", back_populates="appointment", cascade="all, delete-orphan")
```

**Key Changes:**
- **request_type**: Categorizes appointments by type (dignitary, darshan, volunteer, other)
- **calendar_event_id**: Links appointments to calendar time slots
- **number_of_attendees**: Tracks total attendees for capacity management
- **appointment_users**: Bridge table for managing multiple attendees

### 3. AppointmentUser (New Bridge Table)

The `AppointmentUser` model manages the many-to-many relationship between appointments and users/attendees:

```python
class RelationshipType(str, enum.Enum):
    SPOUSE = "Spouse"
    CHILD = "Child"
    PARENT = "Parent"
    RELATIVE = "Relative"
    FRIEND = "Friend"
    OTHER = "Other"

class AppointmentUser(Base):
    # Core relationship
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Attendee information
    attendee_name = Column(String(255), nullable=False)
    attendee_email = Column(String(255), nullable=True)
    attendee_phone = Column(String(50), nullable=True)
    relationship_to_requester = Column(Enum(RelationshipType), nullable=True)
    
    # Check-in status (reuses AttendanceStatus from AppointmentDignitary)
    attendance_status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PENDING)
    checked_in_at = Column(DateTime, nullable=True)
    checked_in_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Special requirements
    comments = Column(Text, nullable=True)
```

**Key Features:**
- **Bridge Pattern**: Similar to existing `AppointmentDignitary` table
- **Individual Tracking**: Each attendee is tracked separately for check-in
- **Relationship Types**: Tracks how attendees relate to the requester
- **Unified Check-in**: Reuses `AttendanceStatus` enum for consistency

### Relationships Updated

1. **User Model**: Added new relationships for calendar events and appointment users:
   ```python
   # Calendar event relationships
   created_calendar_events = relationship("CalendarEvent", foreign_keys="[CalendarEvent.created_by]")
   updated_calendar_events = relationship("CalendarEvent", foreign_keys="[CalendarEvent.updated_by]")
   
   # Appointment user relationships
   appointment_participations = relationship("AppointmentUser", foreign_keys="[AppointmentUser.user_id]")
   checked_in_appointments = relationship("AppointmentUser", foreign_keys="[AppointmentUser.checked_in_by]")
   ```

2. **Location/MeetingPlace Models**: Added calendar event relationships:
   ```python
   calendar_events = relationship("CalendarEvent", back_populates="location")
   ```

## Capacity Management

### How It Works
- **max_capacity**: Set when creating a calendar event (e.g., 100 for darshan, 1 for dignitary meetings)
- **current_capacity**: Calculated dynamically by counting:
  - Number of approved appointments linked to the calendar event
  - Sum of `number_of_attendees` for those appointments
  - Individual `AppointmentUser` records for precise tracking

### Example Flow
1. **Create Darshan Event**: `max_capacity = 100`
2. **User Registers**: Creates appointment with `number_of_attendees = 3` and 3 `AppointmentUser` records
3. **Check Capacity**: Before approval, system verifies current + new attendees ≤ max_capacity
4. **Approve**: If capacity allows, appointment status → "Approved"
5. **Check-in**: Individual attendees check in via `AppointmentUser` records

## API Design (Planned)

### Calendar Event Management
```
POST   /api/calendar-events                 # Create calendar event
GET    /api/calendar-events                 # List calendar events with filters
GET    /api/calendar-events/{id}           # Get calendar event details
PUT    /api/calendar-events/{id}           # Update calendar event
DELETE /api/calendar-events/{id}           # Delete calendar event
GET    /api/calendar-events/{id}/availability  # Check availability
GET    /api/calendar-events/{id}/attendees # Get attendee list
```

### Darshan Management
```
POST   /api/darshan/register               # Register for darshan
GET    /api/darshan/slots                  # Get available darshan slots
GET    /api/darshan/my-registrations       # Get user's registrations
PUT    /api/darshan/registrations/{id}     # Update registration
POST   /api/darshan/check-in/{appointment_user_id}  # Check-in attendee
GET    /api/darshan/queue/{event_id}       # Get attendance status
```

### Modified Appointment Endpoints
- Add `request_type` filter to existing endpoints
- Support creating appointments with `calendar_event_id`
- Return calendar event information in responses
- Include `appointment_users` in appointment details

## Example Workflows

### Darshan Registration Workflow
1. **Admin creates darshan calendar event**:
   ```json
   POST /api/calendar-events
   {
     "event_type": "DARSHAN",
     "title": "Morning Darshan",
     "start_datetime": "2025-01-15T09:00:00",
     "duration": 120,
     "location_id": 1,
     "max_capacity": 100,
     "instructions": "Please arrive 15 minutes early"
   }
   ```

2. **User registers for darshan**:
   ```json
   POST /api/darshan/register
   {
     "calendar_event_id": 123,
     "attendees": [
       {
         "name": "John Doe",
         "email": "john@example.com",
         "relationship_to_requester": "SPOUSE"
       },
       {
         "name": "Jane Doe", 
         "relationship_to_requester": "CHILD"
       }
     ],
     "purpose": "Seeking blessings"
   }
   ```

3. **System creates**:
   - One `Appointment` with `request_type = 'darshan'` and `number_of_attendees = 2`
   - Two `AppointmentUser` records (one for each attendee)

4. **Admin approval**: System checks capacity before approving

5. **Check-in**: Usher checks in each attendee individually

## Implementation Status

### ✅ Completed
- CalendarEvent model with comprehensive event types
- AppointmentUser bridge table following existing patterns
- Updated Appointment model with calendar integration
- Enhanced User, Location, and MeetingPlace relationships
- Proper indexing and constraints for performance

### 🟡 In Progress / Planned
- API endpoints for calendar event management
- Darshan registration and check-in APIs
- Capacity validation logic
- Frontend UI components
- Migration scripts for existing data

## Key Benefits Realized

1. **Unified Request System**: All appointment types use the same `appointments` table
2. **Consistent Bridge Pattern**: `AppointmentUser` follows same pattern as `AppointmentDignitary`
3. **Flexible Event Types**: Easy to add new event types via enum
4. **Individual Attendee Tracking**: Each person can be checked in separately
5. **Scalable Capacity Management**: Dynamic calculation supports any event size
6. **Backward Compatible**: Existing dignitary functionality unchanged

## Security Considerations

1. **Access Control**: 
   - Only SECRETARIAT/ADMIN can create calendar events
   - Different permissions for different request types
   - Darshan check-in limited to USHER role

2. **Data Privacy**:
   - Personal information separated in AppointmentUser table
   - Comprehensive audit trails for all modifications

## Next Steps

1. **Complete API Implementation**: Build the planned endpoints
2. **Frontend Development**: Create UI for calendar management and darshan registration
3. **Data Migration**: Migrate existing appointments to use calendar events
4. **Testing**: Comprehensive testing of capacity management and check-in flows
5. **Documentation**: API documentation and user guides

## Conclusion

The implemented data model successfully transforms the AOLF GSEC system into a comprehensive calendar management platform while maintaining backward compatibility. The design follows established patterns in the codebase and provides the flexibility needed for darshan and other appointment types. 