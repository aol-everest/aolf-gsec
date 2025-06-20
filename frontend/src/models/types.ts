// Types for the backend API

interface Location {
  id: number;
  name: string;
  street_address: string;
  state: string;
  city: string;
  country: string;
  zip_code: string;
  driving_directions?: string;
  parking_info?: string;
  attachment_path?: string;
  attachment_name?: string;
  attachment_file_type?: string;
  attachment_thumbnail_path?: string;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  // Professional Information
  title_in_organization?: string;
  organization?: string;
  // Enhanced Location Information
  state_province?: string;
  state_province_code?: string;
  city?: string;
  country_code?: string;
  // Art of Living Teacher Information
  teacher_status?: string;
  teacher_code?: string;
  programs_taught?: string[];
  // Art of Living Roles/Affiliations
  aol_affiliations?: string[];
}

interface BusinessCardExtraction {
  honorific_title?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  title_in_organization?: string;
  organization?: string;
  primary_domain?: string;
  primary_domain_other?: string;
  phone?: string;
  other_phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  linked_in_or_website?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  social_media?: Record<string, string> | Array<string>;
  bio?: string;
  bio_summary?: string;
  additional_info?: Record<string, string>;
  extra_fields?: Array<{key: string, value: string}>;
  address?: string;
  attachment_id?: number;
  attachment_uuid?: string;
  file_name?: string;
  file_path?: string;
  file_type?: string;
  is_image?: boolean;
  thumbnail_path?: string;
  has_dignitary_met_gurudev?: boolean;
  gurudev_meeting_date?: string;
  gurudev_meeting_location?: string;
  gurudev_meeting_notes?: string;
  secretariat_notes?: string;
}

interface Dignitary {
  id: number;
  honorific_title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  primary_domain: string;
  primary_domain_other: string;
  title_in_organization: string;
  organization: string;
  bio_summary: string;
  poc_first_name: string;
  poc_last_name: string;
  poc_email: string;
  poc_phone: string;
  linked_in_or_website: string;
  country_code: string;
  country: string;
  state: string;
  city: string;
  relationship_type?: string;
  poc_relationship_type?: string;
  has_dignitary_met_gurudev: boolean;
  gurudev_meeting_date?: string;
  gurudev_meeting_location?: string;
  gurudev_meeting_notes?: string;
}

interface AppointmentAttachment {
  id: number;
  appointment_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  is_image: boolean;
  thumbnail_path?: string;
  uploaded_by: number;
  created_at: string;
  attachment_type: string;
}

interface Appointment {
  id: number;
  appointment_date: string;
  appointment_dignitaries?: AppointmentDignitary[];
  appointment_time: string;
  duration: number;
  appointment_type: string;
  approved_by?: number;
  approved_by_user?: User;
  approved_datetime?: string;
  attachments?: AppointmentAttachment[];
  created_at: string;
  created_by?: number;
  created_by_user?: User;
  dignitary: Dignitary; // MUST DEPRECATE
  last_updated_by?: number;
  last_updated_by_user?: User;
  location: Location;
  location_id: number;
  meeting_place: MeetingPlace;
  meeting_place_id: number;
  preferred_date?: string;  // For dignitary appointments only
  preferred_start_date?: string;  // For non-dignitary appointments
  preferred_end_date?: string;    // For non-dignitary appointments
  preferred_time_of_day?: string;
  purpose?: string;
  requester?: User;
  requester_id?: number;
  requester_notes_to_secretariat: string;
  secretariat_follow_up_actions: string;
  secretariat_meeting_notes: string;
  secretariat_notes_to_requester: string;
  status: string;
  sub_status: string;
  updated_at: string;
  appointment_contacts?: AppointmentContact[];
  request_type: string;
  number_of_attendees?: number;
  calendar_event_id?: number;
  objective?: string;  // What would you like to get out of the meeting? (expected outcome)
  attachments_comment?: string;  // Generic field for attachment-related comments/metadata
}

