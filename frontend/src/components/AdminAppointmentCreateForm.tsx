import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { formatDate, getLocalDateString, formatDateWithTimezone, parseUTCDate } from '../utils/dateUtils';
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
  Autocomplete,
  Alert,
  Snackbar,
  ListItemIcon,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from './LocationAutocomplete';
import { useNavigate } from 'react-router-dom';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { Location, Dignitary, Appointment } from '../models/types';
import { EnumSelect } from './EnumSelect';
import { useEnums } from '../hooks/useEnums';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminAppointmentEditCard, { AdminAppointmentEditCardRef } from './AdminAppointmentEditCard';
import { StatusMap, SubStatusMap, StatusSubStatusMapping, EventTypeMap, CalendarEvent } from '../models/types';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { PencilIconV2, TrashIconV2 } from './iconsv2';

// Interfaces
interface AppointmentResponse extends Omit<Appointment, 'dignitary' | 'requester' | 'location' | 'approved_by_user' | 'last_updated_by_user' | 'attachments'> {
  // Only include the fields that are returned by the API when creating a new appointment
  purpose?: string;
}

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

// For Step 1
interface InitialFormData {
  numberOfDignitaries: number;
  eventType: string;
}

// For Step 2: Dignitary Information
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
  dignitaryCountryCode: string;
  dignitaryState: string;
  dignitaryCity: string;
  dignitaryHasMetGurudev: boolean;
  dignitaryGurudevMeetingDate?: string;
  dignitaryGurudevMeetingLocation?: string;
  dignitaryGurudevMeetingNotes?: string;
}

// Create a type that makes all fields in Dignitary optional
type PartialDignitary = Partial<Dignitary>;

// Interface for selected dignitaries
interface SelectedDignitary extends PartialDignitary {
  id: number;
  isNew?: boolean;
  relationshipType?: string;
  previousId?: number;
  first_name: string;
  last_name: string;
  created_by?: number;
  created_at?: string;
}

// For Step 3: Appointment Information
interface AppointmentFormData {
  num_dignitaries: number;
  preferred_date?: string;
  preferred_time_of_day?: string;
  purpose_of_meeting?: string;
  location_id?: number | null;
  meeting_place_id?: number | null;
  requester_notes_to_secretariat?: string;
  appointment_date?: string;
  appointment_time?: string;
  duration?: number;
  status?: string;
  sub_status?: string;
  appointment_type?: string | null;
  secretariat_notes_to_requester?: string;
  secretariat_meeting_notes?: string;
  secretariat_follow_up_actions?: string;
}

// Define validation errors interface
interface ValidationErrors {
  appointment_date?: string;
  appointment_time?: string;
  location_id?: string;
  status?: string;
  sub_status?: string;
  appointment_type?: string;
  secretariat_notes_to_requester?: string;
  secretariat_follow_up_actions?: string;
  secretariat_meeting_notes?: string;
  purpose_of_meeting?: string;
}

const steps = ['Event Type', 'Add Attendee Information', 'Event Details'];

