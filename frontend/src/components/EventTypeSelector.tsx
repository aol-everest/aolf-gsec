import React from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
} from '@mui/material';
import { Controller, Control } from 'react-hook-form';
import NumberInput from './NumberInput';

interface ValidationErrors {
  eventType?: string;
  numberOfDignitaries?: string;
}

interface EventTypeSelectorProps {
  control: Control<any>;
  validationErrors: ValidationErrors;
  eventTypeOptions: string[];
  eventTypeMap: Record<string, string> | undefined;
  showDignitaryCount?: boolean;
  watchEventType?: string;
  onEventTypeChange?: (eventType: string) => void;
}

export const EventTypeSelector: React.FC<EventTypeSelectorProps> = ({
  control,
  validationErrors,
  eventTypeOptions,
  eventTypeMap,
  showDignitaryCount = true,
  watchEventType,
  onEventTypeChange,
}) => {
  const isDignitary = eventTypeMap && watchEventType === eventTypeMap['DIGNITARY_APPOINTMENT'];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Event Information
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select the type of event you want to create. For dignitary appointments, you can specify the number of dignitaries.
        </Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name="eventType"
          control={control}
          rules={{ required: 'Event type is required' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!validationErrors.eventType}>
              <InputLabel>Event Type</InputLabel>
              <Select
                {...field}
                label="Event Type"
                onChange={(e) => {
                  field.onChange(e.target.value);
                  if (onEventTypeChange) {
                    onEventTypeChange(e.target.value);
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
              {validationErrors.eventType && (
                <FormHelperText>{validationErrors.eventType}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {/* Show dignitary count only for dignitary appointments */}
      {showDignitaryCount && isDignitary && (
        <Grid item xs={12} md={6}>
          <Controller
            name="numberOfDignitaries"
            control={control}
            rules={{ 
              required: 'Number of dignitaries is required',
              min: {
                value: 1,
                message: 'At least one dignitary is required for this event type'
              },
              max: {
                value: 8,
                message: 'Maximum 8 dignitaries allowed'
              }
            }}
            render={({ field }) => (
              <NumberInput
                value={field.value || 1}
                onChange={field.onChange}
                min={1}
                max={8}
                increment={1}
                label="Number of Dignitaries"
                error={!!validationErrors.numberOfDignitaries}
                helperText={
                  validationErrors.numberOfDignitaries || 
                  "Specify between 1 and 8 dignitaries."
                }
                required
              />
            )}
          />
        </Grid>
      )}
    </Grid>
  );
};

export default EventTypeSelector; 