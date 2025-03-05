import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { formatDate, getLocalDate } from '../utils/dateUtils';
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
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from './LocationAutocomplete';
import { useNavigate } from 'react-router-dom';
import { getStatusChipSx } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { Location, Dignitary, Appointment } from '../models/types';
import { EnumSelect } from './EnumSelect';
import { useEnums } from '../hooks/useEnums';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

// Remove the hardcoded enum and add a state for time of day options
// const AppointmentTimeOfDay = {
//   MORNING: "Morning",
//   AFTERNOON: "Afternoon",
//   EVENING: "Evening"
// }

// Add AppointmentResponse interface for the API response
interface AppointmentResponse extends Omit<Appointment, 'dignitary' | 'requester' | 'location' | 'approved_by_user' | 'last_updated_by_user' | 'attachments'> {
  // Only include the fields that are returned by the API when creating a new appointment
}

// Step 1: POC Information
interface PocFormData {
  pocFirstName: string;
  pocLastName: string;
  pocEmail: string;
  pocPhone: string;
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
  dignitaryTitleInOrganization: string;
  dignitaryOrganization: string;
  dignitaryBioSummary: string;
  dignitaryLinkedInOrWebsite: string;
  dignitaryCountry: string;
  dignitaryState: string;
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

// Step 3: Appointment Information
interface AppointmentFormData {
  purpose: string;
  preferredDate: string;
  preferredTimeOfDay: string;
  location_id: number;
  requesterNotesToSecretariat: string;
}

const steps = ['Point of Contact Information', 'Dignitary Information', 'Appointment Details'];

export const AppointmentRequestForm: React.FC = () => {
  const { userInfo, updateUserInfo } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [dignitaries, setDignitaries] = useState<Dignitary[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<AppointmentResponse | null>(null);
  // Use any type to avoid TypeScript errors with the selectedDignitary state
  const [selectedDignitary, setSelectedDignitary] = useState<any>(null);
  // New state for multiple dignitaries
  const [selectedDignitaries, setSelectedDignitaries] = useState<SelectedDignitary[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDignitaryIndex, setEditingDignitaryIndex] = useState<number | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  // Add state for file attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Add a state to track if the selected dignitary has been modified
  const [isDignitaryModified, setIsDignitaryModified] = useState<boolean>(false);

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
  
  // Forms for each step
  const pocForm = useForm<PocFormData>({
    defaultValues: {
      pocFirstName: userInfo?.first_name || '',
      pocLastName: userInfo?.last_name || '',
      pocEmail: userInfo?.email || '',
      pocPhone: userInfo?.phone_number || '',
    }
  });

  const dignitaryForm = useForm<DignitaryFormData>({
    defaultValues: {
      isExistingDignitary: false,
      selectedDignitaryId: undefined,
      dignitaryHonorificTitle: '',
      dignitaryFirstName: '',
      dignitaryLastName: '',
      dignitaryEmail: '',
      dignitaryPhone: '',
      dignitaryPrimaryDomain: '',
      dignitaryTitleInOrganization: '',
      dignitaryOrganization: '',
      dignitaryBioSummary: '',
      dignitaryLinkedInOrWebsite: '',
      dignitaryCountry: '',
      dignitaryState: '',
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
      preferredDate: '',
      preferredTimeOfDay: '',
      location_id: 0,
      requesterNotesToSecretariat: '',
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

  // Function to populate dignitary form fields
  const populateDignitaryForm = (dignitary: Dignitary) => {
    console.log('Populating dignitary form with:', dignitary);
    dignitaryForm.setValue('dignitaryHonorificTitle', dignitary.honorific_title);
    dignitaryForm.setValue('dignitaryFirstName', dignitary.first_name);
    dignitaryForm.setValue('dignitaryLastName', dignitary.last_name);
    dignitaryForm.setValue('dignitaryEmail', dignitary.email);
    dignitaryForm.setValue('dignitaryPhone', dignitary.phone || '');
    dignitaryForm.setValue('dignitaryPrimaryDomain', dignitary.primary_domain);
    dignitaryForm.setValue('dignitaryTitleInOrganization', dignitary.title_in_organization);
    dignitaryForm.setValue('dignitaryOrganization', dignitary.organization);
    dignitaryForm.setValue('dignitaryBioSummary', dignitary.bio_summary);
    dignitaryForm.setValue('dignitaryLinkedInOrWebsite', dignitary.linked_in_or_website || '');
    dignitaryForm.setValue('dignitaryCountry', dignitary.country || '');
    dignitaryForm.setValue('dignitaryState', dignitary.state || '');
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
      pocForm.setValue('pocPhone', userInfo.phone_number || '');
    }
  }, [userInfo, pocForm]);

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
      const { data: response } = await api.post<Dignitary>('/dignitaries/new/', data);
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
      
      setShowConfirmation(true);
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
    
    try {
      let dignitaryToAdd: SelectedDignitary;
      
      if (formData.isExistingDignitary && formData.selectedDignitaryId) {
        // Check if dignitary is already in the list (for edit mode)
        if (!isEditMode && selectedDignitaries.some(d => d.id === formData.selectedDignitaryId)) {
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
            title_in_organization: formData.dignitaryTitleInOrganization,
            organization: formData.dignitaryOrganization,
            bio_summary: formData.dignitaryBioSummary,
            linked_in_or_website: formData.dignitaryLinkedInOrWebsite,
            country: formData.dignitaryCountry,
            state: formData.dignitaryState,
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
          title_in_organization: formData.dignitaryTitleInOrganization,
          organization: formData.dignitaryOrganization,
          bio_summary: formData.dignitaryBioSummary,
          linked_in_or_website: formData.dignitaryLinkedInOrWebsite,
          country: formData.dignitaryCountry,
          state: formData.dignitaryState,
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

      if (isEditMode && editingDignitaryIndex !== null) {
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
      
      enqueueSnackbar(
        isEditMode 
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
    const dignitaryToEdit = selectedDignitaries[index];
    setIsEditMode(true);
    setEditingDignitaryIndex(index);
    
    // Set form values based on the dignitary
    dignitaryForm.setValue('isExistingDignitary', !dignitaryToEdit.isNew);
    if (!dignitaryToEdit.isNew) {
      dignitaryForm.setValue('selectedDignitaryId', dignitaryToEdit.id);
    }
    
    // Populate the form with dignitary data
    populateDignitaryForm(dignitaryToEdit as Dignitary);
  };

  // Reset the dignitary form
  const resetDignitaryForm = () => {
    dignitaryForm.reset({
      isExistingDignitary: false,
      selectedDignitaryId: undefined,
      dignitaryHonorificTitle: '',
      dignitaryFirstName: '',
      dignitaryLastName: '',
      dignitaryEmail: '',
      dignitaryPhone: '',
      dignitaryPrimaryDomain: '',
      dignitaryTitleInOrganization: '',
      dignitaryOrganization: '',
      dignitaryBioSummary: '',
      dignitaryLinkedInOrWebsite: '',
      dignitaryCountry: '',
      dignitaryState: '',
      dignitaryCity: '',
      dignitaryHasMetGurudev: false,
      pocRelationshipType: '',
      dignitaryGurudevMeetingDate: '',
      dignitaryGurudevMeetingLocation: '',
      dignitaryGurudevMeetingNotes: '',
    });
  };

  const handleNext = async (skipExistingCheck: boolean = false) => {
    if (activeStep === 0) {
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
          await updateUserMutation.mutateAsync({ phone_number: data.pocPhone });
          setActiveStep(1);
        } catch (error) {
          console.error('Error updating user:', error);
        }
      })();
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
      
      // Since dignitaries are already created/updated when added to the list,
      // we just need to collect their IDs
      const dignitaryIds = selectedDignitaries.map(d => d.id);
      
      // Store the list of dignitary IDs for appointment creation
      sessionStorage.setItem('appointmentDignitaryIds', JSON.stringify(dignitaryIds));
      
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
      
      const appointmentData = await appointmentForm.handleSubmit(async (data) => {
        try {
          // Get dignitary IDs from storage
          const dignitary_ids = JSON.parse(sessionStorage.getItem('appointmentDignitaryIds') || '[]');
          
          if (dignitary_ids.length === 0) {
            enqueueSnackbar('No dignitaries selected for appointment', { variant: 'error' });
            return;
          }
          
          const appointmentCreateData = {
            dignitary_ids: dignitary_ids,
            purpose: data.purpose,
            preferred_date: data.preferredDate,
            preferred_time_of_day: data.preferredTimeOfDay,
            location_id: data.location_id,
            requester_notes_to_secretariat: data.requesterNotesToSecretariat,
            status: statusOptions[0],
          };
          
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

  const renderStepContent = (step: number) => {
    // Show loading indicator if data is still loading
    // if (step === 1 && (isLoadingDomains || isLoadingTitles || isLoadingRelationships || isLoadingDignitaries)) {
    //   return (
    //     <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
    //       <CircularProgress />
    //     </Box>
    //   );
    // }

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
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  InputLabelProps={{ shrink: true }}
                  {...pocForm.register('pocPhone', { required: 'Phone number is required' })}
                  error={!!pocForm.formState.errors.pocPhone}
                  helperText={pocForm.formState.errors.pocPhone?.message}
                  required
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
                  Dignitary Information
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Add one or more dignitaries to this appointment request.
                </Typography>
              </Grid>

              {/* List of selected dignitaries */}
              {selectedDignitaries.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Selected Dignitaries ({selectedDignitaries.length})
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
                          primary={`${dignitary.honorific_title} ${dignitary.first_name} ${dignitary.last_name}`}
                          secondary={
                            <>
                              <Typography component="span" variant="body2">
                                {dignitary.title_in_organization}, {dignitary.organization}
                              </Typography>
                              <br />
                              <Typography component="span" variant="body2" color="text.secondary">
                                Relationship: {dignitary.relationship_type || dignitary.poc_relationship_type}
                              </Typography>
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
                            onClick={() => editDignitaryInList(index)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={() => removeDignitaryFromList(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  {isEditMode ? 'Edit Dignitary' : 'Add a Dignitary'}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={dignitaryForm.watch('isExistingDignitary').toString()}
                    onChange={(e) => {
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
                          dignitaryHonorificTitle: '',
                          dignitaryFirstName: '',
                          dignitaryLastName: '',
                          dignitaryEmail: '',
                          dignitaryPhone: '',
                          dignitaryPrimaryDomain: '',
                          dignitaryTitleInOrganization: '',
                          dignitaryOrganization: '',
                          dignitaryBioSummary: '',
                          dignitaryLinkedInOrWebsite: '',
                          dignitaryCountry: '',
                          dignitaryState: '',
                          dignitaryCity: '',
                          dignitaryHasMetGurudev: false,
                        });
                      } else if (selectedDignitary) {
                        // Restore selected dignitary data and ID if switching back
                        populateDignitaryForm(selectedDignitary);
                        dignitaryForm.setValue('selectedDignitaryId', selectedDignitary.previousId || selectedDignitary.id);
                      }
                    }}
                  >
                    <FormControlLabel 
                      value="true" 
                      control={<Radio />} 
                      label="Select an existing dignitary"
                      disabled={dignitaries.length === 0}
                    />
                    <FormControlLabel 
                      value="false" 
                      control={<Radio />} 
                      label="Add a new dignitary" 
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
                        >
                          {dignitaries.map((dignitary) => (
                            <MenuItem key={dignitary.id} value={dignitary.id}>
                              {`${dignitary.honorific_title} ${dignitary.first_name} ${dignitary.last_name}`}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
              ) : null}

              <Grid item xs={12} md={6}>
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

              <Grid item xs={12} md={6} lg={4}>
                <TextField
                  fullWidth
                  label="Title in Organization"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryTitleInOrganization', { required: 'Title is required' })}
                  error={!!dignitaryForm.formState.errors.dignitaryTitleInOrganization}
                  helperText={dignitaryForm.formState.errors.dignitaryTitleInOrganization?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={6} lg={4}>
                <TextField
                  fullWidth
                  label="Organization"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryOrganization', { required: 'Organization is required' })}
                  error={!!dignitaryForm.formState.errors.dignitaryOrganization}
                  helperText={dignitaryForm.formState.errors.dignitaryOrganization?.message}
                />
              </Grid>

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
                  {...dignitaryForm.register('dignitaryLinkedInOrWebsite', { required: 'URL is required' })}
                  error={!!dignitaryForm.formState.errors.dignitaryLinkedInOrWebsite}
                  helperText={dignitaryForm.formState.errors.dignitaryLinkedInOrWebsite?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Controller
                  name="dignitaryCountry"
                  control={dignitaryForm.control}
                  rules={{ required: 'Country is required' }}
                  render={({ field }) => (
                    <LocationAutocomplete
                      label="Country"
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Reset state and city when country changes
                        dignitaryForm.setValue('dignitaryState', '');
                        dignitaryForm.setValue('dignitaryCity', '');
                      }}
                      error={!!dignitaryForm.formState.errors.dignitaryCountry}
                      helperText={dignitaryForm.formState.errors.dignitaryCountry?.message}
                      types={['country']}
                      onPlaceSelect={(place) => {
                        if (!place?.address_components) return;
                        
                        const countryComponent = place.address_components.find(
                          component => component.types.includes('country')
                        );

                        if (countryComponent) {
                          setSelectedCountryCode(countryComponent.short_name);
                        }
                      }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Controller
                  name="dignitaryState"
                  control={dignitaryForm.control}
                  rules={{ required: 'State is required' }}
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
                      componentRestrictions={selectedCountryCode ? { country: selectedCountryCode } : undefined}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Controller
                  name="dignitaryCity"
                  control={dignitaryForm.control}
                  rules={{ required: 'City is required' }}
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
                      componentRestrictions={selectedCountryCode ? { country: selectedCountryCode } : undefined}
                    />
                  )}
                />
              </Grid>                  

              <Grid item xs={12} md={6} lg={4}>
                <FormControlLabel
                  control={<Checkbox checked={dignitaryForm.watch('dignitaryHasMetGurudev')} onChange={(e) => dignitaryForm.setValue('dignitaryHasMetGurudev', e.target.checked)} />}
                  label="Has Dignitary Met Gurudev?"
                />
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
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={isEditMode ? <EditIcon /> : <AddIcon />}
                    onClick={addDignitaryToList}
                  >
                    {getButtonText()}
                  </Button>
                </Box>
              </Grid>
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

              <Grid item xs={12} md={6} lg={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Preferred Date"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ 
                    min: getLocalDate(0),
                    max: getLocalDate(60),
                  }}
                  {...appointmentForm.register('preferredDate', { required: 'Preferred date is required' })}
                  error={!!appointmentForm.formState.errors.preferredDate}
                  helperText={appointmentForm.formState.errors.preferredDate?.message}
                  required
                />
              </Grid>

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
                    rules={{ required: 'Location is required' }}
                    render={({ field }) => (
                      <Select
                        label="Location *"
                        {...field}
                      >
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
                  <Button
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<Box component="span" sx={{ fontSize: '1.25rem' }}>📎</Box>}
                  >
                    Select Files
                  </Button>
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
                <strong>Dignitaries:</strong> {selectedDignitaries.map(d => 
                  `${d.honorific_title} ${d.first_name} ${d.last_name}`
                ).join(', ')}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Preferred Date:</strong> {submittedAppointment.preferred_date}
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
              <Typography variant="body1">
                <strong>Purpose:</strong> {submittedAppointment.purpose}
              </Typography>
            </Grid>
            {submittedAppointment.requester_notes_to_secretariat && (
              <Grid item xs={12}>
                <Typography variant="body1">
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
            {`${selectedDignitary.honorific_title} ${selectedDignitary.first_name} ${selectedDignitary.last_name}`}:
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
                        formatDate(appointment.appointment_date, false) + ' ' + appointment.appointment_time + ' (confirmed)' || 
                        formatDate(appointment.preferred_date, false) + ' ' + appointment.preferred_time_of_day + ' (requested)'
                      }
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography>
                      Location: {appointment.location?.name || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Chip 
                      label={appointment.status}
                      size="small"
                      sx={getStatusChipSx(appointment.status, theme)}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>

          <Typography sx={{ mt: 2 }}>
            Would you like to create another appointment request?
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

  // Update the button text based on the current state
  const getButtonText = () => {
    if (isEditMode) {
      return "Update Dignitary";
    } else if (dignitaryForm.watch('isExistingDignitary') && isDignitaryModified) {
      return "Update and Add Dignitary";
    } else {
      return "Add Dignitary";
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3 }}>
        {renderStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep !== 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => handleNext(false)}
            disabled={activeStep === steps.length}
          >
            {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </Box>
      </Paper>

      {renderConfirmationDialog()}
      {renderWarningDialog()}
    </Box>
  );
};

export default AppointmentRequestForm; 