interface AdminAppointmentUpdate {
  id?: number;
  appointment_date?: string;
  appointment_dignitaries?: AppointmentDignitary[];
  appointment_time?: string;
  appointment_type?: string;
  attachments?: AppointmentAttachment[];
  location_id?: number;
  purpose?: string;
  requester_id?: number;
  requester_notes_to_secretariat?: string;
  secretariat_follow_up_actions?: string;
  secretariat_meeting_notes?: string;
  secretariat_notes_to_requester?: string;
  status?: string;
  sub_status?: string;
}

interface AppointmentDignitary {
  id: number;
  appointment_id: number;
  dignitary_id: number;
  dignitary: Dignitary;
  created_at?: string;
}

interface AppointmentContact {
  id: number;
  appointment_id: number;
  contact_id: number;
  contact: UserContact;
  role_in_team_project?: string;
  role_in_team_project_other?: string;
  attendance_status?: string;
  checked_in_at?: string;
  checked_in_by?: number;
  comments?: string;
  // Engagement and participation fields
  has_met_gurudev_recently?: boolean;
  is_attending_course?: boolean;
  course_attending?: string;
  is_doing_seva?: boolean;
  seva_type?: string;
  created_at?: string;
  updated_at?: string;
}

interface StatusSubStatusMapping {
  [key: string]: {
    default_sub_status: string;
    valid_sub_statuses: string[];
  }
}

interface EnumMap {
  [key: string]: string;
}

interface StatusMap {   
  [key: string]: string;
}

interface SubStatusMap {
  [key: string]: string;
}

interface EventTypeMap {
  [key: string]: string;
}

interface RoleMap {
  [key: string]: string;
}

interface AccessLevelMap {
  [key: string]: string;
}

interface EntityTypeMap {
  [key: string]: string;
}

interface HonorificTitleMap {
  [key: string]: string;
}

// Combined structure with both counts and IDs in a single map
interface AppointmentTimeSlotDetailsMap {
  dates: {
    [date: string]: {
      appointment_count: number;
      time_slots: {
        [timeSlot: string]: {
          [appointmentId: string]: number; // appointment ID -> people count
        };
      };
    };
  };
}

export interface MeetingPlace {
  id: number;
  location_id: number;
  name: string;
  description?: string;
  floor?: string;
  room_number?: string;
  building?: string;
  additional_directions?: string;
  is_default: boolean;
  is_active: boolean;
  lat?: number;
  lng?: number;
  created_at: string;
  updated_at?: string;
  created_by: number;
  updated_by?: number;
  created_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  updated_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

export interface RequestTypeConfig {
  request_type: string;
  display_name: string;
  description: string;
  attendee_type: string;
  max_attendees: number;
  attendee_label_singular: string;
  attendee_label_plural: string;
  step_2_title: string;
  step_2_description: string;
}

export interface PersonalAttendee {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  relationship_to_requester?: string;
  role_in_team_project?: string;
  role_in_team_project_other?: string;
  comments?: string;
}

export interface UserContact {
  id: number;
  owner_user_id: number;
  contact_user_id?: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  relationship_to_owner?: string;
  has_met_gurudev_recently?: boolean;
  is_attending_course?: boolean;
  course_attending?: string;
  is_doing_seva?: boolean;
  seva_type?: string;
  created_by?: number;
  notes?: string;
  appointment_usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  contact_user?: User;
}

export interface UserContactCreateData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  relationship_to_owner?: string;
  notes?: string;
  contact_user_id?: number;
}

export interface UserContactUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  relationship_to_owner?: string;
  notes?: string;
  contact_user_id?: number;
}

