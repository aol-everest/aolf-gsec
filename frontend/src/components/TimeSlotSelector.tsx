import React, { useState } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Autocomplete,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Controller, Control, UseFormGetValues, UseFormSetValue, useWatch } from 'react-hook-form';
import { AppointmentTimeSlotDetailsMap } from '../models/types';
import { getDurationOptions, defaultTimeOptions, findTimeOption, isTimeOffHours } from '../utils/dateUtils';
import { PrimaryButton } from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import useTimeSlots from '../hooks/useTimeSlots';

interface ValidationErrors {
  appointment_date?: string;
  appointment_time?: string;
  duration?: string;
}

interface TimeSlotSelectorProps {
  control: Control<any>;
  validationErrors: ValidationErrors;
  getValues: UseFormGetValues<any>;
  setValue: UseFormSetValue<any>;
  timeSlotDetailsMap?: AppointmentTimeSlotDetailsMap | null;
  currentAppointmentId?: number;
  isLoadingTimeSlots?: boolean;
  showDuration?: boolean;
  getTimeSlotOccupancy?: (date: string, timeSlot: string, duration?: number, currentAppointmentId?: number) => { appointment_count: number; people_count: number };
}

export const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  control,
  validationErrors,
  getValues,
  setValue,
  timeSlotDetailsMap,
  currentAppointmentId,
  isLoadingTimeSlots = false,
  showDuration = true,
  getTimeSlotOccupancy,
}) => {
  const [showOffHoursWarning, setShowOffHoursWarning] = useState(false);
  const [selectedOffHoursTime, setSelectedOffHoursTime] = useState<string | null>(null);

  const durationOptions = getDurationOptions();

  // Watch the duration field so the warning updates when duration changes
  const watchedDuration = useWatch({ control, name: 'duration' }) || 15;

  // Helper function to check if a time slot is available
  const checkTimeSlotAvailability = (
    date: string,
    time: string,
    timeSlotDetailsMap: AppointmentTimeSlotDetailsMap | null | undefined,
    currentAppointmentId?: number
  ): { isAvailable: boolean; appointments: number } => {
    if (!timeSlotDetailsMap || !timeSlotDetailsMap.dates || !timeSlotDetailsMap.dates[date]) {
      return { isAvailable: true, appointments: 0 };
    }

    const dateData = timeSlotDetailsMap.dates[date];
    if (!dateData.time_slots || !dateData.time_slots[time]) {
      return { isAvailable: true, appointments: 0 };
    }

    const timeSlotData = dateData.time_slots[time];
    
    const appointmentIds = Object.keys(timeSlotData).map(id => parseInt(id, 10));
    const filteredAppointments = currentAppointmentId 
      ? appointmentIds.filter(id => id !== currentAppointmentId)
      : appointmentIds;
    
    return { isAvailable: filteredAppointments.length === 0, appointments: filteredAppointments.length };
  };

  return (
    <>
      {/* Appointment Date */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="appointment_date"
          control={control}
          render={({ field }) => {
            // Calculate appointment count for the selected date
            let appointmentCount = 0;
            
            if (timeSlotDetailsMap && field.value && timeSlotDetailsMap.dates[field.value]) {
              appointmentCount = timeSlotDetailsMap.dates[field.value].appointment_count;
              
              if (currentAppointmentId) {
                const dateData = timeSlotDetailsMap.dates[field.value];
                let isCurrentAppointmentOnThisDate = false;
                
                Object.values(dateData.time_slots).forEach(timeSlotData => {
                  if (timeSlotData.hasOwnProperty(currentAppointmentId.toString())) {
                    isCurrentAppointmentOnThisDate = true;
                  }
                });
                
                if (isCurrentAppointmentOnThisDate) {
                  appointmentCount = Math.max(0, appointmentCount - 1);
                }
              }
            }
            
            return (
              <TextField
                {...field}
                fullWidth
                label="Appointment Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                error={!!validationErrors.appointment_date}
                helperText={
                  <>
                    {validationErrors.appointment_date || ''}
                    {appointmentCount > 0 && (
                      <Box component="span" sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        color: 'primary.main',
                        fontWeight: 'bold'
                      }}>
                        <Alert severity="info" sx={{ mt: 0.5, pl: 1.3, pr: 1.3, pb: 0.5, pt: 0.5, color: 'text.primary', fontWeight: '500', backgroundColor: 'info.light' }}>
                            {appointmentCount} other {appointmentCount === 1 ? 'appointment' : 'appointments'} currently scheduled for this date.
                        </Alert>
                      </Box>
                    )}
                  </>
                }
                onChange={(e) => {
                  field.onChange(e);
                  // Reset appointment time when date changes to avoid conflicts
                  if (field.value !== e.target.value) {
                    setValue('appointment_time', '');
                  }
                }}
              />
            );
          }}
        />
      </Grid>

      {/* Appointment Time */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="appointment_time"
          control={control}
          render={({ field }) => {
            const timeOption = findTimeOption(field.value, defaultTimeOptions);
            
            return (
              <>
                <Autocomplete
                  options={defaultTimeOptions}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                  isOptionEqualToValue={(option, value) => 
                    option.value === (typeof value === 'string' ? value : value.value)
                  }
                  value={timeOption}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      if (isTimeOffHours(newValue.value)) {
                        setSelectedOffHoursTime(newValue.value);
                        setShowOffHoursWarning(true);
                      } else {
                        field.onChange(newValue.value);
                      }
                    } else {
                      field.onChange('');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Appointment Time"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!validationErrors.appointment_time}
                      helperText={
                        <>
                          {validationErrors.appointment_time || ''}
                          {field.value && getTimeSlotOccupancy && (() => {
                            const selectedDate = getValues('appointment_date');
                            const occupancyData = getTimeSlotOccupancy(selectedDate, field.value, watchedDuration, currentAppointmentId);
                            return occupancyData.appointment_count > 0 ? (
                              <Alert severity="warning" sx={{ mt: 0.5, pl: 1.3, pr: 1.3, pb: 0.5, pt: 0.5, color: 'text.primary', fontWeight: '500', backgroundColor: 'warning.light' }}>
                                This time slot already has {occupancyData.appointment_count} other {occupancyData.people_count === 0 && 'placeholder'} {occupancyData.appointment_count === 1 ? 'appointment' : 'appointments'}
                                {occupancyData.people_count > 0 ? (' with ' + occupancyData.people_count.toString() + (occupancyData.people_count === 1 ? ' dignitary' : ' dignitaries')) : ''} scheduled.
                              </Alert>
                            ) : null;
                          })()}
                        </>
                      }
                    />
                  )}
                  renderOption={(props, option) => {
                    const selectedDate = getValues('appointment_date');
                    const { appointment_count: appointmentCount, people_count: peopleCount } = getTimeSlotOccupancy 
                      ? getTimeSlotOccupancy(selectedDate, option.value, watchedDuration, currentAppointmentId)
                      : { appointment_count: 0, people_count: 0 };
                    const hasAppointments = appointmentCount > 0;
                    
                    // Check if time is outside normal hours
                    const isOutsideNormalHours = isTimeOffHours(option.value);
                    
                    return (
                      <li 
                        {...props} 
                        style={{
                          ...(props.style || {}),
                          color: isOutsideNormalHours ? '#9e9e9e' : undefined,
                          fontWeight: hasAppointments ? 'bold' : undefined,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{option.label}</span>
                        {hasAppointments && (
                          <Chip 
                            size="small" 
                            color="primary" 
                            label={`${appointmentCount} ${peopleCount > 0 ? ' (Dignitaries: ' + peopleCount + ')' : ''}`} 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </li>
                    );
                  }}
                  freeSolo={false}
                  disableClearable={false}
                />
                
                {/* Off-hours warning dialog */}
                <Dialog
                  open={showOffHoursWarning}
                  onClose={() => setShowOffHoursWarning(false)}
                >
                  <DialogTitle>Unusual Time Selected</DialogTitle>
                  <DialogContent>
                    <DialogContentText>
                      You've selected a time outside normal appointment hours (8am-10pm).
                      Are you sure you want to schedule an appointment at this time?
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <SecondaryButton onClick={() => setShowOffHoursWarning(false)}>
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton onClick={() => {
                      if (selectedOffHoursTime) {
                        setValue('appointment_time', selectedOffHoursTime);
                      }
                      setShowOffHoursWarning(false);
                    }}>
                      Confirm
                    </PrimaryButton>
                  </DialogActions>
                </Dialog>
              </>
            );
          }}
        />
      </Grid>

      {/* Duration */}
      {showDuration && (
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="duration"
            control={control}
            defaultValue={15}
            render={({ field }) => (
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel id="duration-select-label">Duration</InputLabel>
                <Select
                  {...field}
                  labelId="duration-select-label"
                  label="Duration"
                  value={field.value || 15}
                  error={!!validationErrors.duration}
                >
                  {durationOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </Grid>
      )}
    </>
  );
};

export default TimeSlotSelector; 