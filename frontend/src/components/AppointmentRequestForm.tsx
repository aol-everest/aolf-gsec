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
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from './LocationAutocomplete';
// import { 
//   PRIMARY_DOMAINS, 
//   HONORIFIC_TITLES, 
//   PrimaryDomain, 
//   HonorificTitle,
//   RELATIONSHIP_TYPES,
//   RelationshipType,
// } from '../constants/formConstants';
import { useNavigate } from 'react-router-dom';
import { getStatusChipSx } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';

// Add Location interface
interface Location {
  id: number;
  name: string;
  street_address: string;
  state: string;
  city: string;
  country: string;
  zip_code: string;
  driving_directions?: string;
  parking_info?: string;
}

// Add AppointmentTimeOfDay enum
enum AppointmentTimeOfDay {
  MORNING = "Morning",
  AFTERNOON = "Afternoon",
  EVENING = "Evening"
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

// Step 3: Appointment Information
interface AppointmentFormData {
  purpose: string;
  preferredDate: string;
  preferredTimeOfDay: AppointmentTimeOfDay;
  location_id: number;
  requesterNotesToSecretariat: string;
}

const steps = ['Point of Contact Information', 'Dignitary Information', 'Appointment Details'];

export const AppointmentRequestForm: React.FC = () => {
  const { userInfo, updateUserInfo } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [dignitaries, setDignitaries] = useState<any[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<any>(null);
  const [selectedDignitary, setSelectedDignitary] = useState<any>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const navigate = useNavigate();
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  // Add state for file attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch options from API
  const { data: primaryDomains = [], isLoading: isLoadingDomains } = useQuery<string[]>({
    queryKey: ['primary-domains'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/dignitaries/primary-domain-options');
      return data;
    },
  });

  const { data: honorificTitles = [], isLoading: isLoadingTitles } = useQuery<string[]>({
    queryKey: ['honorific-titles'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/dignitaries/honorific-title-options');
      return data;
    },
  });

  const { data: relationshipTypes = [], isLoading: isLoadingRelationships } = useQuery<string[]>({
    queryKey: ['relationship-types'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/dignitaries/relationship-type-options');
      return data;
    },
  });

  useEffect(() => {
    const fetchStatusOptions = async () => {
      const response = await fetch('http://localhost:8001/appointments/status-options', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStatusOptions(data);
      }
    };
    fetchStatusOptions();
  }, []);
  
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
      dignitaryHonorificTitle: honorificTitles[0],
      dignitaryFirstName: '',
      dignitaryLastName: '',
      dignitaryEmail: '',
      dignitaryPhone: '',
      dignitaryPrimaryDomain: primaryDomains[0],
      dignitaryTitleInOrganization: '',
      dignitaryOrganization: '',
      dignitaryBioSummary: '',
      dignitaryLinkedInOrWebsite: '',
      dignitaryCountry: '',
      dignitaryState: '',
      dignitaryCity: '',
      dignitaryHasMetGurudev: false,
      pocRelationshipType: relationshipTypes[0],
      dignitaryGurudevMeetingDate: '',
      dignitaryGurudevMeetingLocation: '',
      dignitaryGurudevMeetingNotes: '',
    }
  });

  const appointmentForm = useForm<AppointmentFormData>({
    defaultValues: {
      purpose: '',
      preferredDate: '',
      preferredTimeOfDay: AppointmentTimeOfDay.MORNING,
      location_id: 0,
      requesterNotesToSecretariat: '',
    }
  });

  // Fetch dignitaries assigned to the user
  useEffect(() => {
    const fetchDignitaries = async () => {
      try {
        const response = await fetch('http://localhost:8001/dignitaries/assigned', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setDignitaries(data);
          
          // If there are dignitaries, default to selecting the first one
          if (data.length > 0) {
            dignitaryForm.setValue('isExistingDignitary', true);
            dignitaryForm.setValue('selectedDignitaryId', data[0].id);
            setSelectedDignitary(data[0]);
            populateDignitaryForm(data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching dignitaries:', error);
      }
    };
    fetchDignitaries();
  }, []);

  // Function to populate dignitary form fields
  const populateDignitaryForm = (dignitary: any) => {
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
    dignitaryForm.setValue('dignitaryLinkedInOrWebsite', dignitary.linked_in_or_website);
    dignitaryForm.setValue('dignitaryCountry', dignitary.country);
    dignitaryForm.setValue('dignitaryState', dignitary.state);
    dignitaryForm.setValue('dignitaryCity', dignitary.city);
    dignitaryForm.setValue('dignitaryHasMetGurudev', dignitary.has_dignitary_met_gurudev);
    dignitaryForm.setValue('dignitaryGurudevMeetingDate', dignitary.gurudev_meeting_date || '');
    dignitaryForm.setValue('dignitaryGurudevMeetingLocation', dignitary.gurudev_meeting_location || '');
    dignitaryForm.setValue('dignitaryGurudevMeetingNotes', dignitary.gurudev_meeting_notes || '');
    
    // Set the POC relationship type from the dignitary data
    if (dignitary.relationship_type) {
      console.log('Setting POC relationship type from dignitary data:', dignitary.relationship_type);
      dignitaryForm.setValue('pocRelationshipType', dignitary.relationship_type);
    } else {
      // If relationship_type is missing (which shouldn't happen with our updated backend),
      // default to the first relationship type
      console.warn('Dignitary data missing relationship_type, using default');
      dignitaryForm.setValue('pocRelationshipType', relationshipTypes[0] || 'Direct');
    }
  };

  // Update form values when userInfo changes
  useEffect(() => {
    if (userInfo) {
      pocForm.setValue('pocFirstName', userInfo.first_name || '');
      pocForm.setValue('pocLastName', userInfo.last_name || '');
      pocForm.setValue('pocEmail', userInfo.email || '');
      pocForm.setValue('pocPhone', userInfo.phone_number || '');
    }
  }, [userInfo, pocForm]);

  // Modify the checkExistingAppointments function to return all appointments
  const checkExistingAppointments = async (dignitaryId: number) => {
    try {
      const response = await fetch(`http://localhost:8001/appointments/my/${dignitaryId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const appointments = await response.json();
        const today = new Date();
        const existingAppointments = appointments.filter(
          (apt: any) => apt.dignitary_id === dignitaryId && 
          new Date(apt.preferred_date) >= today
        );
        return existingAppointments.length > 0 ? existingAppointments : null;
      }
    } catch (error) {
      console.error('Error checking existing appointments:', error);
    }
    return null;
  };

  // Modify the handleDignitarySelection function to not show warning
  const handleDignitarySelection = async (dignitary: any) => {
    setSelectedDignitary(dignitary);
    populateDignitaryForm(dignitary);
    
    // Check for existing appointments
    const existingAppointments = await checkExistingAppointments(dignitary.id);
    if (existingAppointments && existingAppointments.length > 0) {
      setSelectedDignitary({
        ...dignitary,
        appointments: existingAppointments,
      });
    }
  };

  // Add useEffect to fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('http://localhost:8001/locations/all', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    fetchLocations();
  }, []);

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
          await updateUserInfo({ phone_number: data.pocPhone });
          setActiveStep(1);
        } catch (error) {
          console.error('Error updating user:', error);
        }
      })();
    } else if (activeStep === 1) {
      // Validate dignitary form
      const isValid = await dignitaryForm.trigger();
      if (!isValid) {
        // Show error notification
        enqueueSnackbar('Please fill in all required fields', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        return;
      }
      
      const dignitaryData = await dignitaryForm.handleSubmit(async (data) => {
        try {
          if (data.isExistingDignitary && data.selectedDignitaryId && !skipExistingCheck) {
            // Check for existing appointments before proceeding
            const existingAppointments = await checkExistingAppointments(data.selectedDignitaryId);
            if (existingAppointments) {
              setSelectedDignitary({
                ...selectedDignitary,
                appointments: existingAppointments,
              });
              setShowWarningDialog(true);
              return; // Stop here and wait for user confirmation
            }
          }
          
          if (data.isExistingDignitary && data.selectedDignitaryId) {
            // Update existing dignitary if any field has changed
            const selectedDignitary = dignitaries.find(d => d.id === data.selectedDignitaryId);
            const hasChanges = selectedDignitary && (
              selectedDignitary.honorific_title !== data.dignitaryHonorificTitle ||
              selectedDignitary.first_name !== data.dignitaryFirstName ||
              selectedDignitary.last_name !== data.dignitaryLastName ||
              selectedDignitary.email !== data.dignitaryEmail ||
              selectedDignitary.phone !== data.dignitaryPhone ||
              selectedDignitary.primary_domain !== data.dignitaryPrimaryDomain ||
              selectedDignitary.title_in_organization !== data.dignitaryTitleInOrganization ||
              selectedDignitary.organization !== data.dignitaryOrganization ||
              selectedDignitary.bio_summary !== data.dignitaryBioSummary ||
              selectedDignitary.linked_in_or_website !== data.dignitaryLinkedInOrWebsite ||
              selectedDignitary.country !== data.dignitaryCountry ||
              selectedDignitary.state !== data.dignitaryState ||
              selectedDignitary.city !== data.dignitaryCity ||
              selectedDignitary.has_dignitary_met_gurudev !== data.dignitaryHasMetGurudev ||
              selectedDignitary.gurudev_meeting_date !== data.dignitaryGurudevMeetingDate ||
              selectedDignitary.gurudev_meeting_location !== data.dignitaryGurudevMeetingLocation ||
              selectedDignitary.gurudev_meeting_notes !== data.dignitaryGurudevMeetingNotes ||
              selectedDignitary.relationship_type !== data.pocRelationshipType
            );

            if (hasChanges) {
              // Dignitary update data including poc_relationship_type
              const dignitaryUpdateData = {
                honorific_title: data.dignitaryHonorificTitle,
                first_name: data.dignitaryFirstName,
                last_name: data.dignitaryLastName,
                email: data.dignitaryEmail,
                phone: data.dignitaryPhone,
                primary_domain: data.dignitaryPrimaryDomain,
                title_in_organization: data.dignitaryTitleInOrganization,
                organization: data.dignitaryOrganization,
                bio_summary: data.dignitaryBioSummary,
                linked_in_or_website: data.dignitaryLinkedInOrWebsite,
                country: data.dignitaryCountry,
                state: data.dignitaryState,
                city: data.dignitaryCity,
                has_dignitary_met_gurudev: data.dignitaryHasMetGurudev,
                gurudev_meeting_date: data.dignitaryGurudevMeetingDate,
                gurudev_meeting_location: data.dignitaryGurudevMeetingLocation,
                gurudev_meeting_notes: data.dignitaryGurudevMeetingNotes,
                poc_relationship_type: data.pocRelationshipType,
              };

              console.log('Updating dignitary with data:', JSON.stringify(dignitaryUpdateData, null, 2));
              console.log('Specific field values:');
              console.log('- honorific_title:', data.dignitaryHonorificTitle, typeof data.dignitaryHonorificTitle);
              console.log('- primary_domain:', data.dignitaryPrimaryDomain, typeof data.dignitaryPrimaryDomain);
              console.log('- poc_relationship_type:', data.pocRelationshipType, typeof data.pocRelationshipType);

              // Convert empty strings to null for optional fields
              const cleanedDignitaryUpdateData = Object.fromEntries(
                Object.entries(dignitaryUpdateData).map(([key, value]) => {
                  // If the value is an empty string, convert it to null
                  if (value === '') {
                    return [key, null];
                  }
                  return [key, value];
                })
              );

              console.log('Cleaned dignitary update data:', JSON.stringify(cleanedDignitaryUpdateData, null, 2));

              const response = await fetch(`http://localhost:8001/dignitaries/update/${data.selectedDignitaryId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify(cleanedDignitaryUpdateData),
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to update dignitary. Status:', response.status);
                console.error('Error details:', JSON.stringify(errorData, null, 2));
                
                // Display error notification with more details
                enqueueSnackbar(`Failed to update dignitary: ${response.status} - ${errorData.detail || 'Unknown error'}`, { 
                  variant: 'error',
                  autoHideDuration: 6000
                });
                
                throw new Error(`Failed to update dignitary: ${JSON.stringify(errorData)}`);
              }
              const updatedDignitary = await response.json();
              console.log('Successfully updated dignitary:', updatedDignitary);
              setSelectedDignitary(updatedDignitary);
            }
          } else {
            // Create new dignitary
            const dignitaryCreateData = {
              honorific_title: data.dignitaryHonorificTitle,
              first_name: data.dignitaryFirstName,
              last_name: data.dignitaryLastName,
              email: data.dignitaryEmail,
              phone: data.dignitaryPhone || null,
              primary_domain: data.dignitaryPrimaryDomain,
              title_in_organization: data.dignitaryTitleInOrganization,
              organization: data.dignitaryOrganization,
              bio_summary: data.dignitaryBioSummary,
              linked_in_or_website: data.dignitaryLinkedInOrWebsite,
              country: data.dignitaryCountry,
              state: data.dignitaryState,
              city: data.dignitaryCity,
              poc_relationship_type: data.pocRelationshipType,
              has_dignitary_met_gurudev: data.dignitaryHasMetGurudev,
              gurudev_meeting_date: data.dignitaryGurudevMeetingDate,
              gurudev_meeting_location: data.dignitaryGurudevMeetingLocation,
              gurudev_meeting_notes: data.dignitaryGurudevMeetingNotes,
            };

            console.log('Creating dignitary with data:', dignitaryCreateData);

            // Convert empty strings to null for optional fields
            const cleanedDignitaryCreateData = Object.fromEntries(
              Object.entries(dignitaryCreateData).map(([key, value]) => {
                // If the value is an empty string, convert it to null
                if (value === '') {
                  return [key, null];
                }
                return [key, value];
              })
            );

            console.log('Cleaned dignitary create data:', JSON.stringify(cleanedDignitaryCreateData, null, 2));

            const response = await fetch('http://localhost:8001/dignitaries/new/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              },
              body: JSON.stringify(cleanedDignitaryCreateData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Failed to create dignitary. Status:', response.status);
              console.error('Error details:', JSON.stringify(errorData, null, 2));
              
              // Display error notification with more details
              enqueueSnackbar(`Failed to create dignitary: ${response.status} - ${errorData.detail || 'Unknown error'}`, { 
                variant: 'error',
                autoHideDuration: 6000
              });
              
              throw new Error(`Failed to create dignitary: ${JSON.stringify(errorData)}`);
            }
            const newDignitary = await response.json();
            
            // Update the dignitaries list with the new dignitary
            setDignitaries(prev => [...prev, newDignitary]);
            
            // Switch to existing dignitary mode and select the new dignitary
            dignitaryForm.setValue('isExistingDignitary', true);
            dignitaryForm.setValue('selectedDignitaryId', newDignitary.id);
            setSelectedDignitary(newDignitary);
          }
          
          setActiveStep(2);
        } catch (error) {
          console.error('Error in dignitary form submission:', error);
        }
      })();
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
          const response = await fetch('http://localhost:8001/appointments/new', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify({
              dignitary_id: dignitaryForm.getValues().selectedDignitaryId,
              purpose: data.purpose,
              preferred_date: data.preferredDate,
              preferred_time_of_day: data.preferredTimeOfDay,
              location_id: data.location_id,
              requester_notes_to_secretariat: data.requesterNotesToSecretariat,
              status: statusOptions[0],
            }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to create appointment:', errorData);
            throw new Error('Failed to create appointment');
          }
          const appointmentResponse = await response.json();
          
          // Upload attachments if any
          if (selectedFiles.length > 0) {
            setIsUploading(true);
            await uploadAttachments(appointmentResponse.id);
          }
          
          setSubmittedAppointment(appointmentResponse);
          setShowConfirmation(true);
          setIsUploading(false);
        } catch (error) {
          console.error('Error creating appointment:', error);
          setIsUploading(false);
          enqueueSnackbar('Failed to create appointment. Please try again.', { variant: 'error' });
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
          <Box component="form" onSubmit={dignitaryForm.handleSubmit(() => handleNext(false))}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Dignitary Information
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
                          dignitaryHonorificTitle: honorificTitles[0],
                          dignitaryFirstName: '',
                          dignitaryLastName: '',
                          dignitaryEmail: '',
                          dignitaryPhone: '',
                          dignitaryPrimaryDomain: primaryDomains[0],
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
                <FormControl fullWidth required error={!!dignitaryForm.formState.errors.pocRelationshipType}>
                  <InputLabel>Relationship Type</InputLabel>
                  <Select
                    label="Relationship Type"
                    value={dignitaryForm.watch('pocRelationshipType')}
                    {...dignitaryForm.register('pocRelationshipType', { 
                      required: 'Relationship type is required' 
                    })}
                  >
                    {relationshipTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                  {dignitaryForm.formState.errors.pocRelationshipType && (
                    <FormHelperText>
                      {dignitaryForm.formState.errors.pocRelationshipType.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} sx={{ my: 2 }}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!!dignitaryForm.formState.errors.dignitaryHonorificTitle}>
                  <InputLabel>Honorific Title</InputLabel>
                  <Select
                    label="Honorific Title"
                    value={dignitaryForm.watch('dignitaryHonorificTitle')}
                    {...dignitaryForm.register('dignitaryHonorificTitle', { 
                      required: 'Honorific title is required' 
                    })}
                  >
                    {honorificTitles.map((title) => (
                      <MenuItem key={title} value={title}>
                        {title}
                      </MenuItem>
                    ))}
                  </Select>
                  {dignitaryForm.formState.errors.dignitaryHonorificTitle && (
                    <FormHelperText>
                      {dignitaryForm.formState.errors.dignitaryHonorificTitle.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required error={!!dignitaryForm.formState.errors.dignitaryPrimaryDomain}>
                  <InputLabel>Primary Domain</InputLabel>
                  <Select
                    label="Primary Domain *"
                    value={dignitaryForm.watch('dignitaryPrimaryDomain')}
                    {...dignitaryForm.register('dignitaryPrimaryDomain', { 
                      required: 'Primary domain is required' 
                    })}
                  >
                    {primaryDomains.map((domain) => (
                      <MenuItem key={domain} value={domain}>
                        {domain}
                      </MenuItem>
                    ))}
                  </Select>
                  {dignitaryForm.formState.errors.dignitaryPrimaryDomain && (
                    <FormHelperText>
                      {dignitaryForm.formState.errors.dignitaryPrimaryDomain.message}
                    </FormHelperText>
                  )}
                </FormControl>
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
                <FormControl fullWidth required>
                  <InputLabel>Primary Domain</InputLabel>
                  <Select
                    label="Primary Domain"
                    value={dignitaryForm.watch('dignitaryPrimaryDomain')}
                    {...dignitaryForm.register('dignitaryPrimaryDomain')}
                  >
                    {primaryDomains.map((domain) => (
                      <MenuItem key={domain} value={domain}>
                        {domain}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                    {Object.values(AppointmentTimeOfDay).map((timeOfDay) => (
                      <MenuItem key={timeOfDay} value={timeOfDay}>
                        {timeOfDay}
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

    const dignitary = dignitaries.find(d => d.id === submittedAppointment.dignitary_id);
    const location = locations.find(l => l.id === submittedAppointment.location_id);
    const dignitaryName = dignitary ? 
      `${dignitary.honorific_title} ${dignitary.first_name} ${dignitary.last_name}` : 
      'Selected Dignitary';

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
                <strong>Dignitary:</strong> {dignitaryName}
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