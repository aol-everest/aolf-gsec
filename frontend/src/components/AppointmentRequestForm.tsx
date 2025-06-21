import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { formatDate, getLocalDateString, validateDateRange, validateSingleDate, formatDateRange } from '../utils/dateUtils';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
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
import { Link, useNavigate } from 'react-router-dom';
import { formatHonorificTitle } from '../utils/formattingUtils';
import NumberInput from './NumberInput';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { Location, Dignitary, Appointment, RequestTypeConfig, PersonalAttendee, UserContact, UserContactCreateData, UserContactUpdateData, UserContactListResponse, SystemWarningCode, UserContactCreateResponse } from '../models/types';
import { EnumSelect } from './EnumSelect';
import { useEnums } from '../hooks/useEnums';

import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { AppointmentStatusChip } from './AppointmentStatusChip';
import { PersonSelectionChip } from './PersonSelectionChip';
import ProfileFieldsForm, { ProfileFieldsFormRef } from './ProfileFieldsForm';
import { isProfileComplete, getProfileCompletionFields } from '../utils/profileValidation';
import { UserUpdateData } from '../models/types';
import { GenericTable, createGenericColumnHelper, TableCellComponents } from './GenericTable';

// Import new step configuration system
import { getMainSteps, getDisplaySteps, shouldShowProfileOverlay, WizardState, StepData } from './appointment/stepConfig';
import { StepNavigation } from './appointment/StepNavigation';
import { AttendeeList } from './appointment/AttendeeList';
import { ProfileOverlay } from './appointment/ProfileOverlay';
import { 
  EditIconV2, 
  CheckSquareCircleFilledIconV2, 
  CheckCircleIconV2, 
  CloseIconFilledCircleV2, 
  DropdownBarIconV2, 
  TrashIconV2, 
  ImageIconV2, 
  PDFIconV2, 
  TextFileIconV2, 
  PowerPointIconV2, 
  SpreadsheetIconV2, 
  GenericFileIconV2, 
  AddCircleIconV2, 
  FileFilledIconV2, 
  PowerPointFilledIconV2, 
  SpreadsheetFilledIconV2, 
  ClipIconV2,
  AddCircleFilledIconV2
} from './iconsv2';
import { useAppointmentSummary, hasExistingAppointments } from '../hooks/useAppointmentSummary';
import { CountrySelect } from './selects/CountrySelect';
import { PrimaryDomainSelect } from './selects/PrimaryDomainSelect';
import { SubdivisionStateDropdown } from './selects/SubdivisionStateDropdown';
import { HonorificTitleSelect } from './selects/HonorificTitleSelect';
import { UserDignitarySelector } from './selects/UserDignitarySelector';
import { DignitaryForm } from './DignitaryForm';
import { ContactForm } from './ContactForm';
import { AppointmentContactFields } from './AppointmentContactFields';
import { ExistingContactSelector } from './ExistingContactSelector';
import { UserContactSelector } from './UserContactSelector';
import { useWarningMessages, getWarningMessage, getWarningMessages } from '../utils/warningUtils';

import { SelectedDignitary as UserSelectedDignitary } from './selects/GenericDignitarySelector';
import { SelectableChipGroup } from './SelectableChipGroup';



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

// Main form data interface combining all steps
interface AppointmentRequestFormData {
  requestType: string;
  numberOfAttendees: number;
  purpose: string;
  preferredDate: string;
  preferredStartDate: string;
  preferredEndDate: string;
  preferredTimeOfDay: string;
  location_id: number | undefined;
  requesterNotesToSecretariat: string;
  objective: string;
  attachmentsComment: string;
}

// Create a type that makes all fields in Dignitary optional
type PartialDignitary = Partial<Dignitary>;

// Use the SelectedDignitary interface from the generic component
type SelectedDignitary = UserSelectedDignitary;

// Appointment instance fields interface
interface AppointmentInstanceFields {
  hasMetGurudevRecently: boolean | null;
  isAttendingCourse: boolean | null;
  courseAttending: string;
  courseAttendingOther: string;
  isDoingSeva: boolean | null;
  sevaType: string;
  roleInTeamProject: string;
  roleInTeamProjectOther: string;
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
  courseAttendingOther: string;
  isDoingSeva: boolean | null;
  sevaType: string;
}

interface AppointmentRequestFormProps {
  showProfileStep?: boolean;
}

// Helper function to get file icon based on file type
const getFileIcon = (fileType: string, size: number = 20) => {
  if (fileType.includes('image')) {
    return <ImageIconV2 sx={{ width: size, height: size }} />;
  } else if (fileType.includes('pdf')) {
    return <PDFIconV2 sx={{ width: size, height: size }} />;
  } else if (fileType.includes('word') || fileType.includes('text')) {
    return <TextFileIconV2 sx={{ width: size, height: size }} />;
  } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
    return <SpreadsheetFilledIconV2 sx={{ width: size, height: size }} />;
  } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
    return <PowerPointFilledIconV2 sx={{ width: size, height: size }} />;
  } else {
    return <FileFilledIconV2 sx={{ width: size, height: size }} />;
  }
};

