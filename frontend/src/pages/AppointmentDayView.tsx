import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Chip,
  Grid,
  useTheme,
  alpha,
  CircularProgress,
  Collapse,
} from '@mui/material';
import format from 'date-fns/format';
import isToday from 'date-fns/isToday';
import parseISO from 'date-fns/parseISO';
import Layout from '../components/Layout';
import { getLocalDate, formatTime } from '../utils/dateUtils';
import { getStatusChipSx } from '../utils/formattingUtils';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import { Appointment } from '../models/types';
import AppointmentCard from '../components/AppointmentCard';

const AppointmentDayView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getLocalDate(0));
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<number | null>(null);
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

  const handleAppointmentClick = (appointmentId: number) => {
    setExpandedAppointmentId(expandedAppointmentId === appointmentId ? null : appointmentId);
  };

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box>
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
                <React.Fragment key={appointment.id}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out',
                      },
                    }}
                    onClick={() => handleAppointmentClick(appointment.id)}
                  >
                    <Grid container spacing={3}>
                      {/* Time and Status */}
                      <Grid item xs={12} sm={3}>
                        <Typography variant="h5" color="primary" gutterBottom>
                          {formatTime(appointment.appointment_time)}
                        </Typography>
                        {/* <Chip
                          label={appointment.status}
                          sx={getStatusChipSx(appointment.status, theme)}
                        /> */}
                      </Grid>

                      {/* Dignitary and Purpose */}
                      <Grid item xs={12} sm={9}>
                        <Typography variant="h6" gutterBottom>
                          {appointment.dignitary.honorific_title} {appointment.dignitary.first_name} {appointment.dignitary.last_name}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          Title: {appointment.dignitary.title_in_organization}, Organization: {appointment.dignitary.organization}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body1">
                            <strong>Purpose:</strong> {appointment.purpose}
                          </Typography>
                          {appointment.location && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Location:</strong> {appointment.location.name} - {appointment.location.city}, {appointment.location.state}
                            </Typography>
                          )}
                          {appointment.requester_notes_to_secretariat && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              <strong>Notes from Point of Contact:</strong> {appointment.requester_notes_to_secretariat}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                  <Collapse in={expandedAppointmentId === appointment.id}>
                    <Box sx={{ mt: -2, mb: 2 }}>
                      <AppointmentCard appointment={appointment} theme={theme} />
                    </Box>
                  </Collapse>
                </React.Fragment>
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentDayView; 