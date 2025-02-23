import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import Layout from '../components/Layout';
import { useForm, Controller } from 'react-hook-form';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminAppointmentsReviewRoute } from '../config/routes';
import { Appointment, Location } from '../models/types';

interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  location_id: number | null;
  status: string;
  sub_status: string;
  appointment_type: string;
  requester_notes_to_secretariat: string;
  secretariat_follow_up_actions: string;
  secretariat_meeting_notes: string;
  secretariat_notes_to_requester: string;
}

const AppointmentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset } = useForm<AppointmentFormData>();

  // Fetch status options
  const { data: statusOptions = [] } = useQuery<string[]>({
    queryKey: ['status-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/status-options');
      return data;
    },
  });

  // Fetch sub-status options
  const { data: subStatusOptions = [] } = useQuery<string[]>({
    queryKey: ['sub-status-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/sub-status-options');
      return data;
    },
  });

  // Fetch appointment type options
  const { data: appointmentTypeOptions = [] } = useQuery<string[]>({
    queryKey: ['type-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/type-options');
      return data;
    },
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get<Location[]>('/locations/all');
      return data;
    },
  });

  // Fetch appointment
  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data } = await api.get<Appointment>(`/admin/appointments/${id}`);
      reset({
        appointment_date: data.appointment_date || data.preferred_date,
        appointment_time: data.appointment_time || data.preferred_time_of_day,
        location_id: data.location_id || null,
        status: data.status,
        sub_status: data.sub_status,
        appointment_type: data.appointment_type,
        requester_notes_to_secretariat: data.requester_notes_to_secretariat,
        secretariat_follow_up_actions: data.secretariat_follow_up_actions,
        secretariat_meeting_notes: data.secretariat_meeting_notes,
        secretariat_notes_to_requester: data.secretariat_notes_to_requester,
      });
      return data;
    },
    enabled: !!id,
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const { data: response } = await api.patch(`/admin/appointments/update/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      enqueueSnackbar('Appointment updated successfully', { variant: 'success' });
      navigate(AdminAppointmentsReviewRoute.path || '');
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      enqueueSnackbar('Failed to update appointment', { variant: 'error' });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    updateAppointmentMutation.mutate(data);
  };

  if (isLoading || !appointment) {
    return (
      <Layout>
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container>
        <Box>
          <Typography variant="h4" gutterBottom>
            Edit Appointment
          </Typography>
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Paper elevation={0} sx={{ p: 0, mb: 2, border: 'none', boxShadow: 'none', borderRadius: 0, bgcolor: 'transparent' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" gutterBottom color="primary">
                  Request #: {appointment.id}
                </Typography>
              </Box>
            </Paper>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={3}>
                {/* Dignitary Information (Read-only) */}
                <Grid item xs={12} sx={{ pb: 1 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Dignitary
                  </Typography>
                  <Typography>
                    {appointment.dignitary.honorific_title} {appointment.dignitary.first_name} {appointment.dignitary.last_name}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {appointment.dignitary.organization} - {appointment.dignitary.title_in_organization} | {appointment.dignitary.email} | {appointment.dignitary.phone}
                  </Typography>
                  {appointment.requester_notes_to_secretariat && (
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">Pre-meeting Notes</Typography>
                      <Typography>{appointment.requester_notes_to_secretariat}</Typography>
                    </Grid>
                  )}
                </Grid>

                {/* Appointment Date and Time */}
                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="appointment_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Appointment Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="appointment_time"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Appointment Time"
                        type="time"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="location_id"
                    control={control}
                    defaultValue={null}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Location</InputLabel>
                        <Select
                          {...field}
                          value={field.value || ''}
                          label="Location"
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {locations.map((location) => (
                            <MenuItem key={location.id} value={location.id}>
                              {`${location.name} - ${location.city}, ${location.state}, ${location.country}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Status */}
                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select {...field} label="Status">
                          {statusOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Sub-Status */}
                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="sub_status"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Sub-Status</InputLabel>
                        <Select {...field} label="Sub-Status">
                          {subStatusOptions.map((subStatus) => (
                            <MenuItem key={subStatus} value={subStatus}>
                              {subStatus}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Appointment Type */}
                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="appointment_type"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Appointment Type</InputLabel>
                        <Select {...field} label="Appointment Type">
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {appointmentTypeOptions.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="secretariat_notes_to_requester"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field} 
                        fullWidth
                        multiline
                        rows={4}
                        label="Notes to Point of Contact (shared with Point of Contact)"
                      />
                    )}
                  />
                </Grid>

                {appointment.status === 'Approved' && appointment.appointment_date && new Date(appointment.appointment_date) >= new Date() && (
                  <Grid item xs={12}>
                    <Controller
                      name="secretariat_follow_up_actions"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={4}
                          label="Follow-up Actions (Secretariat Internal)"
                        />
                      )}
                    />
                  </Grid>
                )}

                {appointment.status === 'Approved' && appointment.appointment_date && new Date(appointment.appointment_date) >= new Date() && (
                  <Grid item xs={12}>
                    <Controller
                      name="secretariat_meeting_notes"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={4}
                          label="Meeting Notes (Secretariat Internal)"
                        />  
                      )}
                    />
                  </Grid>
                )}

                {/* Buttons */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(AdminAppointmentsReviewRoute.path || '')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                    >
                      Save Changes
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentEdit; 