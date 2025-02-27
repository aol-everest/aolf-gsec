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
  email_notification_preferences?: Record<string, boolean>;
  created_at: string;
  last_login_at?: string;
} 