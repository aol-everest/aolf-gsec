# Calendar Management System Data Model Evolution Plan

## Executive Summary

This document outlines the evolution of the AOLF GSEC appointment system from a dignitary-focused system to a comprehensive calendar management system for Gurudev. The new system will support multiple request types including:
- Dignitary appointments (existing)
- Darshan sessions (bulk appointments)
- Volunteer meetings
- Placeholder calendar events
- Other event types as needed

## Current State Analysis

### Existing Data Model
- **Appointment**: Currently designed primarily for dignitary appointments
- **Dignitary**: Stores information about dignitaries
- **AppointmentDignitary**: Many-to-many relationship between appointments and dignitaries
- **Location/MeetingPlace**: Hierarchical location structure
- **User**: System users with role-based access

### Current Limitations
1. Appointment table is tightly coupled to dignitary concept
2. No support for bulk time slots (needed for Darshan)
3. Limited flexibility for different appointment types with different workflows
4. No concept of calendar blocks or time slot management

## Proposed Data Model

### Core Design Principles
1. **Separation of Concerns**: Separate calendar time management from appointment requests
2. **Flexibility**: Support multiple request types with extensible attributes
3. **Backward Compatibility**: Minimize breaking changes to existing functionality
4. **Scalability**: Design for future appointment types and workflows

### New Tables

#### 1. CalendarEvent (New)
```sql
CREATE TABLE calendar_events (
    id INTEGER PRIMARY KEY,
    event_type ENUM('dignitary_appointment', 'darshan', 'volunteer_meeting', 'private_event', 'placeholder', 'travel', 'other'),
    title VARCHAR(255),
    description TEXT,
    
    -- Time fields
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    
    -- Location
    location_id INTEGER REFERENCES locations(id),
    meeting_place_id INTEGER REFERENCES meeting_places(id),
    
    -- Capacity management (for darshan and shared events)
    max_capacity INTEGER DEFAULT 1,
    -- Note: current_capacity will be calculated dynamically by counting approved appointments
    is_open_for_booking BOOLEAN DEFAULT TRUE,
    
    -- Darshan specific fields
    darshan_type VARCHAR(50), -- 'general', 'vip', 'special_occasion'
    darshan_instructions TEXT,
    
    -- Event status
    status ENUM('draft', 'confirmed', 'cancelled', 'completed') DEFAULT 'draft',
    
    -- Calendar sync
    external_calendar_id VARCHAR(255), -- Google Calendar ID
    external_calendar_link TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    
    INDEX idx_start_datetime (start_datetime),
    INDEX idx_event_type (event_type),
    INDEX idx_status (status)
);
```

#### 2. Appointment (Modified)
```sql
-- Add new columns to existing appointment table
ALTER TABLE appointments ADD COLUMN calendar_event_id INTEGER REFERENCES calendar_events(id);
ALTER TABLE appointments ADD COLUMN request_type ENUM('dignitary', 'darshan', 'volunteer', 'other') DEFAULT 'dignitary';

-- For darshan appointments
ALTER TABLE appointments ADD COLUMN darshan_registration_number VARCHAR(50);
ALTER TABLE appointments ADD COLUMN number_of_attendees INTEGER DEFAULT 1;
```

#### 3. AppointmentUser (New - Bridge Table)
```sql
CREATE TABLE appointment_users (
    id INTEGER PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Attendee information (for cases where user might bring guests)
    attendee_name VARCHAR(255) NOT NULL,
    attendee_email VARCHAR(255),
    attendee_phone VARCHAR(50),
    attendee_age INTEGER,
    relationship_to_user VARCHAR(100), -- 'self', 'spouse', 'child', 'parent', etc.
    
    -- Check-in status
    attendance_status ENUM('pending', 'checked_in', 'no_show', 'cancelled') DEFAULT 'pending',
    check_in_time TIMESTAMP,
    checked_in_by INTEGER REFERENCES users(id),
    
    -- Special requirements
    special_requirements TEXT,
    wheelchair_access BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    
    UNIQUE KEY unique_appointment_user (appointment_id, user_id),
    INDEX idx_appointment_id (appointment_id),
    INDEX idx_user_id (user_id),
    INDEX idx_attendance_status (attendance_status)
);
```

### Capacity Management Explanation

**Q: What is the difference between max_capacity and current_capacity?**

**A:** 
- **max_capacity**: The maximum number of people that can be accommodated in a calendar event (set when creating the event)
  - For dignitary appointments: Usually 1 (exclusive) or a small number (shared)
  - For darshan sessions: Could be 50, 100, or more depending on the venue
  - For volunteer meetings: Depends on the meeting type

