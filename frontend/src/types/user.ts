export enum UserRole {
  SECRETARIAT = 'SECRETARIAT',
  GENERAL = 'GENERAL',
  USHER = 'USHER'
}

export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  picture?: string;
  role: UserRole;
  // Available preferences: appointment_created, appointment_updated, new_appointment_request, bcc_on_all_emails (Secretariat only)
  email_notification_preferences?: Record<string, boolean>;
  created_at: string;
  last_login_at?: string;
} 