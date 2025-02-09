import React from 'react';
import { useForm } from 'react-hook-form';
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

interface AppointmentFormData {
  // POC Information
  pocFirstName: string;
  pocLastName: string;
  pocEmail: string;
  pocPhone: string;

  // Dignitary Information
  dignitaryHonorificTitle: string;
  dignitaryFirstName: string;
  dignitaryLastName: string;
  dignitaryEmail: string;
  dignitaryPhone: string;
  dignitaryPrimaryDomain: 'Business' | 'Government' | 'Religious' | 'Spiritual' | 'Sports' | 'Entertainment' | 'Media' | 'Education' | 'Healthcare';
  dignitaryTitleInOrganization: string;
  dignitaryOrganization: string;
  dignitaryBioSummary: string;
  dignitaryLinkedInOrWebsite: string;
  dignitaryCountry: string;
  dignitaryState: string;
  dignitaryCity: string;
  dignitaryPreMeetingNotes: string;
}

const PRIMARY_DOMAINS = [
  'Business',
  'Government',
  'Religious',
  'Spiritual',
  'Sports',
  'Entertainment',
  'Media',
  'Education',
  'Healthcare',
] as const;

export const AppointmentRequestForm: React.FC = () => {
  const { userInfo } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    defaultValues: {
      pocFirstName: userInfo?.name?.split(' ')[0] || '',
      pocLastName: userInfo?.name?.split(' ').slice(1).join(' ') || '',
      pocEmail: userInfo?.email || '',
    }
  });

  const onSubmit = (data: AppointmentFormData) => {
    // TODO: Submit to API
    console.log(data);
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

        {/* Dignitary Information Section */}
        <Grid item xs={12} sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Dignitary Information
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Honorific Title"
            {...register('dignitaryHonorificTitle', { required: 'Honorific title is required' })}
            error={!!errors.dignitaryHonorificTitle}
            helperText={errors.dignitaryHonorificTitle?.message}
          />
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
          <TextField
            fullWidth
            label="Country"
            {...register('dignitaryCountry', { required: 'Country is required' })}
            error={!!errors.dignitaryCountry}
            helperText={errors.dignitaryCountry?.message}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="State"
            {...register('dignitaryState', { required: 'State is required' })}
            error={!!errors.dignitaryState}
            helperText={errors.dignitaryState?.message}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="City"
            {...register('dignitaryCity', { required: 'City is required' })}
            error={!!errors.dignitaryCity}
            helperText={errors.dignitaryCity?.message}
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