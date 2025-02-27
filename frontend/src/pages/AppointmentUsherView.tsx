import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { format, addDays, parseISO } from 'date-fns';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';

// Define interfaces for the USHER view
interface DignitaryUsherView {
  honorific_title?: string;
  first_name: string;
  last_name: string;
}

interface RequesterUsherView {
  first_name: string;
  last_name: string;
  phone_number?: string;
}

interface AppointmentUsherView {
  id: number;
  appointment_date?: string;
  appointment_time?: string;
  dignitary: DignitaryUsherView;
  requester: RequesterUsherView;
  location?: {
    name: string;
  };
}

const AppointmentUsherView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const today = new Date();

  // Get appointments for USHER view
  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ['usher-appointments', selectedDate],
    queryFn: async () => {
      try {
        const url = selectedDate 
          ? `/usher/appointments?date=${selectedDate}`
          : '/usher/appointments';
        const response = await api.get(url);
        return response.data as AppointmentUsherView[];
      } catch (error) {
        console.error('Error fetching appointments:', error);
        enqueueSnackbar('Failed to fetch appointments', { variant: 'error' });
        throw error;
      }
    },
    refetchOnMount: true,
    staleTime: 0,
  });

  // Format dates for display
  const formatDisplayDate = (date: Date) => {
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  // Group appointments by date
  const groupedAppointments = appointments?.reduce((acc, appointment) => {
    if (!appointment.appointment_date) return acc;
    
    if (!acc[appointment.appointment_date]) {
      acc[appointment.appointment_date] = [];
    }
    acc[appointment.appointment_date].push(appointment);
    return acc;
  }, {} as Record<string, AppointmentUsherView[]>) || {};

  // Generate date options for the dropdown
  const dateOptions = [];
  for (let i = -7; i <= 14; i++) {
    const date = addDays(today, i);
    dateOptions.push({
      value: format(date, 'yyyy-MM-dd'),
      label: formatDisplayDate(date),
    });
  }

  // Handle date change
  const handleDateChange = (event: SelectChangeEvent) => {
    setSelectedDate(event.target.value);
  };

  // Format dignitary name
  const formatDignitaryName = (dignitary: DignitaryUsherView) => {
    const honorific = dignitary.honorific_title || '';
    return `${honorific} ${dignitary.first_name} ${dignitary.last_name}`.trim();
  };

  if (isLoading) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Box sx={{ mt: 2 }}>
            <Alert severity="error">Error loading appointments</Alert>
          </Box>
        </Container>
      </Layout>
    );
  }

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
              Appointments Schedule
            </Typography>
            <Box sx={{ width: 300 }}>
              <FormControl fullWidth>
                <InputLabel id="date-select-label">Select Date</InputLabel>
                <Select
                  labelId="date-select-label"
                  value={selectedDate || ''}
                  label="Select Date"
                  onChange={handleDateChange}
                >
                  <MenuItem value="">Today and Next Two Days</MenuItem>
                  {dateOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {Object.keys(groupedAppointments).length === 0 ? (
            <Paper 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                borderRadius: 2
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No appointments found for the selected period
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.keys(groupedAppointments).sort().map((date) => (
                <Box key={date} sx={{ mb: 4 }}>
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    {formatDisplayDate(parseISO(date))}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {groupedAppointments[date].map((appointment) => (
                      <Grid item xs={12} key={appointment.id}>
                        <Paper
                          elevation={2}
                          sx={{ 
                            p: 3, 
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateY(-2px)',
                            }
                          }}
                        >
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {appointment.appointment_time || 'Time not specified'}
                              </Typography>
                              <Typography variant="body1">
                                {appointment.location?.name || 'Location not specified'}
                              </Typography>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                              <Typography variant="subtitle2" color="text.secondary">
                                Dignitary
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {formatDignitaryName(appointment.dignitary)}
                              </Typography>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                              <Typography variant="subtitle2" color="text.secondary">
                                Point of Contact
                              </Typography>
                              <Typography variant="body1">
                                {appointment.requester.first_name} {appointment.requester.last_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {appointment.requester.phone_number || 'No phone number'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentUsherView; 