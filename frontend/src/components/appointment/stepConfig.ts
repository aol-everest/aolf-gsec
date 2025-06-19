import { RequestTypeConfig } from '../../models/types';

export interface StepData {
  // Profile data
  profileData?: any;
  
  // Step 1: Initial Information
  pocFirstName?: string;
  pocLastName?: string;
  pocEmail?: string;
  requestType?: string;
  numberOfAttendees?: number;
  
  // Step 2: Attendee Information
  dignitaries?: any[];
  contacts?: any[];
  
  // Step 3: Appointment Details
  purpose?: string;
  preferredDate?: string;
  preferredStartDate?: string;
  preferredEndDate?: string;
  preferredTimeOfDay?: string;
  location_id?: number;
  requesterNotesToSecretariat?: string;
  attachments?: File[];
}

export interface StepConfig {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
  validate: (data: StepData) => Promise<{ isValid: boolean; errors?: string[] }>;
  onNext?: (data: StepData) => Promise<void>;
  isOptional?: boolean;
  isVisible?: (data: StepData) => boolean;
}

export interface WizardState {
  currentStep: number;
  data: StepData;
  isProfileRequired: boolean;
  completedSteps: Set<number>;
  errors: Record<string, string[]>;
}

// Main steps configuration (always 4 steps)
export const getMainSteps = (requestTypeConfig: RequestTypeConfig | null): Omit<StepConfig, 'component' | 'validate' | 'onNext'>[] => [
  {
    id: 'initial-info',
    title: 'Initial Information',
    description: 'Basic information about your appointment request'
  },
  {
    id: 'appointment-details',
    title: 'Appointment Details',
    description: 'Specify appointment preferences and details'
  },
  {
    id: 'attendee-info',
    title: requestTypeConfig?.step_2_title || 'Add Attendee Information',
    description: requestTypeConfig?.step_2_description || 'Add attendees to this appointment request'
  },
  {
    id: 'review-submit',
    title: 'Review & Submit',
    description: 'Review your appointment request before submission'
  }
];

// Helper to get display steps (for stepper)
export const getDisplaySteps = (requestTypeConfig: RequestTypeConfig | null) => {
  return getMainSteps(requestTypeConfig).map(step => step.title);
};

// Helper to check if we should show profile overlay
export const shouldShowProfileOverlay = (isProfileComplete: boolean, currentStep: number): boolean => {
  return !isProfileComplete && currentStep === 0;
}; 