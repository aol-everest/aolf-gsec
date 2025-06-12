import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  TextField,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnums } from '../hooks/useEnums';
import { 
  Location, 
  Dignitary, 
  AppointmentTimeSlotDetailsMap,
  StatusMap,
  SubStatusMap,
  StatusSubStatusMapping,
  EventTypeMap,
  CalendarEvent,
  Appointment
} from '../models/types';
import { PrimaryButton } from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import EventTypeSelector from './EventTypeSelector';
import DignitarySelector from './DignitarySelector';
import TimeSlotSelector from './TimeSlotSelector';
import LocationSelector from './LocationSelector';
import StatusSelector from './StatusSelector';
import useTimeSlots from '../hooks/useTimeSlots';
import { Controller } from 'react-hook-form';
import NumberInput from './NumberInput';

interface AppointmentFormData {
  eventType: string;
  numberOfDignitaries: number;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  location_id: number | null;
  meeting_place_id: number | null;
  status: string;
  sub_status: string;
  appointment_type: string | null;
  title: string;
  max_capacity: number;
  is_open_for_booking: boolean;
  instructions: string;
  description: string;
  purpose: string;
  secretariat_meeting_notes: string;
  secretariat_follow_up_actions: string;
}

interface AppointmentResponse extends Omit<Appointment, 'dignitary' | 'requester' | 'location' | 'approved_by_user' | 'last_updated_by_user' | 'attachments'> {
  purpose?: string;
}

interface ValidationErrors {
  eventType?: string;
  numberOfDignitaries?: string;
  appointment_date?: string;
  appointment_time?: string;
  duration?: string;
  location_id?: string;
  meeting_place_id?: string;
  status?: string;
  sub_status?: string;
  appointment_type?: string;
  purpose?: string;
  title?: string;
  max_capacity?: string;
  is_open_for_booking?: string;
  instructions?: string;
  description?: string;
}

