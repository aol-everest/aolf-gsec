# Darshan Implementation - Summary and Overview

## Purpose
This document provides a high-level summary of the darshan functionality implementation for the AOLF GSEC system, linking together the detailed planning documents.

## Background
The AOLF GSEC system was originally built as a dignitary appointment management system. We are now expanding it to become a comprehensive calendar management system for Gurudev, supporting multiple types of appointments and events.

## Key Documents

### 1. Data Model Plan
**File**: `202505-adding-darshan-functionality.md`  
**Purpose**: Defines the database changes needed to support darshan and other appointment types

**Key Changes**:
- New `calendar_events` table for managing time blocks on Gurudev's calendar
- New `appointment_users` bridge table for darshan attendees (similar to existing `appointment_dignitaries`)
- Modified `appointments` table with `request_type` field to support different appointment types
- Calendar events store the actual date/time, appointments become requests for calendar time

### 2. API Migration Plan
**File**: `202505-darshan-api-migration-plan.md`  
**Purpose**: Details the API changes required to support the new data model

**Key Changes**:
- New `/admin/calendar-events` APIs for managing time blocks
- Enhanced appointment APIs to support both dignitary and darshan requests
- New `/darshan/*` APIs for public darshan registration
- Updated usher APIs for individual attendee check-in

## Implementation Overview

### What is Darshan?
Darshan is a group appointment type where many people can register to meet Gurudev during a specific time slot. Unlike dignitary appointments (1-on-1), darshan sessions can accommodate 50-100+ people.

### How It Works

1. **Admin Creates Darshan Time Slot**
   - Creates a `CalendarEvent` with `event_type = DARSHAN`
   - Sets `max_capacity` (e.g., 100 people)
   - Marks as `is_open_for_booking = true`

2. **Users Register for Darshan**
   - Select an available darshan slot
   - Add attendees (self, spouse, children, etc.)
   - Creates an `Appointment` linked to the `CalendarEvent`
   - Each attendee gets an `AppointmentUser` record

3. **Capacity Management**
   - System tracks total registered attendees
   - Prevents registration when slot is full
   - Dynamic calculation: current_capacity = sum of approved appointments' attendees

4. **Check-in Process**
   - Ushers can check in individual attendees
   - Each `AppointmentUser` has its own check-in status
   - Real-time tracking of attendance

### Key Design Decisions

1. **Generic Appointment Table**: All appointment types (dignitary, darshan, volunteer) use the same `appointments` table with a `request_type` field

2. **Bridge Table Pattern**: 
   - `AppointmentDignitary` for dignitary appointments (existing)
   - `AppointmentUser` for darshan appointments (new)
   - Only one type used per appointment

3. **Calendar-Centric Design**: Time/date information moves from appointments to calendar events, making appointments "requests for calendar time"

4. **Backward Compatibility**: Legacy fields maintained during transition, dual-write strategy ensures no disruption

## Benefits

1. **Unified Calendar**: All events on Gurudev's calendar in one system
2. **Flexible**: Easy to add new appointment types
3. **Scalable**: Supports both individual and group appointments
4. **Trackable**: Individual attendee tracking for better management
5. **Compatible**: Existing dignitary functionality continues unchanged

## Implementation Phases

### Phase 1: Data Model (Backend)
- Create new tables and relationships
- Add new fields to existing tables
- Maintain backward compatibility

### Phase 2: API Development
- Calendar event management APIs
- Enhanced appointment APIs
- Darshan-specific endpoints
- Updated usher functionality

### Phase 3: Frontend Updates
- Calendar event management UI
- Darshan registration flow
- Enhanced usher check-in interface

### Phase 4: Migration
- Migrate existing appointments to use calendar events
- Update all appointments with request_type
- Gradual transition to new fields

## Quick Reference

### New Models
- `CalendarEvent` - Time blocks on calendar
- `AppointmentUser` - Darshan attendees

### Modified Models
- `Appointment` - Added `calendar_event_id`, `request_type`, `number_of_attendees`
- `User` - Added relationships for calendar events and appointment users

### New Enums
- `EventType` - Types of calendar events
- `EventStatus` - Calendar event status
- `RequestType` - Types of appointment requests
- `RelationshipType` - Attendee relationships

### Key API Endpoints
- `POST /admin/calendar-events` - Create time slots
- `POST /darshan/register` - Register for darshan
- `GET /darshan/available-slots` - View available slots
- `POST /usher/appointment-users/{id}/check-in` - Check in attendees

## For Future Development

When working on darshan functionality:
1. Refer to the data model plan for database structure
2. Refer to the API migration plan for endpoint specifications
3. Remember that appointments now link to calendar events
4. Always consider both `AppointmentDignitary` and `AppointmentUser` based on `request_type`
5. Maintain backward compatibility during the transition period

---

*Last Updated: January 2025* 