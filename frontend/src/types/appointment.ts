import { RelationshipType, HonorificTitle, PrimaryDomain } from "../constants/formConstants";

export interface AppointmentFormData {
  // POC Information (auto-populated for logged-in POCs)
  pocFirstName: string;
  pocLastName: string;
  pocEmail: string;
  pocPhone: string;
  pocRelationshipType: RelationshipType;

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