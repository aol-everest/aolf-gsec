# Frontend Migration Plan for Darshan Functionality

## Executive Summary

This document outlines the comprehensive frontend migration plan to support the new darshan functionality and calendar event system in the AOLF GSEC application. The plan focuses on updating the React frontend to work with the new backend data models while maintaining backward compatibility with existing dignitary appointment functionality.

## Overview

The frontend needs to be updated to support:
1. **Calendar Event Management** - New calendar events that represent time blocks
2. **Request Type Differentiation** - Support for dignitary, darshan, volunteer, and other appointment types
3. **Appointment Users** - Managing darshan attendees (similar to existing appointment dignitaries)
4. **Enhanced Usher Interface** - Individual check-in for darshan attendees
5. **Capacity Management** - Real-time tracking of darshan slot availability

## Current Frontend State Analysis

### Existing Components
- **AppointmentRequestForm**: Currently handles only dignitary appointments with multi-step form
- **UsherAppointmentSchedule**: Shows dignitary appointments with check-in functionality
- **AdminAppointmentList/Tiles**: Lists appointments in table/card format
- **AppointmentCard**: Displays appointment details
- **AdminAppointmentEdit**: Edit appointment details and status

### Current Data Model
- Appointments are tightly coupled to dignitary concept
- Uses `appointment_dignitaries` bridge table for multiple dignitaries
- Time/date stored directly on appointment
- No concept of calendar events or capacity management

### Current Limitations
1. No support for non-dignitary appointment types
2. No calendar event concept for time slot management
3. Limited to dignitary-based appointments only
4. No capacity management for group appointments

## Data Model Updates

### 1.1 New Type Definitions

Add to `frontend/src/models/types.ts`:

```typescript
// Calendar Event Types
export interface CalendarEvent {
  id: number;
  event_type: EventType;
  title: string;
  description?: string;
  start_datetime: string;
  start_date: string;
  start_time: string;
  duration: number;
  location_id?: number;
  location?: Location;
  meeting_place_id?: number;
  meeting_place?: MeetingPlace;
  max_capacity: number;
  is_open_for_booking: boolean;
  instructions?: string;
  status: EventStatus;
  creation_context?: CalendarCreationContext;
  creation_context_id?: string;
  external_calendar_id?: string;
  external_calendar_link?: string;
  created_at: string;
  created_by?: number;
  updated_at: string;
  updated_by?: number;
}

// Appointment User (for darshan attendees)
export interface AppointmentUser {
  id: number;
  appointment_id: number;
  user_id: number;
  attendee_name: string;
  attendee_email?: string;
  attendee_phone?: string;
  relationship_to_requester?: RelationshipType;
  attendance_status: AttendanceStatus;
  checked_in_at?: string;
  checked_in_by?: number;
  comments?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Appointment interface
export interface Appointment {
  // ... existing fields ...
  calendar_event_id?: number;
  calendar_event?: CalendarEvent;
  request_type?: RequestType;
  number_of_attendees?: number;
  appointment_users?: AppointmentUser[];
}

// New Enums
export enum EventType {
  DIGNITARY_APPOINTMENT = "Dignitary Appointment",
  DARSHAN = "Darshan",
  TEACHER_MEETING = "Teacher Meeting",
  VOLUNTEER_MEETING = "Volunteer Meeting",
  PRIVATE_EVENT = "Private Event",
  PLACEHOLDER = "Placeholder",
  TRAVEL = "Travel",
  OTHER = "Other"
}

export enum EventStatus {
  DRAFT = "Draft",
  CONFIRMED = "Confirmed",
  CANCELLED = "Cancelled",
  COMPLETED = "Completed"
}

export enum RequestType {
  DIGNITARY = "dignitary",
  DARSHAN = "darshan",
  VOLUNTEER = "volunteer",
  OTHER = "other"
}

export enum CalendarCreationContext {
  APPOINTMENT_APPROVAL = "appointment_approval",
  DIRECT_CREATION = "direct_creation",
  BULK_IMPORT = "bulk_import"
}

export enum AttendanceStatus {
  PENDING = "Pending",
  CHECKED_IN = "Checked In",
  CANCELLED = "Cancelled",
  NO_SHOW = "No Show"
}

export enum RelationshipType {
  SPOUSE = "Spouse",
  CHILD = "Child", 
  PARENT = "Parent",
  RELATIVE = "Relative",
  FRIEND = "Friend",
  OTHER = "Other"
}
```