export const AdminAppointmentCreateSimple: React.FC = () => {
  const navigate = useNavigate();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Form state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [selectedDignitaries, setSelectedDignitaries] = useState<Dignitary[]>([]);
  const [isCalendarEventMode, setIsCalendarEventMode] = useState(false);
  
  // Use the time slots hook
  const { timeSlotDetailsMap, isLoadingTimeSlots, fetchTimeSlotData, getTimeSlotOccupancy } = useTimeSlots();

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<AppointmentFormData>({
    defaultValues: {
      eventType: '',
      numberOfDignitaries: 1,
      appointment_date: '',
      appointment_time: '',
      duration: 15,
      location_id: null,
      meeting_place_id: null,
      status: '',
      sub_status: '',
      appointment_type: null,
      title: '',
      max_capacity: 10,
      is_open_for_booking: true,
      instructions: '',
      description: '',
      purpose: '',
      secretariat_meeting_notes: '',
      secretariat_follow_up_actions: '',
    },
  });

  const watchEventType = watch('eventType');
  const watchDate = watch('appointment_date');
  const watchStatus = watch('status');

  // Fetch event type options
  const { data: eventTypeOptions = [] } = useQuery<string[]>({
    queryKey: ['calendar-event-type-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/calendar/event-type-options');
      return data;
    },
  });

  // Fetch event type map
  const { data: eventTypeMap } = useQuery<EventTypeMap>({
    queryKey: ['event-type-map'],
    queryFn: async () => {
      const { data } = await api.get<EventTypeMap>('/calendar/event-type-options-map');
      return data;
    },
  });

  // Fetch event type configurations
  const { data: eventTypeConfigs = [] } = useQuery<Array<{ event_type: string; display_name: string; description: string }>>({
    queryKey: ['event-type-configurations'],
    queryFn: async () => {
      const { data } = await api.get<Array<{ event_type: string; display_name: string; description: string }>>('/event-types/configurations');
      return data;
    },
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get<Location[]>('/admin/locations/all');
      return data;
    },
  });

  // Fetch dignitaries
  const { data: dignitaries = [] } = useQuery<Dignitary[]>({
    queryKey: ['admin-assigned-dignitaries'],
    queryFn: async () => {
      const { data } = await api.get<Dignitary[]>('/admin/dignitaries/all');
      return data;
    },
  });

  // Fetch countries
  const { data: countries = [] } = useQuery<Array<{ iso2_code: string; name: string }>>({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await api.get<Array<{ iso2_code: string; name: string }>>('/countries/all');
      return data;
    },
  });

  // Fetch status-related data
  const { data: statusMap = {} } = useQuery<StatusMap>({
    queryKey: ['status-map'],
    queryFn: async () => {
      const { data } = await api.get<StatusMap>('/appointments/status-options-map');
      return data;
    },
  });

  const { data: subStatusMap = {} } = useQuery<SubStatusMap>({
    queryKey: ['sub-status-map'],
    queryFn: async () => {
      const { data } = await api.get<SubStatusMap>('/appointments/sub-status-options-map');
      return data;
    },
  });

  const { data: statusSubStatusMapping } = useQuery<StatusSubStatusMapping>({
    queryKey: ['status-substatus-mapping'],
    queryFn: async () => {
      const { data } = await api.get<StatusSubStatusMapping>('/appointments/status-substatus-mapping');
      return data;
    },
  });

  const { values: allSubStatusOptions = [] } = useEnums('appointmentSubStatus');

  // Set default status to APPROVED when statusMap is loaded
  useEffect(() => {
    if (statusMap && statusMap['APPROVED'] && !getValues('status')) {
      setValue('status', statusMap['APPROVED']);
    }
  }, [statusMap, setValue, getValues]);

  // Watch for date changes and fetch time slot data
  useEffect(() => {
    if (watchDate) {
      if (timeSlotDetailsMap && 
          timeSlotDetailsMap.dates && 
          timeSlotDetailsMap.dates[watchDate]) {
        return;
      }
      fetchTimeSlotData(watchDate, getValues('location_id') || undefined);
    }
  }, [watchDate, fetchTimeSlotData, getValues, timeSlotDetailsMap]);

  // Auto-default sub-status when status changes
  useEffect(() => {
    if (watchStatus && statusSubStatusMapping && statusSubStatusMapping[watchStatus]) {
      const { default_sub_status, valid_sub_statuses } = statusSubStatusMapping[watchStatus];
      
      // Only set default if current sub_status is not valid for the new status
      const currentSubStatus = getValues('sub_status');
      
      if (!currentSubStatus || !valid_sub_statuses.includes(currentSubStatus)) {
        console.log(`Setting sub_status to default: ${default_sub_status}`);
        setValue('sub_status', default_sub_status);
      }
    }
  }, [watchStatus, statusSubStatusMapping, getValues, setValue]);

  // Handle event type changes
  const handleEventTypeChange = (eventType: string) => {
    const isDignitary = eventTypeMap && eventType === eventTypeMap['DIGNITARY_APPOINTMENT'];
    setIsCalendarEventMode(!isDignitary);
    
    if (isDignitary) {
      setValue('numberOfDignitaries', 1);
    }
  };

  // Dignitary management
  const handleDignitaryAdd = (dignitary: Dignitary) => {
    setSelectedDignitaries(prev => [...prev, dignitary]);
  };

  const handleDignitaryRemove = (index: number) => {
    setSelectedDignitaries(prev => prev.filter((_, i) => i !== index));
  };

  const handleDignitaryCreate = async (formData: any): Promise<Dignitary> => {
    const { data } = await api.post<Dignitary>('/admin/dignitaries', formData);
    queryClient.invalidateQueries({ queryKey: ['admin-assigned-dignitaries'] });
    return data;
  };

  // Create appointment mutation
  const createAppointmentMutation = useMutation<AppointmentResponse, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<AppointmentResponse>('/admin/appointments/new', data);
      return response;
    },
    onSuccess: (appointmentResponse) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      enqueueSnackbar('Appointment created successfully', { variant: 'success' });
      navigate('/admin/appointments/review');
    },
    onError: (error: any) => {
      console.error('Error creating appointment:', error);
      const errorMsg = typeof error.response?.data === 'string' 
        ? error.response.data 
        : 'Some required fields are missing or invalid.';
      enqueueSnackbar(`Failed to create appointment: ${errorMsg}`, { variant: 'error' });
    }
  });

  // Create calendar event mutation
  const createCalendarEventMutation = useMutation<CalendarEvent, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<CalendarEvent>('/admin/calendar-events', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      enqueueSnackbar('Calendar event created successfully', { variant: 'success' });
      navigate('/admin/appointments/review');
    },
    onError: (error: any) => {
      console.error('Error creating calendar event:', error);
      const errorMsg = typeof error.response?.data === 'string' 
        ? error.response.data 
        : 'Some required fields are missing or invalid.';
      enqueueSnackbar(`Failed to create calendar event: ${errorMsg}`, { variant: 'error' });
    }
  });

  const onSubmit = async (data: AppointmentFormData) => {
    setValidationErrors({});

    try {
      if (isCalendarEventMode) {
        // Create calendar event
        const eventData = {
          event_type: data.eventType,
          title: data.title,
          description: data.description,
          start_date: data.appointment_date,
          start_time: data.appointment_time,
          duration: data.duration || 15,
          location_id: data.location_id,
          meeting_place_id: data.meeting_place_id,
          max_capacity: data.max_capacity,
          is_open_for_booking: data.is_open_for_booking,
          instructions: data.instructions,
          status: data.status || 'CONFIRMED',
          notes: data.secretariat_meeting_notes || '',
        };
        
        await createCalendarEventMutation.mutateAsync(eventData);
      } else {
        // Create appointment
        if (selectedDignitaries.length === 0) {
          enqueueSnackbar('Please select at least one dignitary for the appointment', { variant: 'error' });
          return;
        }

        const appointmentData = {
          dignitary_ids: selectedDignitaries.map(d => d.id),
          title: data.title,
          purpose: data.purpose || '',
          location_id: data.location_id,
          meeting_place_id: data.meeting_place_id,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          duration: data.duration || 15,
          event_type: data.eventType,
          is_placeholder: false,
          ...(data.status ? { status: data.status } : {}),
          ...(data.sub_status ? { sub_status: data.sub_status } : {}),
          ...(data.appointment_type ? { appointment_type: data.appointment_type } : {}),
          ...(data.secretariat_meeting_notes ? { secretariat_meeting_notes: data.secretariat_meeting_notes } : {}),
          ...(data.secretariat_follow_up_actions ? { secretariat_follow_up_actions: data.secretariat_follow_up_actions } : {}),
        };
        
        await createAppointmentMutation.mutateAsync(appointmentData);
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const isDignitary = eventTypeMap && watchEventType === eventTypeMap['DIGNITARY_APPOINTMENT'];

  return (
    <Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={4}>
          {/* Event Type Selection */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <EventTypeSelector
                control={control}
                validationErrors={validationErrors}
                eventTypeOptions={eventTypeOptions}
                eventTypeMap={eventTypeMap}
                eventTypeConfigs={eventTypeConfigs}
                watchEventType={watchEventType}
                onEventTypeChange={handleEventTypeChange}
              />
            </Paper>
          </Grid>

          {/* Dignitary Selection - Only for dignitary appointments */}
          {isDignitary && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <DignitarySelector
                  dignitaries={dignitaries}
                  selectedDignitaries={selectedDignitaries}
                  onDignitaryAdd={handleDignitaryAdd}
                  onDignitaryRemove={handleDignitaryRemove}
                  onDignitaryCreate={handleDignitaryCreate}
                  countries={countries}
                  isLoadingCountries={false}
                  maxDignitaries={getValues('numberOfDignitaries') || 8}
                  required={true}
                  title="Select Dignitaries"
                  description="Select existing dignitaries or create new ones for this appointment."
                />
              </Paper>
            </Grid>
          )}

          {/* Date, Time & Location */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Schedule & Location
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Select the date, time, and location for this {isCalendarEventMode ? 'event' : 'appointment'}.
              </Typography>
              
              <Grid container spacing={3}>
                <TimeSlotSelector
                  control={control}
                  validationErrors={validationErrors}
                  getValues={getValues}
                  setValue={setValue}
                  timeSlotDetailsMap={timeSlotDetailsMap}
                  isLoadingTimeSlots={isLoadingTimeSlots}
                  getTimeSlotOccupancy={getTimeSlotOccupancy}
                />
                
                <LocationSelector
                  control={control}
                  validationErrors={validationErrors}
                  locations={locations}
                />
              </Grid>
            </Paper>
          </Grid>

          {/* Purpose & Details */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isCalendarEventMode ? 'Event Details' : 'Appointment Details'}
              </Typography>
              
              <Grid container spacing={3}>
                {/* Title (required) */}
                <Grid item xs={12} md={12}>
                  <Controller
                    name="title"
                    control={control}
                    rules={{ required: 'Title is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Title"
                        required
                        error={!!validationErrors.title}
                        helperText={validationErrors.title}
                      />
                    )}
                  />
                </Grid>

                {/* Description (for events) */}
                {isCalendarEventMode && (
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={4}
                          label="Event Description"
                          error={!!validationErrors.description}
                          helperText={validationErrors.description}
                        />
                      )}
                    />
                  </Grid>
                )}

                {/* Instructions (for events) */}
                {isCalendarEventMode && (
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="instructions"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={4}
                          label="Instructions for Attendees"
                          error={!!validationErrors.instructions}
                          helperText={validationErrors.instructions}
                        />
                      )}
                    />
                  </Grid>
                )}

                {/* Max Capacity (for darshan/events) */}
                {isCalendarEventMode && (
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="max_capacity"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          value={field.value || 10}
                          onChange={field.onChange}
                          min={1}
                          max={500}
                          increment={10}
                          label="Max Capacity"
                          error={!!validationErrors.max_capacity}
                          helperText={validationErrors.max_capacity}
                        />
                      )}
                    />
                  </Grid>
                )}

                {/* Is Open for Booking (for events) */}
                {isCalendarEventMode && (
                  <Grid item xs={12} md={4}>
                    <Controller
                      name="is_open_for_booking"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                          label="Open for Booking"
                        />
                      )}
                    />
                  </Grid>
                )}

                {/* Purpose (for appointments) */}
                {!isCalendarEventMode && (
                  <Grid item xs={12}>
                    <Controller
                      name="purpose"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={4}
                          label="Purpose of Meeting"
                          error={!!validationErrors.purpose}
                          helperText={validationErrors.purpose}
                          required
                        />
                      )}
                    />
                  </Grid>
                )}

                {!isCalendarEventMode && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Administrative Fields
                      </Typography>
                    </Grid>

                    <StatusSelector
                      control={control}
                      validationErrors={validationErrors}
                      statusMap={statusMap}
                      subStatusMap={subStatusMap}
                      allSubStatusOptions={allSubStatusOptions}
                      statusSubStatusMapping={statusSubStatusMapping}
                    />

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Secretariat Meeting Notes"
                        {...control.register?.('secretariat_meeting_notes')}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Secretariat Follow-up Actions"
                        {...control.register?.('secretariat_follow_up_actions')}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'flex-end',
              pt: 2
            }}>
              <SecondaryButton
                onClick={() => navigate('/admin/appointments/review')}
                size="large"
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                size="large"
                disabled={createAppointmentMutation.isPending || createCalendarEventMutation.isPending}
              >
                {createAppointmentMutation.isPending || createCalendarEventMutation.isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  `Create ${isCalendarEventMode ? 'Event' : 'Appointment'}`
                )}
              </PrimaryButton>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default AdminAppointmentCreateSimple; 