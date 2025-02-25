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
  title_in_organization: string;
  organization: string;
  bio_summary: string;
  poc_first_name: string;
  poc_last_name: string;
  poc_email: string;
  poc_phone: string;
  linked_in_or_website: string;
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
}

interface Appointment {
  id: number;
  dignitary_id: number;
  dignitary: Dignitary;
  requester: User;
  purpose: string;
  preferred_date: string;
  preferred_time_of_day: string;
  appointment_date: string;
  appointment_time: string;
  location_id: number;
  location?: Location;
  requester_notes_to_secretariat: string;
  status: string;
  sub_status: string;
  appointment_type: string;
  created_at: string;
  updated_at: string;
  secretariat_notes_to_requester: string;
  secretariat_meeting_notes: string;
  secretariat_follow_up_actions: string;
  approved_datetime: string;
  approved_by: number;
  approved_by_user: User;
  last_updated_by: number;
  last_updated_by_user: User;
  attachments?: AppointmentAttachment[];
}

export type { Location, User, Dignitary, Appointment, AppointmentAttachment };
