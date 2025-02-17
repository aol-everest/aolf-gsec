import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { getLocalDate } from '../utils/dateUtils';
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
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from './LocationAutocomplete';
import { 
  PRIMARY_DOMAINS, 
  HONORIFIC_TITLES, 
  PrimaryDomain, 
  HonorificTitle,
  RELATIONSHIP_TYPES,
  RelationshipType,
} from '../constants/formConstants';
import { useNavigate } from 'react-router-dom';

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
  dignitaryHonorificTitle: HonorificTitle;
  dignitaryFirstName: string;
  dignitaryLastName: string;
  dignitaryEmail: string;
  dignitaryPhone: string;
  dignitaryPrimaryDomain: PrimaryDomain;
  dignitaryTitleInOrganization: string;
  dignitaryOrganization: string;
  dignitaryBioSummary: string;
  dignitaryLinkedInOrWebsite: string;
  dignitaryCountry: string;
  dignitaryState: string;
  dignitaryCity: string;
  pocRelationshipType: RelationshipType;
}

// Step 3: Appointment Information
interface AppointmentFormData {
  purpose: string;
  preferredDate: string;
  preferredTime: string;
  duration: string;
  location: string;
  preMeetingNotes: string;
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
  const navigate = useNavigate();
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

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
      dignitaryHonorificTitle: HONORIFIC_TITLES[0],
      dignitaryFirstName: '',
      dignitaryLastName: '',
      dignitaryEmail: '',
      dignitaryPhone: '',
      dignitaryPrimaryDomain: PRIMARY_DOMAINS[0],
      dignitaryTitleInOrganization: '',
      dignitaryOrganization: '',
      dignitaryBioSummary: '',
      dignitaryLinkedInOrWebsite: '',
      dignitaryCountry: '',
      dignitaryState: '',
      dignitaryCity: '',
      pocRelationshipType: RELATIONSHIP_TYPES[0],
    }
  });

  const appointmentForm = useForm<AppointmentFormData>({
    defaultValues: {
      purpose: '',
      preferredDate: '',
      preferredTime: '',
      duration: '',
      location: '',
      preMeetingNotes: '',
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

  const handleNext = async () => {
    if (activeStep === 0) {
      const pocData = await pocForm.handleSubmit(async (data) => {
        try {
          // Use updateUserInfo from AuthContext instead of direct API call
          await updateUserInfo({ phone_number: data.pocPhone });
          setActiveStep(1);
        } catch (error) {
          console.error('Error updating user:', error);
        }
      })();
    } else if (activeStep === 1) {
      const dignitaryData = await dignitaryForm.handleSubmit(async (data) => {
        try {
          let dignitaryId = data.selectedDignitaryId;
          
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
              selectedDignitary.city !== data.dignitaryCity
            );

            if (hasChanges) {
              // Dignitary update data without poc_relationship_type
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
              };

              const response = await fetch(`http://localhost:8001/dignitaries/update/${data.selectedDignitaryId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify(dignitaryUpdateData),
              });
              if (!response.ok) throw new Error('Failed to update dignitary');
              const updatedDignitary = await response.json();
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
            };

            console.log('Creating dignitary with data:', dignitaryCreateData);

            const response = await fetch('http://localhost:8001/dignitaries/new/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              },
              body: JSON.stringify(dignitaryCreateData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Failed to create dignitary:', errorData);
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
          console.error('Error handling dignitary:', error);
        }
      })();
    } else if (activeStep === 2) {
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
              preferred_time: data.preferredTime,
              duration: data.duration,
              location: data.location,
              pre_meeting_notes: data.preMeetingNotes,
              status: statusOptions[0],
            }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to create appointment:', errorData);
            throw new Error('Failed to create appointment');
          }
          const appointmentResponse = await response.json();
          setSubmittedAppointment(appointmentResponse);
          setShowConfirmation(true);
        } catch (error) {
          console.error('Error creating appointment:', error);
        }
      })();
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box component="form" onSubmit={pocForm.handleSubmit(handleNext)}>
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
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box component="form" onSubmit={dignitaryForm.handleSubmit(handleNext)}>
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
                        // Clear form when switching to new dignitary
                        dignitaryForm.setValue('selectedDignitaryId', undefined);
                        dignitaryForm.reset({
                          ...dignitaryForm.getValues(),
                          selectedDignitaryId: undefined,
                          dignitaryHonorificTitle: HONORIFIC_TITLES[0],
                          dignitaryFirstName: '',
                          dignitaryLastName: '',
                          dignitaryEmail: '',
                          dignitaryPhone: '',
                          dignitaryPrimaryDomain: PRIMARY_DOMAINS[0],
                          dignitaryTitleInOrganization: '',
                          dignitaryOrganization: '',
                          dignitaryBioSummary: '',
                          dignitaryLinkedInOrWebsite: '',
                          dignitaryCountry: '',
                          dignitaryState: '',
                          dignitaryCity: '',
                        });
                      } else if (selectedDignitary) {
                        // Restore selected dignitary data if switching back
                        populateDignitaryForm(selectedDignitary);
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
                <Grid item xs={12}>
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
                              setSelectedDignitary(selectedDignitary);
                              populateDignitaryForm(selectedDignitary);
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
                <FormControl fullWidth>
                  <InputLabel>Relationship Type</InputLabel>
                  <Select
                    label="Relationship Type"
                    defaultValue={RELATIONSHIP_TYPES[0]}
                    {...dignitaryForm.register('pocRelationshipType')}
                  >
                    {RELATIONSHIP_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sx={{ my: 2 }}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Honorific Title</InputLabel>
                  <Select
                    label="Honorific Title"
                    defaultValue={HONORIFIC_TITLES[0]}
                    {...dignitaryForm.register('dignitaryHonorificTitle')}
                  >
                    {HONORIFIC_TITLES.map((title) => (
                      <MenuItem key={title} value={title}>
                        {title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryFirstName', { required: 'First name is required' })}
                  error={!!dignitaryForm.formState.errors.dignitaryFirstName}
                  helperText={dignitaryForm.formState.errors.dignitaryFirstName?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryLastName', { required: 'Last name is required' })}
                  error={!!dignitaryForm.formState.errors.dignitaryLastName}
                  helperText={dignitaryForm.formState.errors.dignitaryLastName?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryEmail', { required: 'Email is required' })}
                  error={!!dignitaryForm.formState.errors.dignitaryEmail}
                  helperText={dignitaryForm.formState.errors.dignitaryEmail?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryPhone')}
                  error={!!dignitaryForm.formState.errors.dignitaryPhone}
                  helperText={dignitaryForm.formState.errors.dignitaryPhone?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Primary Domain</InputLabel>
                  <Select
                    label="Primary Domain"
                    defaultValue={PRIMARY_DOMAINS[0]}
                    {...dignitaryForm.register('dignitaryPrimaryDomain')}
                  >
                    {PRIMARY_DOMAINS.map((domain) => (
                      <MenuItem key={domain} value={domain}>
                        {domain}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Title in Organization"
                  InputLabelProps={{ shrink: true }}
                  {...dignitaryForm.register('dignitaryTitleInOrganization', { required: 'Title is required' })}
                  error={!!dignitaryForm.formState.errors.dignitaryTitleInOrganization}
                  helperText={dignitaryForm.formState.errors.dignitaryTitleInOrganization?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
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
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box component="form" onSubmit={appointmentForm.handleSubmit(handleNext)}>
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
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Preferred Date"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ 
                    min: getLocalDate(0),
                    max: getLocalDate(30),
                  }}
                  {...appointmentForm.register('preferredDate', { required: 'Preferred date is required' })}
                  error={!!appointmentForm.formState.errors.preferredDate}
                  helperText={appointmentForm.formState.errors.preferredDate?.message}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Preferred Time"
                  InputLabelProps={{ shrink: true }}
                  {...appointmentForm.register('preferredTime')}
                  error={!!appointmentForm.formState.errors.preferredTime}
                  helperText={appointmentForm.formState.errors.preferredTime?.message}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Requested Duration"
                  placeholder="e.g., 10 minutes, 30 minutes, 1 hour"
                  {...appointmentForm.register('duration')}
                  error={!!appointmentForm.formState.errors.duration}
                  helperText={appointmentForm.formState.errors.duration?.message}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  placeholder="e.g., Boone, Los Angeles, etc."
                  {...appointmentForm.register('location')}
                  error={!!appointmentForm.formState.errors.location}
                  helperText={appointmentForm.formState.errors.location?.message}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Pre-Meeting Notes"
                  {...appointmentForm.register('preMeetingNotes')}
                  error={!!appointmentForm.formState.errors.preMeetingNotes}
                  helperText={appointmentForm.formState.errors.preMeetingNotes?.message}
                />
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  // Add confirmation dialog
  const renderConfirmationDialog = () => {
    if (!submittedAppointment) return null;

    const dignitary = dignitaries.find(d => d.id === submittedAppointment.dignitary_id);
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
            {submittedAppointment.preferred_time && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Preferred Time:</strong> {submittedAppointment.preferred_time}
                </Typography>
              </Grid>
            )}
            {submittedAppointment.duration && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Duration:</strong> {submittedAppointment.duration}
                </Typography>
              </Grid>
            )}
            {submittedAppointment.location && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Location:</strong> {submittedAppointment.location}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="body1">
                <strong>Purpose:</strong> {submittedAppointment.purpose}
              </Typography>
            </Grid>
            {submittedAppointment.pre_meeting_notes && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>Pre-meeting Notes:</strong> {submittedAppointment.pre_meeting_notes}
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
            onClick={handleNext}
            disabled={activeStep === steps.length}
          >
            {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </Box>
      </Paper>

      {renderConfirmationDialog()}
    </Box>
  );
};

export default AppointmentRequestForm; 