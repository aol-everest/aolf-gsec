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
  appointment_type: string;
  approved_by: number;
  approved_by_user: User;
  approved_datetime: string;
  attachments?: AppointmentAttachment[];
  created_at: string;
  dignitary: Dignitary; // MUST DEPRECATE
  last_updated_by: number;
  last_updated_by_user: User;
  location: Location;
  location_id: number;
  preferred_date?: string;
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

interface StatusSubStatusMapping {
  [key: string]: {
    default_sub_status: string;
    valid_sub_statuses: string[];
  }
}

interface StatusMap {   
  [key: string]: string;
}

interface SubStatusMap {
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

export type { 
  Location, 
  User, 
  Dignitary, 
  Appointment, 
  AppointmentAttachment, 
  AppointmentDignitary, 
  AdminAppointmentUpdate,
  StatusSubStatusMapping, 
  StatusMap, 
  SubStatusMap, 
  RoleMap, 
  AccessLevelMap, 
  EntityTypeMap, 
  HonorificTitleMap, 
  AppointmentTimeSlotDetailsMap
};

