import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Chip,
  Divider,
  Grid,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import format from 'date-fns/format';
import isToday from 'date-fns/isToday';
import parseISO from 'date-fns/parseISO';
import startOfDay from 'date-fns/startOfDay';
import Layout from '../components/Layout';
import { getLocalDate } from '../utils/dateUtils';
import { getStatusChipSx } from '../utils/formattingUtils';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';

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

interface Dignitary {
  honorific_title: string;
  first_name: string;
  last_name: string;
  organization: string;
  title_in_organization: string;
}

interface Appointment {
  id: number;
  dignitary: Dignitary;
  purpose: string;
  appointment_date: string;
  appointment_time: string;
  duration: string;
  location: Location;
  status: string;
  requester_notes_to_secretariat?: string;
  secretariat_follow_up_actions?: string;
  secretariat_meeting_notes?: string;
  secretariat_notes_to_requester?: string;
}

const AppointmentDayView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getLocalDate(0));
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: async () => {
      try {
        const { data } = await api.get<Appointment[]>('/admin/appointments/all', {
          params: {
            status: 'APPROVED'
          }
        });
        
        // Filter appointments for the selected date and sort by time
        return data
          .filter((apt) => apt.appointment_date === selectedDate)
          .sort((a, b) => {
            if (!a.appointment_time) return 1;
            if (!b.appointment_time) return -1;
            return a.appointment_time.localeCompare(b.appointment_time);
          });
      } catch (error) {
        console.error('Error fetching appointments:', error);
        enqueueSnackbar('Failed to fetch appointments', { variant: 'error' });
        throw error;
      }
    }
  });

  const formatTime = (time: string) => {
    if (!time) return 'Time TBD';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return time;
    }
  };

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ 
            // py: 3 
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4
          }}>
            <Typography variant="h4" component="h1">
              {isToday(parseISO(selectedDate)) ? "Today's Schedule" : format(parseISO(selectedDate), 'MMMM d, yyyy')}
            </Typography>
            <TextField
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              inputProps={{
                min: getLocalDate(-1),
                max: getLocalDate(365),
              }}
              sx={{ width: 200 }}
            />
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : appointments.length === 0 ? (
            <Paper 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                borderRadius: 2
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No appointments scheduled for this date
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {appointments.map((appointment: Appointment) => (
                <Paper
                  key={appointment.id}
                  elevation={1}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    position: 'relative',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out',
                    },
                  }}
                >
                  <Grid container spacing={3}>
                    {/* Time and Status */}
                    <Grid item xs={12} sm={3}>
                      <Typography variant="h5" color="primary" gutterBottom>
                        {formatTime(appointment.appointment_time)}
                      </Typography>
                      <Chip
                        label={appointment.status}
                        sx={getStatusChipSx(appointment.status, theme)}
                      />
                    </Grid>

                    {/* Dignitary and Purpose */}
                    <Grid item xs={12} sm={9}>
                      <Typography variant="h6" gutterBottom>
                        {appointment.dignitary.honorific_title} {appointment.dignitary.first_name} {appointment.dignitary.last_name}
                      </Typography>
                      <Typography color="text.secondary" gutterBottom>
                        {appointment.dignitary.title_in_organization}, {appointment.dignitary.organization}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body1">
                          <strong>Purpose:</strong> {appointment.purpose}
                        </Typography>
                        {appointment.duration && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            <strong>Duration:</strong> {appointment.duration}
                          </Typography>
                        )}
                        {appointment.location && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Location:</strong> {appointment.location.name} - {appointment.location.city}, {appointment.location.state}
                          </Typography>
                        )}
                        {appointment.requester_notes_to_secretariat && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            <strong>Notes:</strong> {appointment.requester_notes_to_secretariat}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentDayView; 