export interface UserContactListResponse {
  contacts: UserContact[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface UserContactSearchResponse {
  contacts: UserContact[];
  total_results: number;
  search_query: string;
}

export interface CalendarEvent {
  id?: number;
  event_type: string;
  title: string;
  description?: string;
  start_datetime: string;
  start_date: string;
  start_time: string;
  duration: number;
  location_id?: number;
  meeting_place_id?: number;
  max_capacity?: number;
  is_open_for_booking?: boolean;
  instructions?: string;
  status?: string;
  creation_context?: string;
  creation_context_id?: string;
  external_calendar_id?: string;
  external_calendar_link?: string;
}

// New types for calendar event-centric schedule
export interface AppointmentSummary {
  id: number;
  purpose?: string;
  status: string;
  sub_status?: string;
  appointment_type?: string;
  request_type?: string;
  number_of_attendees?: number;
  appointment_dignitaries?: AppointmentDignitary[];
  appointment_contacts?: AppointmentContact[];
  requester?: User;
  secretariat_meeting_notes?: string;
  secretariat_follow_up_actions?: string;
  secretariat_notes_to_requester?: string;
  // Date fields
  preferred_date?: string;  // For dignitary appointments only
  preferred_start_date?: string;  // For non-dignitary appointments
  preferred_end_date?: string;    // For non-dignitary appointments
  preferred_time_of_day?: string;
  // Legacy fields - now sourced from calendar event
  appointment_date: string;
  appointment_time: string;
  duration: number;
  objective?: string;  // What would you like to get out of the meeting? (expected outcome)
  attachments_comment?: string;  // Generic field for attachment-related comments/metadata
}

export interface CalendarEventWithAppointments {
  id: number;
  event_type: string;
  title: string;
  description?: string;
  start_datetime: string;
  start_date: string;
  start_time: string;
  duration: number;
  location?: Location;
  meeting_place?: MeetingPlace;
  max_capacity: number;
  is_open_for_booking: boolean;
  instructions?: string;
  status: string;
  creation_context?: string;
  creation_context_id?: string;
  external_calendar_id?: string;
  external_calendar_link?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  // Enriched fields
  current_capacity: number;
  available_capacity: number;
  linked_appointments_count: number;
  appointments: AppointmentSummary[];
  total_attendees: number;
  appointment_count: number;
}

export interface ScheduleResponse {
  calendar_events: CalendarEventWithAppointments[];
  total_events: number;
}

// User profile and notification interfaces
export interface NotificationPreferences {
  appointment_created: boolean;
  appointment_updated: boolean;
  new_appointment_request: boolean;
  bcc_on_all_emails: boolean;
}

export interface UserUpdateData {
  phone_number: string;
  email_notification_preferences: NotificationPreferences;
  country_code: string;
  title_in_organization?: string;
  organization?: string;
  state_province?: string;
  state_province_code?: string;
  city?: string;
  teacher_status: string;
  teacher_code?: string;
  programs_taught?: string[];
  aol_affiliations?: string[];
}

// Geographic data interface
export interface SubdivisionData {
  id: number;
  country_code: string;
  subdivision_code: string;
  name: string;
  subdivision_type: string;
  is_enabled: boolean;
  full_code: string;
}

// Field display names mapping
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  phone_number: 'Phone Number',
  country_code: 'Country',
  title_in_organization: 'Title in Organization',
  organization: 'Organization',
  teacher_status: 'Art of Living Teacher Status',
  programs_taught: 'Programs Taught',
  teacher_code: 'Teacher Code',
  aol_affiliations: 'Art of Living Affiliations',
  state_province: 'State/Province',
  city: 'City',
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  honorific_title: 'Honorific Title',
  primary_domain: 'Primary Domain',
  bio_summary: 'Bio Summary',
  linked_in_or_website: 'LinkedIn or Website',
  state: 'State',
  relationship_to_requester: 'Relationship to You',
  role_in_team_project: 'Role in Team/Project',
  comments: 'Comments',
  notes: 'Notes'
};

export const getFieldDisplayName = (fieldName: string): string => {
  return FIELD_DISPLAY_NAMES[fieldName] || fieldName;
};

export type { 
  Location, 
  User, 
  Dignitary, 
  BusinessCardExtraction,
  Appointment, 
  AppointmentAttachment, 
  AppointmentDignitary, 
  AppointmentContact,
  AdminAppointmentUpdate,
  EnumMap,
  StatusSubStatusMapping, 
  StatusMap, 
  SubStatusMap, 
  EventTypeMap,
  RoleMap, 
  AccessLevelMap, 
  EntityTypeMap, 
  HonorificTitleMap, 
  AppointmentTimeSlotDetailsMap
};

