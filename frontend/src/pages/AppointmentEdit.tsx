import React, { useState, useEffect } from 'react';
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
  Chip,
} from '@mui/material';
import Layout from '../components/Layout';
import { useForm, Controller } from 'react-hook-form';

interface Dignitary {
  id: number;
  honorific_title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  primary_domain: string;
  title_in_organization: string;
  organization: string;
  bio_summary: string;
  poc_first_name: string;
  poc_last_name: string;
  poc_email: string;
  poc_phone: string;
}

interface Location {
  id: number;
  name: string;
  street_address: string;
  state: string;
  city: string;
  country: string;
  zip_code: string;
  driving_directions?: string;
  parking_info?: string;
}

interface Appointment {
  id: number;
  dignitary_id: number;
  dignitary: Dignitary;
  purpose: string;
  preferred_date: string;
  preferred_time_of_day: string;
  appointment_date: string;
  appointment_time: string;
  location_id: number;
  location?: Location;
  requester_notes_to_secretariat: string;
  status: string;
  secretariat_follow_up_actions: string;
  secretariat_meeting_notes: string;
  secretariat_notes_to_requester: string;
  created_at: string;
  updated_at: string;
}

interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  location_id: number | null;
  status: string;
  requester_notes_to_secretariat: string;
  secretariat_follow_up_actions: string;
  secretariat_meeting_notes: string;
  secretariat_notes_to_requester: string;
}

const AppointmentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const { control, handleSubmit, reset } = useForm<AppointmentFormData>();

  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const response = await fetch('http://localhost:8001/appointments/status-options', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch status options');
        const data = await response.json();
        setStatusOptions(data);
      } catch (error) {
        console.error('Error fetching status options:', error);
      }
    };

    fetchStatusOptions();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('http://localhost:8001/locations/all', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const response = await fetch(`http://localhost:8001/admin/appointments/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch appointment');
        const data = await response.json();
        setAppointment(data);
        reset({
          appointment_date: data.appointment_date || data.preferred_date,
          appointment_time: data.appointment_time || data.preferred_time_of_day,
          location_id: data.location_id || null,
          status: data.status,
          requester_notes_to_secretariat: data.requester_notes_to_secretariat,
          secretariat_follow_up_actions: data.secretariat_follow_up_actions,
          secretariat_meeting_notes: data.secretariat_meeting_notes,
          secretariat_notes_to_requester: data.secretariat_notes_to_requester,
        });
      } catch (error) {
        console.error('Error fetching appointment:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAppointment();
    }
  }, [id, reset]);

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      const response = await fetch(`http://localhost:8001/admin/appointments/update/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update appointment');
      navigate('/admin/appointments/tiles');
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  if (loading || !appointment) {
    return (
      <Layout>
        <Container>
          <Typography>Loading...</Typography>
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
                        label="Notes to Point of Contact"
                      />
                    )}
                  />
                </Grid>

                {/* Buttons */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/admin/appointments/tiles')}
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