### 1.2 Update Enum Hooks

Modify `frontend/src/hooks/useEnums.ts`:

```typescript
export type EnumType = 'userRole' | 'appointmentStatus' | 'appointmentSubStatus' | 
  'appointmentType' | 'appointmentTimeOfDay' | 'honorificTitle' | 'primaryDomain' | 
  'relationshipType' | 'attachmentType' | 'accessLevel' | 'entityType' |
  'eventType' | 'eventStatus' | 'requestType' | 'attendanceStatus';

const enumEndpoints: Record<EnumType, string> = {
  // ... existing endpoints ...
  eventType: '/calendar-events/event-type-options',
  eventStatus: '/calendar-events/event-status-options', 
  requestType: '/appointments/request-type-options',
  attendanceStatus: '/appointments/attendance-status-options'
};
```

## Component Updates

### 2.1 Create New Components

#### Calendar Event Management Components

**CalendarEventList** (`frontend/src/components/CalendarEventList.tsx`):
```typescript
// Features:
// - List all calendar events with filters
// - Filter by event type, date range, status
// - Actions: create, edit, delete, view details
// - Capacity indicators
// - Search and pagination
```

**CalendarEventForm** (`frontend/src/components/CalendarEventForm.tsx`):
```typescript
// Features:
// - Create/edit calendar events
// - Event type selection
// - Date/time picker with duration
// - Location/meeting place selection
// - Capacity settings
// - Instructions field
// - Status management
```

**CalendarEventCard** (`frontend/src/components/CalendarEventCard.tsx`):
```typescript
// Features:
// - Display event details
// - Capacity status (filled/available)
// - List of registered appointments
// - Actions based on user role
```

#### Darshan-Specific Components

**DarshanRegistrationForm** (`frontend/src/components/DarshanRegistrationForm.tsx`):
```typescript
// Features:
// - Select available darshan time slots
// - Add multiple attendees with relationship types
// - Form validation for required fields
// - Capacity checking
// - Submit registration
```

**DarshanSlotSelector** (`frontend/src/components/DarshanSlotSelector.tsx`):
```typescript
// Features:
// - Display available darshan slots
// - Show capacity status
// - Filter by date/location
// - Real-time availability updates
```

**AttendeeManager** (`frontend/src/components/AttendeeManager.tsx`):
```typescript
// Features:
// - Add/remove attendees
// - Manage attendee details (name, email, phone)
// - Specify relationships
// - Validation for required fields
```

### 2.2 Update Existing Components

#### AppointmentRequestForm Updates

Major changes to `frontend/src/components/AppointmentRequestForm.tsx`:

```typescript
// Step 0: Request Type Selection (NEW)
// - Radio buttons for request types
// - Description of each type
// - Conditional rendering of subsequent steps

// Step 1: POC Information (UPDATED)
// - Same as before but conditional based on request type

// Step 2: Appointment Details (SPLIT)
// For Dignitary: Existing dignitary selection flow
// For Darshan: Calendar slot selection + attendee management
// For Other: Simplified form

// Step 3: Final Details (UPDATED)
// - Purpose field (universal)
// - Notes to secretariat
// - Location (if not set by calendar event)
// - Attachments
```

#### Usher Interface Updates

Update `frontend/src/pages/UsherAppointmentSchedule.tsx`:

```typescript
// Enhanced interface to handle both types:
interface UsherAppointmentSchedule {
  id: number;
  appointment_date?: string;
  appointment_time?: string;
  request_type: RequestType;
  // Dignitary appointments
  appointment_dignitaries?: AppointmentDignitaryUsherView[];
  // Darshan appointments  
  appointment_users?: AppointmentUserUsherView[];
  requester?: RequesterUsherView;
  location?: { name: string; };
  calendar_event?: CalendarEvent;
}

// New functions:
// - groupAttendeesByTimeSlot() for darshan attendees
// - renderDarshanAttendees() 
// - handleBulkCheckin() for darshan groups
// - individualCheckin() for appointment_users
```

#### Admin Components Updates

Update admin components to handle new fields:

**AdminAppointmentList.tsx**:
- Add request_type column/filter
- Show attendee count for darshan
- Different icons for appointment types

