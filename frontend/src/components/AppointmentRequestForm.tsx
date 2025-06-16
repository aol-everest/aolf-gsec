import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { formatDate, getLocalDateString, validateDateRange, validateSingleDate, formatDateRange } from '../utils/dateUtils';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  Checkbox,
  CircularProgress,
  LinearProgress,
  FormHelperText,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  FormLabel,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from './LocationAutocomplete';
import { useNavigate } from 'react-router-dom';
import { formatHonorificTitle } from '../utils/formattingUtils';
import NumberInput from './NumberInput';
import { useTheme } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { Location, Dignitary, Appointment, RequestTypeConfig, PersonalAttendee, UserContact, UserContactCreateData, UserContactUpdateData, UserContactListResponse } from '../models/types';
import { EnumSelect } from './EnumSelect';
import { useEnums } from '../hooks/useEnums';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { AppointmentStatusChip } from './AppointmentStatusChip';
import { PersonSelectionChip } from './PersonSelectionChip';
import ProfileFieldsForm, { ProfileFieldsFormRef } from './ProfileFieldsForm';
import { isProfileComplete, getProfileCompletionFields } from '../utils/profileValidation';
import { UserUpdateData } from '../models/types';

// Import new step configuration system
import { getMainSteps, getDisplaySteps, shouldShowProfileOverlay, WizardState, StepData } from './appointment/stepConfig';
import { StepNavigation } from './appointment/StepNavigation';
import { AttendeeList } from './appointment/AttendeeList';
import { ProfileOverlay } from './appointment/ProfileOverlay';
import { InitialInfoStep } from './appointment/steps/InitialInfoStep';
import { CheckSquareCircleFilledIconV2, CheckCircleIconV2, CloseIconFilledCircleV2 } from './iconsv2';
import { useAppointmentSummary, hasExistingAppointments } from '../hooks/useAppointmentSummary';
import { CountrySelect } from './CountrySelect';
import { SubdivisionStateDropdown } from './SubdivisionStateDropdown';

// Remove the hardcoded enum and add a state for time of day options
// const AppointmentTimeOfDay = {
//   MORNING: "Morning",
//   AFTERNOON: "Afternoon",
//   EVENING: "Evening"
// }

// Add AppointmentResponse interface for the API response
interface AppointmentResponse extends Omit<Appointment, 'dignitary' | 'requester' | 'location' | 'approved_by_user' | 'last_updated_by_user' | 'attachments'> {
  // Only include the fields that are returned by the API when creating a new appointment
  // Note: preferred_start_date and preferred_end_date are already inherited from Appointment
}

// Add Country interface based on the backend model
interface Country {
  iso2_code: string;
  name: string;
  iso3_code: string;
  region?: string;
  sub_region?: string;
  intermediate_region?: string;
  country_groups?: string[];
  alt_names?: string[];
  is_enabled: boolean;
}

// Step 1: POC Information
interface PocFormData {
  pocFirstName: string;
  pocLastName: string;
  pocEmail: string;
  requestType: string;
  numberOfAttendees: number; // Changed from numberOfDignitaries to be generic
}

// Step 2: Dignitary Information
interface DignitaryFormData {
  isExistingDignitary: boolean;
  selectedDignitaryId?: number;
  dignitaryHonorificTitle: string;
  dignitaryFirstName: string;
  dignitaryLastName: string;
  dignitaryEmail: string;
  dignitaryPhone: string;
  dignitaryPrimaryDomain: string;
  dignitaryPrimaryDomainOther: string;
  dignitaryTitleInOrganization: string;
  dignitaryOrganization: string;
  dignitaryBioSummary: string;
  dignitaryLinkedInOrWebsite: string;
  dignitaryCountry: string;
  dignitaryCountryCode: string; // Added for country code
  dignitaryState: string;
  dignitaryStateCode: string; // Added for state code
  dignitaryCity: string;
  dignitaryHasMetGurudev: boolean;
  pocRelationshipType: string;
  dignitaryGurudevMeetingDate?: string;
  dignitaryGurudevMeetingLocation?: string;
  dignitaryGurudevMeetingNotes?: string;
}

// Create a type that makes all fields in Dignitary optional
type PartialDignitary = Partial<Dignitary>;

// New interface for selected dignitaries
interface SelectedDignitary extends PartialDignitary {
  id: number; // Only id is required
  isNew?: boolean;
  relationshipType?: string;
  previousId?: number;
  poc_relationship_type?: string;
  first_name: string; // First name is required
  last_name: string; // Last name is required
  created_by?: number; // Add created_by property
  created_at?: string; // Add created_at property
}

// Engagement fields interface
interface EngagementFields {
  hasMetGurudevRecently: boolean | null;
  isAttendingCourse: boolean | null;
  courseAttending: string;
  isDoingSeva: boolean | null;
  sevaType: string;
}

// Personal Attendee Form Data
interface PersonalAttendeeFormData {
  firstName: string;
  lastName: string;
  email: string; // Now required
  phone: string;
  relationshipToRequester: string;
  roleInTeamProject: string;
  roleInTeamProjectOther: string;
  comments: string;
  // Engagement and participation fields
  hasMetGurudevRecently: boolean | null;
  isAttendingCourse: boolean | null;
  courseAttending: string;
  isDoingSeva: boolean | null;
  sevaType: string;
}

// Step 3: Appointment Information
interface AppointmentFormData {
  purpose: string;
  preferredDate: string;  // For dignitary appointments only
  preferredStartDate: string;  // For non-dignitary appointments
  preferredEndDate: string;    // For non-dignitary appointments
  preferredTimeOfDay: string;
  location_id: number;
  requesterNotesToSecretariat: string;
}

interface AppointmentRequestFormProps {
  showProfileStep?: boolean;
}

