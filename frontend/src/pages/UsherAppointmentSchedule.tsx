import React, { useState, useEffect, ReactNode } from 'react';
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
  Chip,
  Stack,
  Collapse,
  Button,
  Divider,
} from '@mui/material';
import { format, addDays, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { USHER_DISPLAY_DAYS } from '../constants/formConstants';
import { FilterChip } from '../components/FilterChip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { formatHonorificTitle, getStatusChipSx } from '../utils/formattingUtils';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import { formatTime } from '../utils/dateUtils';

// Define interfaces for the USHER view
interface DignitaryUsherView {
  honorific_title?: string;
  first_name?: string;
  last_name?: string;
  title_in_organization?: string;
  organization?: string;
}

interface RequesterUsherView {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

// Include attendance status in the interface
interface AppointmentDignitaryUsherView {
  id: number;
  dignitary: DignitaryUsherView;
  attendance_status: string;
}

interface UsherAppointmentSchedule {
  id: number;
  appointment_date?: string;
  appointment_time?: string;
  dignitary?: DignitaryUsherView; // Keep for backward compatibility
  appointment_dignitaries?: AppointmentDignitaryUsherView[];
  requester?: RequesterUsherView;
  location?: {
    name: string;
  };
  purpose?: string;
}

// Define attendance status enum for UI display
enum AttendanceStatus {
  PENDING = "Pending",
  CHECKED_IN = "Checked In",
  CANCELLED = "Cancelled",
  NO_SHOW = "No Show"
}

const UsherAppointmentSchedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const today = new Date();
  const [expandedDignitaries, setExpandedDignitaries] = useState<Record<number, boolean>>({});
  const queryClient = useQueryClient();

  // Format dates for display
  const formatDisplayDate = (date: Date) => {
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  // Generate date options for pills (today and next 2 days)
  const dateOptions = [];
  for (let i = 0; i < USHER_DISPLAY_DAYS; i++) {
    const date = addDays(today, i);
    dateOptions.push({
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE, MMM d'),
      fullLabel: formatDisplayDate(date),
      isToday: i === 0,
    });
  }

  // Set default selected date to today on initial load
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(format(today, 'yyyy-MM-dd'));
    }
  }, []);

  // Get appointments for USHER view
  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ['usher-appointments', selectedDate],
    queryFn: async () => {
      try {
        const url = selectedDate 
          ? `/usher/appointments?date=${selectedDate}`
          : '/usher/appointments';
        const response = await api.get(url);
        return response.data as UsherAppointmentSchedule[];
      } catch (error) {
        console.error('Error fetching appointments:', error);
        enqueueSnackbar('Failed to fetch appointments', { variant: 'error' });
        throw error;
      }
    },
    refetchOnMount: true,
    staleTime: 0,
  });

  // Update attendance status mutation
  const updateAttendanceStatusMutation = useMutation({
    mutationFn: async ({ appointmentDignitaryId, status }: { appointmentDignitaryId: number, status: string }) => {
      const response = await api.patch('/usher/dignitaries/checkin', {
        appointment_dignitary_id: appointmentDignitaryId,
        attendance_status: status
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usher-appointments', selectedDate] });
      enqueueSnackbar('Attendance status updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      console.error('Error updating attendance status:', error);
      enqueueSnackbar('Failed to update attendance status', { variant: 'error' });
    }
  });

  // Group appointments by date
  const groupedAppointments = appointments?.reduce((acc, appointment) => {
    if (!appointment.appointment_date) return acc;
    
    if (!acc[appointment.appointment_date]) {
      acc[appointment.appointment_date] = [];
    }
    acc[appointment.appointment_date].push(appointment);
    return acc;
  }, {} as Record<string, UsherAppointmentSchedule[]>) || {};

  // Further group appointments by time
  const groupAppointmentsByTime = (dayAppointments: UsherAppointmentSchedule[]) => {
    return dayAppointments.reduce((acc, appointment) => {
      const time = appointment.appointment_time || 'No time specified';
      if (!acc[time]) {
        acc[time] = [];
      }
      acc[time].push(appointment);
      return acc;
    }, {} as Record<string, UsherAppointmentSchedule[]>);
  };

  // Handle date change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  // Toggle expanded state for a specific appointment
  const toggleExpanded = (appointmentId: number) => {
    setExpandedDignitaries(prev => ({
      ...prev,
      [appointmentId]: !prev[appointmentId]
    }));
  };

  // Handle check-in/undo check-in
  const handleAttendanceStatusChange = (appointmentDignitaryId: number, currentStatus: string) => {
    const newStatus = currentStatus === AttendanceStatus.CHECKED_IN 
      ? AttendanceStatus.PENDING 
      : AttendanceStatus.CHECKED_IN;
    
    updateAttendanceStatusMutation.mutate({ 
      appointmentDignitaryId, 
      status: newStatus 
    });
  };

  // Get a friendly label for the date
  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEE, MMM d');
  };

  // Render check-in button based on attendance status
  const renderCheckinButton = (appointmentDignitary: AppointmentDignitaryUsherView) => {
    const isCheckedIn = appointmentDignitary.attendance_status === AttendanceStatus.CHECKED_IN;
    
    return isCheckedIn ? (
      <SecondaryButton
        size="small"
        startIcon={<UndoIcon />}
        onClick={(e) => {
          e.stopPropagation();
          handleAttendanceStatusChange(appointmentDignitary.id, appointmentDignitary.attendance_status);
        }}
        sx={{ ml: 1 }}
      >
        Undo Check-in
      </SecondaryButton>
    ) : (
      <PrimaryButton
        size="small"
        startIcon={<CheckCircleIcon />}
        onClick={(e) => {
          e.stopPropagation();
          handleAttendanceStatusChange(appointmentDignitary.id, appointmentDignitary.attendance_status);
        }}
        sx={{ ml: 1 }}
      >
        Check in
      </PrimaryButton>
    );
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
              Usher Schedule
            </Typography>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4
          }}>
            <Stack direction="row" spacing={1}>
              {dateOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.isToday ? `Today (${option.label})` : option.label}
                  value={option.value}
                  selectedValue={selectedDate || ''}
                  onToggle={handleDateChange}
                  sx={{ 
                    fontWeight: option.value === selectedDate ? 'bold' : 'normal',
                    fontSize: '0.9rem',
                    py: 0.5,
                    px: 0.5
                  }}
                />
              ))}
            </Stack>
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
                No appointments found for {selectedDate ? getDateLabel(selectedDate) : 'the selected date'}
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.keys(groupedAppointments).sort().map((date) => {
                const timeGroupedAppointments = groupAppointmentsByTime(groupedAppointments[date]);
                
                return (
                  <Box key={date} sx={{ mb: 4 }}>
                    <Grid container spacing={2}>
                      {Object.entries(timeGroupedAppointments)
                        .sort(([timeA], [timeB]) => timeA.localeCompare(timeB))
                        .map(([time, timeAppointments]) => (
                          <>
                            <Grid item xs={12} sm={12} md={12}>
                              <Chip
                                label={formatTime(time)}
                                sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                              />
                            </Grid>
    
                            <Grid item xs={12} key={`${date}-${time}`}>
                              <Paper
                                elevation={2}
                                sx={{ 
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                }}
                              >
                                {timeAppointments.map((appointment, index) => (
                                  <React.Fragment key={appointment.id}>
                                    {index > 0 && <Divider />}
                                    <Box sx={{ p: 3 }}>
                                      <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                          <Typography variant="subtitle1" fontWeight="bold">
                                            {appointment.location?.name || 'Location not specified'}
                                          </Typography>
                                        </Grid>
                                        
                                        <Grid item xs={12} md={6}>
                                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            {appointment.requester && (
                                              <Typography variant="body2" color="text.secondary" align="right">
                                                <strong>Point of Contact:</strong> {appointment.requester.first_name} {appointment.requester.last_name}
                                                {appointment.requester.phone_number && (
                                                  <Typography variant="body2" color="text.secondary">
                                                    {appointment.requester.phone_number}
                                                  </Typography>
                                                )}
                                              </Typography>
                                            )}
                                          </Box>
                                        </Grid>
                                      </Grid>
                                      
                                      <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                          Dignitaries:
                                        </Typography>
                                        
                                        {appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0 ? (
                                          appointment.appointment_dignitaries.map((appointmentDignitary) => {
                                            const dignitary = appointmentDignitary.dignitary;
                                            const isCheckedIn = appointmentDignitary.attendance_status === AttendanceStatus.CHECKED_IN;
                                            
                                            return (
                                              <Box 
                                                key={appointmentDignitary.id} 
                                                sx={{ 
                                                  display: 'flex', 
                                                  justifyContent: 'space-between', 
                                                  alignItems: 'center',
                                                  py: 1,
                                                  borderBottom: '1px solid',
                                                  borderColor: alpha(theme.palette.divider, 0.5),
                                                  '&:last-child': {
                                                    borderBottom: 'none'
                                                  }
                                                }}
                                              >
                                                <Box>
                                                  <Typography variant="body1" fontWeight="medium">
                                                    {formatHonorificTitle(dignitary.honorific_title || '')} {dignitary.first_name} {dignitary.last_name}
                                                  </Typography>
                                                  {(dignitary.title_in_organization || dignitary.organization) && (
                                                    <Typography variant="body2" color="text.secondary">
                                                      {dignitary.title_in_organization && `${dignitary.title_in_organization}`}
                                                      {dignitary.organization && dignitary.title_in_organization && ' - '}
                                                      {dignitary.organization && `${dignitary.organization}`}
                                                    </Typography>
                                                  )}
                                                </Box>
                                                
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                  {isCheckedIn && (
                                                    <Chip 
                                                      label="Checked In" 
                                                      color="success" 
                                                      size="small" 
                                                      sx={{ mr: 1 }}
                                                    />
                                                  )}
                                                  {renderCheckinButton(appointmentDignitary)}
                                                </Box>
                                              </Box>
                                            );
                                          })
                                        ) : appointment.dignitary ? (
                                          // For backward compatibility
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                                            <Typography variant="body1" fontWeight="medium">
                                              {formatHonorificTitle(appointment.dignitary.honorific_title || '')} {appointment.dignitary.first_name} {appointment.dignitary.last_name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                              (Unable to check in - legacy record)
                                            </Typography>
                                          </Box>
                                        ) : (
                                          <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            No dignitary information
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  </React.Fragment>
                                ))}
                              </Paper>
                            </Grid>
                          </>
                        ))}
                    </Grid>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default UsherAppointmentSchedule; 