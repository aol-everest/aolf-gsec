import React from 'react';
import { 
  Box, 
  Grid, 
  TextField, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  FormHelperText 
} from '@mui/material';
import { Controller, UseFormReturn } from 'react-hook-form';
import NumberInput from '../../NumberInput';
import { RequestTypeConfig } from '../../../models/types';

interface InitialInfoStepProps {
  form: UseFormReturn<any>;
  userInfo: any;
  requestTypeConfigs: RequestTypeConfig[];
  selectedRequestTypeConfig: RequestTypeConfig | null;
  isLoadingRequestTypes: boolean;
}

export const InitialInfoStep: React.FC<InitialInfoStepProps> = ({
  form,
  userInfo,
  requestTypeConfigs,
  selectedRequestTypeConfig,
  isLoadingRequestTypes
}) => {
  return (
    <Box>
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
            {...form.register('pocFirstName')}
            disabled
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Name"
            {...form.register('pocLastName')}
            disabled
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            {...form.register('pocEmail')}
            disabled
          />
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Appointment Information
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
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
                  {String(form.formState.errors.requestType.message || 'Request type is required')}
                </FormHelperText>
              )}
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
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
                onChange={field.onChange}
                min={1}
                max={selectedRequestTypeConfig?.max_attendees || 15}
                increment={1}
                label={selectedRequestTypeConfig ? 
                  `Number of ${selectedRequestTypeConfig.attendee_label_plural} (including yourself if attending)` : 
                  "Number of Attendees (including yourself if attending)"
                }
                error={!!form.formState.errors.numberOfAttendees}
                helperText={String(form.formState.errors.numberOfAttendees?.message || '')}
                required
              />
            )}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default InitialInfoStep; 