export const AppointmentRequestForm: React.FC<AppointmentRequestFormProps> = ({ 
  showProfileStep = false 
}) => {
  const { userInfo, updateUserInfo } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const navigate = useNavigate();
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
  
  // Add state for material completion status (for project/team meetings)
  const [materialCompletionStatus, setMaterialCompletionStatus] = useState<string>('');
  
  // State to track the required number of dignitaries/attendees
  const [requiredDignitariesCount, setRequiredDignitariesCount] = useState<number>(1);
  
  // State to track appointment instance fields for each contact
  const [contactAppointmentInstanceFields, setContactAppointmentInstanceFields] = useState<Record<number, AppointmentInstanceFields>>({});
  
  // State for selected contact in dropdown (before adding)

  
  // State for selected request type configuration
  const [selectedRequestTypeConfig, setSelectedRequestTypeConfig] = useState<RequestTypeConfig | null>(null);
  
  // State for personal attendees (non-dignitary requests)
  const [selectedPersonalAttendees, setSelectedPersonalAttendees] = useState<PersonalAttendee[]>([]);
  
  // State for personal attendee form
  const [isPersonalAttendeeFormExpanded, setIsPersonalAttendeeFormExpanded] = useState(false);
  const [isEditingPersonalAttendee, setIsEditingPersonalAttendee] = useState(false);
  const [editingPersonalAttendeeIndex, setEditingPersonalAttendeeIndex] = useState<number | null>(null);
  
  // State for dignitary editing
  const [editingDignitary, setEditingDignitary] = useState<SelectedDignitary | null>(null);

  const [showDignitaryEditDialog, setShowDignitaryEditDialog] = useState(false);
  
  // State for dignitary selection interface
  const [dignitarySelectionMode, setDignitarySelectionMode] = useState<'none' | 'existing' | 'new'>('none');
  
  // State for user contacts integration
  const [userContacts, setUserContacts] = useState<UserContact[]>([]);
  const [selectedUserContacts, setSelectedUserContacts] = useState<UserContact[]>([]);
  
  // State for contact dialog management
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactDialogMode, setContactDialogMode] = useState<'create' | 'edit'>('create');
  const [editingContact, setEditingContact] = useState<UserContact | null>(null);
  const [contactSelectionMode, setContactSelectionMode] = useState<'none' | 'existing' | 'new' | 'self'>('none');
  
  // State for collecting appointment instance data
  const [pendingContactForAppointmentInstance, setPendingContactForAppointmentInstance] = useState<UserContact | null>(null);

  
  // State for self-attendance feature
  const [isUserAttending, setIsUserAttending] = useState(true);  // Changed to default to true
  
  // State for contact warnings
  const [contactWarnings, setContactWarnings] = useState<SystemWarningCode[]>([]);
  
  // Get warning messages from backend
  const { values: warningMessages = {} } = useWarningMessages();

  
  // These state variables are no longer needed as they're handled by UserDignitarySelector

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

  // Fetch honorific titles


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
  
  // A single, unified form for the entire appointment request wizard
  const form = useForm<AppointmentRequestFormData>({
    defaultValues: {
      requestType: 'Personal', // User has set this back
      numberOfAttendees: 1,
      purpose: '',
      preferredDate: '',
      preferredStartDate: '',
      preferredEndDate: '',
      preferredTimeOfDay: '',
      location_id: undefined,
      requesterNotesToSecretariat: '',
      objective: '',
      attachmentsComment: '',
    }
  });

  const watchRequestType = form.watch('requestType') || '';

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
      courseAttendingOther: '',
      isDoingSeva: null,
      sevaType: '',
    }
  });

  // Update the useEffect to handle the dignitaries data
  useEffect(() => {
    if (fetchedDignitaries.length > 0) {
      setDignitaries(fetchedDignitaries);
    }
  }, [fetchedDignitaries]);

  // Set the fetched contacts
  useEffect(() => {
    if (fetchedUserContacts.length > 0) {
      setUserContacts(fetchedUserContacts);
    }
  }, [fetchedUserContacts]);



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



  // These functions are no longer needed as they're handled by UserDignitarySelector



  // Set default request type when configs are loaded
  useEffect(() => {
    if (requestTypeConfigs.length > 0) {
      const currentValue = form.getValues('requestType');
      // If the current value is not present or not valid, set a default.
      if (!currentValue || !requestTypeConfigs.find(c => c.request_type === currentValue)) {
        const defaultConfig = requestTypeConfigs.find(c => c.request_type === requestTypeMap['PERSONAL']) || requestTypeConfigs[0];
        if (defaultConfig) {
          form.setValue('requestType', defaultConfig.request_type);
        }
      }
    }
  }, [requestTypeConfigs, form, requestTypeMap]);

  // Update selected request type config when form value changes
  useEffect(() => {
    const config = requestTypeConfigs.find(c => c.request_type === watchRequestType);
    
    // Clear attendee lists when request type changes to avoid incompatible field data
    if (selectedRequestTypeConfig && config && selectedRequestTypeConfig.request_type !== config.request_type) {
      // Clear dignitaries for dignitary appointments
      if (selectedDignitaries.length > 0) {
        setSelectedDignitaries([]);
      }
      
      // Clear contacts for non-dignitary appointments
      if (selectedUserContacts.length > 0) {
        setSelectedUserContacts([]);
      }
      
      // Clear appointment instance fields
      setContactAppointmentInstanceFields({});
      
      // Reset user attendance state
      setIsUserAttending(true);
    }
    
    setSelectedRequestTypeConfig(config || null);
  }, [watchRequestType, requestTypeConfigs]);

  // These functions are no longer needed as they're handled by UserDignitarySelector

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

  // These mutations are no longer needed as they're handled by UserDignitarySelector

  // Mutation for creating new user contact
  const createUserContactMutation = useMutation<UserContactCreateResponse, Error, UserContactCreateData>({
    mutationFn: async (data: UserContactCreateData) => {
      const { data: response } = await api.post<UserContactCreateResponse>('/contacts/', data);
      return response;
    },
    onSuccess: (response) => {
      const newContact = response.contact;
      
      // Handle warnings if present
      if (response.warnings && response.warnings.length > 0) {
        setContactWarnings(response.warnings);
        // Show warning messages to user
        const warningTexts = getWarningMessages(response.warnings, warningMessages);
        warningTexts.forEach(message => {
          enqueueSnackbar(message, { variant: 'warning', autoHideDuration: 8000 });
        });
      }
      
      // Update the contacts list with the new contact
      setUserContacts(prev => [...prev, newContact]);
      
      queryClient.invalidateQueries({ queryKey: ['user-contacts'] });
      
      // Skip notification for self-contacts to avoid unnecessary notifications
      const isSelfContact = newContact.relationship_to_owner === relationshipTypeMap['SELF'];
      
      if (!isSelfContact) {
        enqueueSnackbar('New contact created successfully', { variant: 'success' });
      }
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
      
      // Scroll to top to show the submitted message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Clear all relevant appointment and related data caches
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-summary'] });
      
      // Clear dignitary cache if dignitaries were used
      if (selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY']) {
        queryClient.invalidateQueries({ queryKey: ['assigned-dignitaries'] });
      }
      
      // Clear contacts cache if contacts were used/updated
      if (selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY']) {
        queryClient.invalidateQueries({ queryKey: ['user-contacts'] });
      }
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

  // Dignitary management functions are now handled by UserDignitarySelector
  const handleDignitaryAdd = (dignitary: SelectedDignitary) => {
    console.log('Adding dignitary to list:', dignitary);
    console.log('poc_relationship_type in added dignitary:', dignitary.poc_relationship_type);
    setSelectedDignitaries(prev => [...prev, dignitary]);
  };

  const handleDignitaryRemove = (index: number) => {
    setSelectedDignitaries(prev => prev.filter((_, i) => i !== index));
  };

  const handleDignitaryEdit = (dignitary: SelectedDignitary) => {
    console.log('Edit dignitary data:', dignitary);
    console.log('poc_relationship_type:', dignitary.poc_relationship_type);
    console.log('relationshipType:', dignitary.relationshipType);
    setEditingDignitary(dignitary);
    setShowDignitaryEditDialog(true);
  };

  const handleDignitaryUpdate = (updatedDignitary: SelectedDignitary) => {
    setSelectedDignitaries(prev => 
      prev.map(d => d.id === updatedDignitary.id ? updatedDignitary : d)
    );
    setEditingDignitary(null);
    setShowDignitaryEditDialog(false);
  };

  const handleDignitaryEditCancel = () => {
    setEditingDignitary(null);
    setShowDignitaryEditDialog(false);
  };

  const handleDignitarySelectionCancel = () => {
    setDignitarySelectionMode('none');
  };

  const handleAddExistingDignitary = (dignitary: SelectedDignitary) => {
    handleDignitaryAdd(dignitary);
    setDignitarySelectionMode('none');
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
      // Engagement and participation fields - default to not answered
      hasMetGurudevRecently: null,
      isAttendingCourse: null,
      courseAttending: '',
      courseAttendingOther: '',
      isDoingSeva: null,
      sevaType: '',
    });

  };

  // Email validation helper function
  // Updated validation function - now focuses on required fields, not email duplicates
  const validateContactForm = (contactData: UserContactCreateData): string[] => {
    const warnings: string[] = [];
    
    if (!contactData.first_name || !contactData.first_name.trim()) {
      warnings.push("First name is required");
    }
    
    if (!contactData.last_name || !contactData.last_name.trim()) {
      warnings.push("Last name is required");
    }
    
    if (!contactData.relationship_to_owner) {
      warnings.push("Relationship to you is required");
    }
    
    return warnings;
  };

  // Create self-contact function
  const createSelfContact = async (): Promise<UserContact | null> => {
    try {
      if (!userInfo?.email) {
        return null; // Silent fail for missing email
      }

      // Check existing contacts more thoroughly
      const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
      let existingSelfContact = userContacts.find(contact => 
        contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
        (contact.email?.toLowerCase().trim() === userInfo.email?.toLowerCase().trim())
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
        // Note: contact_user_id will be populated by the backend for self-contacts
      };

      const response = await createUserContactMutation.mutateAsync(selfContactData);
      return response.contact;
    } catch (error: any) {
      // Handle 409 conflict gracefully
      if (error.response?.status === 409) {
        console.log('Self-contact already exists, fetching from server');
        // Refetch contacts to get the existing one
        queryClient.invalidateQueries({ queryKey: ['user-contacts'] });
        // Try to find the existing contact in the current list
        const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
        const existingSelfContact = userContacts.find(contact => 
          contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
          (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName) ||
          (contact.email === userInfo?.email)
        );
        return existingSelfContact || null;
      }
      console.error('Error creating self-contact:', error);
      return null; // Silent fail to avoid user disruption
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
    
    // Initialize appointment instance fields for this contact
    setContactAppointmentInstanceFields(prev => ({
      ...prev,
      [contact.id]: {
        hasMetGurudevRecently: null,  // Not answered by default
        isAttendingCourse: null,      // Not answered by default
        courseAttending: '',
        courseAttendingOther: '',
        isDoingSeva: null,            // Not answered by default
        sevaType: '',
        roleInTeamProject: '',
        roleInTeamProjectOther: ''
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
    
    // Clean up appointment instance fields for this contact
    setContactAppointmentInstanceFields(prev => {
      const newFields = { ...prev };
      delete newFields[contactId];
      return newFields;
    });
    
    enqueueSnackbar('Contact removed from appointment', { variant: 'info' });
  };

  const createAndAddContact = async (contactData: UserContactCreateData) => {
    try {
      const response = await createUserContactMutation.mutateAsync(contactData);
      addContactToList(response.contact);
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  // New contact dialog handlers
  const handleAddNewContact = () => {
    setContactSelectionMode('new');
  };

  const handleSelectExistingContact = () => {
    setContactSelectionMode('existing');
    
    // Check if there are available contacts
    const availableContacts = userContacts.filter(c => 
      !selectedUserContacts.some(sc => sc.id === c.id)
    );
    
    if (availableContacts.length === 0) {
      enqueueSnackbar('All your contacts have already been added to this appointment', { 
        variant: 'info' 
      });
      return;
    }
  };

  const handleAddSelfToAppointment = async () => {
    const selfContact = await createSelfContact();
    if (selfContact) {
      setPendingContactForAppointmentInstance(selfContact);
      setContactSelectionMode('self');
    }
  };

  const handleEditContact = (contact: UserContact) => {
    // Don't allow editing self contacts
    const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
    const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
      (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
    
    if (isSelfContact) {
      return; // Don't allow editing self contacts
    }

    setContactDialogMode('edit');
    setEditingContact(contact);
    setShowContactDialog(true);
  };

  const handleContactDialogClose = () => {
    setShowContactDialog(false);
    setContactDialogMode('create');
    setEditingContact(null);
    setContactSelectionMode('none');
  };

  const handleContactDialogSuccess = (contact: UserContact) => {
    if (contactDialogMode === 'create') {
      addContactToList(contact);
    } else if (contactDialogMode === 'edit') {
      // Update the contact in the list
      setSelectedUserContacts(prev => 
        prev.map(c => c.id === contact.id ? contact : c)
      );
    }
    handleContactDialogClose();
  };

  const handleExistingContactSelect = (contact: UserContact) => {
    setPendingContactForAppointmentInstance(contact);
    // Keep contactSelectionMode as 'existing' to show both selector and form
    // setContactSelectionMode('existing');
  };

  const handleContactSelectionCancel = () => {
    setContactSelectionMode('none');
    setPendingContactForAppointmentInstance(null);
  };

  const handleAppointmentInstanceComplete = (contact: UserContact, appointmentInstanceData?: AppointmentInstanceFields) => {
    addContactToList(contact);
    
    // Store appointment instance data if provided
    if (appointmentInstanceData) {
      setContactAppointmentInstanceFields(prev => ({
        ...prev,
        [contact.id]: appointmentInstanceData
      }));
    }
    
    // Reset state
    setPendingContactForAppointmentInstance(null);
    setContactSelectionMode('none');
  };

  // Check if self contact is already added
  const isSelfContactAdded = () => {
    const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
    return selectedUserContacts.some(contact => 
      contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
      (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName)
    );
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
      // Validate request type form
      const isValid = await form.trigger(['requestType']);
      if (!isValid) {
        // Show error notification
        enqueueSnackbar('Please fill in all required fields', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        return;
      }
      
      const formData = form.getValues();
      
      // Check for existing appointments for non-dignitary requests
      if (!skipExistingCheck && 
          selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY']) {
        const { hasExisting, count } = hasExistingAppointments(appointmentSummary, formData.requestType);
        
        if (hasExisting) {
          // Show confirmation dialog
          setShowExistingAppointmentsDialog(true);
          setPendingStepTransition(true);
          return;
        }
      }
      
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Define fields for step 1 validation based on request type
      const step1Fields: (keyof AppointmentRequestFormData)[] = [
        'purpose', 'location_id'
      ];

      // Only add preferredTimeOfDay for non-Personal requests
      if (watchRequestType !== requestTypeMap['PERSONAL']) {
        step1Fields.push('preferredTimeOfDay');
      }

      if (watchRequestType === requestTypeMap['DIGNITARY']) {
        step1Fields.push('preferredDate');
      } else {
        step1Fields.push('preferredStartDate', 'preferredEndDate');
      }

      if (watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING']) {
        step1Fields.push('objective');
      }
      
      // Validate appointment form fields for step 1
      const isValid = await form.trigger(step1Fields);
      if (!isValid) {
        // Show error notification
        enqueueSnackbar('Please fill in all required fields', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        return;
      }
      
      setActiveStep(2);
    } else if (activeStep === 2) {
      const isValid = await form.trigger(['numberOfAttendees']);
      if (!isValid) return;

      // Handle different attendee types based on request type
      if (selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY']) {
        // For dignitary requests, check dignitaries
        if (selectedDignitaries.length === 0) {
          enqueueSnackbar('Please add at least one dignitary', { 
            variant: 'error',
            autoHideDuration: 3000
          });
          return;
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
      
      // Move to review step instead of submitting
      setActiveStep(3);
    } else if (activeStep === 3) {
      // Review & Submit step - actually submit the appointment
      const formData = form.getValues();
      try {
        let appointmentCreateData: any = {
          purpose: formData.purpose,
          location_id: formData.location_id,
          requester_notes_to_secretariat: formData.requesterNotesToSecretariat,
          status: statusOptions[0],
          request_type: selectedRequestTypeConfig?.request_type || requestTypeMap['DIGNITARY'],
        };

        // Only include preferred_time_of_day for non-Personal requests
        if (selectedRequestTypeConfig?.request_type !== requestTypeMap['PERSONAL']) {
          appointmentCreateData.preferred_time_of_day = formData.preferredTimeOfDay;
        }

        // Add meeting goal for project/team meetings
        if (selectedRequestTypeConfig?.request_type === requestTypeMap['PROJECT_TEAM_MEETING']) {
          appointmentCreateData.objective = formData.objective;
          appointmentCreateData.attachments_comment = materialCompletionStatus;
        }

        // Add appropriate date fields based on request type
        if (selectedRequestTypeConfig?.request_type === requestTypeMap['DIGNITARY']) {
          appointmentCreateData.preferred_date = formData.preferredDate;
        } else {
          appointmentCreateData.preferred_start_date = formData.preferredStartDate;
          appointmentCreateData.preferred_end_date = formData.preferredEndDate;
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
          
          // Build contacts with appointment instance fields
          const contactsWithAppointmentInstance = contactIds.map((contactId: number) => {
            const appointmentInstanceData = contactAppointmentInstanceFields[contactId] || {
              hasMetGurudevRecently: null,  // Not answered by default
              isAttendingCourse: null,      // Not answered by default
              courseAttending: '',
              courseAttendingOther: '',
              isDoingSeva: null,            // Not answered by default
              sevaType: '',
              roleInTeamProject: '',
              roleInTeamProjectOther: ''
            };
            
            return {
              contact_id: contactId,
              has_met_gurudev_recently: appointmentInstanceData.hasMetGurudevRecently,
              is_attending_course: appointmentInstanceData.isAttendingCourse,
              course_attending: appointmentInstanceData.courseAttending || null,
              course_attending_other: appointmentInstanceData.courseAttendingOther || null,
              is_doing_seva: appointmentInstanceData.isDoingSeva,
              seva_type: appointmentInstanceData.sevaType || null,
              role_in_team_project: appointmentInstanceData.roleInTeamProject || null,
              role_in_team_project_other: appointmentInstanceData.roleInTeamProjectOther || null
            };
          });
          
          appointmentCreateData.contacts_with_engagement = contactsWithAppointmentInstance;
          appointmentCreateData.number_of_attendees = contactIds.length;
        }
        
        await createAppointmentMutation.mutateAsync(appointmentCreateData);
      } catch (error) {
        console.error('Error creating appointment:', error);
      }
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



  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleNext(false); }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Your Information
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  If you need to update your information, please do so in the <Link to="/profile" style={{ textDecoration: 'none' }}>profile</Link> page.
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={6} lg={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Name
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.13, minHeight: '24px' }}>
                        {(userInfo?.first_name || '-') + ' ' + (userInfo?.last_name || '-')}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6} lg={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Email
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.13, minHeight: '24px' }}>
                        {userInfo?.email || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6} lg={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Phone Number
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.13, minHeight: '24px' }}>
                        {userInfo?.phone_number || '-'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  What type of appointment are you requesting?
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required error={!!form.formState.errors.requestType}>
                  <InputLabel>Request Type</InputLabel>
                  <Controller
                    name="requestType"
                    control={form.control}
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
                  {form.formState.errors.requestType && (
                    <FormHelperText>
                      {form.formState.errors.requestType.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>


            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleNext(false); }}>
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
                  label={watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] 
                    ? "What is this specific project or team meeting about?" 
                    : "Purpose of Meeting"}
                  placeholder={watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] 
                    ? "Please describe the specific project, initiative, or team matter you'd like to discuss with Gurudev..." 
                    : undefined}
                  {...form.register('purpose', { required: 'Purpose is required' })}
                  error={!!form.formState.errors.purpose}
                  helperText={form.formState.errors.purpose?.message}
                  required
                />
              </Grid>

              {/* Project/Team Meeting specific fields */}
              {watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="What is your goal for the meeting?"
                    placeholder="What would you like to achieve from this meeting? What is your expected outcome?"
                    {...form.register('objective', { 
                      required: selectedRequestTypeConfig?.request_type === requestTypeMap['PROJECT_TEAM_MEETING'] 
                        ? 'Meeting objective is required for project/team meetings' 
                        : false 
                    })}
                    error={!!form.formState.errors.objective}
                    helperText={form.formState.errors.objective?.message || "Please describe what you hope to accomplish and what outcome you're seeking from this meeting."}
                    required={watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING']}
                  />
                </Grid>
              )}

              {/* Conditional date fields based on request type */}
              {watchRequestType === requestTypeMap['DIGNITARY'] ? (
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
                    {...form.register('preferredDate', { 
                      required: 'Preferred date is required',
                      validate: (value) => {
                        const validation = validateSingleDate(value);
                        return validation.isValid || validation.error;
                      }
                    })}
                    error={!!form.formState.errors.preferredDate}
                    helperText={form.formState.errors.preferredDate?.message}
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
                      {...form.register('preferredStartDate', { 
                        required: 'Preferred start date is required',
                        validate: (value) => {
                          const endDate = form.getValues('preferredEndDate');
                          if (endDate) {
                            const validation = validateDateRange(value, endDate);
                            return validation.isValid || validation.error;
                          }
                          return true;
                        }
                      })}
                      error={!!form.formState.errors.preferredStartDate}
                      helperText={form.formState.errors.preferredStartDate?.message}
                      required
                      onChange={(e) => {
                        form.setValue('preferredStartDate', e.target.value);
                        const currentEndDate = form.getValues('preferredEndDate');
                        
                        // Auto-set end date to same as start date if not set, or if end date is before new start date
                        if (!currentEndDate || new Date(currentEndDate + 'T00:00:00') < new Date(e.target.value + 'T00:00:00')) {
                          form.setValue('preferredEndDate', e.target.value);
                        }
                        // Trigger validation
                        form.trigger(['preferredStartDate', 'preferredEndDate']);
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
                        min: form.watch('preferredStartDate') || getLocalDateString(0),
                        max: getLocalDateString(60),
                      }}
                      {...form.register('preferredEndDate', { 
                        required: 'Preferred end date is required',
                        validate: (value) => {
                          const startDate = form.getValues('preferredStartDate');
                          if (startDate) {
                            const validation = validateDateRange(startDate, value);
                            return validation.isValid || validation.error;
                          }
                          return true;
                        }
                      })}
                      error={!!form.formState.errors.preferredEndDate}
                      helperText={form.formState.errors.preferredEndDate?.message}
                      required
                      onChange={(e) => {
                        form.setValue('preferredEndDate', e.target.value);
                        // Trigger validation
                        form.trigger(['preferredStartDate', 'preferredEndDate']);
                      }}
                    />
                  </Grid>
                </>
              )}

              {/* Conditionally show Preferred Time of Day - not for Personal appointments */}
              {watchRequestType !== requestTypeMap['PERSONAL'] && (
                <Grid item xs={12} md={6} lg={4} key="time-of-day-grid-item">
                  <FormControl fullWidth required error={!!form.formState.errors.preferredTimeOfDay}>
                    <InputLabel>Preferred Time of Day</InputLabel>
                    <Select
                      label="Preferred Time of Day *"
                      value={form.watch('preferredTimeOfDay')}
                      {...form.register('preferredTimeOfDay', { 
                        required: watchRequestType !== requestTypeMap['PERSONAL'] ? 'Preferred time of day is required' : false
                      })}
                    >
                      {timeOfDayOptions.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                    {form.formState.errors.preferredTimeOfDay && (
                      <FormHelperText>
                        {form.formState.errors.preferredTimeOfDay.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} md={6} lg={4} key="location-selector-grid-item">
                <FormControl fullWidth required error={!!form.formState.errors.location_id}>
                  <InputLabel>Location</InputLabel>
                  <Controller
                    name="location_id"
                    control={form.control}
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
                  {form.formState.errors.location_id && (
                    <FormHelperText>
                      {form.formState.errors.location_id.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} key="notes-grid-item">
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Notes to Secretariat"
                  {...form.register('requesterNotesToSecretariat')}
                  error={!!form.formState.errors.requesterNotesToSecretariat}
                  helperText={form.formState.errors.requesterNotesToSecretariat?.message}
                />
              </Grid>
              
              {/* Add attachment section */}
              <Grid item xs={12} key="attachments-grid-item">
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" color="text.primary" gutterBottom>
                  {watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] 
                    ? "Project Documentation & Presentations" 
                    : "Attachments"}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] 
                    ? "Please upload or add links to any material you plan to present to Gurudev." 
                    : "Upload relevant documents or images for this appointment request."}
                </Typography>
                
                <Box sx={{ mt: 2, mb: 2 }}>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  />
                  <SecondaryButton
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<ClipIconV2 sx={{ width: 20, height: 20 }} />}
                  >
                    Select Files
                  </SecondaryButton>
                </Box>
                
                {/* Additional questions for project/team meetings */}
                {watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] && (
                  <SelectableChipGroup
                    title="Material Completion Status"
                    description="What is the current completion status of the material you plan to present?"
                    options={['≤50% Complete', '~80% Complete', '100% Complete']}
                    selectedValue={materialCompletionStatus}
                    onSelectionChange={setMaterialCompletionStatus}
                    helperText="Please select the option that best describes the current completion status of your material for presentation to Gurudev."
                  />
                )}
                
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
                            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                              {getFileIcon(file.type, 24)}
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

      case 2:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={7} lg={8} xl={9}>
                <Typography variant="h6" gutterBottom>
                  Total number of Attendees
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={5} lg={4} xl={3}>
                <Controller
                  name="numberOfAttendees"
                  control={form.control}
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
                      onChange={(value) => {
                        field.onChange(value);
                        setRequiredDignitariesCount(value);
                      }}
                      min={1}
                      max={selectedRequestTypeConfig?.max_attendees || 15}
                      increment={1}
                      label={selectedRequestTypeConfig ? 
                        `Total number of ${selectedRequestTypeConfig.attendee_label_plural}` : 
                        "Total number of Attendees"
                      }
                      error={!!form.formState.errors.numberOfAttendees}
                      helperText={form.formState.errors.numberOfAttendees?.message}
                      required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {selectedRequestTypeConfig?.step_2_title || 'Attendee Information'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedRequestTypeConfig?.step_2_description || 'Add attendees to this appointment request.'}
                </Typography>
              </Grid>

              {/* Show dignitary form for dignitary requests */}
              {selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY'] ? (
                <>
                  {/* Table of selected dignitaries */}
                  {selectedDignitaries.length >= 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        {requiredDignitariesCount > 0 && selectedDignitaries.length < requiredDignitariesCount && (
                          <span>You need to add {requiredDignitariesCount} dignitaries in total{' '}({selectedDignitaries.length} of {requiredDignitariesCount} added)</span>
                        )}
                        {requiredDignitariesCount > 0 && selectedDignitaries.length === requiredDignitariesCount && (
                          <span>All dignitaries added. Click next to continue.</span>
                        )}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <GenericTable
                          data={selectedDignitaries}
                          columns={dignitariesTableColumns}
                          getRowId={(dignitary) => dignitary.id.toString()}
                          emptyMessage="No dignitaries added yet"
                          enableSearch={false}
                          enablePagination={false}
                          enableColumnVisibility={false}
                          tableProps={{
                            size: isMobile ? 'small' : 'medium',
                            stickyHeader: false,
                          }}
                          containerProps={{
                            sx: {
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              '& .MuiTableContainer-root': {
                                boxShadow: 'none',
                              }
                            }
                          }}
                        />
                      </Box>
                    </Grid>
                  )}

                  {/* Action buttons for dignitary selection */}
                  {dignitarySelectionMode === 'none' && selectedDignitaries.length < requiredDignitariesCount && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'center' }}>
                      <PrimaryButton
                        size="medium"
                        startIcon={<AddCircleFilledIconV2 />}
                        onClick={() => setDignitarySelectionMode('new')}
                        // sx={{ flex: 1 }}
                      >
                        Add a New Dignitary
                      </PrimaryButton>
                      <SecondaryButton
                        size="medium"
                        startIcon={<DropdownBarIconV2 />}
                        onClick={() => setDignitarySelectionMode('existing')}
                        // sx={{ flex: 1 }}
                      >
                        Select an Existing Dignitary
                      </SecondaryButton>
                      </Box>
                    </Grid>
                  )}

                  {/* Existing dignitary selector */}
                  {dignitarySelectionMode === 'existing' && (
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Select an Existing Dignitary
                          </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Choose from existing dignitaries in the system.
                            </Typography>
                      
                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select Dignitary</InputLabel>
                              <Select
                          label="Select Dignitary"
                          value=""
                                onChange={(e) => {
                            const dignitaryId = Number(e.target.value);
                            const dignitary = dignitaries.find(d => d.id === dignitaryId);
                            if (dignitary) {
                              const selectedDignitary: SelectedDignitary = {
                                ...dignitary,
                                id: dignitary.id,
                                first_name: dignitary.first_name,
                                last_name: dignitary.last_name,
                              };
                              handleAddExistingDignitary(selectedDignitary);
                            }
                          }}
                        >
                          {dignitaries
                            .filter(d => !selectedDignitaries.some(sd => sd.id === d.id))
                            .map((dignitary) => (
                              <MenuItem key={dignitary.id} value={dignitary.id}>
                                    <Box>
                                      <Typography variant="body1">
                                    {formatHonorificTitle(dignitary.honorific_title || '')} {dignitary.first_name} {dignitary.last_name}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                    {[dignitary.title_in_organization, dignitary.organization, dignitary.email].filter(Boolean).join(' | ') || 'No additional info'}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                      
                      <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
                        <SecondaryButton
                          onClick={handleDignitarySelectionCancel}
                              >
                                Cancel
                        </SecondaryButton>
                            </Box>
                          </Grid>
                        )}

                  {/* New dignitary form */}
                  {dignitarySelectionMode === 'new' && (
                    <DignitaryForm
                      mode="create"
                      onSave={(dignitary) => {
                        handleDignitaryAdd(dignitary);
                        setDignitarySelectionMode('none');
                      }}
                      onCancel={handleDignitarySelectionCancel}
                    />
                        )}
                        </>
                      ) : (
                /* Contact management for non-dignitary requests */
                <>


                  {/* Table of selected contacts */}
                  {selectedUserContacts.length >= 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        {requiredDignitariesCount > 0 && selectedUserContacts.length < requiredDignitariesCount && (
                          <span>You need to add {requiredDignitariesCount} {selectedRequestTypeConfig?.attendee_label_singular?.toLowerCase() || 'attendee'}(s) in total{' '}({selectedUserContacts.length} of {requiredDignitariesCount} added)</span>
                        )}
                        {requiredDignitariesCount > 0 && selectedUserContacts.length === requiredDignitariesCount && (
                          <span>All {selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'attendees'} added. Click next to continue.</span>
                        )}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <GenericTable
                          data={selectedUserContacts}
                          columns={contactsTableColumns}
                          getRowId={(contact) => contact.id.toString()}
                          emptyMessage={`No ${selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'attendees'} added yet. Please add ${selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'attendees'} by choosing the option below.`}
                          enableSearch={false}
                          enablePagination={false}
                          enableColumnVisibility={false}
                          tableProps={{
                            size: isMobile ? 'small' : 'medium',
                            stickyHeader: false,
                          }}
                          containerProps={{
                            sx: {
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              '& .MuiTableContainer-root': {
                                boxShadow: 'none',
                              }
                            }
                          }}
                        />
                      </Box>
                    </Grid>
                  )}

                  {/* New 3-button layout for adding contacts */}
                  {selectedUserContacts.length < requiredDignitariesCount && (
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Add {selectedRequestTypeConfig?.attendee_label_plural || 'Contacts'}
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        mb: 2
                      }}>
                        {/* Add New Contact Button */}
                        <PrimaryButton
                          startIcon={<AddCircleFilledIconV2 />}
                          onClick={handleAddNewContact}
                          disabled={selectedUserContacts.length >= requiredDignitariesCount}
                          size="medium"
                        >
                          Add New Contact
                        </PrimaryButton>

                        {/* Select Existing Contact Button */}
                        <SecondaryButton
                          startIcon={<DropdownBarIconV2 />}
                          onClick={handleSelectExistingContact}
                          disabled={
                            selectedUserContacts.length >= requiredDignitariesCount ||
                            userContacts.filter(c => !selectedUserContacts.some(sc => sc.id === c.id)).length === 0
                          }
                          size="medium"
                        >
                          Select Existing Contact
                          </SecondaryButton>
                          
                        {/* Add Yourself Button */}
                        {!isSelfContactAdded() && (
                          <SecondaryButton
                            startIcon={<AddCircleFilledIconV2 />}
                            onClick={handleAddSelfToAppointment}
                            disabled={selectedUserContacts.length >= requiredDignitariesCount}
                            size="medium"
                          >
                            Add Yourself
                          </SecondaryButton>
                        )}
                        </Box>
                      </Grid>
                  )}

                  {/* New contact form */}
                  {contactSelectionMode === 'new' && (
                    <ContactForm
                      mode="create"
                      request_type={selectedRequestTypeConfig?.request_type}
                      formData={{
                        ...form.getValues()
                      }}
                      initialAppointmentInstanceData={undefined}
                      onSave={(contact, appointmentInstanceData) => {
                        addContactToList(contact);
                        
                        // Store appointment instance data if provided
                        if (appointmentInstanceData) {
                          setContactAppointmentInstanceFields(prev => ({
                            ...prev,
                            [contact.id]: appointmentInstanceData
                          }));
                        }
                        
                        setContactSelectionMode('none');
                      }}
                      onCancel={handleContactSelectionCancel}
                    />
                  )}

                  {/* Existing contact selector */}
                  {contactSelectionMode === 'existing' && (
                    <Grid item xs={12}>
                      <UserContactSelector
                        userContacts={userContacts}
                        selectedContacts={selectedUserContacts}
                        relationshipTypeMap={relationshipTypeMap}
                        onContactAdd={handleExistingContactSelect}
                        onCancel={handleContactSelectionCancel}
                        autoSelect={true}
                      />
                    </Grid>
                  )}

                  {/* Show ContactForm below UserContactSelector when contact is selected in existing mode */}
                  {(contactSelectionMode === 'existing' || contactSelectionMode === 'self') && pendingContactForAppointmentInstance && (
                    <ContactForm
                      contact={pendingContactForAppointmentInstance}
                      mode="edit"
                      fieldsToShow="appointment"
                      request_type={selectedRequestTypeConfig?.request_type}
                      formData={{
                        ...form.getValues()
                      }}
                      initialAppointmentInstanceData={contactAppointmentInstanceFields[pendingContactForAppointmentInstance.id]}
                      onSave={handleAppointmentInstanceComplete}
                      onCancel={handleContactSelectionCancel}
                    />
                  )}
                  
                  {/* Display contact warnings if any */}
                  {contactWarnings.length > 0 && (
                    <Grid item xs={12}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          bgcolor: alpha(theme.palette.warning.light, 0.1),
                          border: '1px solid',
                          borderColor: alpha(theme.palette.warning.main, 0.3),
                        }}
                      >
                        <Typography variant="subtitle2" color="warning.dark" gutterBottom>
                          Contact Warnings
                        </Typography>
                          {contactWarnings.map((warning, index) => (
                            <Typography key={index} variant="body2" color="warning.dark" sx={{ mb: 1 }}>
                             • {getWarningMessage(warning, warningMessages)}
                            </Typography>
                          ))}
                      </Paper>
                    </Grid>
                  )}

                </>
              )}
            </Grid>
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
                      p: 1, 
                      pb: 2,
                      mb: 3, 
                      bgcolor: alpha(theme.palette.success.light, 0.1),
                      color: 'success.contrastText',
                      border: '1px solid',
                      borderColor: alpha(theme.palette.success.main, 0.1),
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h2" gutterBottom sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      mb: 0,
                    }}>
                      Submitted! <CheckCircleIconV2 sx={{ fontSize: '2rem', ml: 1, color: 'success.main' }} />
                    </Typography>
                    <Typography variant="h6" gutterBottom sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      textAlign: 'center',
                      color: 'primary.main',
                    }}>
                      Request: <Typography variant="h6" sx={{ fontWeight: 700 }}>#{submittedAppointment.id}</Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      Please save this number for future reference and communication with the secretariat.
                      You will receive email updates about your appointment status.
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {submittedAppointment ? (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Submitted Appointment Request
                  </Typography>
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Review Your Appointment Request
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                    Please review all the details below before submitting your appointment request.
                  </Typography>
                </Grid>
              )}
              {/* Request Summary */}
                {/* Request Type */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    Request Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequestTypeConfig?.display_name || form.getValues('requestType')}
                  </Typography>
                </Grid>

                {/* Number of Attendees */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    Number of {selectedRequestTypeConfig?.attendee_label_plural || 'Attendees'}
                  </Typography>
                  <Typography variant="body1">
                    {form.getValues('numberOfAttendees')}
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
                    {watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] 
                      ? "Project/Team Meeting About" 
                      : "Purpose of Meeting"}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {form.getValues('purpose')}
                  </Typography>
                </Grid>

                {/* Meeting Objective for Project/Team Meetings */}
                {watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] && form.getValues('objective') && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">
                      Meeting Objective
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {form.getValues('objective')}
                    </Typography>
                  </Grid>
                )}

                {/* Material Completion Status for Project/Team Meetings */}
                {watchRequestType === requestTypeMap['PROJECT_TEAM_MEETING'] && materialCompletionStatus && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">
                      Material Completion Status
                    </Typography>
                    <Typography variant="body1">
                      {materialCompletionStatus}
                    </Typography>
                  </Grid>
                )}

                {/* Date */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">
                    Preferred Date{selectedRequestTypeConfig?.request_type !== requestTypeMap['DIGNITARY'] ? ' Range' : ''}
                  </Typography>
                  <Typography variant="body1">
                    {watchRequestType === requestTypeMap['DIGNITARY'] 
                      ? form.getValues('preferredDate')
                      : formatDateRange(form.getValues('preferredStartDate'), form.getValues('preferredEndDate'))
                    }
                  </Typography>
                </Grid>

                {/* Time */}
                {watchRequestType !== requestTypeMap['PERSONAL'] && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">
                      Preferred Time of Day
                    </Typography>
                    <Typography variant="body1">
                      {form.getValues('preferredTimeOfDay')}
                    </Typography>
                  </Grid>
                )}

                {/* Location */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {(() => {
                      const locationId = form.getValues('location_id');
                      const location = locations.find(l => l.id === locationId);
                      return location ? `${location.name} - ${location.city}, ${location.state}, ${location.country}` : 'Not specified';
                    })()}
                  </Typography>
                </Grid>

                {/* Notes */}
                {form.getValues('requesterNotesToSecretariat') && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">
                      Notes to Secretariat
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {form.getValues('requesterNotesToSecretariat')}
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
                          icon={getFileIcon(file.type, 16)}
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
                {watchRequestType === requestTypeMap['DIGNITARY'] 
                  ? submittedAppointment.preferred_date
                  : formatDateRange(submittedAppointment.preferred_start_date || '', submittedAppointment.preferred_end_date || '')
                }
              </Typography>
            </Grid>
            {submittedAppointment.preferred_time_of_day && selectedRequestTypeConfig?.request_type !== requestTypeMap['PERSONAL'] && (
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
  // renderWarningDialog is no longer needed as dignitary management is handled by UserDignitarySelector

  // Render existing appointments confirmation dialog
  const renderExistingAppointmentsDialog = () => {
    if (!selectedRequestTypeConfig) return null;

    const { hasExisting, count } = hasExistingAppointments(appointmentSummary, form.getValues('requestType'));
    
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
        <DialogTitle variant="h5" color="primary" sx={{ fontWeight: 600 }}>Existing Appointment Request Found</DialogTitle>
        <DialogContent sx={{ px: 3, py: 3 }}>
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <SecondaryButton 
            onClick={() => {
              setShowExistingAppointmentsDialog(false);
              setPendingStepTransition(false);
            }} 
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            onClick={() => {
              setShowExistingAppointmentsDialog(false);
              setPendingStepTransition(false);
              // Continue with the step transition
              setActiveStep(1);
            }}
          >
            Continue Anyway
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    );
  };

  // Create column helper for contacts table
  const contactsColumnHelper = createGenericColumnHelper<UserContact>();

  // Create column helper for dignitaries table
  const dignitariesColumnHelper = createGenericColumnHelper<SelectedDignitary>();

  // Define contacts table columns
  const contactsTableColumns = useMemo(() => {
    if (isMobile) {
      // Mobile: only show name with relationship and actions
      return [
        contactsColumnHelper.accessor('first_name', {
          id: 'nameAndRelationship',
          header: 'Contact',
          cell: ({ row }) => {
            const contact = row.original;
            const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
            const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
                                 (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
            
            const displayName = isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
            const relationship = contact.relationship_to_owner;
            
            return (
              <Box>
                <TableCellComponents.PrimaryText sx={{ fontSize: '14px', fontWeight: 500 }}>
                  {displayName}
                </TableCellComponents.PrimaryText>
                {relationship && !isSelfContact && (
                  <TableCellComponents.SecondaryText sx={{ fontSize: '12px', mt: 0.5 }}>
                    {relationship}
                  </TableCellComponents.SecondaryText>
                )}
              </Box>
            );
          },
          // size: undefined, // Auto-size on mobile
        }),
        contactsColumnHelper.display({
          id: 'actions',
          header: 'Actions',
          cell: ({ row }) => {
            const contact = row.original;
            const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
            const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
                                 (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
            
            return (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {!isSelfContact && (
                  <TableCellComponents.ActionButton 
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleEditContact(contact);
                    }}
                    sx={{ width: 32, height: 32 }}
                  >
                    <EditIconV2 sx={{ fontSize: 16 }} />
                  </TableCellComponents.ActionButton>
                )}
                <TableCellComponents.ActionButton
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    removeContactFromList(contact.id);
                  }}
                  sx={{ 
                    width: 32, 
                    height: 32,
                    '&:hover': {
                      backgroundColor: 'error.light',
                      borderColor: 'error.main'
                    }
                  }}
                >
                  <TrashIconV2 sx={{ fontSize: 16, color: 'error.main' }} />
                </TableCellComponents.ActionButton>
              </Box>
            );
          },
          size: 80,
          enableSorting: false,
        }),
      ];
    } else {
      // Desktop: show more details in separate columns
      return [
        contactsColumnHelper.accessor('first_name', {
          id: 'name',
          header: 'Name',
          cell: ({ row }) => {
            const contact = row.original;
            const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
            const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
                                 (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
            
            const displayName = isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
            
            return (
              <TableCellComponents.PrimaryText>
                {displayName}
              </TableCellComponents.PrimaryText>
            );
          },
          size: 180,
        }),
        contactsColumnHelper.accessor('relationship_to_owner', {
          id: 'relationship',
          header: 'Relationship',
          cell: ({ row }) => (
            <TableCellComponents.SecondaryText>
              {row.original.relationship_to_owner || '-'}
            </TableCellComponents.SecondaryText>
          ),
          size: 140,
        }),
        contactsColumnHelper.accessor('email', {
          id: 'email',
          header: 'Email',
          cell: ({ row }) => (
            <TableCellComponents.SecondaryText sx={{ fontSize: '13px' }}>
              {row.original.email || '-'}
            </TableCellComponents.SecondaryText>
          ),
          size: 200,
        }),
        contactsColumnHelper.accessor('phone', {
          id: 'phone',
          header: 'Phone',
          cell: ({ row }) => (
            <TableCellComponents.SecondaryText sx={{ fontSize: '13px' }}>
              {row.original.phone || '-'}
            </TableCellComponents.SecondaryText>
          ),
          size: 140,
        }),
        contactsColumnHelper.display({
          id: 'actions',
          header: 'Actions',
          cell: ({ row }) => {
            const contact = row.original;
            const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
            const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] || 
                                 (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
            
            return (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {!isSelfContact && (
                  <TableCellComponents.ActionButton 
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleEditContact(contact);
                    }}
                  >
                    <EditIconV2 sx={{ fontSize: 18 }} />
                  </TableCellComponents.ActionButton>
                )}
                <TableCellComponents.ActionButton
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    removeContactFromList(contact.id);
                  }}
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'error.light',
                      borderColor: 'error.main'
                    }
                  }}
                >
                  <TrashIconV2 sx={{ fontSize: 18, color: 'error.main' }} />
                </TableCellComponents.ActionButton>
              </Box>
            );
          },
          size: 100,
          enableSorting: false,
        }),
      ];
    }
  }, [isMobile, relationshipTypeMap, removeContactFromList]);

  // Define dignitaries table columns
  const dignitariesTableColumns = useMemo(() => {
    if (isMobile) {
      // Mobile: only show name with title and actions
      return [
        dignitariesColumnHelper.accessor('first_name', {
          id: 'nameAndTitle',
          header: 'Dignitary',
          cell: ({ row }) => {
            const dignitary = row.original;
            const displayName = `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`;
            const titleCompany = [dignitary.title_in_organization, dignitary.organization].filter(Boolean).join(', ');
            
            return (
              <Box>
                <TableCellComponents.PrimaryText sx={{ fontSize: '14px', fontWeight: 500 }}>
                  {displayName}
                </TableCellComponents.PrimaryText>
                {titleCompany && (
                  <TableCellComponents.SecondaryText sx={{ fontSize: '12px', mt: 0.5 }}>
                    {titleCompany}
                  </TableCellComponents.SecondaryText>
                )}
              </Box>
            );
          },
          // size: undefined, // Auto-size on mobile
        }),
        dignitariesColumnHelper.display({
          id: 'actions',
          header: 'Actions',
          cell: ({ row }) => {
            const dignitary = row.original;
            const index = selectedDignitaries.findIndex(d => d.id === dignitary.id);
            
            return (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <TableCellComponents.ActionButton 
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleDignitaryEdit(dignitary);
                  }}
                  sx={{ width: 32, height: 32 }}
                >
                  <EditIconV2 sx={{ fontSize: 16 }} />
                </TableCellComponents.ActionButton>
                <TableCellComponents.ActionButton
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleDignitaryRemove(index);
                  }}
                  sx={{ 
                    width: 32, 
                    height: 32,
                    '&:hover': {
                      backgroundColor: 'error.light',
                      borderColor: 'error.main'
                    }
                  }}
                >
                  <TrashIconV2 sx={{ fontSize: 16, color: 'error.main' }} />
                </TableCellComponents.ActionButton>
              </Box>
            );
          },
          size: 80,
          enableSorting: false,
        }),
      ];
    } else {
      // Desktop: show more details in separate columns
      return [
        dignitariesColumnHelper.accessor('first_name', {
          id: 'name',
          header: 'Name',
          cell: ({ row }) => {
            const dignitary = row.original;
            const displayName = `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`;
            
            return (
              <TableCellComponents.PrimaryText>
                {displayName}
              </TableCellComponents.PrimaryText>
            );
          },
          size: 200,
        }),
        dignitariesColumnHelper.accessor('title_in_organization', {
          id: 'title',
          header: 'Title',
          cell: ({ row }) => (
            <TableCellComponents.SecondaryText>
              {row.original.title_in_organization || '-'}
            </TableCellComponents.SecondaryText>
          ),
          size: 160,
        }),
        dignitariesColumnHelper.accessor('organization', {
          id: 'organization',
          header: 'Organization',
          cell: ({ row }) => (
            <TableCellComponents.SecondaryText>
              {row.original.organization || '-'}
            </TableCellComponents.SecondaryText>
          ),
          size: 180,
        }),
        dignitariesColumnHelper.accessor('email', {
          id: 'email',
          header: 'Email',
          cell: ({ row }) => (
            <TableCellComponents.SecondaryText sx={{ fontSize: '13px' }}>
              {row.original.email || '-'}
            </TableCellComponents.SecondaryText>
          ),
          size: 200,
        }),
        dignitariesColumnHelper.display({
          id: 'actions',
          header: 'Actions',
          cell: ({ row }) => {
            const dignitary = row.original;
            const index = selectedDignitaries.findIndex(d => d.id === dignitary.id);
            
            return (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <TableCellComponents.ActionButton 
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleDignitaryEdit(dignitary);
                  }}
                >
                  <EditIconV2 sx={{ fontSize: 18 }} />
                </TableCellComponents.ActionButton>
                <TableCellComponents.ActionButton
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleDignitaryRemove(index);
                  }}
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'error.light',
                      borderColor: 'error.main'
                    }
                  }}
                >
                  <TrashIconV2 sx={{ fontSize: 18, color: 'error.main' }} />
                </TableCellComponents.ActionButton>
              </Box>
            );
          },
          size: 100,
          enableSorting: false,
        }),
      ];
    }
  }, [isMobile, formatHonorificTitle, selectedDignitaries, handleDignitaryRemove]);

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
        {getDisplaySteps(selectedRequestTypeConfig).map((label: string) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ 
        pt: 3,
        pb: 0,
        px: 0,
        boxShadow: 'none',
        borderRadius: '0px',
        borderTop: '1px solid #E9E9E9',
        
      }}>
        {renderStepContent(activeStep)}
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mt: 3,
          borderTop: '1px solid #E9E9E9',
          pt: 3,
        }}>
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
                >
                  Back
                </SecondaryButton>
              )}
              <PrimaryButton
                onClick={() => handleNext(false)}
                disabled={
                  // At step 0 with profile required, check if form is valid
                  (activeStep === 0 && wizardState.isProfileRequired && !isProfileFormValid) ||
                  // At attendee step (now step 2), if no attendees are selected (dignitary or contacts), disable the next button
                  (activeStep === 2 && selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY'] && selectedDignitaries.length === 0) ||
                  (activeStep === 2 && selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY'] && selectedUserContacts.length === 0) ||
                  // At attendee step (now step 2), if not enough attendees are added, disable the next button
                  (activeStep === 2 && selectedRequestTypeConfig?.attendee_type === attendeeTypeMap['DIGNITARY'] && selectedDignitaries.length < requiredDignitariesCount) ||
                  (activeStep === 2 && selectedRequestTypeConfig?.attendee_type !== attendeeTypeMap['DIGNITARY'] && selectedUserContacts.length < requiredDignitariesCount) ||
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
      {renderExistingAppointmentsDialog()}

      {/* Edit Dignitary Dialog */}
      <Dialog
        open={showDignitaryEditDialog}
        onClose={handleDignitaryEditCancel}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0, pb: 0, pt: 2, px: 3 }}>
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Typography variant="h2">
                Editing Dignitary Contact
              </Typography>
              <IconButton
                edge="end"
                onClick={handleDignitaryEditCancel}
                aria-label="close"
              >
                <CloseIconFilledCircleV2 sx={{ fontSize: '1.5rem' }} />
              </IconButton>
            </Box>
            {editingDignitary && (
              <Typography variant="subtitle2" color="text.secondary">
                {formatHonorificTitle(editingDignitary.honorific_title || '')} {editingDignitary.first_name} {editingDignitary.last_name}
              </Typography>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3 }}>
          {editingDignitary && (
            <DignitaryForm
              mode="edit"
              dignitary={editingDignitary}
              onSave={handleDignitaryUpdate}
              onCancel={handleDignitaryEditCancel}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Form Dialog */}
      <Dialog
        open={showContactDialog}
        onClose={handleContactDialogClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0, pb: 0, pt: 2, px: 3 }}>
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Typography variant="h2">
                {contactDialogMode === 'create' ? 'Add New Contact' : 'Edit Contact'}
              </Typography>
              <IconButton
                edge="end"
                onClick={handleContactDialogClose}
                aria-label="close"
              >
                <CloseIconFilledCircleV2 sx={{ fontSize: '1.5rem' }} />
              </IconButton>
            </Box>
            {editingContact && contactDialogMode === 'edit' && (
              <Typography variant="subtitle2" color="text.secondary">
                {editingContact.first_name} {editingContact.last_name}
              </Typography>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3 }}>
          <ContactForm
            contact={editingContact}
            mode={contactDialogMode}
            request_type={selectedRequestTypeConfig?.request_type}
            formData={{
              ...form.getValues()
            }}
            initialAppointmentInstanceData={editingContact ? contactAppointmentInstanceFields[editingContact.id] : undefined}
            onSave={(contact, appointmentInstanceData) => {
              handleContactDialogSuccess(contact);
              
              // Store appointment instance data if provided for edit mode
              if (appointmentInstanceData && contactDialogMode === 'edit') {
                setContactAppointmentInstanceFields(prev => ({
                  ...prev,
                  [contact.id]: appointmentInstanceData
                }));
              }
            }}
            onCancel={handleContactDialogClose}
          />
        </DialogContent>
      </Dialog>

    </Box>
  );
};

export default AppointmentRequestForm; 
