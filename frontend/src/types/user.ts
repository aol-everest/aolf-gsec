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
  country_code?: string;
  role: UserRole;
  // Available preferences: appointment_created, appointment_updated, new_appointment_request, bcc_on_all_emails (Secretariat only)
  email_notification_preferences?: Record<string, boolean>;
  
  // Professional Information (consistent with dignitary model)
  title_in_organization?: string;
  organization?: string;
  
  // Enhanced Location Information
  state_province?: string;
  state_province_code?: string;
  city?: string;
  
  // Art of Living Teacher Information
  teacher_status?: string;
  teacher_code?: string;
  programs_taught?: string[];
  
  // Art of Living Roles/Affiliations
  aol_affiliations?: string[];
  
  created_at: string;
  last_login_at?: string;
} 