**AdminAppointmentEdit.tsx**:
- Handle calendar_event association
- Show appointment_users for darshan
- Capacity validation

**AppointmentCard.tsx**:
- Display request_type
- Show calendar event details if available
- List appointment_users for darshan

## New Pages

### 3.1 Admin Calendar Management

**AdminCalendarEvents** (`frontend/src/pages/AdminCalendarEvents.tsx`):
```typescript
// Route: /admin/calendar-events
// Features:
// - List all calendar events
// - Create/edit/delete events
// - Filter by type, date, status
// - View bookings and capacity
// - Bulk operations
```

**AdminCalendarEventEdit** (`frontend/src/pages/AdminCalendarEventEdit.tsx`):
```typescript
// Route: /admin/calendar-events/:id/edit
// Features:
// - Edit calendar event details
// - Manage associated appointments
// - View attendance for past events
// - Export attendee lists
```

### 3.2 Darshan User Pages

**DarshanRegistration** (`frontend/src/pages/DarshanRegistration.tsx`):
```typescript
// Route: /darshan/register
// Features:
// - Browse available darshan slots
// - Register for darshan with attendees
// - Real-time capacity updates
// - Registration confirmation
```

**MyDarshanRegistrations** (`frontend/src/pages/MyDarshanRegistrations.tsx`):
```typescript
// Route: /darshan/my-registrations
// Features:
// - View user's darshan registrations
// - Edit attendee details
// - Cancel registrations
// - Download confirmation/passes
```

**DarshanSchedule** (`frontend/src/pages/DarshanSchedule.tsx`):
```typescript
// Route: /darshan/schedule
// Features:
// - Public view of upcoming darshan sessions
// - Capacity indicators
// - Location and timing details
// - Registration links
```

## API Integration

### 4.1 Calendar Event Services

Create `frontend/src/services/calendarEventService.ts`:

```typescript
export const calendarEventService = {
  // Admin APIs
  getEvents: (filters?: CalendarEventFilters) => 
    api.get('/admin/calendar-events', { params: filters }),
  
  getEvent: (id: number) => 
    api.get(`/admin/calendar-events/${id}`),
  
  createEvent: (data: CreateCalendarEventRequest) => 
    api.post('/admin/calendar-events', data),
  
  updateEvent: (id: number, data: UpdateCalendarEventRequest) => 
    api.put(`/admin/calendar-events/${id}`, data),
  
  deleteEvent: (id: number) => 
    api.delete(`/admin/calendar-events/${id}`),
  
  // Public APIs
  getAvailableDarshanSlots: () => 
    api.get('/darshan/available-slots'),
  
  getEventAvailability: (id: number) => 
    api.get(`/calendar-events/${id}/availability`),
  
  getEventAttendees: (id: number) => 
    api.get(`/admin/calendar-events/${id}/attendees`)
};
```

### 4.2 Darshan Services

Create `frontend/src/services/darshanService.ts`:

```typescript
export const darshanService = {
  // Registration
  register: (data: DarshanRegistrationRequest) => 
    api.post('/darshan/register', data),
  
  getMyRegistrations: () => 
    api.get('/darshan/my-registrations'),
  
  updateRegistration: (id: number, data: UpdateRegistrationRequest) => 
    api.put(`/darshan/registrations/${id}`, data),
  
  cancelRegistration: (id: number) => 
    api.delete(`/darshan/registrations/${id}`),
  
  // Check-in (Usher)
  checkInAttendee: (appointmentUserId: number) => 
    api.post(`/usher/appointment-users/${appointmentUserId}/check-in`),
  
  bulkCheckIn: (appointmentId: number, type: 'all' | 'users' | 'dignitaries') => 
    api.post(`/usher/appointments/${appointmentId}/check-in-${type}`)
};
```

### 4.3 Update Appointment Services

Modify existing appointment services to handle new fields:

```typescript
// Add to appointment creation/update:
interface CreateAppointmentRequest {
  // ... existing fields ...
  request_type: RequestType;
  calendar_event_id?: number;
  attendees?: AttendeeInfo[]; // For darshan requests
  dignitary_ids?: number[]; // For dignitary requests
}
```

## Routing Updates

### 5.1 New Routes

Add to `frontend/src/config/routes.ts`:

