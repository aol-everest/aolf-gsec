import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Typography,
  Grid,
  Divider,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useApi } from '../hooks/useApi';
import { Dignitary } from '../models/types';
import { SelectedDignitary } from './selects/GenericDignitarySelector';
import { EnumSelect } from './EnumSelect';
import { CountrySelect } from './selects/CountrySelect';
import { PrimaryDomainSelect } from './selects/PrimaryDomainSelect';
import { SubdivisionStateDropdown } from './selects/SubdivisionStateDropdown';
import { HonorificTitleSelect } from './selects/HonorificTitleSelect';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';

// Shared Dignitary Form Component
interface DignitaryFormProps {
  mode: 'create' | 'edit';
  dignitary?: SelectedDignitary; // undefined for create, required for edit
  onSave: (dignitary: SelectedDignitary) => void;
  onCancel: () => void;
}

export const DignitaryForm: React.FC<DignitaryFormProps> = ({ mode, dignitary, onSave, onCancel }) => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  console.log('Dignitary for edit:', dignitary);
  
  // Initialize form with appropriate default values based on mode
  const dignitaryForm = useForm({
    defaultValues: mode === 'edit' && dignitary ? {
      honorificTitle: dignitary.honorific_title || '(Not Applicable)',
      firstName: dignitary.first_name || '',
      lastName: dignitary.last_name || '',
      email: dignitary.email || '',
      phone: dignitary.phone || '',
      primaryDomain: dignitary.primary_domain || '',
      primaryDomainOther: dignitary.primary_domain_other || '',
      titleInOrganization: dignitary.title_in_organization || '',
      organization: dignitary.organization || '',
      bioSummary: dignitary.bio_summary || '',
      linkedInOrWebsite: dignitary.linked_in_or_website || '',
      countryCode: dignitary.country_code || '',
      state: dignitary.state || '',
      city: dignitary.city || '',
      hasMetGurudev: dignitary.has_dignitary_met_gurudev || false,
      pocRelationshipType: dignitary.poc_relationship_type || dignitary.relationship_type || '',
      gurudevMeetingDate: dignitary.gurudev_meeting_date || '',
      gurudevMeetingLocation: dignitary.gurudev_meeting_location || '',
      gurudevMeetingNotes: dignitary.gurudev_meeting_notes || '',
    } : {
      honorificTitle: '(Not Applicable)',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      primaryDomain: '',
      primaryDomainOther: '',
      titleInOrganization: '',
      organization: '',
      bioSummary: '',
      linkedInOrWebsite: '',
      countryCode: '',
      state: '',
      city: '',
      hasMetGurudev: false,
      pocRelationshipType: '',
      gurudevMeetingDate: '',
      gurudevMeetingLocation: '',
      gurudevMeetingNotes: '',
    }
  });

  // Create mutation for new dignitaries
  const createDignitaryMutation = useMutation<Dignitary, Error, any>({
    mutationFn: async (data: any) => {
      console.log('Sending to API:', data);
      console.log('poc_relationship_type in request:', data.poc_relationship_type);
      const { data: response } = await api.post<Dignitary>('/dignitaries/new', data);
      return response;
    },
    onSuccess: (newDignitary) => {
      console.log('API response for new dignitary:', newDignitary);
      console.log('poc_relationship_type in API response:', newDignitary.poc_relationship_type);
      
      const selectedDignitary: SelectedDignitary = {
        ...newDignitary,
        isNew: true,
      };
      
      console.log('selectedDignitary being passed to onSave:', selectedDignitary);
      console.log('poc_relationship_type in selectedDignitary:', selectedDignitary.poc_relationship_type);
      
      onSave(selectedDignitary);
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

  // Update mutation for existing dignitaries
  const updateDignitaryMutation = useMutation<Dignitary, Error, any>({
    mutationFn: async (data: any) => {
      if (!dignitary?.id) throw new Error('Dignitary ID is required for update');
      const { data: response } = await api.patch<Dignitary>(`/dignitaries/update/${dignitary.id}`, data);
      return response;
    },
    onSuccess: (updatedDignitary) => {
      const selectedDignitary: SelectedDignitary = {
        ...updatedDignitary,
      };
      onSave(selectedDignitary);
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

  const handleSave = async () => {
    const isValid = await dignitaryForm.trigger();
    if (!isValid) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
      return;
    }

    const formData = dignitaryForm.getValues();
    const dignitaryData = {
      honorific_title: formData.honorificTitle,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      primary_domain: formData.primaryDomain,
      primary_domain_other: formData.primaryDomainOther || undefined,
      title_in_organization: formData.titleInOrganization || undefined,
      organization: formData.organization || undefined,
      bio_summary: formData.bioSummary || undefined,
      linked_in_or_website: formData.linkedInOrWebsite || undefined,
      country_code: formData.countryCode || undefined,
      state: formData.state || undefined,
      city: formData.city || undefined,
      has_dignitary_met_gurudev: formData.hasMetGurudev,
      poc_relationship_type: formData.pocRelationshipType,
      gurudev_meeting_date: formData.gurudevMeetingDate || undefined,
      gurudev_meeting_location: formData.gurudevMeetingLocation || undefined,
      gurudev_meeting_notes: formData.gurudevMeetingNotes || undefined,
    };

    // Use appropriate mutation based on mode
    if (mode === 'create') {
      createDignitaryMutation.mutate(dignitaryData);
    } else {
      updateDignitaryMutation.mutate(dignitaryData);
    }
  };

  return (
    <Grid item xs={12}>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" gutterBottom>
        {mode === 'create' ? 'Add a New Dignitary' : 'Edit Dignitary'}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {mode === 'create' ? 'Enter the dignitary\'s information and click "Save and Add" at the bottom of the page.' : 'Update dignitary information and click "Save Changes" at the bottom of the page.'}
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Relationship Type */}
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="pocRelationshipType"
            control={dignitaryForm.control}
            rules={{ required: 'Relationship type is required' }}
            render={({ field }) => (
              <EnumSelect
                enumType="relationshipType"
                label="Relationship to You"
                error={!!dignitaryForm.formState.errors.pocRelationshipType}
                helperText={dignitaryForm.formState.errors.pocRelationshipType?.message}
                value={field.value}
                onChange={field.onChange}
                required
              />
            )}
          />
        </Grid>

        {/* Honorific Title */}
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="honorificTitle"
            control={dignitaryForm.control}
            rules={{ required: 'Honorific title is required' }}
            render={({ field }) => (
              <HonorificTitleSelect
                label="Honorific Title"
                value={field.value}
                onChange={field.onChange}
                error={!!dignitaryForm.formState.errors.honorificTitle}
                helperText={dignitaryForm.formState.errors.honorificTitle?.message}
                required
              />
            )}
          />
        </Grid>

        {/* First Name */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="First Name"
            {...dignitaryForm.register('firstName', { required: 'First name is required' })}
            error={!!dignitaryForm.formState.errors.firstName}
            helperText={dignitaryForm.formState.errors.firstName?.message}
            required
          />
        </Grid>

        {/* Last Name */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="Last Name"
            {...dignitaryForm.register('lastName', { required: 'Last name is required' })}
            error={!!dignitaryForm.formState.errors.lastName}
            helperText={dignitaryForm.formState.errors.lastName?.message}
            required
          />
        </Grid>

        {/* Email */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            {...dignitaryForm.register('email', {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address'
              }
            })}
            error={!!dignitaryForm.formState.errors.email}
            helperText={dignitaryForm.formState.errors.email?.message}
          />
        </Grid>

        {/* Phone */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="Phone Number"
            {...dignitaryForm.register('phone')}
            error={!!dignitaryForm.formState.errors.phone}
            helperText={dignitaryForm.formState.errors.phone?.message}
          />
        </Grid>

        {/* Primary Domain */}
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="primaryDomain"
            control={dignitaryForm.control}
            rules={{ required: 'Primary domain is required' }}
            render={({ field }) => (
              <PrimaryDomainSelect
                label="Primary Domain"
                value={field.value}
                onChange={field.onChange}
                error={!!dignitaryForm.formState.errors.primaryDomain}
                helperText={dignitaryForm.formState.errors.primaryDomain?.message}
                required
              />
            )}
          />
        </Grid>

        {/* Primary Domain Other */}
        {dignitaryForm.watch('primaryDomain') === 'Other' && (
          <Grid item xs={12} md={6} lg={4}>
            <TextField
              fullWidth
              label="Other Primary Domain"
              {...dignitaryForm.register('primaryDomainOther', { required: 'Please specify the primary domain' })}
              error={!!dignitaryForm.formState.errors.primaryDomainOther}
              helperText={dignitaryForm.formState.errors.primaryDomainOther?.message}
              required
            />
          </Grid>
        )}

        {/* Title in Organization */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="Title in Organization"
            {...dignitaryForm.register('titleInOrganization')}
            error={!!dignitaryForm.formState.errors.titleInOrganization}
            helperText={dignitaryForm.formState.errors.titleInOrganization?.message}
          />
        </Grid>

        {/* Organization */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="Organization"
            {...dignitaryForm.register('organization')}
            error={!!dignitaryForm.formState.errors.organization}
            helperText={dignitaryForm.formState.errors.organization?.message}
          />
        </Grid>

        {/* Country */}
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="countryCode"
            control={dignitaryForm.control}
            render={({ field }) => (
              <CountrySelect
                label="Country"
                value={field.value}
                onChange={field.onChange}
                error={!!dignitaryForm.formState.errors.countryCode}
                helperText={dignitaryForm.formState.errors.countryCode?.message}
              />
            )}
          />
        </Grid>

        {/* State */}
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="state"
            control={dignitaryForm.control}
            render={({ field }) => (
              <SubdivisionStateDropdown
                label="State/Province"
                countryCode={dignitaryForm.watch('countryCode')}
                value={field.value}
                onChange={field.onChange}
                error={!!dignitaryForm.formState.errors.state}
                helperText={dignitaryForm.formState.errors.state?.message}
              />
            )}
          />
        </Grid>

        {/* City */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="City"
            {...dignitaryForm.register('city')}
            error={!!dignitaryForm.formState.errors.city}
            helperText={dignitaryForm.formState.errors.city?.message}
          />
        </Grid>

        {/* Bio Summary */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Bio Summary"
            {...dignitaryForm.register('bioSummary')}
            error={!!dignitaryForm.formState.errors.bioSummary}
            helperText={dignitaryForm.formState.errors.bioSummary?.message}
          />
        </Grid>

        {/* LinkedIn or Website */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="LinkedIn or Website"
            {...dignitaryForm.register('linkedInOrWebsite')}
            error={!!dignitaryForm.formState.errors.linkedInOrWebsite}
            helperText={dignitaryForm.formState.errors.linkedInOrWebsite?.message}
          />
        </Grid>

        {/* Has Met Gurudev */}
        <Grid item xs={12} md={6}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Has this dignitary met Gurudev?</FormLabel>
            <RadioGroup
              row
              value={dignitaryForm.watch('hasMetGurudev').toString()}
              onChange={(e) => dignitaryForm.setValue('hasMetGurudev', e.target.value === 'true')}
            >
              <FormControlLabel value="true" control={<Radio />} label="Yes" />
              <FormControlLabel value="false" control={<Radio />} label="No" />
            </RadioGroup>
          </FormControl>
        </Grid>

        {/* Gurudev Meeting Fields */}
        {dignitaryForm.watch('hasMetGurudev') && (
          <>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                type="date"
                label="Meeting Date with Gurudev"
                InputLabelProps={{ shrink: true }}
                {...dignitaryForm.register('gurudevMeetingDate')}
                error={!!dignitaryForm.formState.errors.gurudevMeetingDate}
                helperText={dignitaryForm.formState.errors.gurudevMeetingDate?.message}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Meeting Location"
                {...dignitaryForm.register('gurudevMeetingLocation')}
                error={!!dignitaryForm.formState.errors.gurudevMeetingLocation}
                helperText={dignitaryForm.formState.errors.gurudevMeetingLocation?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Meeting Notes"
                {...dignitaryForm.register('gurudevMeetingNotes')}
                error={!!dignitaryForm.formState.errors.gurudevMeetingNotes}
                helperText={dignitaryForm.formState.errors.gurudevMeetingNotes?.message}
              />
            </Grid>
          </>
        )}

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <SecondaryButton onClick={onCancel}>
              Cancel
            </SecondaryButton>
            <PrimaryButton 
              onClick={handleSave}
              disabled={createDignitaryMutation.isPending || updateDignitaryMutation.isPending}
            >
              {(createDignitaryMutation.isPending || updateDignitaryMutation.isPending) 
                ? 'Saving...' 
                : mode === 'create' 
                  ? 'Save and Add' 
                  : 'Save Changes'
              }
            </PrimaryButton>
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default DignitaryForm; 