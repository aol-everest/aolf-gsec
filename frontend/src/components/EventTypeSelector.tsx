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

interface EventTypeConfig {
  event_type: string;
  display_name: string;
  description: string;
}

interface EventTypeSelectorProps {
  control: Control<any>;
  validationErrors: ValidationErrors;
  eventTypeOptions: string[];
  eventTypeMap: Record<string, string> | undefined;
  eventTypeConfigs?: EventTypeConfig[];
  showDignitaryCount?: boolean;
  watchEventType?: string;
  onEventTypeChange?: (eventType: string) => void;
}

export const EventTypeSelector: React.FC<EventTypeSelectorProps> = ({
  control,
  validationErrors,
  eventTypeOptions,
  eventTypeMap,
  eventTypeConfigs,
  showDignitaryCount = true,
  watchEventType,
  onEventTypeChange,
}) => {
  const isDignitary = eventTypeMap && watchEventType === eventTypeMap['DIGNITARY_APPOINTMENT'];

  // Get the description for the selected event type
  const selectedEventTypeConfig = eventTypeConfigs?.find(config => config.event_type === watchEventType);

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
                {eventTypeOptions.map((eventType) => {
                  const config = eventTypeConfigs?.find(c => c.event_type === eventType);
                  return (
                    <MenuItem key={eventType} value={eventType}>
                      <div>
                        <Typography variant="body1">
                          {config?.display_name || eventType}
                        </Typography>
                        {config?.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {config.description}
                          </Typography>
                        )}
                      </div>
                    </MenuItem>
                  );
                })}
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

      {/* Show selected event type description */}
      {selectedEventTypeConfig && (
        <Grid item xs={12} md={12}>
          <Typography variant="h3" gutterBottom color="primary">
            {selectedEventTypeConfig.display_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedEventTypeConfig.description}
          </Typography>
        </Grid>
      )}

    </Grid>
  );
};

export default EventTypeSelector; 