export const AdminAppointmentCreateForm: React.FC = () => {
  const { userInfo } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | undefined>(undefined);
  const [dignitaries, setDignitaries] = useState<Dignitary[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<AppointmentResponse | null>(null);
  const [selectedDignitaries, setSelectedDignitaries] = useState<SelectedDignitary[]>([]);
  const [selectedDignitary, setSelectedDignitary] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDignitaryIndex, setEditingDignitaryIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  // File attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // State to track the required number of dignitaries
  const [requiredDignitariesCount, setRequiredDignitariesCount] = useState<number>(1);
  
  // Track if the selected dignitary has been modified
  const [isDignitaryModified, setIsDignitaryModified] = useState(false);

  // Track if the dignitary form is expanded
  const [isDignitaryFormExpanded, setIsDignitaryFormExpanded] = useState(false);
  
  // Add state for validation errors
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  
  // Track if validation should happen on change
  const [enableValidateOnChange, setEnableValidateOnChange] = useState(false);
  
  // Add ref for AdminAppointmentEditCard
  const appointmentEditCardRef = useRef<AdminAppointmentEditCardRef>(null);

  // Add this line near the top with other state variables
  const [isPlaceholderMode, setIsPlaceholderMode] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [isCalendarEventMode, setIsCalendarEventMode] = useState(false);

  // Fetch status options
  const { data: statusOptions = [] } = useQuery<string[]>({
    queryKey: ['status-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/status-options');
      return data;
    },
  });
  
  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get<Location[]>('/admin/locations/all');
      return data;
    },
  });

  // Fetch dignitaries assigned to the user
  const { data: fetchedDignitaries = [], isLoading: isLoadingDignitaries } = useQuery<Dignitary[]>({
    queryKey: ['admin-assigned-dignitaries'],
    queryFn: async () => {
      const { data } = await api.get<Dignitary[]>('/admin/dignitaries/all');
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
  
  // Fetch status map from the API
  const { data: statusMap = {} } = useQuery<StatusMap>({
    queryKey: ['status-map'],
    queryFn: async () => {
      const { data } = await api.get<StatusMap>('/appointments/status-options-map');
      return data;
    },
  });

  // Fetch substatus map from the API  
  const { data: subStatusMap = {} } = useQuery<SubStatusMap>({
    queryKey: ['sub-status-map'],
    queryFn: async () => {
      const { data } = await api.get<SubStatusMap>('/appointments/sub-status-options-map');
      return data;
    },
  });

  // Fetch status-substatus mapping from the API
  const { data: statusSubStatusMapping } = useQuery<StatusSubStatusMapping>({
    queryKey: ['status-substatus-mapping'],
    queryFn: async () => {
      const { data } = await api.get<StatusSubStatusMapping>('/appointments/status-substatus-mapping');
      return data;
    },
  });

  // Fetch all substatus options
  const { values: allSubStatusOptions = [] } = useEnums('appointmentSubStatus');

  // Fetch event type options
  const { data: eventTypeOptions = [] } = useQuery<string[]>({
    queryKey: ['calendar-event-type-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/calendar/event-type-options');
      return data;
    },
  });

  // Fetch event type map from the API
  const { data: eventTypeMap = {} } = useQuery<EventTypeMap>({
    queryKey: ['calendar-event-type-map'],
    queryFn: async () => {
      const { data } = await api.get<EventTypeMap>('/calendar/event-type-options-map');
      return data;
    },
  });
  
  // Forms for each step
  const initialForm = useForm<InitialFormData>({
    defaultValues: {
      numberOfDignitaries: 1,
      eventType: '',
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
      dignitaryCity: '',
      dignitaryHasMetGurudev: false,
      dignitaryGurudevMeetingDate: '',
      dignitaryGurudevMeetingLocation: '',
      dignitaryGurudevMeetingNotes: '',
    }
  });

  const appointmentForm = useForm<AppointmentFormData>({
    defaultValues: {
      num_dignitaries: 1,
      preferred_date: '',
      preferred_time_of_day: '',
      purpose_of_meeting: '',
      location_id: null,
      requester_notes_to_secretariat: '',
      appointment_date: '',
      appointment_time: '',
      status: '',
      sub_status: '',
      appointment_type: null,
      secretariat_notes_to_requester: '',
      secretariat_meeting_notes: '',
      secretariat_follow_up_actions: '',
    }
  });

  // Watch fields for conditional validation
  const watchStatus = appointmentForm.watch('status') || '';
  const watchSubStatus = appointmentForm.watch('sub_status') || '';
  const watchAppointmentDate = appointmentForm.watch('appointment_date') || '';

  // Update the useEffect to handle the dignitaries data
  useEffect(() => {
    if (fetchedDignitaries.length > 0) {
      setDignitaries(fetchedDignitaries);
    }
  }, [fetchedDignitaries]);

  // Function to populate dignitary form fields
  const populateDignitaryForm = (dignitary: Dignitary) => {
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
    dignitaryForm.setValue('dignitaryCity', dignitary.city || '');
    dignitaryForm.setValue('dignitaryHasMetGurudev', dignitary.has_dignitary_met_gurudev);
    dignitaryForm.setValue('dignitaryGurudevMeetingDate', dignitary.gurudev_meeting_date || '');
    dignitaryForm.setValue('dignitaryGurudevMeetingLocation', dignitary.gurudev_meeting_location || '');
    dignitaryForm.setValue('dignitaryGurudevMeetingNotes', dignitary.gurudev_meeting_notes || '');
    
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
          selectedDignitary.gurudev_meeting_notes !== currentValues.dignitaryGurudevMeetingNotes;
          
        setIsDignitaryModified(hasChanges);
      }
    });
    return () => subscription.unsubscribe();
  }, [dignitaryForm, selectedDignitary]);

  // Set default substatus when status changes
  useEffect(() => {
    if (watchStatus && statusSubStatusMapping && statusSubStatusMapping[watchStatus]) {
      const { default_sub_status, valid_sub_statuses } = statusSubStatusMapping[watchStatus];
      
      // Only set default if current substatus is not valid for the new status
      const currentSubStatus = appointmentForm.getValues('sub_status');
      
      if (!currentSubStatus || !valid_sub_statuses.includes(currentSubStatus)) {
        appointmentForm.setValue('sub_status', default_sub_status);
      }
    }
  }, [watchStatus, statusSubStatusMapping, appointmentForm]);

  // Function to handle dignitary selection
  const handleDignitarySelection = (dignitary: Dignitary) => {
    setSelectedDignitary(dignitary as any);
    populateDignitaryForm(dignitary);
  };

  // Mutation for creating new dignitary
  const createDignitaryMutation = useMutation<Dignitary, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<Dignitary>('/admin/dignitaries/new', data);
      return response;
    },
    onSuccess: (newDignitary) => {
      // Update the dignitaries list with the new dignitary
      setDignitaries(prev => [...prev, newDignitary]);
      
      // Switch to existing dignitary mode and select the new dignitary
      dignitaryForm.setValue('isExistingDignitary', true);
      dignitaryForm.setValue('selectedDignitaryId', newDignitary.id);
      setSelectedDignitary(newDignitary);
      
      queryClient.invalidateQueries({ queryKey: ['admin-assigned-dignitaries'] });
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

  // Mutation for updating dignitary
  const updateDignitaryMutation = useMutation<Dignitary, Error, { id: number, data: any }>({
    mutationFn: async ({ id, data }) => {
      const { data: response } = await api.patch<Dignitary>(`/dignitaries/update/${id}`, data);
      return response;
    },
    onSuccess: (updatedDignitary) => {
      setSelectedDignitary(updatedDignitary);
      queryClient.invalidateQueries({ queryKey: ['admin-assigned-dignitaries'] });
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

  // Function to add a dignitary to the list
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
            city: formData.dignitaryCity,
            has_dignitary_met_gurudev: formData.dignitaryHasMetGurudev,
            gurudev_meeting_date: formData.dignitaryGurudevMeetingDate,
            gurudev_meeting_location: formData.dignitaryGurudevMeetingLocation,
            gurudev_meeting_notes: formData.dignitaryGurudevMeetingNotes,
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
          city: formData.dignitaryCity,
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
      dignitaryCity: '',
      dignitaryHasMetGurudev: false,
      dignitaryGurudevMeetingDate: '',
      dignitaryGurudevMeetingLocation: '',
      dignitaryGurudevMeetingNotes: '',
    });
    setSelectedDignitary(null);
    setIsDignitaryModified(false);
    
    // Reset the selected country code
    setSelectedCountryCode(undefined);
  };

  // Validate form based on status and substatus combinations
  const validateForm = () => {
    // Simply use the card's validate method for all validation
    const cardErrors = appointmentEditCardRef.current?.validate() || {};
    setValidationErrors(cardErrors);
    return Object.keys(cardErrors).length === 0;
  };

  // Handle file selection
  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Function to remove a file from the selected files
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Function for camera input
  const handleCameraInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleChooseFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleTakePhoto = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
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

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon />;
    } else if (fileType === 'application/pdf') {
      return <PictureAsPdfIcon />;
    } else if (fileType.startsWith('text/')) {
      return <DescriptionIcon />;
    } else {
      return <InsertDriveFileIcon />;
    }
  };

  // Mutation for creating new appointment
  const createAppointmentMutation = useMutation<AppointmentResponse, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<AppointmentResponse>('/admin/appointments/new', data);
      return response;
    },
    onSuccess: async (appointmentResponse) => {
      setSubmittedAppointment(appointmentResponse);
      
      // Upload attachments if any
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        await uploadAttachments(appointmentResponse.id);
      }
      
      setShowConfirmation(true);
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      console.error('Error creating appointment:', error);
      setIsUploading(false);
      let errorMsg = 'Some required fields are missing or invalid.';
      if (error.response?.data) {
        // If backend returns a string, use it; otherwise, keep generic message
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      enqueueSnackbar(`Failed to create appointment: ${errorMsg}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Mutation for creating new calendar event
  const createCalendarEventMutation = useMutation<CalendarEvent, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<CalendarEvent>('/admin/calendar-events', data);
      return response;
    },
    onSuccess: async (eventResponse) => {
      // Set the submitted appointment to the calendar event for display purposes
      setSubmittedAppointment({
        ...eventResponse as any,
        id: eventResponse.id!,
        purpose: eventResponse.description || '',
        appointment_date: eventResponse.start_date,
        appointment_time: eventResponse.start_time,
      });
      
      setShowConfirmation(true);
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
    onError: (error: any) => {
      console.error('Error creating calendar event:', error);
      setIsUploading(false);
      let errorMsg = 'Some required fields are missing or invalid.';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      enqueueSnackbar(`Failed to create calendar event: ${errorMsg}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Generate time options in 15-minute increments
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourFormatted = hour.toString().padStart(2, '0');
        const minuteFormatted = minute.toString().padStart(2, '0');
        const value = `${hourFormatted}:${minuteFormatted}`;
        const label = `${hour % 12 === 0 ? 12 : hour % 12}:${minuteFormatted} ${hour < 12 ? 'AM' : 'PM'}`;
        options.push({ value, label });
      }
    }
    return options;
  }, []);

  // Helper function to find the time option object from a time string
  const findTimeOption = (timeString: string | null) => {
    if (!timeString) return null;
    return timeOptions.find(option => option.value === timeString) || null;
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate initial form
      const isValid = await initialForm.trigger();
      if (!isValid) {
        enqueueSnackbar('Please fill in all required fields', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        return;
      }
      
      const initialData = initialForm.getValues();
      
      // Check event type and set modes accordingly
      const isDignitaryAppointment = eventTypeMap && initialData.eventType === eventTypeMap['DIGNITARY_APPOINTMENT'];
      setSelectedEventType(initialData.eventType);

      if (isDignitaryAppointment) {
        setRequiredDignitariesCount(initialData.numberOfDignitaries);
        setIsPlaceholderMode(false);
        setIsCalendarEventMode(false);
        setActiveStep(1);
      } else {
        setRequiredDignitariesCount(0);
        setIsPlaceholderMode(false);
        setIsCalendarEventMode(true);
        setActiveStep(2);
      }
    } else if (activeStep === 1) {
      // For step 2, check if we have at least one dignitary
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
        enqueueSnackbar(`Please add ${requiredDignitariesCount - selectedDignitaries.length} more dignitary(s). You specified ${requiredDignitariesCount} dignitary(s) in the previous step.`, { 
          variant: 'error',
          autoHideDuration: 5000
        });
        return;
      }
      
      setActiveStep(2);
    } else if (activeStep === 2) {
      // Enable validation on change after first submit attempt
      if (!enableValidateOnChange) {
        setEnableValidateOnChange(true);
      }
      
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
      
      // Validate form data based on status and substatus
      const isFormValid = validateForm();
      
      // If there are validation errors, prevent submission
      if (!isFormValid) {
        setShowValidationSummary(true);
        
        // Show error notification
        enqueueSnackbar('Please fix the errors before submitting', { variant: 'error' });
        return;
      }
      
      try {
        const formData = appointmentForm.getValues();
        
        if (isCalendarEventMode) {
          // Create calendar event for non-dignitary event types
          const calendarEventData = {
            event_type: selectedEventType,
            title: formData.purpose_of_meeting || 'Untitled Event',
            description: formData.purpose_of_meeting || '',
            start_date: formData.appointment_date,
            start_time: formData.appointment_time,
            duration: formData.duration || 60,
            location_id: formData.location_id,
            meeting_place_id: formData.meeting_place_id,
            max_capacity: 50, // Default capacity for non-dignitary events
            is_open_for_booking: true,
            instructions: formData.secretariat_notes_to_requester,
            status: 'DRAFT', // Default status for calendar events
          };
          
          console.log('[DEBUG] Calendar Event Creation Payload:', calendarEventData);
          await createCalendarEventMutation.mutateAsync(calendarEventData);
        } else {
          // Create appointment for dignitary event types (existing flow)
          const dignitary_ids = selectedDignitaries.map(d => d.id);
          
          if (dignitary_ids.length === 0 && !isCalendarEventMode) {
            enqueueSnackbar('No dignitaries selected for appointment', { variant: 'error' });
            return;
          }
          
          const appointmentCreateData = {
            dignitary_ids: dignitary_ids,
            purpose: formData.purpose_of_meeting || '',
            location_id: formData.location_id,
            requester_notes_to_secretariat: formData.requester_notes_to_secretariat,
            appointment_date: formData.appointment_date,
            appointment_time: formData.appointment_time,
            status: formData.status,
            sub_status: formData.sub_status,
            appointment_type: formData.appointment_type,
            secretariat_notes_to_requester: formData.secretariat_notes_to_requester,
            secretariat_meeting_notes: formData.secretariat_meeting_notes,
            secretariat_follow_up_actions: formData.secretariat_follow_up_actions,
            is_placeholder: false,
            duration: formData.duration || 15,
            event_type: selectedEventType,
          };
          
          console.log('[DEBUG] Appointment Creation Payload:', appointmentCreateData);
          await createAppointmentMutation.mutateAsync(appointmentCreateData);
        }
      } catch (error) {
        console.error('Error creating event:', error);
      }
    }
  };

  const handleBack = () => {
    // If we're in placeholder mode or calendar event mode and at step 3, go back to step 1
    if ((isPlaceholderMode || isCalendarEventMode) && activeStep === 2) {
      setActiveStep(0);
    } else {
      setActiveStep(prev => prev - 1);
    }
  };

  // Get button text based on state
  const getButtonText = () => {
    if (isEditMode) {
      return "Save Changes";
    } else if (dignitaryForm.watch('isExistingDignitary') && isDignitaryModified) {
      return "Save and Add";
    } else {
      return "Save and Add";
    }
  };

  // Render content based on the active step
  const renderStepContent = (step: number) => {
    // Show loading indicator if data is still loading
    if (isLoadingDignitaries || isLoadingTimeOfDayOptions || isLoadingCountries) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    switch (step) {
      case 0:
        return (
          <Box component="form" onSubmit={initialForm.handleSubmit(() => handleNext())}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Event Information
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select the type of event you want to create. For dignitary appointments, you can specify the number of dignitaries (set to 0 for placeholder appointments).
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="eventType"
                  control={initialForm.control}
                  rules={{ required: 'Event type is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!initialForm.formState.errors.eventType}>
                      <InputLabel>Event Type</InputLabel>
                      <Select
                        {...field}
                        label="Event Type"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          const selectedType = e.target.value;
                          
                          // If it's a dignitary appointment, set default number of dignitaries
                          const isDignitary = eventTypeMap && selectedType === eventTypeMap['DIGNITARY_APPOINTMENT'];
                          if (isDignitary) {
                            initialForm.setValue('numberOfDignitaries', 1);
                          }
                        }}
                      >
                        <MenuItem value="">
                          <em>Select an event type</em>
                        </MenuItem>
                        {eventTypeOptions.map((eventType) => (
                          <MenuItem key={eventType} value={eventType}>
                            {eventType}
                          </MenuItem>
                        ))}
                      </Select>
                      {initialForm.formState.errors.eventType && (
                        <FormHelperText>{initialForm.formState.errors.eventType.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Show dignitary-specific options only for dignitary appointments */}
              {eventTypeMap && initialForm.watch('eventType') === eventTypeMap['DIGNITARY_APPOINTMENT'] && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Number of Dignitaries"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 1, max: 8 }}
                    {...initialForm.register('numberOfDignitaries', { 
                      required: 'Number of dignitaries is required',
                      min: {
                        value: 1,
                        message: 'At least one dignitary is required for this event type'
                      },
                      max: {
                        value: 8,
                        message: 'Maximum 8 dignitaries allowed'
                      },
                      valueAsNumber: true
                    })}
                    error={!!initialForm.formState.errors.numberOfDignitaries}
                    helperText={
                      initialForm.formState.errors.numberOfDignitaries?.message || 
                      "Specify between 1 and 8 dignitaries."
                    }
                    required
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Dignitary Information
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Add one or more dignitaries to this appointment.
                  {requiredDignitariesCount > 0 && (
                    <span> You need to add {requiredDignitariesCount} dignitary(s) in total.</span>
                  )}
                </Typography>
              </Grid>

              {/* List of selected dignitaries */}
              {selectedDignitaries.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Selected Dignitaries ({selectedDignitaries.length} of {requiredDignitariesCount})
                  </Typography>
                  <List>
                    {selectedDignitaries.map((dignitary, index) => (
                      <ListItem 
                        key={index}
                        component={Paper}
                        elevation={1}
                        sx={{ 
                          mb: 1,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <ListItemText
                          primary={`${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`}
                          secondary={
                            <>
                              <Typography component="span" variant="body2">
                                {dignitary.title_in_organization}, {dignitary.organization}
                              </Typography>
                              {dignitary.bio_summary && (
                                <Typography component="div" variant="body2" sx={{whiteSpace: 'pre-line'}} mt={1}>
                                  <strong>Bio:</strong> {dignitary.bio_summary}
                                </Typography>
                              )}
                              {dignitary.isNew && (
                                <Chip 
                                  size="small" 
                                  label="New" 
                                  color="primary" 
                                  sx={{ ml: 1 }} 
                                />
                              )}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            aria-label="edit"
                            onClick={() => {
                              editDignitaryInList(index);
                              setIsDignitaryFormExpanded(true);
                            }}
                            sx={{ mr: 1 }}
                          >
                            <PencilIconV2 sx={{ width: 20, height: 20 }} />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={() => removeDignitaryFromList(index)}
                          >
                            <TrashIconV2 sx={{ width: 20, height: 20 }} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
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
                        <TextField
                          select
                          fullWidth
                          label="Country"
                          value={field.value || ''}
                          onChange={(e) => {
                            const countryCode = e.target.value;
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
                          disabled={isLoadingCountries}
                          error={!!dignitaryForm.formState.errors.dignitaryCountryCode}
                          helperText={dignitaryForm.formState.errors.dignitaryCountryCode?.message || (isLoadingCountries ? "Loading countries..." : "")}
                          required
                        >
                          <MenuItem value="">
                            <em>Select a country</em>
                          </MenuItem>
                          {countries.map((country) => (
                            <MenuItem key={country.iso2_code} value={country.iso2_code}>
                              {country.name} ({country.iso2_code})
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="dignitaryState"
                      control={dignitaryForm.control}
                      render={({ field }) => (
                        <LocationAutocomplete
                          label="State"
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value.split(',')[0]);
                          }}
                          error={!!dignitaryForm.formState.errors.dignitaryState}
                          helperText={dignitaryForm.formState.errors.dignitaryState?.message}
                          types={['administrative_area_level_1']}
                          autoComplete="off"
                          componentRestrictions={selectedCountryCode ? { country: selectedCountryCode } : undefined}
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
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        justifyContent: 'flex-end',
                        gap: 2,
                        mt: 2 
                      }}
                    >
                      {/* Cancel button */}
                      <SecondaryButton
                        size="small"
                        startIcon={<CancelIcon />}
                        onClick={() => {
                          if (isEditMode) {
                            setIsEditMode(false);
                            setEditingDignitaryIndex(null);
                          }
                          resetDignitaryForm();
                          setIsDignitaryFormExpanded(false);
                        }}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        Cancel
                      </SecondaryButton>
                      {/* Save/Add button */}
                      <PrimaryButton
                        size="small"
                        startIcon={isEditMode ? <SaveIcon /> : <AddIcon />}
                        onClick={addDignitaryToList}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        {getButtonText()}
                      </PrimaryButton>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box mt={2}>
            {showValidationSummary && Object.keys(validationErrors).length > 0 && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                onClose={() => setShowValidationSummary(false)}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Please fix the following errors:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {Object.entries(validationErrors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Purpose/Title field */}
              <Grid item xs={12}>
                <Controller
                  name="purpose_of_meeting"
                  control={appointmentForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isCalendarEventMode ? "Event Title" : "Purpose of Meeting"}
                      multiline
                      rows={3}
                      required
                    />
                  )}
                />
              </Grid>

              {/* Secretariat Actions Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                  {isCalendarEventMode ? "Event Details" : "Secretariat Actions"}
                </Typography>
                
                {/* Using the reusable component for secretariat fields */}
                <AdminAppointmentEditCard
                  ref={appointmentEditCardRef}
                  control={appointmentForm.control}
                  validationErrors={validationErrors}
                  locations={locations}
                  statusMap={statusMap}
                  subStatusMap={subStatusMap}
                  allSubStatusOptions={allSubStatusOptions}
                  statusSubStatusMapping={statusSubStatusMapping}
                  getValues={appointmentForm.getValues}
                  setValue={appointmentForm.setValue}
                  defaultAppointmentDetails={true}
                  showNotesFields={!isCalendarEventMode}
                  showBusinessCards={false} 
                  showAttachments={!isCalendarEventMode}
                  uploadStrategy="deferred"
                  selectedFiles={selectedFiles}
                  onRemoveFile={handleRemoveFile}
                  onFileSelect={handleFileSelect}
                  uploading={isUploading}
                  onValidationResult={(errors) => {
                    setValidationErrors(prevErrors => ({
                      ...prevErrors,
                      ...errors
                    }));
                  }}
                  validateOnChange={enableValidateOnChange}
                  showStatusFields={!isCalendarEventMode}
                />
              </Grid>
            </Grid>
          </Box>
        );
        
      default:
        return null;
    }
  };

  // Render confirmation dialog
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
          navigate(isCalendarEventMode ? '/admin/calendar' : '/admin/appointments/review');
        }}
      >
        <DialogTitle>{isCalendarEventMode ? 'Calendar Event Created Successfully' : 'Appointment Created Successfully'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              {isCalendarEventMode ? 'Event' : 'Appointment'} ID: {submittedAppointment.id}
            </Typography>
            {isPlaceholderMode && (
              <Chip 
                label="Placeholder Appointment" 
                color="primary" 
                variant="outlined" 
                sx={{ mt: 1 }} 
              />
            )}
            {isCalendarEventMode && (
              <Chip 
                label={`Event Type: ${selectedEventType}`} 
                color="secondary" 
                variant="outlined" 
                sx={{ mt: 1 }} 
              />
            )}
          </Box>

          <Grid container spacing={2}>
            {!isPlaceholderMode && selectedDignitaries.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Dignitaries:</strong> {selectedDignitaries.map(d => 
                    `${formatHonorificTitle(d.honorific_title || '')} ${d.first_name} ${d.last_name}`
                  ).join(', ')}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Status:</strong> {submittedAppointment.status}
                {submittedAppointment.sub_status && ` (${submittedAppointment.sub_status})`}
              </Typography>
            </Grid>
            {submittedAppointment.appointment_date && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Appointment Date:</strong> {submittedAppointment.appointment_date} 
                  {submittedAppointment.appointment_time && ` at ${submittedAppointment.appointment_time}`}
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
                  <strong>Notes from Requester:</strong> {submittedAppointment.requester_notes_to_secretariat}
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
          <PrimaryButton 
            onClick={() => {
              setShowConfirmation(false);
              navigate('/admin/appointments/review');
            }} 
            color="primary"
          >
            Close
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
        {steps.map((label, index) => {
          // Skip rendering step 2 (dignitaries) if we're in placeholder mode
          // but keep the correct activeStep number for the logic
          const isSkipped = isPlaceholderMode && index === 1;
          
          return !isSkipped ? (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ) : null;
        })}
      </Stepper>

      <Paper sx={{ p: 3 }}>
        {renderStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep !== 0 && (
            <SecondaryButton 
              onClick={handleBack} 
              sx={{ mr: 1 }}
              disabled={(activeStep === 1 && isDignitaryFormExpanded)}
            >
              Back
            </SecondaryButton>
          )}
          <PrimaryButton
            onClick={handleNext}
            disabled={
              // If the active step is the last step, disable the next button
              activeStep === steps.length || 
              // At step 2, if the dignitary form is expanded, disable the next button
              (activeStep === 1 && isDignitaryFormExpanded) ||
              // At step 2, if no dignitaries are selected, disable the next button
              (activeStep === 1 && selectedDignitaries.length === 0) ||
              // At step 2, if not enough dignitaries are added, disable the next button
              (activeStep === 1 && selectedDignitaries.length < requiredDignitariesCount)
            }
          >
            {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
          </PrimaryButton>
        </Box>
      </Paper>

      {renderConfirmationDialog()}
    </Box>
  );
};

export default AdminAppointmentCreateForm; 
