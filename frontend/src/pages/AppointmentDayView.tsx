import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import format from 'date-fns/format';
import isToday from 'date-fns/isToday';
import parseISO from 'date-fns/parseISO';
import startOfDay from 'date-fns/startOfDay';
import Layout from '../components/Layout';
import { getLocalDate } from '../utils/dateUtils';

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
  location: string;
  status: string;
  pre_meeting_notes?: string;
}

const AppointmentDayView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getLocalDate(0));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch('http://localhost:8001/admin/appointments/all', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Filter appointments for the selected date and sort by time
          const filteredData = data
            .filter((apt: Appointment) => apt.appointment_date === selectedDate)
            .sort((a: Appointment, b: Appointment) => {
              if (!a.appointment_time) return 1;
              if (!b.appointment_time) return -1;
              return a.appointment_time.localeCompare(b.appointment_time);
            });
          setAppointments(filteredData);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [selectedDate]);

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'PENDING': theme.palette.warning.main,
      'APPROVED': theme.palette.success.main,
      'REJECTED': theme.palette.error.main,
      'FOLLOW_UP': theme.palette.info.main,
    };
    return statusColors[status] || theme.palette.grey[500];
  };

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
        <Box sx={{ py: 3 }}>
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
                min: getLocalDate(-1), // Allow viewing past 1 day appointments
                max: getLocalDate(365),  // Allow viewing next year's appointments
              }}
              sx={{ width: 200 }}
            />
          </Box>

          {appointments.length === 0 ? (
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
              {appointments.map((appointment, index) => (
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
                        sx={{
                          bgcolor: alpha(getStatusColor(appointment.status), 0.1),
                          color: getStatusColor(appointment.status),
                          fontWeight: 500,
                        }}
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
                            <strong>Location:</strong> {appointment.location}
                          </Typography>
                        )}
                        {appointment.pre_meeting_notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            <strong>Notes:</strong> {appointment.pre_meeting_notes}
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