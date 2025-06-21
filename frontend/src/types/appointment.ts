// Define string types for enum values
export type RelationshipType = string;
export type HonorificTitle = string;
export type PrimaryDomain = string;

export interface AppointmentFormData {
  // POC Information is now sourced from logged-in user directly

  // Dignitary Selection
  isExistingDignitary: boolean;
  existingDignitaryId?: string;

  // Dignitary Information
  dignitaryHonorificTitle?: HonorificTitle;
  dignitaryFirstName: string;
  dignitaryLastName: string;
  dignitaryEmail: string;
  dignitaryPhone?: string;
  
  // Professional Information
  dignitaryPrimaryDomain: PrimaryDomain;
  dignitaryTitleInOrganization?: string;
  dignitaryOrganization?: string;
  dignitaryBioSummary: string;
  dignitaryLinkedInOrWebsite: string;

  // Location Information
  dignitaryCountry?: 'US' | 'India' | 'LATAM' | 'Canada' | 'Other';
  dignitaryState?: string;
  dignitaryCut?: string;

  // Additional Notes
  dignitaryPreMeetingNotes?: string;

  // File Attachment for Bio
  dignitaryBioAttachment?: File;
} 