```typescript
// Admin Calendar Routes
export const AdminCalendarEventsRoute: RouteConfig = {
  path: '/admin/calendar-events',
  label: 'Calendar Events',
  icon: CalendarMenuIconV2,
  roles: [ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: AdminCalendarEvents
};

// Darshan Routes
export const DarshanRegistrationRoute: RouteConfig = {
  path: '/darshan/register',
  label: 'Register for Darshan',
  icon: CalendarAddMenuIconV2,
  roles: [USER_ROLE, ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: DarshanRegistration
};

export const MyDarshanRegistrationsRoute: RouteConfig = {
  path: '/darshan/my-registrations',
  label: 'My Darshan Registrations',
  icon: CalendarMenuIconV2,
  roles: [USER_ROLE, ADMIN_ROLE, SECRETARIAT_ROLE],
  showInSidebar: true,
  component: MyDarshanRegistrations
};
```

### 5.2 Navigation Updates

Update sidebar navigation to include:
- Calendar Events (Admin section)
- Register for Darshan (User section)
- My Darshan Registrations (User section)

## UI/UX Enhancements

### 6.1 Visual Design

**Request Type Indicators**:
- Dignitary: Professional icon with blue color
- Darshan: Spiritual icon with saffron color
- Volunteer: Service icon with green color
- Other: Generic icon with gray color

**Capacity Indicators**:
- Progress bars for darshan slots
- Color coding (green: available, yellow: filling up, red: full)
- Real-time updates

**Status Badges**:
- Different styles for appointment vs calendar event status
- Attendance status badges for individual attendees

### 6.2 Mobile Optimization

**Darshan Registration**:
- Touch-friendly slot selection
- Swipeable attendee management
- Optimized form layout

**Usher Interface**:
- Large touch targets for check-in buttons
- Swipeable attendee lists
- Quick bulk actions

### 6.3 Accessibility

- Screen reader support for new components
- Keyboard navigation for calendar interfaces
- High contrast mode compatibility
- Proper ARIA labels

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
**Goals**: Establish data types and basic infrastructure

**Tasks**:
- Add new TypeScript interfaces
- Update enum hooks
- Create basic calendar event services
- Add new route definitions

**Deliverables**:
- Updated type definitions
- Basic API service structure
- Route configuration

### Phase 2: Calendar Event Management (Week 3-4)
**Goals**: Admin can create and manage calendar events

**Tasks**:
- Create CalendarEventList component
- Create CalendarEventForm component
- Build AdminCalendarEvents page
- Implement CRUD operations

**Deliverables**:
- Complete calendar event management interface
- Admin can create darshan time slots

### Phase 3: Darshan Registration (Week 5-6)
**Goals**: Users can register for darshan

**Tasks**:
- Create DarshanRegistrationForm
- Create DarshanSlotSelector
- Build public darshan pages
- Implement capacity checking

**Deliverables**:
- Public darshan registration flow
- Real-time capacity updates

### Phase 4: Enhanced Appointment Flow (Week 7-8)
**Goals**: Support multiple request types in appointment flow

**Tasks**:
- Update AppointmentRequestForm
- Add request type selection
- Implement conditional rendering
- Update admin appointment interfaces

**Deliverables**:
- Unified appointment request form
- Admin can handle all appointment types

### Phase 5: Usher Enhancements (Week 9)
**Goals**: Ushers can handle darshan check-ins

**Tasks**:
- Update UsherAppointmentSchedule
- Add appointment_users support
- Implement bulk check-in
- Add individual attendee management

**Deliverables**:
- Enhanced usher interface
- Support for darshan attendee check-in

### Phase 6: Polish & Testing (Week 10)
**Goals**: Production-ready implementation

**Tasks**:
- UI/UX refinements
- Performance optimization
- Comprehensive testing
- Documentation

**Deliverables**:
- Production-ready frontend
- Complete documentation

## Testing Strategy

### 7.1 Unit Testing

**Components to Test**:
- CalendarEventForm validation
- DarshanRegistrationForm logic
- AttendeeManager functionality
- Capacity calculation functions

**Testing Libraries**:
- Jest for unit tests
- React Testing Library for component tests
- MSW for API mocking

### 7.2 Integration Testing

