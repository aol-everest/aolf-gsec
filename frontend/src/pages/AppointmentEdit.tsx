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

interface Appointment {
  id: number;
  dignitary_id: number;
  dignitary: Dignitary;
  purpose: string;
  preferred_date: string;
  preferred_time: string;
  appointment_date: string;
  appointment_time: string;
  duration: string;
  location: string;
  pre_meeting_notes: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FOLLOW_UP';
  created_at: string;
  updated_at: string;
}

interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  duration: string;
  location: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FOLLOW_UP';
  pre_meeting_notes: string;
}

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'FOLLOW_UP'] as const;

const AppointmentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

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
          appointment_time: data.appointment_time || data.preferred_time,
          duration: data.duration,
          location: data.location,
          status: data.status,
          pre_meeting_notes: data.pre_meeting_notes,
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
      navigate('/appointment-tiles');
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
        <Box sx={{ 
          // py: 4 
        }}>
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
                    {appointment.dignitary.organization} - {appointment.dignitary.title_in_organization}
                  </Typography>
                </Grid>

                {/* Appointment Date and Time */}
                <Grid item xs={12} md={6}>
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

                <Grid item xs={12} md={6}>
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

                {/* Duration and Location */}
                <Grid item xs={12} md={6}>
                  <Controller
                    name="duration"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Duration"
                        placeholder="e.g., 30 minutes, 1 hour"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Location"
                      />
                    )}
                  />
                </Grid>

                {/* Status */}
                <Grid item xs={12} md={6}>
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

                {/* Notes */}
                <Grid item xs={12}>
                  <Controller
                    name="pre_meeting_notes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        rows={4}
                        label="Pre-meeting Notes"
                      />
                    )}
                  />
                </Grid>

                {/* Buttons */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/appointment-tiles')}
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