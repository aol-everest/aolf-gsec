import React, { useState, useEffect } from 'react';
import { useForm, Controller, Control } from 'react-hook-form';
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

interface AppointmentFormData {
  // POC Information
  pocFirstName: string;
  pocLastName: string;
  pocEmail: string;
  pocPhone: string;
  pocRelationshipType: RelationshipType;

  // Dignitary Information
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
  dignitaryPreMeetingNotes: string;

  // Appointment Information
  purpose: string;
  preferredDate: string;
  preferredTime: string;
  duration: string;
  location: string;
}

export const AppointmentRequestForm: React.FC = () => {
  const { userInfo } = useAuth();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  
  // console.log('Current country code:', selectedCountryCode);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<AppointmentFormData>({
    defaultValues: {
      // POC Information
      pocFirstName: userInfo?.name?.split(' ')[0] || '',
      pocLastName: userInfo?.name?.split(' ').slice(1).join(' ') || '',
      pocEmail: userInfo?.email || '',
      pocPhone: '',
      pocRelationshipType: RELATIONSHIP_TYPES[0],

      // Dignitary Information
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
      dignitaryPreMeetingNotes: '',

      // Appointment Information
      purpose: '',
      preferredDate: '',
      preferredTime: '',
      duration: '',
      location: '',
    }
  });

  // Watch for country changes to reset state and city when country changes
  const watchCountry = watch('dignitaryCountry');
  // console.log('Watched country value:', watchCountry);

  useEffect(() => {
    // console.log('Country changed, resetting state and city');
    if (watchCountry === '') {
      setSelectedCountryCode('');
    }
  }, [watchCountry]);

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      const response = await fetch('http://localhost:8001/appointments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          dignitary: {
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
            pre_meeting_notes: data.dignitaryPreMeetingNotes,
          },
          poc_relationship_type: data.pocRelationshipType,
          purpose: data.purpose,
          preferred_date: data.preferredDate,
          preferred_time: data.preferredTime,
          duration: data.duration,
          location: data.location,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit appointment request');
      }

      const result = await response.json();
      console.log('Appointment created:', result);
      
      // TODO: Show success message and redirect
      
    } catch (error) {
      console.error('Error submitting form:', error);
      // TODO: Show error message
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 3 }}>
      <Grid container spacing={3}>
        {/* POC Information Section */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Point of Contact Information
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="First Name"
            {...register('pocFirstName', { required: 'First name is required' })}
            error={!!errors.pocFirstName}
            helperText={errors.pocFirstName?.message}
            disabled // Since it's prefilled from Google
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Name"
            {...register('pocLastName', { required: 'Last name is required' })}
            error={!!errors.pocLastName}
            helperText={errors.pocLastName?.message}
            disabled // Since it's prefilled from Google
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            {...register('pocEmail', { required: 'Email is required' })}
            error={!!errors.pocEmail}
            helperText={errors.pocEmail?.message}
            disabled // Since it's prefilled from Google
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            {...register('pocPhone', { required: 'Phone number is required' })}
            error={!!errors.pocPhone}
            helperText={errors.pocPhone?.message}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.pocRelationshipType}>
            <InputLabel>Relationship Type</InputLabel>
            <Select
              label="Relationship Type"
              defaultValue={RELATIONSHIP_TYPES[0]}
              {...register('pocRelationshipType', { required: 'Relationship type is required' })}
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
            {errors.pocRelationshipType && (
              <Typography color="error" variant="caption">
                {errors.pocRelationshipType.message}
              </Typography>
            )}
          </FormControl>
        </Grid>

        {/* Dignitary Information Section */}
        <Grid item xs={12} sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Dignitary Information
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.dignitaryHonorificTitle}>
            <InputLabel>Honorific Title</InputLabel>
            <Select
              label="Honorific Title"
              defaultValue={HONORIFIC_TITLES[0]}
              {...register('dignitaryHonorificTitle', { required: 'Honorific title is required' })}
            >
              {HONORIFIC_TITLES.map((title) => (
                <MenuItem key={title} value={title}>
                  {title}
                </MenuItem>
              ))}
            </Select>
            {errors.dignitaryHonorificTitle && (
              <Typography color="error" variant="caption">
                {errors.dignitaryHonorificTitle.message}
              </Typography>
            )}
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="First Name"
            {...register('dignitaryFirstName', { required: 'First name is required' })}
            error={!!errors.dignitaryFirstName}
            helperText={errors.dignitaryFirstName?.message}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Name"
            {...register('dignitaryLastName', { required: 'Last name is required' })}
            error={!!errors.dignitaryLastName}
            helperText={errors.dignitaryLastName?.message}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            {...register('dignitaryEmail', { required: 'Email is required' })}
            error={!!errors.dignitaryEmail}
            helperText={errors.dignitaryEmail?.message}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            {...register('dignitaryPhone')}
            error={!!errors.dignitaryPhone}
            helperText={errors.dignitaryPhone?.message}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.dignitaryPrimaryDomain}>
            <InputLabel>Primary Domain</InputLabel>
            <Select
              label="Primary Domain"
              defaultValue={PRIMARY_DOMAINS[0]}
              {...register('dignitaryPrimaryDomain', { required: 'Primary domain is required' })}
            >
              {PRIMARY_DOMAINS.map((domain) => (
                <MenuItem key={domain} value={domain}>
                  {domain}
                </MenuItem>
              ))}
            </Select>
            {errors.dignitaryPrimaryDomain && (
              <Typography color="error" variant="caption">
                {errors.dignitaryPrimaryDomain.message}
              </Typography>
            )}
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Title in Organization"
            {...register('dignitaryTitleInOrganization', { required: 'Title is required' })}
            error={!!errors.dignitaryTitleInOrganization}
            helperText={errors.dignitaryTitleInOrganization?.message}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Organization"
            {...register('dignitaryOrganization', { required: 'Organization is required' })}
            error={!!errors.dignitaryOrganization}
            helperText={errors.dignitaryOrganization?.message}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Bio Summary"
            {...register('dignitaryBioSummary', { required: 'Bio summary is required' })}
            error={!!errors.dignitaryBioSummary}
            helperText={errors.dignitaryBioSummary?.message}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="LinkedIn or Website URL"
            {...register('dignitaryLinkedInOrWebsite', { required: 'URL is required' })}
            error={!!errors.dignitaryLinkedInOrWebsite}
            helperText={errors.dignitaryLinkedInOrWebsite?.message}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Controller
            name="dignitaryCountry"
            control={control}
            rules={{ required: 'Country is required' }}
            render={({ field }) => (
              <LocationAutocomplete
                label="Country"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  // Reset state and city when country changes
                  setValue('dignitaryState', '');
                  setValue('dignitaryCity', '');
                }}
                error={!!errors.dignitaryCountry}
                helperText={errors.dignitaryCountry?.message}
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
            control={control}
            rules={{ required: 'State is required' }}
            render={({ field }) => (
              <LocationAutocomplete
                label="State"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value.split(',')[0]);
                }}
                error={!!errors.dignitaryState}
                helperText={errors.dignitaryState?.message}
                types={['administrative_area_level_1']}
                componentRestrictions={selectedCountryCode ? { country: selectedCountryCode } : undefined}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Controller
            name="dignitaryCity"
            control={control}
            rules={{ required: 'City is required' }}
            render={({ field }) => (
              <LocationAutocomplete
                label="City"
                value={field.value}
                onChange={(value) => {
                  field.onChange(value.split(',')[0]);
                }}
                error={!!errors.dignitaryCity}
                helperText={errors.dignitaryCity?.message}
                types={['locality', 'sublocality']}
                componentRestrictions={selectedCountryCode ? { country: selectedCountryCode } : undefined}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Pre-Meeting Notes"
            {...register('dignitaryPreMeetingNotes')}
            error={!!errors.dignitaryPreMeetingNotes}
            helperText={errors.dignitaryPreMeetingNotes?.message}
          />
        </Grid>

        {/* Add Appointment Information Section */}
        <Grid item xs={12} sx={{ mt: 4 }}>
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
            {...register('purpose', { required: 'Purpose is required' })}
            error={!!errors.purpose}
            helperText={errors.purpose?.message}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Preferred Date"
            InputLabelProps={{ shrink: true }}
            {...register('preferredDate', { required: 'Preferred date is required' })}
            error={!!errors.preferredDate}
            helperText={errors.preferredDate?.message}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="time"
            label="Preferred Time"
            InputLabelProps={{ shrink: true }}
            {...register('preferredTime')}
            error={!!errors.preferredTime}
            helperText={errors.preferredTime?.message}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Duration"
            placeholder="e.g., 30 minutes, 1 hour"
            {...register('duration')}
            error={!!errors.duration}
            helperText={errors.duration?.message}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Location"
            placeholder="e.g., Virtual, Office Address"
            {...register('location')}
            error={!!errors.location}
            helperText={errors.location?.message}
          />
        </Grid>

        <Grid item xs={12}>
          <Button 
            type="submit" 
            variant="contained" 
            fullWidth
            size="large"
            sx={{ mt: 2 }}
          >
            Submit Request
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AppointmentRequestForm; 