**End-to-End Flows**:
- Complete darshan registration process
- Calendar event creation and booking
- Usher check-in workflows
- Admin appointment management

**Tools**:
- Cypress for E2E testing
- TestCafe as backup option

### 7.3 User Acceptance Testing

**Scenarios**:
- Different user roles (admin, user, usher)
- Mobile and desktop browsers
- Edge cases (capacity limits, network issues)
- Accessibility compliance

## Performance Considerations

### 8.1 Optimization Strategies

**Data Loading**:
- Lazy load appointment_users when needed
- Paginate large attendee lists
- Cache calendar event data
- Optimize API queries

**Rendering**:
- Virtualize large lists
- Memoize expensive calculations
- Use React.memo for static components
- Implement proper loading states

### 8.2 Real-time Updates

**WebSocket Integration**:
- Real-time capacity updates
- Live check-in status
- Instant booking confirmations

**Polling Fallback**:
- Graceful degradation for older browsers
- Configurable polling intervals

## Security Considerations

### 9.1 Frontend Validation

**Input Validation**:
- Client-side capacity checking
- Form validation for attendee data
- File upload restrictions

**Access Control**:
- Role-based component rendering
- Route protection
- API endpoint restrictions

### 9.2 Data Protection

**Sensitive Data**:
- Secure handling of attendee information
- PII protection in logging
- Proper data cleanup

## Backward Compatibility

### 10.1 Legacy Support

**Existing Appointments**:
- Handle appointments without calendar_event_id
- Default request_type to 'dignitary'
- Maintain existing dignitary workflow

**Gradual Migration**:
- Dual-write strategy during transition
- Fallback to legacy fields
- Data migration scripts

### 10.2 API Compatibility

**Response Handling**:
- Handle both old and new response formats
- Graceful degradation for missing fields
- Version detection

## Deployment Strategy

### 11.1 Feature Flags

**Gradual Rollout**:
- Feature flags for new functionality
- A/B testing for UI changes
- Rollback capability

### 11.2 Monitoring

**Key Metrics**:
- Registration conversion rates
- Check-in success rates
- Performance metrics
- Error rates

**Alerting**:
- Capacity limit notifications
- Failed registrations
- Performance degradation

## Documentation

### 12.1 Developer Documentation

**Code Documentation**:
- Component prop interfaces
- API service documentation
- Integration guides

**Architecture Documentation**:
- Data flow diagrams
- Component hierarchy
- State management patterns

### 12.2 User Documentation

**User Guides**:
- Darshan registration process
- Admin calendar management
- Usher check-in procedures

**Training Materials**:
- Video tutorials
- Step-by-step guides
- FAQ sections

## Success Metrics

### 13.1 Technical Metrics

- **Performance**: Page load times < 2 seconds
- **Reliability**: 99.9% uptime for registration system
- **Scalability**: Support 1000+ concurrent users
- **Accessibility**: WCAG 2.1 AA compliance

### 13.2 User Experience Metrics

- **Registration Success Rate**: > 95%
- **Check-in Efficiency**: < 30 seconds per attendee
- **User Satisfaction**: > 4.5/5 rating
- **Mobile Usage**: > 60% of registrations

## Risk Mitigation

### 13.1 Technical Risks

**Capacity Race Conditions**:
- Server-side validation
- Optimistic locking
- User feedback for conflicts

**Performance Issues**:
- Load testing
- Caching strategies
- Database optimization

### 13.2 User Experience Risks

**Complex Registration Flow**:
- User testing
- Simplified mobile interface
- Progress indicators

**Check-in Bottlenecks**:
- Bulk operations
- Offline capability
- Quick recovery from errors

## Conclusion

This comprehensive frontend migration plan provides a structured approach to implementing darshan functionality while maintaining the existing dignitary appointment system. The phased implementation ensures minimal disruption to current users while introducing powerful new capabilities.

Key success factors:
1. **Backward Compatibility**: Maintain existing workflows
2. **User Experience**: Intuitive interfaces for all user types
3. **Performance**: Real-time updates and fast loading
4. **Scalability**: Support for large darshan events
5. **Testing**: Comprehensive validation of all scenarios

The plan balances technical excellence with practical delivery timelines, ensuring the AOLF GSEC system can effectively serve both individual dignitary appointments and large-scale darshan events.

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Next Review: After Phase 1 completion* 