- **current_capacity**: This will be calculated dynamically by counting approved appointments linked to that calendar event
  - We don't store this as a column since it changes as appointments are approved/rejected
  - Calculated as: `COUNT(appointments WHERE calendar_event_id = X AND status = 'APPROVED')`
  - For darshan, we might also count the total `number_of_attendees` across all approved appointments

### Modified Relationships

1. **Appointment → CalendarEvent**: Many-to-one relationship
   - Multiple appointments can be linked to a single calendar event (for darshan)
   - Single appointments continue to work as before

2. **Appointment → User**: Many-to-many relationship via AppointmentUser
   - Replaces the need for separate darshan registration table
   - Handles both single user appointments and group appointments
   - Tracks attendance for each individual person

3. **Dignitary → Appointment**: Keep existing relationship
   - For darshan/volunteer meetings, dignitary_id can be NULL

## Data Migration Strategy

#### Phase 1: Add New Tables (Non-breaking)
1. Create CalendarEvent table
2. Create AppointmentUser table
3. Add new columns to Appointment table with defaults

#### Phase 2: Data Migration
1. Create CalendarEvent records for all existing appointments
2. Link existing appointments to their corresponding CalendarEvent
3. Set request_type based on appointment_type
4. Create AppointmentUser records for existing appointments (link to requester_id)

#### Phase 3: API Evolution
1. Create new endpoints for calendar event management
2. Update appointment endpoints to work with calendar events
3. Add darshan-specific endpoints

## API Design

### New Endpoints

#### Calendar Event Management
POST   /api/calendar-events                 # Create calendar event
GET    /api/calendar-events                 # List calendar events with filters
GET    /api/calendar-events/{id}           # Get calendar event details
PUT    /api/calendar-events/{id}           # Update calendar event
DELETE /api/calendar-events/{id}           # Delete calendar event
GET    /api/calendar-events/{id}/availability  # Check availability for darshan slots

#### Darshan Management
POST   /api/darshan/register               # Register for darshan
GET    /api/darshan/slots                  # Get available darshan slots
GET    /api/darshan/registrations          # List darshan registrations
PUT    /api/darshan/registrations/{id}     # Update registration
POST   /api/darshan/check-in/{id}          # Check-in for darshan
GET    /api/darshan/queue/{event_id}       # Get current queue status

#### Volunteer Meeting Management
POST   /api/volunteer-meetings/request     # Request volunteer meeting
GET    /api/volunteer-meetings             # List volunteer meetings

### Modified Endpoints

#### Appointment Endpoints
- Add `request_type` filter to existing list endpoints
- Support creating appointments with `calendar_event_id`
- Return calendar event information in appointment responses

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Create new database tables
- Add migration scripts
- Update models with new relationships
- Create basic CRUD APIs for calendar events

### Phase 2: Darshan Support (Week 3-4)
- Implement darshan registration flow
- Create darshan queue management
- Build check-in functionality
- Add capacity management

### Phase 3: Integration (Week 5-6)
- Update existing appointment flows
- Integrate with Google Calendar
- Update notification system
- Implement access control for new features

### Phase 4: UI Updates (Week 7-8)
- Create calendar event management UI
- Build darshan registration form
- Update appointment creation flow
- Add queue management interface

## Key Benefits

1. **Flexibility**: Support for multiple appointment types with different workflows
2. **Scalability**: Easy to add new event types in the future
3. **Better Calendar Management**: Proper time slot and capacity management
4. **Improved User Experience**: Separate flows for different appointment types
5. **Backward Compatible**: Existing functionality continues to work

## Security Considerations

1. **Access Control**: 
   - Only SECRETARIAT/ADMIN can create calendar events
   - Different permissions for different event types
   - Darshan check-in limited to USHER role

2. **Data Privacy**:
   - Separate personal information from calendar events
   - Audit trail for all modifications

## Performance Considerations

1. **Indexing**: Add indexes on frequently queried fields
2. **Caching**: Cache available darshan slots
3. **Pagination**: Implement pagination for large result sets
4. **Query Optimization**: Use appropriate joins and eager loading

## Future Enhancements

1. **Recurring Events**: Support for recurring darshan sessions
2. **Waitlist Management**: Automatic waitlist for full darshan slots
3. **SMS Notifications**: SMS reminders for darshan appointments
4. **Analytics Dashboard**: Insights on appointment patterns
5. **Multi-language Support**: Support for regional languages in darshan registration

## Conclusion

This evolution transforms the AOLF GSEC system from a simple appointment booking system to a comprehensive calendar management platform. The modular design ensures flexibility for future requirements while maintaining backward compatibility with existing functionality. 