export const AppointmentRequestForm: React.FC<AppointmentRequestFormProps> = ({ 
  showProfileStep = false 
}) => {
  const { userInfo, updateUserInfo } = useAuth();
  
  // Initialize wizard state using step configuration system
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 0,
    data: {},
    isProfileRequired: !isProfileComplete(userInfo),
    completedSteps: new Set<number>(),
    errors: {}
  });
  
  // Keep activeStep for backward compatibility during transition
  const activeStep = wizardState.currentStep;
  
  // Helper function to update wizard state
  const setActiveStep = (step: number | ((prev: number) => number)) => {
    setWizardState(prev => ({
      ...prev,
      currentStep: typeof step === 'function' ? step(prev.currentStep) : step
    }));
  };
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | undefined>(undefined);
  const [dignitaries, setDignitaries] = useState<Dignitary[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<AppointmentResponse | null>(null);
  const [selectedDignitaries, setSelectedDignitaries] = useState<SelectedDignitary[]>([]);
  const [selectedDignitary, setSelectedDignitary] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDignitaryIndex, setEditingDignitaryIndex] = useState<number | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Add ref for ProfileFieldsForm
  const profileFormRef = useRef<ProfileFieldsFormRef>(null);
  const [isProfileFormValid, setIsProfileFormValid] = useState(false);

  // Handle profile overlay close action
  const handleProfileOverlayClose = () => {
    // Check if profile is now complete
    if (isProfileComplete(userInfo)) {
      // Profile is complete, allow them to continue
      setWizardState(prev => ({
        ...prev,
        isProfileRequired: false
      }));
    } else {
      // Profile is still incomplete, redirect to home
      navigate('/home');
    }
  };

  // Monitor profile form validation state
  useEffect(() => {
    const checkValidation = () => {
      if (profileFormRef.current) {
        setIsProfileFormValid(profileFormRef.current.isValid());
      }
    };
    
    // Check validation periodically when on profile step
    if (activeStep === 0 && showProfileStep) {
      const interval = setInterval(checkValidation, 500);
      return () => clearInterval(interval);
    }
  }, [activeStep, showProfileStep]);

  // Profile update mutation for step 0
  const updateProfileMutation = useMutation({
    mutationFn: async (updateData: UserUpdateData) => {
      const { data } = await api.patch('/users/me/update', updateData);
      return data;
    },
    onSuccess: (data) => {
      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      // Update userInfo context with new data
      updateUserInfo(data as any);
      // Update wizard state to mark profile as complete and move to step 0
      setWizardState(prev => ({
        ...prev,
        isProfileRequired: false,
        currentStep: 0
      }));
      // Invalidate user profile queries
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      enqueueSnackbar('Error updating profile', { variant: 'error' });
    }
  });
  
  // Add state for file attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // State to track the required number of dignitaries/attendees
  const [requiredDignitariesCount, setRequiredDignitariesCount] = useState<number>(1);
  
  // State to track engagement fields for each contact
  const [contactEngagementFields, setContactEngagementFields] = useState<Record<number, EngagementFields>>({});
  
  // State for selected contact in dropdown (before adding)
  const [selectedContactForAdding, setSelectedContactForAdding] = useState<number | null>(null);
  
  // State for selected request type configuration
  const [selectedRequestTypeConfig, setSelectedRequestTypeConfig] = useState<RequestTypeConfig | null>(null);
  
  // State for personal attendees (non-dignitary requests)
  const [selectedPersonalAttendees, setSelectedPersonalAttendees] = useState<PersonalAttendee[]>([]);
  
  // State for personal attendee form
  const [isPersonalAttendeeFormExpanded, setIsPersonalAttendeeFormExpanded] = useState(false);
  const [isEditingPersonalAttendee, setIsEditingPersonalAttendee] = useState(false);
  const [editingPersonalAttendeeIndex, setEditingPersonalAttendeeIndex] = useState<number | null>(null);
  
  // State for user contacts integration
  const [userContacts, setUserContacts] = useState<UserContact[]>([]);
  const [selectedUserContacts, setSelectedUserContacts] = useState<UserContact[]>([]);
  const [isContactFormExpanded, setIsContactFormExpanded] = useState(false);
  const [contactFormMode, setContactFormMode] = useState<'select' | 'create'>('select');
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  
  // State for self-attendance feature
  const [isUserAttending, setIsUserAttending] = useState(true);  // Changed to default to true
  const [emailValidationWarnings, setEmailValidationWarnings] = useState<string[]>([]);
  
  // Add a state to track if the selected dignitary has been modified
  const [isDignitaryModified, setIsDignitaryModified] = useState(false);

  // Add a new state variable to track if the dignitary form is expanded
  const [isDignitaryFormExpanded, setIsDignitaryFormExpanded] = useState(false);

  // State for existing appointments dialog
  const [showExistingAppointmentsDialog, setShowExistingAppointmentsDialog] = useState(false);
  const [pendingStepTransition, setPendingStepTransition] = useState(false);

  // Fetch appointment summary data
  const { data: appointmentSummary } = useAppointmentSummary();

  // Fetch request type map from the API
  const { data: requestTypeMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['request-type-map'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string>>('/appointments/request-type-options-map');
      return data;
    },
  });

  // Fetch attendee type map from the API
  const { data: attendeeTypeMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['attendee-type-map'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string>>('/appointments/attendee-type-options-map');
      return data;
    },
  });

  // Fetch status options
  const { data: statusOptions = [] } = useQuery<string[]>({
    queryKey: ['status-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/status-options');
      return data;
    },
  });

  // Fetch relationship type map
  const { data: relationshipTypeMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['person-relationship-type-map'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string>>('/appointments/person-relationship-type-options-map');
      return data;
    },
  });

  // Fetch request type configurations
  const { data: requestTypeConfigs = [], isLoading: isLoadingRequestTypes } = useQuery<RequestTypeConfig[]>({
    queryKey: ['request-type-configurations'],
    queryFn: async () => {
      const { data } = await api.get<RequestTypeConfig[]>('/request-types/configurations');
      return data;
    },
  });
  
  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get<Location[]>('/locations/all');
      return data;
    },
  });

  // Fetch dignitaries assigned to the user
  const { data: fetchedDignitaries = [], isLoading: isLoadingDignitaries } = useQuery<Dignitary[]>({
    queryKey: ['assigned-dignitaries'],
    queryFn: async () => {
      const { data } = await api.get<Dignitary[]>('/dignitaries/assigned');
      return data;
    },
  });

  const { data: timeOfDayOptions = [], isLoading: isLoadingTimeOfDayOptions } = useQuery<string[]>({
    queryKey: ['time-of-day-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/time-of-day-options');
      return data;
    },
  });

  // Fetch user contacts
  const { data: fetchedUserContacts = [], isLoading: isLoadingUserContacts } = useQuery<UserContact[]>({
    queryKey: ['user-contacts'],
    queryFn: async () => {
      const { data } = await api.get<UserContactListResponse>('/contacts/', {
        params: { page: 1, per_page: 100, sort_by: 'usage' }
      });
      return data.contacts;
    },
  });
  
  // Fetch countries
  const { data: countries = [], isLoading: isLoadingCountries } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Country[]>('/countries/all');
        return data;
      } catch (error) {
        enqueueSnackbar('Failed to fetch countries', { variant: 'error' });
        throw error;
      }
    }
  });
  
  // Forms for each step
  const pocForm = useForm<PocFormData>({
    defaultValues: {
          pocFirstName: userInfo?.first_name || '',
    pocLastName: userInfo?.last_name || '',
    pocEmail: userInfo?.email || '',
    requestType: 'Dignitary', // Default to dignitary request
    numberOfAttendees: 1,
    }
  });

  const dignitaryForm = useForm<DignitaryFormData>({
    defaultValues: {
      isExistingDignitary: false,
      selectedDignitaryId: undefined,
      dignitaryHonorificTitle: '(Not Applicable)',
      dignitaryFirstName: '',
      dignitaryLastName: '',
      dignitaryEmail: '',
      dignitaryPhone: '',
      dignitaryPrimaryDomain: '',
      dignitaryPrimaryDomainOther: '',
      dignitaryTitleInOrganization: '',
      dignitaryOrganization: '',
      dignitaryBioSummary: '',
      dignitaryLinkedInOrWebsite: '',
      dignitaryCountry: '',
      dignitaryCountryCode: '',
      dignitaryState: '',
      dignitaryStateCode: '',
      dignitaryCity: '',
      dignitaryHasMetGurudev: false,
      pocRelationshipType: '',
      dignitaryGurudevMeetingDate: '',
      dignitaryGurudevMeetingLocation: '',
      dignitaryGurudevMeetingNotes: '',
    }
  });

  const appointmentForm = useForm<AppointmentFormData>({
    defaultValues: {
      purpose: '',
      preferredDate: '',  // For dignitary appointments only
      preferredStartDate: '',  // For non-dignitary appointments
      preferredEndDate: '',    // For non-dignitary appointments
      preferredTimeOfDay: '',
      location_id: undefined,  // Changed from 0 to undefined
      requesterNotesToSecretariat: '',
    }
  });

  const personalAttendeeForm = useForm<PersonalAttendeeFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      relationshipToRequester: '',
      roleInTeamProject: '',
      roleInTeamProjectOther: '',
      comments: '',
      // Engagement and participation fields - default to not answered
      hasMetGurudevRecently: null,
      isAttendingCourse: null,
      courseAttending: '',
      isDoingSeva: null,
      sevaType: '',
    }
  });

  // Update the useEffect to handle the dignitaries data
  useEffect(() => {
    if (fetchedDignitaries.length > 0) {
      setDignitaries(fetchedDignitaries);
      // If there are dignitaries, default to selecting the first one
      dignitaryForm.setValue('isExistingDignitary', true);
      dignitaryForm.setValue('selectedDignitaryId', fetchedDignitaries[0].id);
      setSelectedDignitary(fetchedDignitaries[0] as any);
      populateDignitaryForm(fetchedDignitaries[0]);
    }
  }, [fetchedDignitaries]);

  // Set the fetched contacts
  useEffect(() => {
    if (fetchedUserContacts.length > 0) {
      setUserContacts(fetchedUserContacts);
    }
  }, [fetchedUserContacts]);

  // Update contact form mode based on available contacts
  useEffect(() => {
    if (isContactFormExpanded) {
      const availableContacts = userContacts.filter(c => !selectedUserContacts.some(sc => sc.id === c.id));
      if (availableContacts.length === 0 && contactFormMode === 'select') {
        setContactFormMode('create');
      }
    }
  }, [isContactFormExpanded, userContacts, selectedUserContacts, contactFormMode]);

  // Check if user is already attending when contacts change
  useEffect(() => {
    // Only sync the attendance state if we actually have contacts to check
    // This prevents overriding the default 'true' value when the form is fresh
    if (selectedUserContacts.length > 0) {
      const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
      const userIsInContacts = selectedUserContacts.some(contact => 
        contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
        (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName)
      );
      setIsUserAttending(userIsInContacts);
    }
  }, [selectedUserContacts, relationshipTypeMap]);

  // Auto-add user as attendee for new appointments
  // This useEffect runs when necessary data is loaded and handles the default self-attendance
  useEffect(() => {
    // Only run this effect if:
    // 1. We have user info (for creating self contact)
    // 2. We have relationship type mapping (needed for self contact creation)
    // 3. We have request type config (to check if it's non-dignitary)
    // 4. User is marked as attending but not yet in the contacts list
    // 5. We haven't selected any contacts yet (fresh form)
    if (userInfo && 
        relationshipTypeMap['SELF'] && 
        selectedRequestTypeConfig &&
        selectedRequestTypeConfig.attendee_type !== attendeeTypeMap['DIGNITARY'] &&
        isUserAttending && 
        selectedUserContacts.length === 0) {
      
      // Automatically add the user as an attendee
      handleSelfAttendanceChange(true);
    }
  }, [userInfo, relationshipTypeMap, selectedRequestTypeConfig, attendeeTypeMap, isUserAttending, selectedUserContacts.length]);

  // Function to populate dignitary form fields
  const populateDignitaryForm = (dignitary: Dignitary) => {
    console.log('Populating dignitary form with:', dignitary);
    dignitaryForm.setValue('dignitaryHonorificTitle', dignitary.honorific_title);
    dignitaryForm.setValue('dignitaryFirstName', dignitary.first_name);
    dignitaryForm.setValue('dignitaryLastName', dignitary.last_name);
    dignitaryForm.setValue('dignitaryEmail', dignitary.email);
    dignitaryForm.setValue('dignitaryPhone', dignitary.phone || '');
    dignitaryForm.setValue('dignitaryPrimaryDomain', dignitary.primary_domain);
    dignitaryForm.setValue('dignitaryPrimaryDomainOther', dignitary.primary_domain_other || '');
    dignitaryForm.setValue('dignitaryTitleInOrganization', dignitary.title_in_organization);
    dignitaryForm.setValue('dignitaryOrganization', dignitary.organization);
    dignitaryForm.setValue('dignitaryBioSummary', dignitary.bio_summary);
    dignitaryForm.setValue('dignitaryLinkedInOrWebsite', dignitary.linked_in_or_website || '');
    dignitaryForm.setValue('dignitaryCountry', dignitary.country || '');
    dignitaryForm.setValue('dignitaryCountryCode', dignitary.country_code || '');
    
    // If we have a country code, update the selected country code for location autocomplete
    if (dignitary.country_code) {
      setSelectedCountryCode(dignitary.country_code);
    }
    
    dignitaryForm.setValue('dignitaryState', dignitary.state || '');
    dignitaryForm.setValue('dignitaryStateCode', ''); // Initialize state code as empty since it's managed by the dropdown
    dignitaryForm.setValue('dignitaryCity', dignitary.city || '');
    dignitaryForm.setValue('dignitaryHasMetGurudev', dignitary.has_dignitary_met_gurudev);
    dignitaryForm.setValue('dignitaryGurudevMeetingDate', dignitary.gurudev_meeting_date || '');
    dignitaryForm.setValue('dignitaryGurudevMeetingLocation', dignitary.gurudev_meeting_location || '');
    dignitaryForm.setValue('dignitaryGurudevMeetingNotes', dignitary.gurudev_meeting_notes || '');
    
    // Set the POC relationship type from the dignitary data
    if (dignitary.relationship_type) {
      console.log('Setting POC relationship type from dignitary data:', dignitary.relationship_type);
      dignitaryForm.setValue('pocRelationshipType', dignitary.relationship_type);
    } else {
      // If relationship_type is missing, default to the first relationship type
      console.warn('Dignitary data missing relationship_type, using default');
    }
    
    // Reset the modification flag when populating the form
    setIsDignitaryModified(false);
  };

  // Add an effect to watch for form changes to detect modifications
  useEffect(() => {
    const subscription = dignitaryForm.watch((value, { name, type }) => {
      // Only check for modifications if we're in existing dignitary mode
      if (dignitaryForm.getValues().isExistingDignitary && selectedDignitary) {
        const currentValues = dignitaryForm.getValues();
        const hasChanges = 
          selectedDignitary.honorific_title !== currentValues.dignitaryHonorificTitle ||
          selectedDignitary.first_name !== currentValues.dignitaryFirstName ||
          selectedDignitary.last_name !== currentValues.dignitaryLastName ||
          selectedDignitary.email !== currentValues.dignitaryEmail ||
          selectedDignitary.phone !== currentValues.dignitaryPhone ||
          selectedDignitary.primary_domain !== currentValues.dignitaryPrimaryDomain ||
          selectedDignitary.title_in_organization !== currentValues.dignitaryTitleInOrganization ||
          selectedDignitary.organization !== currentValues.dignitaryOrganization ||
          selectedDignitary.bio_summary !== currentValues.dignitaryBioSummary ||
          selectedDignitary.linked_in_or_website !== currentValues.dignitaryLinkedInOrWebsite ||
          selectedDignitary.country !== currentValues.dignitaryCountry ||
          selectedDignitary.country_code !== currentValues.dignitaryCountryCode ||
          selectedDignitary.state !== currentValues.dignitaryState ||
          selectedDignitary.city !== currentValues.dignitaryCity ||
          selectedDignitary.has_dignitary_met_gurudev !== currentValues.dignitaryHasMetGurudev ||
          selectedDignitary.gurudev_meeting_date !== currentValues.dignitaryGurudevMeetingDate ||
          selectedDignitary.gurudev_meeting_location !== currentValues.dignitaryGurudevMeetingLocation ||
          selectedDignitary.gurudev_meeting_notes !== currentValues.dignitaryGurudevMeetingNotes ||
          selectedDignitary.relationship_type !== currentValues.pocRelationshipType;
          
        setIsDignitaryModified(hasChanges);
      }
    });
    return () => subscription.unsubscribe();
  }, [dignitaryForm, selectedDignitary]);

  // Update form values when userInfo changes
  useEffect(() => {
    if (userInfo) {
      pocForm.setValue('pocFirstName', userInfo.first_name || '');
      pocForm.setValue('pocLastName', userInfo.last_name || '');
      pocForm.setValue('pocEmail', userInfo.email || '');
  
    }
  }, [userInfo, pocForm]);

  // Set default request type when configs are loaded
  useEffect(() => {
    if (requestTypeConfigs.length > 0 && !pocForm.getValues('requestType')) {
      const defaultConfig = requestTypeConfigs.find(c => c.request_type === requestTypeMap['DIGNITARY']) || requestTypeConfigs[0];
      pocForm.setValue('requestType', defaultConfig.request_type);
    }
  }, [requestTypeConfigs, pocForm]);

  // Update selected request type config when form value changes
  useEffect(() => {
    const requestType = pocForm.watch('requestType');
    const config = requestTypeConfigs.find(c => c.request_type === requestType);
    setSelectedRequestTypeConfig(config || null);
  }, [pocForm.watch('requestType'), requestTypeConfigs]);

  // Query for checking existing appointments
  const checkExistingAppointments = async (dignitaryId: number) => {
    try {
      const { data } = await api.get<any[]>(`/appointments/my/${dignitaryId}`);
      const today = new Date();
      const existingAppointments = data.filter(
        (apt) => apt.dignitary_id === dignitaryId && 
        new Date(apt.preferred_date) >= today
      );
      return existingAppointments.length > 0 ? existingAppointments : null;
    } catch (error) {
      console.error('Error checking existing appointments:', error);
      enqueueSnackbar('Failed to check existing appointments', { variant: 'error' });
      return null;
    }
  };

  // Modify the handleDignitarySelection function to not show warning
  const handleDignitarySelection = async (dignitary: Dignitary) => {
    // Use type assertion to bypass TypeScript error
    setSelectedDignitary(dignitary as any);
    populateDignitaryForm(dignitary);
    
    // Check for existing appointments
    const existingAppointments = await checkExistingAppointments(dignitary.id);
    if (existingAppointments && existingAppointments.length > 0) {
      // Use type assertion to bypass TypeScript error
      const updatedDignitary = {
        ...dignitary,
        appointments: existingAppointments,
      };
      setSelectedDignitary(updatedDignitary as any);
    }
  };

  // Mutation for updating user info
  const updateUserMutation = useMutation({
    mutationFn: async (data: { phone_number: string }) => {
      await updateUserInfo(data);
    },
    onError: (error) => {
      console.error('Error updating user:', error);
      enqueueSnackbar('Failed to update user information', { variant: 'error' });
    }
  });

  // Mutation for updating dignitary
  const updateDignitaryMutation = useMutation<Dignitary, Error, { id: number, data: any }>({
    mutationFn: async ({ id, data }) => {
      const { data: response } = await api.patch<Dignitary>(`/dignitaries/update/${id}`, data);
      return response;
    },
    onSuccess: (updatedDignitary) => {
      console.log('Successfully updated dignitary:', updatedDignitary);
      setSelectedDignitary(updatedDignitary);
      queryClient.invalidateQueries({ queryKey: ['assigned-dignitaries'] });
      enqueueSnackbar('Dignitary updated successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Failed to update dignitary:', error);
      enqueueSnackbar(`Failed to update dignitary: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Mutation for creating new dignitary
  const createDignitaryMutation = useMutation<Dignitary, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<Dignitary>('/dignitaries/new', data);
      return response;
    },
    onSuccess: (newDignitary) => {
      // Update the dignitaries list with the new dignitary
      setDignitaries(prev => [...prev, newDignitary]);
      
      // Switch to existing dignitary mode and select the new dignitary
      dignitaryForm.setValue('isExistingDignitary', true);
      dignitaryForm.setValue('selectedDignitaryId', newDignitary.id);
      setSelectedDignitary(newDignitary);
      
      queryClient.invalidateQueries({ queryKey: ['assigned-dignitaries'] });
      enqueueSnackbar('New dignitary created successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Failed to create dignitary:', error);
      enqueueSnackbar(`Failed to create dignitary: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Mutation for creating new user contact
  const createUserContactMutation = useMutation<UserContact, Error, UserContactCreateData>({
    mutationFn: async (data: UserContactCreateData) => {
      const { data: response } = await api.post<UserContact>('/contacts/', data);
      return response;
    },
    onSuccess: (newContact) => {
      // Update the contacts list with the new contact
      setUserContacts(prev => [...prev, newContact]);
      
      queryClient.invalidateQueries({ queryKey: ['user-contacts'] });
      enqueueSnackbar('New contact created successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Failed to create contact:', error);
      enqueueSnackbar(`Failed to create contact: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Mutation for updating user contact
  const updateUserContactMutation = useMutation<UserContact, Error, { id: number; data: UserContactUpdateData }>({
    mutationFn: async ({ id, data }: { id: number; data: UserContactUpdateData }) => {
      const { data: response } = await api.put<UserContact>(`/contacts/${id}`, data);
      return response;
    },
    onSuccess: (updatedContact) => {
      // Update the contacts list with the updated contact
      setUserContacts(prev => 
        prev.map(contact => 
          contact.id === updatedContact.id ? updatedContact : contact
        )
      );
      
      queryClient.invalidateQueries({ queryKey: ['user-contacts'] });
      enqueueSnackbar('Contact updated successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Failed to update contact:', error);
      enqueueSnackbar(`Failed to update contact: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Mutation for creating new appointment
  const createAppointmentMutation = useMutation<AppointmentResponse, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<AppointmentResponse>('/appointments/new', data);
      return response;
    },
    onSuccess: async (appointmentResponse) => {
      setSubmittedAppointment(appointmentResponse);
      
      // Upload attachments if any
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        await uploadAttachments(appointmentResponse.id);
      }
      
      // Don't show popup dialog, just update state to show confirmation on review page
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
    },
    onError: (error: any) => {
      console.error('Error creating appointment:', error);
      setIsUploading(false);
      enqueueSnackbar(`Failed to create appointment: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Modify the addDignitaryToList function to call the API immediately
  const addDignitaryToList = async () => {
    // Validate the dignitary form
    const isValid = await dignitaryForm.trigger();
    if (!isValid) {
      enqueueSnackbar('Please fill in all required fields for the dignitary', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      return;
    }

    const formData = dignitaryForm.getValues();
    // Store the current edit mode state to use later
    const wasInEditMode = isEditMode;
    
    try {
      let dignitaryToAdd: SelectedDignitary;
      
      if (formData.isExistingDignitary && formData.selectedDignitaryId) {
        // Check if dignitary is already in the list (for non-edit mode)
        if (!wasInEditMode && selectedDignitaries.some(d => d.id === formData.selectedDignitaryId)) {
          enqueueSnackbar('This dignitary is already added to the appointment', { variant: 'warning' });
          return;
        }
        
        // For existing dignitary, check if it needs to be updated in the backend
        if (isDignitaryModified) {
          // Prepare dignitary update data
          const dignitaryUpdateData = {
            honorific_title: formData.dignitaryHonorificTitle,
            first_name: formData.dignitaryFirstName,
            last_name: formData.dignitaryLastName,
            email: formData.dignitaryEmail,
            phone: formData.dignitaryPhone,
            primary_domain: formData.dignitaryPrimaryDomain,
            primary_domain_other: formData.dignitaryPrimaryDomain.toLowerCase() === 'other' ? formData.dignitaryPrimaryDomainOther : null,
            title_in_organization: formData.dignitaryTitleInOrganization,
            organization: formData.dignitaryOrganization,
            bio_summary: formData.dignitaryBioSummary,
            linked_in_or_website: formData.dignitaryLinkedInOrWebsite,
            country: formData.dignitaryCountry,
            country_code: formData.dignitaryCountryCode,
            state: formData.dignitaryState,
            state_code: formData.dignitaryStateCode,
            city: formData.dignitaryCity,
            has_dignitary_met_gurudev: formData.dignitaryHasMetGurudev,
            gurudev_meeting_date: formData.dignitaryGurudevMeetingDate,
            gurudev_meeting_location: formData.dignitaryGurudevMeetingLocation,
            gurudev_meeting_notes: formData.dignitaryGurudevMeetingNotes,
            poc_relationship_type: formData.pocRelationshipType,
          };
          
          // Clean data by converting empty strings to null
          const cleanedDignitaryUpdateData = Object.fromEntries(
            Object.entries(dignitaryUpdateData).map(([key, value]) => {
              return [key, value === '' ? null : value];
            })
          );
          
          // Call the API to update the dignitary
          const updatedDignitary = await updateDignitaryMutation.mutateAsync({ 
            id: formData.selectedDignitaryId, 
            data: cleanedDignitaryUpdateData 
          });
          
          // Use the updated dignitary data
          dignitaryToAdd = {
            ...updatedDignitary,
            relationshipType: formData.pocRelationshipType
          };
        } else {
          // Use the existing dignitary data without changes
          const existingDignitary = dignitaries.find(d => d.id === formData.selectedDignitaryId);
          if (!existingDignitary) {
            enqueueSnackbar('Selected dignitary not found', { variant: 'error' });
            return;
          }
          
          dignitaryToAdd = {
            ...existingDignitary,
            relationshipType: formData.pocRelationshipType
          };
        }
      } else {
        // For a new dignitary, prepare the data
        const dignitaryCreateData = {
          honorific_title: formData.dignitaryHonorificTitle,
          first_name: formData.dignitaryFirstName,
          last_name: formData.dignitaryLastName,
          email: formData.dignitaryEmail,
          phone: formData.dignitaryPhone || null,
          primary_domain: formData.dignitaryPrimaryDomain,
          primary_domain_other: formData.dignitaryPrimaryDomain.toLowerCase() === 'other' ? formData.dignitaryPrimaryDomainOther : null,
          title_in_organization: formData.dignitaryTitleInOrganization,
          organization: formData.dignitaryOrganization,
          bio_summary: formData.dignitaryBioSummary,
          linked_in_or_website: formData.dignitaryLinkedInOrWebsite,
          country: formData.dignitaryCountry,
          country_code: formData.dignitaryCountryCode,
          state: formData.dignitaryState,
          state_code: formData.dignitaryStateCode,
          city: formData.dignitaryCity,
          poc_relationship_type: formData.pocRelationshipType,
          has_dignitary_met_gurudev: formData.dignitaryHasMetGurudev,
          gurudev_meeting_date: formData.dignitaryGurudevMeetingDate,
          gurudev_meeting_location: formData.dignitaryGurudevMeetingLocation,
          gurudev_meeting_notes: formData.dignitaryGurudevMeetingNotes,
        };
        
        // Clean data by converting empty strings to null
        const cleanedDignitaryCreateData = Object.fromEntries(
          Object.entries(dignitaryCreateData).map(([key, value]) => {
            return [key, value === '' ? null : value];
          })
        );
        
        // Call the API to create the dignitary
        const newDignitary = await createDignitaryMutation.mutateAsync(cleanedDignitaryCreateData);
        
        // Use the newly created dignitary
        dignitaryToAdd = {
          ...newDignitary,
          relationshipType: formData.pocRelationshipType
        };
      }

      if (wasInEditMode && editingDignitaryIndex !== null) {
        // Update existing dignitary in the list
        const updatedDignitaries = [...selectedDignitaries];
        updatedDignitaries[editingDignitaryIndex] = dignitaryToAdd;
        setSelectedDignitaries(updatedDignitaries);
        setIsEditMode(false);
        setEditingDignitaryIndex(null);
      } else {
        // Add new dignitary to the list
        setSelectedDignitaries([...selectedDignitaries, dignitaryToAdd]);
      }

      // Reset form for next dignitary
      resetDignitaryForm();
      
      // Always collapse the form after successfully adding/updating a dignitary
      setIsDignitaryFormExpanded(false);
      
      enqueueSnackbar(
        wasInEditMode 
          ? 'Dignitary updated successfully' 
          : isDignitaryModified && formData.isExistingDignitary
            ? 'Dignitary updated and added to appointment'
            : 'Dignitary added to appointment', 
        { variant: 'success' }
      );
    } catch (error) {
      console.error('Error processing dignitary:', error);
      enqueueSnackbar('Failed to process dignitary', { variant: 'error' });
    }
  };
  
  // Function to remove a dignitary from the list
  const removeDignitaryFromList = (index: number) => {
    const updatedDignitaries = [...selectedDignitaries];
    updatedDignitaries.splice(index, 1);
    setSelectedDignitaries(updatedDignitaries);
    
    if (isEditMode && editingDignitaryIndex === index) {
      setIsEditMode(false);
      setEditingDignitaryIndex(null);
      resetDignitaryForm();
    }
  };

  // Function to edit a dignitary in the list
  const editDignitaryInList = (index: number) => {
    setIsEditMode(true);
    setEditingDignitaryIndex(index);
    const dignitary = selectedDignitaries[index];
    
    // Need to type cast since SelectedDignitary has properties that Dignitary doesn't
    setSelectedDignitary(dignitary as unknown as Dignitary);
    
    // Set radio button to "select existing dignitary" (regardless if it's a new or existing dignitary)
    // In edit mode, we treat all dignitaries as "existing" since they're already in the list
    dignitaryForm.setValue('isExistingDignitary', true);
    
    // Set the selected dignitary ID in the dropdown
    dignitaryForm.setValue('selectedDignitaryId', dignitary.id);
    
    // Now populate the form with the dignitary data
    populateDignitaryForm(dignitary as unknown as Dignitary);
    
    // Expand the form when editing
    setIsDignitaryFormExpanded(true);
  };

  // Reset the dignitary form
  const resetDignitaryForm = () => {
    dignitaryForm.reset({
      isExistingDignitary: false,
      selectedDignitaryId: undefined,
      dignitaryHonorificTitle: '(Not Applicable)',
      dignitaryFirstName: '',
      dignitaryLastName: '',
      dignitaryEmail: '',
      dignitaryPhone: '',
      dignitaryPrimaryDomain: '',
      dignitaryPrimaryDomainOther: '',
      dignitaryTitleInOrganization: '',
      dignitaryOrganization: '',
      dignitaryBioSummary: '',
      dignitaryLinkedInOrWebsite: '',
      dignitaryCountry: '',
      dignitaryCountryCode: '',
      dignitaryState: '',
      dignitaryStateCode: '',
      dignitaryCity: '',
      dignitaryHasMetGurudev: false,
      dignitaryGurudevMeetingDate: '',
      dignitaryGurudevMeetingLocation: '',
      dignitaryGurudevMeetingNotes: '',
      pocRelationshipType: '',
    });
    setSelectedDignitary(null);
    setIsDignitaryModified(false);
    
    // Reset the selected country code
    setSelectedCountryCode(undefined);
  };

  // Personal attendee management functions
  const addPersonalAttendeeToList = async () => {
    const isValid = await personalAttendeeForm.trigger();
    if (!isValid) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
      return;
    }

    const formData = personalAttendeeForm.getValues();
    const attendeeData: PersonalAttendee = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      relationship_to_requester: formData.relationshipToRequester || undefined,
      role_in_team_project: formData.roleInTeamProject || undefined,
      role_in_team_project_other: formData.roleInTeamProjectOther || undefined,
      comments: formData.comments || undefined,
    };

    if (isEditingPersonalAttendee && editingPersonalAttendeeIndex !== null) {
      // Update existing attendee
      const updatedAttendees = [...selectedPersonalAttendees];
      updatedAttendees[editingPersonalAttendeeIndex] = attendeeData;
      setSelectedPersonalAttendees(updatedAttendees);
      setIsEditingPersonalAttendee(false);
      setEditingPersonalAttendeeIndex(null);
      enqueueSnackbar('Personal attendee updated successfully', { variant: 'success' });
    } else {
      // Add new attendee
      setSelectedPersonalAttendees(prev => [...prev, attendeeData]);
      enqueueSnackbar('Personal attendee added successfully', { variant: 'success' });
    }

    resetPersonalAttendeeForm();
    setIsPersonalAttendeeFormExpanded(false);
  };

  const removePersonalAttendeeFromList = (index: number) => {
    setSelectedPersonalAttendees(prev => prev.filter((_, i) => i !== index));
    enqueueSnackbar('Personal attendee removed', { variant: 'info' });
  };

  const editPersonalAttendeeInList = (index: number) => {
    const attendee = selectedPersonalAttendees[index];
    personalAttendeeForm.setValue('firstName', attendee.first_name);
    personalAttendeeForm.setValue('lastName', attendee.last_name);
    personalAttendeeForm.setValue('email', attendee.email || '');
    personalAttendeeForm.setValue('phone', attendee.phone || '');
    personalAttendeeForm.setValue('relationshipToRequester', attendee.relationship_to_requester || '');
    personalAttendeeForm.setValue('roleInTeamProject', attendee.role_in_team_project || '');
    personalAttendeeForm.setValue('roleInTeamProjectOther', attendee.role_in_team_project_other || '');
    personalAttendeeForm.setValue('comments', attendee.comments || '');
    
    setIsEditingPersonalAttendee(true);
    setEditingPersonalAttendeeIndex(index);
    setIsPersonalAttendeeFormExpanded(true);
  };

  const resetPersonalAttendeeForm = () => {
    personalAttendeeForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      relationshipToRequester: '',
      roleInTeamProject: '',
      roleInTeamProjectOther: '',
      comments: '',
      // Engagement and participation fields - reset to not answered
      hasMetGurudevRecently: null,
      isAttendingCourse: null,
      courseAttending: '',
      isDoingSeva: null,
      sevaType: '',
    });
    setEmailValidationWarnings([]); // Clear email warnings
  };

  // Email validation helper function
  const validateEmailForDuplicates = (email: string, excludeContactId?: number): string[] => {
    const warnings: string[] = [];
    
    if (!email || !email.trim()) {
      return warnings;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const userEmail = userInfo?.email?.toLowerCase().trim();
    
    // Check if email matches user's email
    if (normalizedEmail === userEmail) {
      warnings.push("This email matches your account email. We recommend entering a valid email for all adults.");
    }
    
    // Check for duplicates in selected contacts
    const duplicateContacts = selectedUserContacts.filter(contact => 
      contact.id !== excludeContactId && 
      contact.email?.toLowerCase().trim() === normalizedEmail
    );
    
    if (duplicateContacts.length > 0) {
      warnings.push("This email is already used by another contact in this appointment.");
    }
    
    return warnings;
  };

  // Create self-contact function
  const createSelfContact = async (): Promise<UserContact | null> => {
    try {
      if (!userInfo?.email) {
        enqueueSnackbar('User email not available for self-contact creation', { variant: 'error' });
        return null;
      }

      // Check if self-contact already exists
      const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
      const existingSelfContact = userContacts.find(contact => 
        contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
        (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName)
      );

      if (existingSelfContact) {
        return existingSelfContact;
      }

      const selfContactData: UserContactCreateData = {
        first_name: relationshipTypeMap['SELF'] || 'Self',
        last_name: relationshipTypeMap['SELF'] || 'Self',
        email: userInfo.email,
        relationship_to_owner: relationshipTypeMap['SELF'],
        notes: 'Auto-created self-contact for appointment attendance'
      };

      const newSelfContact = await createUserContactMutation.mutateAsync(selfContactData);
      return newSelfContact;
    } catch (error) {
      console.error('Error creating self-contact:', error);
      enqueueSnackbar('Failed to create contact', { variant: 'error' });
      return null;
    }
  };

  // Handle self-attendance toggle
  const handleSelfAttendanceChange = async (attending: boolean) => {
    setIsUserAttending(attending);
    
    if (attending) {
      // Add self to contacts
      const selfContact = await createSelfContact();
      if (selfContact) {
        addContactToList(selfContact);
      }
    } else {
      // Remove self from contacts
      const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
      const selfContact = selectedUserContacts.find(contact => 
        contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
        (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName)
      );
      if (selfContact) {
        removeContactFromList(selfContact.id);
      }
    }
  };

  // Contact management functions
  const addContactToList = (contact: UserContact) => {
    if (selectedUserContacts.some(c => c.id === contact.id)) {
      enqueueSnackbar('Contact already added to this appointment', { variant: 'warning' });
      return;
    }
    
    if (selectedUserContacts.length >= requiredDignitariesCount) {
      enqueueSnackbar(`Maximum ${requiredDignitariesCount} ${selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'attendees'} allowed for this request type`, { variant: 'warning' });
      return;
    }
    
    setSelectedUserContacts(prev => [...prev, contact]);
    
    // Initialize engagement fields for this contact
    setContactEngagementFields(prev => ({
      ...prev,
      [contact.id]: {
        hasMetGurudevRecently: null,  // Not answered by default
        isAttendingCourse: null,      // Not answered by default
        courseAttending: '',
        isDoingSeva: null,            // Not answered by default
        sevaType: ''
      }
    }));
    
    const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
    const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
      (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
    
    // Skip notification for self-contacts to avoid unnecessary notifications
    if (!isSelfContact) {
      const displayName = `${contact.first_name} ${contact.last_name}`;
      enqueueSnackbar(`${displayName} added to appointment`, { variant: 'success' });
    }
  };

  const removeContactFromList = (contactId: number) => {
    setSelectedUserContacts(prev => prev.filter(c => c.id !== contactId));
    
    // Clean up engagement fields for this contact
    setContactEngagementFields(prev => {
      const newFields = { ...prev };
      delete newFields[contactId];
      return newFields;
    });
    
    enqueueSnackbar('Contact removed from appointment', { variant: 'info' });
  };

  const createAndAddContact = async (contactData: UserContactCreateData) => {
    try {
      const newContact = await createUserContactMutation.mutateAsync(contactData);
      
      // Get engagement fields from the form
      const formData = personalAttendeeForm.getValues();
      setContactEngagementFields(prev => ({
        ...prev,
        [newContact.id]: {
          hasMetGurudevRecently: formData.hasMetGurudevRecently,  // Keep null if not answered
          isAttendingCourse: formData.isAttendingCourse,          // Keep null if not answered
          courseAttending: formData.courseAttending || '',
          isDoingSeva: formData.isDoingSeva,                      // Keep null if not answered
          sevaType: formData.sevaType || ''
        }
      }));
      
      addContactToList(newContact);
      setIsContactFormExpanded(false);
      setContactFormMode('select');
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  const editContactInList = (contact: UserContact) => {
    setEditingContactId(contact.id);
    setIsContactFormExpanded(true);
    setContactFormMode('create');
    
    // Populate the form with contact data
    personalAttendeeForm.setValue('firstName', contact.first_name);
    personalAttendeeForm.setValue('lastName', contact.last_name);
    personalAttendeeForm.setValue('email', contact.email || '');
    personalAttendeeForm.setValue('phone', contact.phone || '');
    personalAttendeeForm.setValue('relationshipToRequester', contact.relationship_to_owner || '');
    personalAttendeeForm.setValue('comments', contact.notes || '');
  };

  const updateContactInList = async (contactData: UserContactCreateData) => {
    try {
      if (!editingContactId) return;
      
      // Prepare update data (convert undefined to null for backend)
      const updateData: UserContactUpdateData = {
        first_name: contactData.first_name,
        last_name: contactData.last_name,
        email: contactData.email || undefined,
        phone: contactData.phone || undefined,
        relationship_to_owner: contactData.relationship_to_owner || undefined,
        notes: contactData.notes || undefined,
      };
      
      // Call the API to update the contact
      const updatedContact = await updateUserContactMutation.mutateAsync({ 
        id: editingContactId, 
        data: updateData 
      });
      
      // Update in the selected contacts list
      setSelectedUserContacts(prev => 
        prev.map(contact => 
          contact.id === editingContactId ? updatedContact : contact
        )
      );
      
      setIsContactFormExpanded(false);
      setEditingContactId(null);
      setContactFormMode('select');
      resetPersonalAttendeeForm();
    } catch (error) {
      console.error('Failed to update contact:', error);
      // The mutation already handles the error notification
    }
  };

  const handleNext = async (skipExistingCheck: boolean = false) => {
    // Check if we need to show profile overlay
    if (wizardState.isProfileRequired && activeStep === 0) {
      // Handle profile completion step
      if (profileFormRef.current?.validate()) {
        profileFormRef.current.submit();
        // The mutation's onSuccess will handle moving to next step
        return;
      } else {
        enqueueSnackbar('Please complete all required fields', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        return;
      }
    } else if (activeStep === 0) {
      // Validate POC form
      const isValid = await pocForm.trigger();
      if (!isValid) {
        // Show error notification
        enqueueSnackbar('Please fill in all required fields', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        return;
      }
      
      const pocData = await pocForm.handleSubmit(async (data) => {
        try {
          // Phone number is now handled in the profile step, so no need to update here
          // Set the required number of dignitaries
          setRequiredDignitariesCount(data.numberOfAttendees);
          
          // Check for existing appointments for non-dignitary requests
          if (!skipExistingCheck && 
              selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY']) {
            const { hasExisting, count } = hasExistingAppointments(appointmentSummary, data.requestType);
            
            if (hasExisting) {
              // Show confirmation dialog
              setShowExistingAppointmentsDialog(true);
              setPendingStepTransition(true);
              return;
            }
          }
          
          setActiveStep(1);
        } catch (error) {
          console.error('Error updating user:', error);
        }
      })();
    } else if (activeStep === 1) {
      // Handle different attendee types based on request type
      if (selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY']) {
        // For dignitary requests, check dignitaries
        if (selectedDignitaries.length === 0) {
          // If the current form has data, try to add it
          const currentFormData = dignitaryForm.getValues();
          if (currentFormData.dignitaryFirstName && currentFormData.dignitaryLastName) {
            // Try to add the current dignitary
            await addDignitaryToList();
          }
          
          // Check again after potential addition
          if (selectedDignitaries.length === 0) {
            enqueueSnackbar('Please add at least one dignitary', { 
              variant: 'error',
              autoHideDuration: 3000
            });
            return;
          }
        }
        
        // Check if we have added the required number of dignitaries
        if (selectedDignitaries.length < requiredDignitariesCount) {
          enqueueSnackbar(`Please add ${requiredDignitariesCount - selectedDignitaries.length} more dignitary(ies). You specified ${requiredDignitariesCount} dignitary(ies) in the previous step.`, {
            variant: 'error',
            autoHideDuration: 3000
          });
          return;
        }
        
        // Since dignitaries are already created/updated when added to the list,
        // we just need to collect their IDs
        const dignitaryIds = selectedDignitaries.map(d => d.id);
        
        // Store the list of dignitary IDs for appointment creation
        sessionStorage.setItem('appointmentDignitaryIds', JSON.stringify(dignitaryIds));
      } else {
        // This is a non-dignitary appointment, check if we have contacts
        if (selectedUserContacts.length === 0) {
          enqueueSnackbar(`Please add at least one ${selectedRequestTypeConfig?.attendee_label_singular?.toLowerCase() || 'attendee'}`, { 
            variant: 'error',
            autoHideDuration: 3000
          });
          return;
        }
        
        // Check if we have added the required number of contacts
        if (selectedUserContacts.length < requiredDignitariesCount) {
          enqueueSnackbar(`Please add ${requiredDignitariesCount - selectedUserContacts.length} more ${selectedRequestTypeConfig?.attendee_label_singular?.toLowerCase() || 'attendee'}(s). You specified ${requiredDignitariesCount} ${selectedRequestTypeConfig?.attendee_label_singular?.toLowerCase() || 'attendee'}(s) in the previous step.`, { 
            variant: 'error',
            autoHideDuration: 5000
          });
          return;
        }
        
        // Store the list of contact IDs for appointment creation
        const contactIds = selectedUserContacts.map(contact => contact.id);
        sessionStorage.setItem('appointmentContactIds', JSON.stringify(contactIds));
      }
      
      setActiveStep(2);
    } else if (activeStep === 2) {
      // Validate appointment form
      const isValid = await appointmentForm.trigger();
      if (!isValid) {
        // Show error notification
        enqueueSnackbar('Please fill in all required fields', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        return;
      }
      
      // Move to review step instead of submitting
      setActiveStep(3);
    } else if (activeStep === 3) {
      // Review & Submit step - actually submit the appointment
      const appointmentData = await appointmentForm.handleSubmit(async (data) => {
        try {
          let appointmentCreateData: any = {
            purpose: data.purpose,
            preferred_time_of_day: data.preferredTimeOfDay,
            location_id: data.location_id,
            requester_notes_to_secretariat: data.requesterNotesToSecretariat,
            status: statusOptions[0],
            request_type: selectedRequestTypeConfig?.request_type || requestTypeMap['DIGNITARY'],
          };

          // Add appropriate date fields based on request type
          if (selectedRequestTypeConfig?.request_type === requestTypeMap['DIGNITARY']) {
            appointmentCreateData.preferred_date = data.preferredDate;
          } else {
            appointmentCreateData.preferred_start_date = data.preferredStartDate;
            appointmentCreateData.preferred_end_date = data.preferredEndDate;
          }

          if (selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY']) {
            // Get dignitary IDs from storage
            const dignitary_ids = JSON.parse(sessionStorage.getItem('appointmentDignitaryIds') || '[]');
            
            if (dignitary_ids.length === 0) {
              enqueueSnackbar('No dignitaries selected for appointment', { variant: 'error' });
              return;
            }
            
            appointmentCreateData.dignitary_ids = dignitary_ids;
          } else {
            // Get contact IDs from storage
            const contactIds = JSON.parse(sessionStorage.getItem('appointmentContactIds') || '[]');
            
            if (contactIds.length === 0) {
              enqueueSnackbar(`No ${selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'attendees'} selected for appointment`, { variant: 'error' });
              return;
            }
            
            // Build contacts with engagement fields
            const contactsWithEngagement = contactIds.map((contactId: number) => {
              const engagementData = contactEngagementFields[contactId] || {
                hasMetGurudevRecently: null,  // Not answered by default
                isAttendingCourse: null,      // Not answered by default
                courseAttending: '',
                isDoingSeva: null,            // Not answered by default
                sevaType: ''
              };
              
              return {
                contact_id: contactId,
                has_met_gurudev_recently: engagementData.hasMetGurudevRecently,
                is_attending_course: engagementData.isAttendingCourse,
                course_attending: engagementData.courseAttending || null,
                is_doing_seva: engagementData.isDoingSeva,
                seva_type: engagementData.sevaType || null
              };
            });
            
            appointmentCreateData.contacts_with_engagement = contactsWithEngagement;
            appointmentCreateData.number_of_attendees = contactIds.length;
          }
          
          await createAppointmentMutation.mutateAsync(appointmentCreateData);
        } catch (error) {
          console.error('Error creating appointment:', error);
        }
      })();
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Add function to handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  // Add function to remove a file from the selected files
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Add function to upload attachments
  const uploadAttachments = async (appointmentId: number) => {
    try {
      let completed = 0;
      
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload without progress tracking to avoid type issues
        await api.post(`/appointments/${appointmentId}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        });
        
        completed++;
        // Update progress based on completed files
        setUploadProgress((completed / selectedFiles.length) * 100);
      }
      
      enqueueSnackbar(`Successfully uploaded ${selectedFiles.length} attachment(s)`, { variant: 'success' });
      return true;
    } catch (error) {
      console.error('Error uploading attachments:', error);
      enqueueSnackbar('Failed to upload some attachments', { variant: 'error' });
      return false;
    }
  };

  // Component to render engagement fields
  const renderEngagementFields = (
    contactId: number, 
    isRequester: boolean = false,
    formPrefix: string = ''
  ) => {
    // Handle different data sources based on formPrefix
    let engagementData: EngagementFields;
    let updateEngagementField: (field: keyof EngagementFields, value: any) => void;

    if (formPrefix === 'personalAttendee') {
      // Use personalAttendeeForm for contact creation
      engagementData = {
        hasMetGurudevRecently: personalAttendeeForm.watch('hasMetGurudevRecently'),
        isAttendingCourse: personalAttendeeForm.watch('isAttendingCourse'),
        courseAttending: personalAttendeeForm.watch('courseAttending') || '',
        isDoingSeva: personalAttendeeForm.watch('isDoingSeva'),
        sevaType: personalAttendeeForm.watch('sevaType') || ''
      };

      updateEngagementField = (field: keyof EngagementFields, value: any) => {
        if (field === 'hasMetGurudevRecently') {
          personalAttendeeForm.setValue('hasMetGurudevRecently', value);
        } else if (field === 'isAttendingCourse') {
          personalAttendeeForm.setValue('isAttendingCourse', value);
        } else if (field === 'courseAttending') {
          personalAttendeeForm.setValue('courseAttending', value);
        } else if (field === 'isDoingSeva') {
          personalAttendeeForm.setValue('isDoingSeva', value);
        } else if (field === 'sevaType') {
          personalAttendeeForm.setValue('sevaType', value);
        }
      };
    } else {
      // Use contactEngagementFields for existing contacts and self-attendance
      engagementData = contactEngagementFields[contactId] || {
        hasMetGurudevRecently: null,
        isAttendingCourse: null,
        courseAttending: '',
        isDoingSeva: null,
        sevaType: ''
      };

      updateEngagementField = (field: keyof EngagementFields, value: any) => {
        setContactEngagementFields(prev => ({
          ...prev,
          [contactId]: {
            ...prev[contactId],
            [field]: value
          }
        }));
      };
    }

    return (
      <>
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <FormControl component="fieldset" required>
            <FormLabel component="legend">
              {isRequester ? "Have you met Gurudev in last 2 weeks?" : "Have they met Gurudev in last 2 weeks?"}
            </FormLabel>
            <RadioGroup
              row
              value={engagementData.hasMetGurudevRecently?.toString() || ''}
              onChange={(e) => updateEngagementField('hasMetGurudevRecently', e.target.value === 'true')}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <FormControl component="fieldset" required>
            <FormLabel component="legend">
              {isRequester ? "Are you attending a course?" : "Are they attending a course?"}
            </FormLabel>
            <RadioGroup
              row
              value={engagementData.isAttendingCourse?.toString() || ''}
              onChange={(e) => {
                const isAttending = e.target.value === 'true';
                updateEngagementField('isAttendingCourse', isAttending);
                
                // Clear course selection if not attending
                if (!isAttending) {
                  updateEngagementField('isDoingSeva', null);
                  updateEngagementField('sevaType', '');
                }
              }}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>
        </Grid>

        {engagementData.isAttendingCourse && (
          <Grid item xs={12} md={6} lg={4}>
            <EnumSelect
              enumType="courseType"
              label="Course Attending"
              value={engagementData.courseAttending}
              onChange={(e) => updateEngagementField('courseAttending', e.target.value as string)}
              fullWidth
            />
          </Grid>
        )}

        {engagementData.isAttendingCourse !== null && !engagementData.isAttendingCourse && (
          <>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl component="fieldset" required>
                <FormLabel component="legend">
                  {isRequester ? "Are you doing seva?" : "Are they doing seva?"}
                </FormLabel>
                <RadioGroup
                  row
                  value={engagementData.isDoingSeva?.toString() || ''}
                  onChange={(e) => {
                    const isDoingSeva = e.target.value === 'true';
                    updateEngagementField('isDoingSeva', isDoingSeva);
                    
                    // Clear seva type if not doing seva
                    if (!isDoingSeva) {
                      updateEngagementField('sevaType', '');
                    }
                  }}
                >
                  <FormControlLabel value="true" control={<Radio />} label="Yes" />
                  <FormControlLabel value="false" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {engagementData.isDoingSeva && (
              <Grid item xs={12} md={6} lg={4}>
                <EnumSelect
                  enumType="sevaType"
                  label="Type of Seva"
                  value={engagementData.sevaType}
                  onChange={(e) => updateEngagementField('sevaType', e.target.value as string)}
                  fullWidth
                />
              </Grid>
            )}
          </>
        )}
      </>
    );
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box component="form" onSubmit={pocForm.handleSubmit(() => handleNext(false))}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Point of Contact Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  {...pocForm.register('pocFirstName')}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  {...pocForm.register('pocLastName')}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  {...pocForm.register('pocEmail')}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Appointment Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!!pocForm.formState.errors.requestType}>
                  <InputLabel>Request Type</InputLabel>
                  <Controller
                    name="requestType"
                    control={pocForm.control}
                    rules={{ required: 'Request type is required' }}
                    render={({ field }) => (
                      <Select
                        label="Request Type *"
                        {...field}
                        disabled={isLoadingRequestTypes}
                      >
                        {requestTypeConfigs.map((config) => (
                          <MenuItem key={config.request_type} value={config.request_type}>
                            <Box>
                              <Typography variant="body1">{config.display_name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {config.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  {pocForm.formState.errors.requestType && (
                    <FormHelperText>
                      {pocForm.formState.errors.requestType.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="numberOfAttendees"
                  control={pocForm.control}
                  rules={{
                    required: `Number of ${selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'attendees'} is required`,
                    min: {
                      value: 1,
                      message: `At least 1 ${selectedRequestTypeConfig?.attendee_label_singular?.toLowerCase() || 'attendee'} is required`
                    },
                    max: {
                      value: selectedRequestTypeConfig?.max_attendees || 15,
                      message: `Maximum ${selectedRequestTypeConfig?.max_attendees || 15} ${selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'attendees'} allowed`
                    }
                  }}
                  render={({ field }) => (
                    <NumberInput
                      value={field.value || 1}
                      onChange={field.onChange}
                      min={1}
                      max={selectedRequestTypeConfig?.max_attendees || 15}
                      increment={1}
                      label={selectedRequestTypeConfig ? 
                        `Number of ${selectedRequestTypeConfig.attendee_label_plural} (including yourself if attending)` : 
                        "Number of Attendees (including yourself if attending)"
                      }
                      error={!!pocForm.formState.errors.numberOfAttendees}
                      helperText={pocForm.formState.errors.numberOfAttendees?.message}
                      required
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {selectedRequestTypeConfig?.step_2_title || 'Attendee Information'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedRequestTypeConfig?.step_2_description || 'Add attendees to this appointment request.'}
                  {requiredDignitariesCount > 0 && (
                    <span> You need to add {requiredDignitariesCount} {selectedRequestTypeConfig?.attendee_label_singular?.toLowerCase() || 'attendee'}(s) in total.</span>
                  )}
                </Typography>
              </Grid>

              {/* Show dignitary form for dignitary requests */}
              {selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY'] ? (
                <>
                  {/* List of selected dignitaries */}
                  {selectedDignitaries.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                    Selected Dignitaries ({selectedDignitaries.length} of {requiredDignitariesCount})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {selectedDignitaries.map((dignitary, index) => {
                      const displayName = `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`;
                      const titleCompany = [dignitary.title_in_organization, dignitary.organization].filter(Boolean).join(', ');
                      const fullDisplayName = titleCompany ? `${displayName} - ${titleCompany}` : displayName;
                      
                      return (
                        <PersonSelectionChip
                          key={index}
                          id={dignitary.id}
                          firstName={dignitary.first_name}
                          lastName={dignitary.last_name}
                          displayName={fullDisplayName}
                          onDelete={() => removeDignitaryFromList(index)}
                          onEdit={() => {
                            editDignitaryInList(index);
                            setIsDignitaryFormExpanded(true);
                          }}
                          editIcon={<EditIcon />}
                        />
                      );
                    })}
                  </Box>
                </Grid>
              )}

              {/* Button to expand the dignitary form when it's collapsed */}
              {!isDignitaryFormExpanded && (
                <Grid item xs={12}>
                  <PrimaryButton
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setIsDignitaryFormExpanded(true);
                      
                      // If dignitaries exist, default to "select existing dignitary"
                      if (dignitaries.length > 0) {
                        // Find the first dignitary that hasn't been added yet
                        const availableDignitary = dignitaries.find(d => 
                          !selectedDignitaries.some(sd => sd.id === d.id)
                        );
                        
                        if (availableDignitary) {
                          // If there's an available dignitary not yet added, select it
                          dignitaryForm.setValue('isExistingDignitary', true);
                          dignitaryForm.setValue('selectedDignitaryId', availableDignitary.id);
                          setSelectedDignitary(availableDignitary as unknown as Dignitary);
                          populateDignitaryForm(availableDignitary);
                        } else {
                          // If all dignitaries have been added, default to adding a new one
                          resetDignitaryForm();
                        }
                      } else {
                        // Otherwise reset to add a new dignitary
                        resetDignitaryForm();
                      }
                    }}
                    sx={{ mt: 2 }}
                    disabled={selectedDignitaries.length >= requiredDignitariesCount}
                  >
                    {selectedDignitaries.length < requiredDignitariesCount
                      ? `Add Dignitary ${selectedDignitaries.length + 1} of ${requiredDignitariesCount}`
                      : `All ${requiredDignitariesCount} dignitaries added`}
                  </PrimaryButton>
                </Grid>
              )}

              {/* Only show the dignitary form when expanded */}
              {isDignitaryFormExpanded && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        ...(isEditMode ? {
                          bgcolor: 'rgba(33, 150, 243, 0.1)',
                          p: 2,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'primary.main',
                        } : {})
                      }}
                    >
                      {isEditMode && <EditIcon color="primary" sx={{ mr: 1 }} />}
                      <Typography variant="subtitle1" color={isEditMode ? 'primary' : 'inherit'}>
                        {isEditMode ? 'Edit Dignitary Details' : 'Add a Dignitary'}
                      </Typography>
                      {isEditMode && selectedDignitaries.length > 0 && editingDignitaryIndex !== null && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                          Editing: {formatHonorificTitle(selectedDignitaries[editingDignitaryIndex].honorific_title || '')} {selectedDignitaries[editingDignitaryIndex].first_name} {selectedDignitaries[editingDignitaryIndex].last_name}
                        </Typography>
                      )}
                      {!isEditMode && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                          Adding dignitary {selectedDignitaries.length + 1} of {requiredDignitariesCount}
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      {/* Set disabled to true when in edit mode, since we don't want to allow changing between existing/new dignitary */}
                      <RadioGroup
                        value={dignitaryForm.watch('isExistingDignitary').toString()}
                        onChange={(e) => {
                          if (isEditMode) return; // Don't allow changes in edit mode
                          
                          const isExisting = e.target.value === 'true';
                          dignitaryForm.setValue('isExistingDignitary', isExisting);
                          
                          if (!isExisting) {
                            // Store the current selectedDignitaryId in the selectedDignitary object
                            if (selectedDignitary) {
                              setSelectedDignitary({
                                ...selectedDignitary,
                                previousId: dignitaryForm.getValues().selectedDignitaryId
                              });
                            }
                            // Clear form when switching to new dignitary
                            dignitaryForm.setValue('selectedDignitaryId', undefined);
                            dignitaryForm.reset({
                              ...dignitaryForm.getValues(),
                              selectedDignitaryId: undefined,
                              dignitaryHonorificTitle: '(Not Applicable)',
                              dignitaryFirstName: '',
                              dignitaryLastName: '',
                              dignitaryEmail: '',
                              dignitaryPhone: '',
                              dignitaryPrimaryDomain: '',
                              dignitaryPrimaryDomainOther: '',
                              dignitaryTitleInOrganization: '',
                              dignitaryOrganization: '',
                              dignitaryBioSummary: '',
                              dignitaryLinkedInOrWebsite: '',
                              dignitaryCountry: '',
                              dignitaryCountryCode: '',
                              dignitaryState: '',
                              dignitaryStateCode: '',
                              dignitaryCity: '',
                              dignitaryHasMetGurudev: false,
                            });
                          } else {
                            // When switching to "select existing dignitary"
                            if (selectedDignitary) {
                              // Restore selected dignitary data and ID if switching back
                              populateDignitaryForm(selectedDignitary);
                              dignitaryForm.setValue('selectedDignitaryId', selectedDignitary.previousId || selectedDignitary.id);
                            } else if (dignitaries.length > 0) {
                              // Find the first dignitary that hasn't been added yet
                              const availableDignitary = dignitaries.find(d => 
                                !selectedDignitaries.some(sd => sd.id === d.id)
                              );
                              
                              if (availableDignitary) {
                                // If there's an available dignitary not yet added, select it
                                dignitaryForm.setValue('selectedDignitaryId', availableDignitary.id);
                                setSelectedDignitary(availableDignitary as unknown as Dignitary);
                                populateDignitaryForm(availableDignitary);
                              } else {
                                // If all dignitaries have been added, select the first one
                                // (it will be disabled but still shown in the dropdown)
                                const defaultDignitary = dignitaries[0];
                                dignitaryForm.setValue('selectedDignitaryId', defaultDignitary.id);
                                setSelectedDignitary(defaultDignitary as unknown as Dignitary);
                                populateDignitaryForm(defaultDignitary);
                              }
                            }
                          }
                        }}
                      >
                        <FormControlLabel 
                          value="true" 
                          control={<Radio />} 
                          label="Select an existing dignitary"
                          disabled={dignitaries.length === 0 || isEditMode}
                        />
                        <FormControlLabel 
                          value="false" 
                          control={<Radio />} 
                          label="Add a new dignitary" 
                          disabled={isEditMode}
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  
                  {dignitaryForm.watch('isExistingDignitary') ? (
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Select Dignitary</InputLabel>
                        <Controller
                          name="selectedDignitaryId"
                          control={dignitaryForm.control}
                          render={({ field }) => (
                            <Select
                              label="Select Dignitary"
                              value={field.value || ''}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                const selectedDignitary = dignitaries.find(d => d.id === e.target.value);
                                if (selectedDignitary) {
                                  handleDignitarySelection(selectedDignitary);
                                }
                              }}
                              disabled={isEditMode} // Disable dropdown when in edit mode
                            >
                              {dignitaries.map((dignitary) => {
                                // Check if this dignitary has already been added to the appointment
                                const isAlreadyAdded = !isEditMode && selectedDignitaries.some(d => d.id === dignitary.id);
                                return (
                                  <MenuItem 
                                    key={dignitary.id} 
                                    value={dignitary.id}
                                    disabled={isAlreadyAdded}
                                    sx={{
                                      ...(isAlreadyAdded && {
                                        opacity: 0.7,
                                        '& .already-added': {
                                          marginLeft: 1,
                                          fontSize: '0.75rem',
                                          color: 'text.secondary',
                                          fontStyle: 'italic'
                                        }
                                      })
                                    }}
                                  >
                                    {`${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`}
                                    {isAlreadyAdded && <span className="already-added">(already added)</span>}
                                  </MenuItem>
                                );
                              })}
                            </Select>
                          )}
                        />
                      </FormControl>
                    </Grid>
                  ) : null}

                  <Grid item xs={12} md={6} lg={4}>
                    <Controller
                      name="pocRelationshipType"
                      control={dignitaryForm.control}
                      rules={{ required: 'Relationship type is required' }}
                      render={({ field }) => (
                        <EnumSelect
                          enumType="relationshipType"
                          label="Relationship Type"
                          required
                          error={!!dignitaryForm.formState.errors.pocRelationshipType}
                          helperText={dignitaryForm.formState.errors.pocRelationshipType?.message}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ my: 2 }}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  <Grid item xs={12} md={6} lg={4}>
                    <Controller
                      name="dignitaryHonorificTitle"
                      control={dignitaryForm.control}
                      rules={{ required: 'Honorific title is required' }}
                      render={({ field }) => (
                        <EnumSelect
                          enumType="honorificTitle"
                          label="Honorific Title"
                          required
                          error={!!dignitaryForm.formState.errors.dignitaryHonorificTitle}
                          helperText={dignitaryForm.formState.errors.dignitaryHonorificTitle?.message}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Grid>
                              
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      label="First Name"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryFirstName', { required: 'First name is required' })}
                      error={!!dignitaryForm.formState.errors.dignitaryFirstName}
                      helperText={dignitaryForm.formState.errors.dignitaryFirstName?.message}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryLastName', { required: 'Last name is required' })}
                      error={!!dignitaryForm.formState.errors.dignitaryLastName}
                      helperText={dignitaryForm.formState.errors.dignitaryLastName?.message}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryEmail', { required: 'Email is required' })}
                      error={!!dignitaryForm.formState.errors.dignitaryEmail}
                      helperText={dignitaryForm.formState.errors.dignitaryEmail?.message}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryPhone')}
                      error={!!dignitaryForm.formState.errors.dignitaryPhone}
                      helperText={dignitaryForm.formState.errors.dignitaryPhone?.message}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      label="Organization"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryOrganization')}
                      error={!!dignitaryForm.formState.errors.dignitaryOrganization}
                      helperText={dignitaryForm.formState.errors.dignitaryOrganization?.message}
                    />
                  </Grid>

                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      label="Title in Organization"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryTitleInOrganization')}
                      error={!!dignitaryForm.formState.errors.dignitaryTitleInOrganization}
                      helperText={dignitaryForm.formState.errors.dignitaryTitleInOrganization?.message}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={4}>
                    <Controller
                      name="dignitaryPrimaryDomain"
                      control={dignitaryForm.control}
                      render={({ field }) => (
                        <EnumSelect
                          enumType="primaryDomain"
                          label="Primary Domain"
                          required
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Grid>

                  {/* Show "Other" text field only when "Other" is selected as Primary Domain */}
                  {dignitaryForm.watch('dignitaryPrimaryDomain')?.toLowerCase() === 'other' && (
                    <Grid item xs={12} md={6} lg={4}>
                      <TextField
                        fullWidth
                        label="Please specify domain"
                        InputLabelProps={{ shrink: true }}
                        {...dignitaryForm.register('dignitaryPrimaryDomainOther', { 
                          required: 'Please specify the domain' 
                        })}
                        error={!!dignitaryForm.formState.errors.dignitaryPrimaryDomainOther}
                        helperText={dignitaryForm.formState.errors.dignitaryPrimaryDomainOther?.message}
                        required
                        inputProps={{
                          maxLength: 255
                        }}
                      />
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Bio Summary"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryBioSummary', { required: 'Bio summary is required' })}
                      error={!!dignitaryForm.formState.errors.dignitaryBioSummary}
                      helperText={dignitaryForm.formState.errors.dignitaryBioSummary?.message}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="LinkedIn or Website URL"
                      InputLabelProps={{ shrink: true }}
                      {...dignitaryForm.register('dignitaryLinkedInOrWebsite')}
                      error={!!dignitaryForm.formState.errors.dignitaryLinkedInOrWebsite}
                      helperText={dignitaryForm.formState.errors.dignitaryLinkedInOrWebsite?.message}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Controller
                      name="dignitaryCountryCode"
                      control={dignitaryForm.control}
                      rules={{ required: 'Country is required' }}
                      render={({ field }) => (
                        <CountrySelect
                          label="Country"
                          value={field.value || ''}
                          onChange={(countryCode) => {
                            field.onChange(countryCode);
                            
                            // Find the selected country to get its name
                            const selectedCountry = countries.find(c => c.iso2_code === countryCode);
                            if (selectedCountry) {
                              dignitaryForm.setValue('dignitaryCountry', selectedCountry.name);
                              // Update selectedCountryCode for state and city autocomplete
                              setSelectedCountryCode(countryCode);
                            }
                            
                            // Reset state and city when country changes
                            dignitaryForm.setValue('dignitaryState', '');
                            dignitaryForm.setValue('dignitaryCity', '');
                          }}
                          countries={countries}
                          disabled={isLoadingCountries}
                          error={!!dignitaryForm.formState.errors.dignitaryCountryCode}
                          helperText={dignitaryForm.formState.errors.dignitaryCountryCode?.message || (isLoadingCountries ? "Loading countries..." : "")}
                          required
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="dignitaryState"
                      control={dignitaryForm.control}
                      render={({ field }) => (
                        <SubdivisionStateDropdown
                          label="State/Province"
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                          }}
                          onStateCodeChange={(stateCode) => {
                            dignitaryForm.setValue('dignitaryStateCode', stateCode);
                          }}
                          error={!!dignitaryForm.formState.errors.dignitaryState}
                          helperText={dignitaryForm.formState.errors.dignitaryState?.message}
                          countryCode={selectedCountryCode}
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="dignitaryCity"
                      control={dignitaryForm.control}
                      render={({ field }) => (
                        <LocationAutocomplete
                          label="City"
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value.split(',')[0]);
                          }}
                          error={!!dignitaryForm.formState.errors.dignitaryCity}
                          helperText={dignitaryForm.formState.errors.dignitaryCity?.message}
                          types={['locality', 'sublocality']}
                          autoComplete="off"
                          componentRestrictions={selectedCountryCode ? { country: selectedCountryCode } : undefined}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6} lg={4}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Has Dignitary Met Gurudev?</FormLabel>
                      <RadioGroup
                        row
                        value={dignitaryForm.watch('dignitaryHasMetGurudev') ? dignitaryForm.watch('dignitaryHasMetGurudev').toString() : 'false'}
                        onChange={(e) => {
                          const value = e.target.value === 'true';
                          dignitaryForm.setValue('dignitaryHasMetGurudev', value);
                          
                          // Clear meeting details if changing from Yes to No
                          if (!value) {
                            dignitaryForm.setValue('dignitaryGurudevMeetingDate', '');
                            dignitaryForm.setValue('dignitaryGurudevMeetingLocation', '');
                            dignitaryForm.setValue('dignitaryGurudevMeetingNotes', '');
                          }
                        }}
                      >
                        <FormControlLabel value="true" control={<Radio />} label="Yes" />
                        <FormControlLabel value="false" control={<Radio />} label="No" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {dignitaryForm.watch('dignitaryHasMetGurudev') && (
                    <>
                      <Grid item xs={12} md={6} lg={4}>
                        <TextField
                          fullWidth
                          type="date"
                          label="When did they meet Gurudev?"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryGurudevMeetingDate')}
                        />
                      </Grid>
                      <Grid item xs={12} md={6} lg={4}>
                        <TextField
                          fullWidth
                          label="Where did they meet Gurudev?"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryGurudevMeetingLocation')}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          label="Additional notes from the meeting with Gurudev"
                          InputLabelProps={{ shrink: true }}
                          {...dignitaryForm.register('dignitaryGurudevMeetingNotes')}
                        />
                      </Grid>
                    </>
                  )}

                  {/* Add button at the bottom of the form */}
                  <Grid item xs={12}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' }, // Stack vertically on mobile, horizontal on larger screens
                        alignItems: { xs: 'stretch', sm: 'center' }, // Full width on mobile, centered on larger screens
                        justifyContent: 'flex-end', // Position buttons on the right side
                        gap: 2, // Space between buttons
                        mt: 2 
                      }}
                    >
                      {/* Cancel button */}
                      <SecondaryButton
                        size="medium"
                        startIcon={<CancelIcon />}
                        onClick={() => {
                          if (isEditMode) {
                            setIsEditMode(false);
                            setEditingDignitaryIndex(null);
                          }
                          resetDignitaryForm();
                          setIsDignitaryFormExpanded(false);
                        }}
                        sx={{ width: { xs: '100%', sm: 'auto' } }} // Full width on mobile, auto width on larger screens
                      >
                        Cancel
                      </SecondaryButton>
                      {/* Save/Add button */}
                      <PrimaryButton
                        size="medium"
                        startIcon={isEditMode ? <SaveIcon /> : <AddIcon />}
                        onClick={addDignitaryToList}
                        sx={{ width: { xs: '100%', sm: 'auto' } }} // Full width on mobile, auto width on larger screens
                      >
                        {getButtonText()}
                      </PrimaryButton>
                    </Box>
                  </Grid>
                </>
              )}
              </> 
              ) : (
                /* Contact management for non-dignitary requests */
                <>
                  {/* Self-attendance option */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset" sx={{ mb: 2 }}>
                      <FormLabel component="legend">Are you attending this appointment?</FormLabel>
                      <RadioGroup
                        row
                        value={isUserAttending.toString()}
                        onChange={(e) => handleSelfAttendanceChange(e.target.value === 'true')}
                      >
                        <FormControlLabel 
                          value="true" 
                          control={<Radio />} 
                          label="Yes, I am attending" 
                        />
                        <FormControlLabel 
                          value="false" 
                          control={<Radio />} 
                          label="No, I am not attending" 
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {/* Engagement fields for self-attendance */}
                  {isUserAttending && selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY'] && (
                    <>
                      {(() => {
                        const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
                        const selfContact = selectedUserContacts.find(contact => 
                          contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
                          (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName)
                        );
                        return selfContact ? renderEngagementFields(selfContact.id, true) : null;
                      })()}
                    </>
                  )}

                  {/* List of selected contacts */}
                  {selectedUserContacts.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Selected {selectedRequestTypeConfig?.attendee_label_plural || 'Attendees'} ({selectedUserContacts.length} of {requiredDignitariesCount})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {selectedUserContacts.map((contact, index) => {
                          const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
                          const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
                                               (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
                          
                          let fullDisplayName;
                          if (isSelfContact) {
                            fullDisplayName = selfDisplayName; // Just show "Self" for self-contacts
                          } else {
                            const displayName = `${contact.first_name} ${contact.last_name}`;
                            const additionalInfo = contact.relationship_to_owner;
                            fullDisplayName = additionalInfo ? `${displayName} - ${additionalInfo}` : displayName;
                          }
                          
                          return (
                            <PersonSelectionChip
                              key={contact.id}
                              id={contact.id}
                              firstName={contact.first_name}
                              lastName={contact.last_name}
                              displayName={fullDisplayName}
                              onDelete={() => removeContactFromList(contact.id)}
                              onEdit={() => editContactInList(contact)}
                              editIcon={<EditIcon />}
                            />
                          );
                        })}
                      </Box>
                    </Grid>
                  )}

                  {/* Button to expand the contact form when it's collapsed */}
                  {!isContactFormExpanded && (
                    <Grid item xs={12}>
                      <PrimaryButton
                        size="medium"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setIsContactFormExpanded(true);
                          // Set mode based on available contacts
                          const availableContacts = userContacts.filter(c => !selectedUserContacts.some(sc => sc.id === c.id));
                          setContactFormMode(availableContacts.length > 0 ? 'select' : 'create');
                        }}
                        sx={{ mt: 2 }}
                        disabled={selectedUserContacts.length >= requiredDignitariesCount}
                      >
                        {selectedUserContacts.length < requiredDignitariesCount
                          ? `Add ${selectedRequestTypeConfig?.attendee_label_singular || 'Contact'} ${selectedUserContacts.length + 1} of ${requiredDignitariesCount}`
                          : `All ${requiredDignitariesCount} ${selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'contacts'} added`}
                      </PrimaryButton>
                    </Grid>
                  )}

                  {/* Contact form when expanded */}
                  {isContactFormExpanded && (
                    <>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle1">
                            {editingContactId 
                              ? `Editing Contact: ${(() => {
                                  const contact = selectedUserContacts.find(c => c.id === editingContactId);
                                  if (!contact) return '';
                                  const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
                                  const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
                                    (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
                                  return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
                                })()}`
                              : `Add a ${selectedRequestTypeConfig?.attendee_label_singular || 'Contact'}`
                            }
                          </Typography>
                          {!editingContactId && (
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                              Adding {selectedRequestTypeConfig?.attendee_label_singular?.toLowerCase() || 'contact'} {selectedUserContacts.length + 1} of {requiredDignitariesCount}
                            </Typography>
                          )}
                        </Box>
                      </Grid>

                      {/* Mode selection - only show when not editing */}
                      {!editingContactId && (
                        <Grid item xs={12}>
                          <FormControl component="fieldset">
                            <RadioGroup
                              row
                              value={contactFormMode}
                              onChange={(e) => setContactFormMode(e.target.value as 'select' | 'create')}
                            >
                              <FormControlLabel 
                                value="select" 
                                control={<Radio />} 
                                label="Select existing contact" 
                                disabled={userContacts.filter(c => !selectedUserContacts.some(sc => sc.id === c.id)).length === 0}
                              />
                              <FormControlLabel 
                                value="create" 
                                control={<Radio />} 
                                label="Create new contact" 
                              />
                            </RadioGroup>
                          </FormControl>
                        </Grid>
                      )}

                      {(contactFormMode === 'select' && !editingContactId) ? (
                        /* Contact selection */
                        <>
                          <Grid item xs={12}>
                            <FormControl fullWidth>
                              <InputLabel>Select Contact</InputLabel>
                              <Select
                                label="Select Contact"
                                value={selectedContactForAdding || ''}
                                onChange={(e) => {
                                  const contactId = Number(e.target.value);
                                  setSelectedContactForAdding(contactId);
                                  
                                  // Initialize engagement fields for this contact
                                  if (contactId) {
                                    setContactEngagementFields(prev => ({
                                      ...prev,
                                      [contactId]: {
                                        hasMetGurudevRecently: null,
                                        isAttendingCourse: null,
                                        courseAttending: '',
                                        isDoingSeva: null,
                                        sevaType: ''
                                      }
                                    }));
                                  }
                                }}
                              >
                              {userContacts
                                .filter(contact => !selectedUserContacts.some(selected => selected.id === contact.id))
                                .map((contact) => (
                                  <MenuItem key={contact.id} value={contact.id}>
                                    <Box>
                                      <Typography variant="body1">
                                        {(() => {
                                          const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
                                          const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
                                            (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
                                          return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
                                        })()}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {[
                                          contact.relationship_to_owner,
                                          contact.email
                                        ].filter(Boolean).join(' | ') || 'No additional info'}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                            </Select>
                            {userContacts.filter(c => !selectedUserContacts.some(sc => sc.id === c.id)).length === 0 && (
                              <FormHelperText>All contacts have been added to this appointment</FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                        
                        {/* Show engagement fields for selected contact */}
                        {selectedContactForAdding && renderEngagementFields(selectedContactForAdding)}
                        
                        {/* Add button for selected contact */}
                        {selectedContactForAdding && (
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                              <Button
                                variant="outlined"
                                onClick={() => {
                                  setSelectedContactForAdding(null);
                                  setContactEngagementFields(prev => {
                                    const newFields = { ...prev };
                                    delete newFields[selectedContactForAdding];
                                    return newFields;
                                  });
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="contained"
                                onClick={() => {
                                  const contact = userContacts.find(c => c.id === selectedContactForAdding);
                                  if (contact) {
                                    addContactToList(contact);
                                    setSelectedContactForAdding(null);
                                    setIsContactFormExpanded(false);
                                  }
                                }}
                                disabled={!selectedContactForAdding}
                              >
                                Add Contact
                              </Button>
                            </Box>
                          </Grid>
                        )}
                        </>
                      ) : (
                        /* Contact creation form */
                        <>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="First Name"
                              InputLabelProps={{ shrink: true }}
                              {...personalAttendeeForm.register('firstName', { required: 'First name is required' })}
                              error={!!personalAttendeeForm.formState.errors.firstName}
                              helperText={personalAttendeeForm.formState.errors.firstName?.message}
                              required
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Last Name"
                              InputLabelProps={{ shrink: true }}
                              {...personalAttendeeForm.register('lastName', { required: 'Last name is required' })}
                              error={!!personalAttendeeForm.formState.errors.lastName}
                              helperText={personalAttendeeForm.formState.errors.lastName?.message}
                              required
                            />
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Email"
                              type="email"
                              InputLabelProps={{ shrink: true }}
                              {...personalAttendeeForm.register('email', { 
                                required: 'Email is required',
                                pattern: {
                                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                  message: 'Please enter a valid email address'
                                }
                              })}
                              error={!!personalAttendeeForm.formState.errors.email}
                              helperText={personalAttendeeForm.formState.errors.email?.message}
                              onChange={(e) => {
                                personalAttendeeForm.setValue('email', e.target.value);
                                // Validate for duplicates and show warnings
                                const warnings = validateEmailForDuplicates(e.target.value, editingContactId || undefined);
                                setEmailValidationWarnings(warnings);
                              }}
                              required
                            />
                            {/* Show email validation warnings */}
                            {emailValidationWarnings.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                {emailValidationWarnings.map((warning, index) => (
                                  <Typography 
                                    key={index}
                                    variant="caption" 
                                    color="warning.main"
                                    sx={{ display: 'block', fontSize: '0.75rem' }}
                                  >
                                    ⚠️ {warning}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Phone Number"
                              InputLabelProps={{ shrink: true }}
                              {...personalAttendeeForm.register('phone')}
                              error={!!personalAttendeeForm.formState.errors.phone}
                              helperText={personalAttendeeForm.formState.errors.phone?.message}
                            />
                          </Grid>

                          {/* Conditional fields based on attendee type */}
                          {selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['PERSONAL'] && (
                            <Grid item xs={12} md={6}>
                              <Controller
                                name="relationshipToRequester"
                                control={personalAttendeeForm.control}
                                render={({ field }) => (
                                  <EnumSelect
                                    enumType="personRelationshipType"
                                    label="Relationship to You"
                                    error={!!personalAttendeeForm.formState.errors.relationshipToRequester}
                                    helperText={personalAttendeeForm.formState.errors.relationshipToRequester?.message}
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                )}
                              />
                            </Grid>
                          )}

                          {/* Engagement and participation fields for non-dignitary appointments */}
                          {selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY'] && 
                            renderEngagementFields(-1, false, 'personalAttendee')
                          }

                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label="Notes"
                              InputLabelProps={{ shrink: true }}
                              {...personalAttendeeForm.register('comments')}
                              error={!!personalAttendeeForm.formState.errors.comments}
                              helperText={personalAttendeeForm.formState.errors.comments?.message}
                            />
                          </Grid>
                        </>
                      )}

                      {/* Action buttons */}
                      <Grid item xs={12}>
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'stretch', sm: 'center' },
                            justifyContent: 'flex-end',
                            gap: 2,
                            mt: 2 
                          }}
                        >
                          {/* Cancel button */}
                          <SecondaryButton
                            size="medium"
                            startIcon={<CancelIcon />}
                            onClick={() => {
                              resetPersonalAttendeeForm();
                              setIsContactFormExpanded(false);
                              setEditingContactId(null);
                              setContactFormMode('select');
                            }}
                            sx={{ width: { xs: '100%', sm: 'auto' } }}
                          >
                            Cancel
                          </SecondaryButton>
                          
                          {/* Add/Create/Update button */}
                          {contactFormMode === 'create' && (
                            <PrimaryButton
                              size="medium"
                              startIcon={editingContactId ? <EditIcon /> : <AddIcon />}
                              onClick={async () => {
                                const isValid = await personalAttendeeForm.trigger();
                                if (!isValid) return;

                                const formData = personalAttendeeForm.getValues();
                                const contactData: UserContactCreateData = {
                                  first_name: formData.firstName,
                                  last_name: formData.lastName,
                                  email: formData.email || undefined,
                                  phone: formData.phone || undefined,
                                  relationship_to_owner: formData.relationshipToRequester || undefined,
                                  notes: formData.comments || undefined,
                                };

                                if (editingContactId) {
                                  await updateContactInList(contactData);
                                } else {
                                  await createAndAddContact(contactData);
                                }
                              }}
                              sx={{ width: { xs: '100%', sm: 'auto' } }}
                            >
                              {editingContactId ? 'Update' : 'Create and Add'}
                            </PrimaryButton>
                          )}
                        </Box>
                      </Grid>
                    </>
                  )}
                </>
              )}
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box component="form" onSubmit={appointmentForm.handleSubmit(() => handleNext(false))}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Appointment Information
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Purpose of Meeting"
                  {...appointmentForm.register('purpose', { required: 'Purpose is required' })}
                  error={!!appointmentForm.formState.errors.purpose}
                  helperText={appointmentForm.formState.errors.purpose?.message}
                  required
                />
              </Grid>

              {/* Conditional date fields based on request type */}
              {selectedRequestTypeConfig?.request_type === requestTypeMap['DIGNITARY'] ? (
                // Single date picker for dignitary appointments
                <Grid item xs={12} md={6} lg={4}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Preferred Date"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ 
                      min: getLocalDateString(0),
                      max: getLocalDateString(60),
                    }}
                    {...appointmentForm.register('preferredDate', { 
                      required: 'Preferred date is required',
                      validate: (value) => {
                        const validation = validateSingleDate(value);
                        return validation.isValid || validation.error;
                      }
                    })}
                    error={!!appointmentForm.formState.errors.preferredDate}
                    helperText={appointmentForm.formState.errors.preferredDate?.message}
                    required
                  />
                </Grid>
              ) : (
                // Date range picker for non-dignitary appointments
                <>
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Preferred Start Date"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ 
                        min: getLocalDateString(0),
                        max: getLocalDateString(60),
                      }}
                      {...appointmentForm.register('preferredStartDate', { 
                        required: 'Preferred start date is required',
                        validate: (value) => {
                          const endDate = appointmentForm.getValues('preferredEndDate');
                          if (endDate) {
                            const validation = validateDateRange(value, endDate);
                            return validation.isValid || validation.error;
                          }
                          return true;
                        }
                      })}
                      error={!!appointmentForm.formState.errors.preferredStartDate}
                      helperText={appointmentForm.formState.errors.preferredStartDate?.message}
                      required
                      onChange={(e) => {
                        appointmentForm.setValue('preferredStartDate', e.target.value);
                        const currentEndDate = appointmentForm.getValues('preferredEndDate');
                        
                        // Auto-set end date to same as start date if not set, or if end date is before new start date
                        if (!currentEndDate || new Date(currentEndDate + 'T00:00:00') < new Date(e.target.value + 'T00:00:00')) {
                          appointmentForm.setValue('preferredEndDate', e.target.value);
                        }
                        // Trigger validation
                        appointmentForm.trigger(['preferredStartDate', 'preferredEndDate']);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Preferred End Date"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ 
                        min: appointmentForm.watch('preferredStartDate') || getLocalDateString(0),
                        max: getLocalDateString(60),
                      }}
                      {...appointmentForm.register('preferredEndDate', { 
                        required: 'Preferred end date is required',
                        validate: (value) => {
                          const startDate = appointmentForm.getValues('preferredStartDate');
                          if (startDate) {
                            const validation = validateDateRange(startDate, value);
                            return validation.isValid || validation.error;
                          }
                          return true;
                        }
                      })}
                      error={!!appointmentForm.formState.errors.preferredEndDate}
                      helperText={appointmentForm.formState.errors.preferredEndDate?.message}
                      required
                      onChange={(e) => {
                        appointmentForm.setValue('preferredEndDate', e.target.value);
                        // Trigger validation
                        appointmentForm.trigger(['preferredStartDate', 'preferredEndDate']);
                      }}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={6} lg={4}>
              <FormControl fullWidth required error={!!appointmentForm.formState.errors.preferredTimeOfDay}>
                  <InputLabel>Preferred Time of Day</InputLabel>
                  <Select
                    label="Preferred Time of Day *"
                    value={appointmentForm.watch('preferredTimeOfDay')}
                    {...appointmentForm.register('preferredTimeOfDay', { 
                      required: 'Preferred time of day is required' 
                    })}
                  >
                    {timeOfDayOptions.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                  {appointmentForm.formState.errors.preferredTimeOfDay && (
                    <FormHelperText>
                      {appointmentForm.formState.errors.preferredTimeOfDay.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6} lg={4}>
                <FormControl fullWidth required error={!!appointmentForm.formState.errors.location_id}>
                  <InputLabel>Location</InputLabel>
                  <Controller
                    name="location_id"
                    control={appointmentForm.control}
                    rules={{ 
                      required: 'Location is required',
                      validate: value => (value && value > 0) || 'Please select a location'
                    }}
                    render={({ field }) => (
                      <Select
                        label="Location *"
                        {...field}
                        displayEmpty
                      >
                        <MenuItem value="" disabled>
                          Select a location
                        </MenuItem>
                        {locations.map((location) => (
                          <MenuItem key={location.id} value={location.id}>
                            {`${location.name} - ${location.city}, ${location.state}, ${location.country}`}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  {appointmentForm.formState.errors.location_id && (
                    <FormHelperText>
                      {appointmentForm.formState.errors.location_id.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes to Secretariat"
                  {...appointmentForm.register('requesterNotesToSecretariat')}
                  error={!!appointmentForm.formState.errors.requesterNotesToSecretariat}
                  helperText={appointmentForm.formState.errors.requesterNotesToSecretariat?.message}
                />
              </Grid>
              
              {/* Add attachment section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Attachments
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Upload relevant documents or images for this appointment request.
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  />
                  <SecondaryButton
                    size="medium"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<Box component="span" sx={{ fontSize: '1.25rem' }}>📎</Box>}
                  >
                    Select Files
                  </SecondaryButton>
                </Box>
                
                {selectedFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected Files ({selectedFiles.length})
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      {selectedFiles.map((file, index) => (
                        <Box 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            py: 1,
                            borderBottom: index < selectedFiles.length - 1 ? '1px solid #eee' : 'none'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box component="span" sx={{ mr: 1, fontSize: '1.25rem' }}>
                              {file.type.includes('image') ? '🖼️' : 
                               file.type.includes('pdf') ? '📄' : 
                               file.type.includes('word') ? '📝' : 
                               file.type.includes('excel') ? '📊' : 
                               file.type.includes('presentation') ? '📽️' : '📁'}
                            </Box>
                            <Box>
                              <Typography variant="body2" noWrap sx={{ maxWidth: '300px' }}>
                                {file.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(file.size / 1024).toFixed(1)} KB
                              </Typography>
                            </Box>
                          </Box>
                          <Button 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoveFile(index)}
                          >
                            Remove
                          </Button>
                        </Box>
                      ))}
                    </Paper>
                  </Box>
                )}
              </Grid>
            </Grid>
            
            {isUploading && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Uploading attachments... {uploadProgress.toFixed(0)}%
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}
          </Box>
        );

      case 3:
        // Review & Submit step
        return (
          <Box>
            <Grid container spacing={2}>
              {/* Show confirmation if appointment was submitted */}
              {submittedAppointment && (
                <Grid item xs={12}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 3, 
                      mb: 3, 
                      bgcolor: alpha(theme.palette.success.light, 0.1),
                      color: 'success.contrastText',
                      border: '1px solid',
                      borderColor: alpha(theme.palette.success.main, 0.1),
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      mb: 2,
                    }}>
                      <CheckCircleIconV2 sx={{ fontSize: '2rem', mr: 1, color: 'success.main' }} /> Submitted!
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Request ID: <strong>{submittedAppointment.id}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Please save this ID for future reference and communication with the secretariat.
                      You will receive email updates about your appointment status.
                    </Typography>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Review Your Appointment Request
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                  Please review all the details below before submitting your appointment request.
                </Typography>
              </Grid>

              {/* Request Summary */}
                {/* Request Type */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    Request Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequestTypeConfig?.display_name || pocForm.getValues('requestType')}
                  </Typography>
                </Grid>

                {/* Number of Attendees */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    Number of {selectedRequestTypeConfig?.attendee_label_plural || 'Attendees'}
                  </Typography>
                  <Typography variant="body1">
                    {pocForm.getValues('numberOfAttendees')}
                  </Typography>
                </Grid>

                {/* Attendees List */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    {selectedRequestTypeConfig?.attendee_label_plural || 'Attendees'}
                  </Typography>
                  {selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY'] ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedDignitaries.map((dignitary, index) => {
                        const displayName = `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`;
                        const titleCompany = [dignitary.title_in_organization, dignitary.organization].filter(Boolean).join(', ');
                        const fullDisplayName = titleCompany ? `${displayName} - ${titleCompany}` : displayName;
                        return (
                          <Chip key={index} label={fullDisplayName} variant="outlined" />
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedUserContacts.map((contact, index) => {
                        const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
                        const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
                          (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
                        const displayName = isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
                        const relationship = contact.relationship_to_owner;
                        const fullDisplayName = relationship && !isSelfContact ? `${displayName} (${relationship})` : displayName;
                        return (
                          <Chip key={index} label={fullDisplayName} variant="outlined" />
                        );
                      })}
                    </Box>
                  )}
                </Grid>

                {/* Purpose */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2">
                    Purpose of Meeting
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {appointmentForm.getValues('purpose')}
                  </Typography>
                </Grid>

                {/* Date */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    Preferred Date{selectedRequestTypeConfig?.request_type !== requestTypeMap['DIGNITARY'] ? ' Range' : ''}
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequestTypeConfig?.request_type === requestTypeMap['DIGNITARY'] 
                      ? appointmentForm.getValues('preferredDate')
                      : formatDateRange(appointmentForm.getValues('preferredStartDate'), appointmentForm.getValues('preferredEndDate'))
                    }
                  </Typography>
                </Grid>

                {/* Time */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    Preferred Time of Day
                  </Typography>
                  <Typography variant="body1">
                    {appointmentForm.getValues('preferredTimeOfDay')}
                  </Typography>
                </Grid>

                {/* Location */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {(() => {
                      const locationId = appointmentForm.getValues('location_id');
                      const location = locations.find(l => l.id === locationId);
                      return location ? `${location.name} - ${location.city}, ${location.state}, ${location.country}` : 'Not specified';
                    })()}
                  </Typography>
                </Grid>

                {/* Notes */}
                {appointmentForm.getValues('requesterNotesToSecretariat') && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">
                      Notes to Secretariat
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {appointmentForm.getValues('requesterNotesToSecretariat')}
                    </Typography>
                  </Grid>
                )}

                {/* Attachments */}
                {selectedFiles.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Attachments ({selectedFiles.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedFiles.map((file, index) => (
                        <Chip 
                          key={index} 
                          label={file.name} 
                          variant="outlined" 
                          size="small"
                          icon={
                            <Box component="span" sx={{ fontSize: '1rem' }}>
                              {file.type.includes('image') ? '🖼️' : 
                                file.type.includes('pdf') ? '📄' : 
                                file.type.includes('word') ? '📝' : 
                                file.type.includes('excel') ? '📊' : 
                                file.type.includes('presentation') ? '📽️' : '📁'}
                            </Box>
                          }
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

              {/* Upload Progress */}
              {isUploading && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Uploading attachments... {uploadProgress.toFixed(0)}%
                    </Typography>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  // Update the confirmation dialog to show location name
  const renderConfirmationDialog = () => {
    if (!submittedAppointment) return null;

    const location = locations.find(l => l.id === submittedAppointment.location_id);

    return (
      <Dialog 
        open={showConfirmation} 
        maxWidth="sm" 
        fullWidth
        onClose={() => {
          setShowConfirmation(false);
          navigate('/home');
        }}
      >
        <DialogTitle>Appointment Request Submitted Successfully</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Request ID: {submittedAppointment.id}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Please save this ID for future reference and communication with the secretariat.
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom>Request Summary</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>{selectedRequestTypeConfig?.attendee_label_plural || 'Attendees'}:</strong> {
                  selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY'] 
                    ? selectedDignitaries.map(d => 
                        `${formatHonorificTitle(d.honorific_title || '')} ${d.first_name} ${d.last_name}`
                      ).join(', ')
                    : selectedUserContacts.map(c => {
                        const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
                        const isSelfContact = c.relationship_to_owner === relationshipTypeMap['SELF'] ||
                          (c.first_name === selfDisplayName && c.last_name === selfDisplayName);
                        return isSelfContact ? selfDisplayName : `${c.first_name} ${c.last_name}`;
                      }).join(', ')
                }
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Preferred Date{selectedRequestTypeConfig?.request_type !== requestTypeMap['DIGNITARY'] ? ' Range' : ''}:</strong>{' '}
                {selectedRequestTypeConfig?.request_type === requestTypeMap['DIGNITARY'] 
                  ? submittedAppointment.preferred_date
                  : formatDateRange(submittedAppointment.preferred_start_date || '', submittedAppointment.preferred_end_date || '')
                }
              </Typography>
            </Grid>
            {submittedAppointment.preferred_time_of_day && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Preferred Time:</strong> {submittedAppointment.preferred_time_of_day}
                </Typography>
              </Grid>
            )}
            {location && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Location:</strong> {`${location.name} - ${location.city}, ${location.state}, ${location.country}`}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="body1" sx={{whiteSpace: 'pre-line'}}>
                <strong>Purpose:</strong> {submittedAppointment.purpose}
              </Typography>
            </Grid>
            {submittedAppointment.requester_notes_to_secretariat && (
              <Grid item xs={12}>
                <Typography variant="body1" sx={{whiteSpace: 'pre-line'}}>
                  <strong>Notes to Secretariat:</strong> {submittedAppointment.requester_notes_to_secretariat}
                </Typography>
              </Grid>
            )}
            {selectedFiles.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Attachments:</strong> {selectedFiles.length} file(s) uploaded
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowConfirmation(false);
              navigate('/home');
            }} 
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Update the warning dialog to show appointment details
  const renderWarningDialog = () => {
    if (!selectedDignitary) return null;

    return (
      <Dialog
        open={showWarningDialog}
        onClose={() => setShowWarningDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Existing Appointment Requests Found</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You have the following pending appointment requests for{' '}
            {`${formatHonorificTitle(selectedDignitary.honorific_title || '')} ${selectedDignitary.first_name} ${selectedDignitary.last_name}`}:
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            {selectedDignitary.appointments?.map((appointment: any) => (
              <Paper 
                key={appointment.id} 
                elevation={1} 
                sx={{ 
                  p: 2, 
                  mb: 2,
                  bgcolor: 'grey.50'
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography>
                      Date & Time: {
                        appointment.appointment_date && appointment.appointment_time
                          ? formatDate(appointment.appointment_date, false) + ' ' + appointment.appointment_time + ' (confirmed)'
                          : appointment.preferred_start_date && appointment.preferred_end_date
                            ? formatDateRange(appointment.preferred_start_date, appointment.preferred_end_date) + ' ' + (appointment.preferred_time_of_day || '') + ' (requested)'
                            : appointment.preferred_date
                              ? formatDate(appointment.preferred_date, false) + ' ' + (appointment.preferred_time_of_day || '') + ' (requested)'
                              : 'Date TBD'
                      }
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography>
                      Location: {appointment.location?.name || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <AppointmentStatusChip status={appointment.status} size='small' />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>

          <Typography sx={{ mt: 2 }}>
            Would you like to create another appointment request for{' '}
            {`${formatHonorificTitle(selectedDignitary.honorific_title || '')} ${selectedDignitary.first_name} ${selectedDignitary.last_name}`}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWarningDialog(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setShowWarningDialog(false);
              // setActiveStep(2);
              handleNext(true);
            }}
            color="primary"
            variant="contained"
          >
            Create New Request
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Render existing appointments confirmation dialog
  const renderExistingAppointmentsDialog = () => {
    if (!selectedRequestTypeConfig) return null;

    const { hasExisting, count } = hasExistingAppointments(appointmentSummary, pocForm.getValues('requestType'));
    
    if (!hasExisting) return null;

    return (
      <Dialog
        open={showExistingAppointmentsDialog}
        onClose={() => {
          setShowExistingAppointmentsDialog(false);
          setPendingStepTransition(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Existing Appointment Request Found</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Dear {userInfo?.first_name},
          </Typography>
          
          <Typography gutterBottom>
            We noticed you currently have {count} open appointment request{count > 1 ? 's' : ''} for{' '}
            <strong>{selectedRequestTypeConfig.display_name}</strong> that {count > 1 ? 'are' : 'is'} still being processed.
          </Typography>

          <Typography gutterBottom>
            Would you like to proceed with creating another appointment request for the same type? 
            Please note that submitting multiple requests for the same type may cause delays in processing.
          </Typography>

          <Typography>
            If you need to update or modify your existing request, we recommend reaching out to our office directly.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowExistingAppointmentsDialog(false);
              setPendingStepTransition(false);
            }} 
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowExistingAppointmentsDialog(false);
              setPendingStepTransition(false);
              // Continue with the step transition
              setActiveStep(1);
            }}
            color="primary"
            variant="contained"
          >
            Continue Anyway
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Update the button text based on the current state
  const getButtonText = () => {
    if (isEditMode) {
      return "Save Changes";
    } else if (dignitaryForm.watch('isExistingDignitary') && isDignitaryModified) {
      return "Save and Add";
    } else {
      return "Save and Add";
    }
  };

      return (
      <Box sx={{ width: '100%' }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
          {getDisplaySteps(selectedRequestTypeConfig).map((label: string) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

      <Paper sx={{ p: 3 }}>
        {renderStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {/* Show different buttons based on whether appointment is submitted */}
          {submittedAppointment ? (
            <PrimaryButton
              onClick={() => navigate('/')}
              startIcon={<CloseIconFilledCircleV2 sx={{ fontSize: '1.5rem' }} />}
            >
              Close
            </PrimaryButton>
          ) : (
            <>
              {activeStep !== 0 && (
                <SecondaryButton 
                  onClick={handleBack} 
                  sx={{ mr: 1 }}
                  disabled={(activeStep === 1 && (isDignitaryFormExpanded || isContactFormExpanded))}
                >
                  Back
                </SecondaryButton>
              )}
              <PrimaryButton
                onClick={() => handleNext(false)}
                disabled={
                  // At step 0 with profile required, check if form is valid
                  (activeStep === 0 && wizardState.isProfileRequired && !isProfileFormValid) ||
                  // At attendee step, if forms are expanded, disable navigation
                  (activeStep === 1 && (isDignitaryFormExpanded || isContactFormExpanded)) || 
                  // At attendee step, if no attendees are selected (dignitary or contacts), disable the next button
                  (activeStep === 1 && selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY'] && selectedDignitaries.length === 0) ||
                  (activeStep === 1 && selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY'] && selectedUserContacts.length === 0) ||
                  // At attendee step, if not enough attendees are added, disable the next button
                  (activeStep === 1 && selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY'] && selectedDignitaries.length < requiredDignitariesCount) ||
                  (activeStep === 1 && selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY'] && selectedUserContacts.length < requiredDignitariesCount) ||
                  // Disable submit button while uploading
                  isUploading
                }
              >
                {activeStep === getDisplaySteps(selectedRequestTypeConfig).length - 1 ? 'Submit' : 'Next'}
              </PrimaryButton>
            </>
          )}
        </Box>
      </Paper>
      
      {/* Profile dialog when profile completion is required */}
      <ProfileOverlay
        open={wizardState.isProfileRequired}
        userInfo={userInfo}
        profileFormRef={profileFormRef}
        onSubmit={(data: UserUpdateData) => updateProfileMutation.mutate(data)}
        isSubmitting={updateProfileMutation.isPending}
        fieldsToShow={getProfileCompletionFields(userInfo)}
        onClose={handleProfileOverlayClose}
      />
      
      {renderConfirmationDialog()}
      {renderWarningDialog()}
      {renderExistingAppointmentsDialog()}
    </Box>
  );
};

export default AppointmentRequestForm; 
