import React, { useState, useEffect } from 'react';
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
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import { format, addDays, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { USHER_DISPLAY_DAYS } from '../constants/formConstants';
import { FilterChip } from '../components/FilterChip';
import { formatHonorificTitle } from '../utils/formattingUtils';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import { formatTime } from '../utils/dateUtils';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import PersonIcon from '@mui/icons-material/Person';
import { UserIconSquareCircleV2, CirclePhoneFlipIconV2, CheckSquareCircleFilledIconV2 } from '../components/iconsv2';

// Define interfaces for the USHER view
interface DignitaryUsherView {
  id: number;
  honorific_title?: string;
  first_name?: string;
  last_name?: string;
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
}

// Define attendance status enum for UI display
enum AttendanceStatus {
  PENDING = "Pending",
  CHECKED_IN = "Checked In",
  CANCELLED = "Cancelled",
  NO_SHOW = "No Show"
}

// Type for grouped dignitaries by time slot
type DignitaryByTimeSlot = {
  [timeSlot: string]: {
    [dignitaryId: number]: {
      appointmentDignitaryIds: number[];
      dignitary: DignitaryUsherView;
      status: string;
      locations: Set<string>;
      appointmentIds: Set<number>;
      requester: RequesterUsherView | null;
    }
  }
};

const UsherAppointmentSchedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedPOCs, setExpandedPOCs] = useState<Record<string, boolean>>({});
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const today = new Date();
  const queryClient = useQueryClient();

  // Handle expanding/collapsing POC details
  const togglePOCDetails = (timeSlot: string, dignitaryId: string) => {
    const key = `${timeSlot}-${dignitaryId}`;
    setExpandedPOCs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Check if POC details are expanded
  const isPOCExpanded = (timeSlot: string, dignitaryId: string) => {
    const key = `${timeSlot}-${dignitaryId}`;
    return !!expandedPOCs[key];
  };

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

  // Group dignitaries by time slot
  const groupDignitariesByTimeSlot = (dayAppointments: UsherAppointmentSchedule[]): DignitaryByTimeSlot => {
    return dayAppointments.reduce((acc, appointment) => {
      const time = appointment.appointment_time || 'No time specified';
      
      if (!acc[time]) {
        acc[time] = {};
      }
      
      // Process each dignitary in the appointment
      if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
        appointment.appointment_dignitaries.forEach(appointmentDignitary => {
          const dignitary = appointmentDignitary.dignitary;
          const dignitaryId = dignitary.id;
          
          if (!acc[time][dignitaryId]) {
            // First time seeing this dignitary at this time slot
            acc[time][dignitaryId] = {
              appointmentDignitaryIds: [appointmentDignitary.id],
              dignitary: dignitary,
              status: appointmentDignitary.attendance_status,
              locations: new Set([appointment.location?.name || 'Location not specified']),
              appointmentIds: new Set([appointment.id]),
              requester: appointment.requester || null
            };
          } else {
            // Dignitary already exists in this time slot, add this appointment
            acc[time][dignitaryId].appointmentDignitaryIds.push(appointmentDignitary.id);
            
            // Update status if any appointment has checked in the dignitary
            if (appointmentDignitary.attendance_status === AttendanceStatus.CHECKED_IN) {
              acc[time][dignitaryId].status = AttendanceStatus.CHECKED_IN;
            }
            
            // Add location if not already in the set
            if (appointment.location?.name) {
              acc[time][dignitaryId].locations.add(appointment.location.name);
            }
            
            acc[time][dignitaryId].appointmentIds.add(appointment.id);
          }
        });
      }
      
      return acc;
    }, {} as DignitaryByTimeSlot);
  };

  // Handle date change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  // Handle check-in/undo check-in for a dignitary across all their appointment_dignitary records
  const handleAttendanceStatusChange = async (
    timeSlot: string, 
    dignitaryId: number, 
    currentStatus: string, 
    appointmentDignitaryIds: number[]
  ) => {
    const newStatus = currentStatus === AttendanceStatus.CHECKED_IN 
      ? AttendanceStatus.PENDING 
      : AttendanceStatus.CHECKED_IN;
    
    // Create an array of promises for all appointment_dignitary updates
    const updatePromises = appointmentDignitaryIds.map(id => 
      updateAttendanceStatusMutation.mutateAsync({ 
        appointmentDignitaryId: id, 
        status: newStatus 
      })
    );

    try {
      // Wait for all updates to complete
      await Promise.allSettled(updatePromises);
      
      // Show success message
      const action = newStatus === AttendanceStatus.CHECKED_IN ? 'checked in' : 'marked as pending';
      enqueueSnackbar(`Dignitary ${action} successfully`, { variant: 'success' });
    } catch (error) {
      console.error('Error updating some attendance statuses:', error);
      // We still consider the dignitary checked in even if some updates failed
      enqueueSnackbar('Not all appointment records were updated, but dignitary status was changed', { variant: 'warning' });
    }
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
  const renderCheckinButton = (
    timeSlot: string,
    dignitaryId: number, 
    status: string, 
    appointmentDignitaryIds: number[]
  ) => {
    
    const isCheckedIn = status === AttendanceStatus.CHECKED_IN;
    
    return isCheckedIn ? (
      <SecondaryButton
        size="small"
        startIcon={<UndoIcon />}
        onClick={() => handleAttendanceStatusChange(timeSlot, dignitaryId, status, appointmentDignitaryIds)}
        sx={{ ml: 1 }}
      >
        Undo Check-in
      </SecondaryButton>
    ) : (
      <PrimaryButton
        size="small"
        startIcon={<CheckCircleIcon />}
        onClick={() => handleAttendanceStatusChange(timeSlot, dignitaryId, status, appointmentDignitaryIds)}
        sx={{ ml: 1 }}
      >
        Check-in
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
                const dignitariesByTimeSlot = groupDignitariesByTimeSlot(groupedAppointments[date]);
                
                return (
                  <Box key={date} sx={{ mb: 4 }}>
                    <Grid container spacing={2}>
                      {Object.entries(dignitariesByTimeSlot)
                        .sort(([timeA], [timeB]) => timeA.localeCompare(timeB))
                        .map(([time, dignitaries]) => (
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
                                <Box sx={{ 
                                  p: 2,
                                  border: '1px solid',
                                  borderColor: 'rgba(0, 0, 0, 0.05)',
                                  borderRadius: 2,
                                }}>
                                  <Box sx={{ mt: 0 }}>
                                    <Typography variant="h5" color="text.secondary">
                                      Dignitaries:
                                    </Typography>
                                    
                                    {Object.entries(dignitaries).map(([dignitaryId, data]) => {
                                      const { dignitary, status, appointmentDignitaryIds, locations, requester } = data;
                                      const isCheckedIn = status === AttendanceStatus.CHECKED_IN;
                                      const isPOCDetailsExpanded = isPOCExpanded(time, dignitaryId);
                                      const hasPOC = !!requester;
                                      
                                      return (
                                        <Box 
                                          key={dignitaryId} 
                                          sx={{ 
                                            p: 1.3,
                                            mt: 1,
                                            border: '1px solid',
                                            borderColor: 'rgba(0, 0, 0, 0.05)',
                                            borderRadius: 2,
                                            '&:last-child': {
                                              borderBottom: 'none'
                                            }
                                          }}
                                        >
                                          {/* Main dignitary info with responsive layout */}
                                          <Box sx={{ 
                                            display: 'flex', 
                                            flexDirection: { xs: 'column', sm: 'row' },
                                            justifyContent: 'space-between', 
                                            alignItems: { xs: 'flex-start', sm: 'center' },
                                          }}>
                                            {/* Dignitary name and POC toggle */}
                                            <Box sx={{ flexGrow: 1, width: { xs: '100%', sm: 'auto', md: 'auto' } }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: '500', color: theme.palette.text.primary }}>
                                                  {isCheckedIn && (
                                                    <CheckSquareCircleFilledIconV2 sx={{ color: 'success.main', mr: 1 }} />
                                                  )}
                                                  {formatHonorificTitle(dignitary.honorific_title || '')} {dignitary.first_name} {dignitary.last_name}
                                                </Typography>                                                
                                              </Box>
                                              {/* <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                <strong>Location{locations.size > 1 ? 's' : ''}:</strong> {Array.from(locations).join(', ')}
                                              </Typography> */}
                                            </Box>
                                            
                                            {/* Check-in button and status */}
                                            <Box sx={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              justifyContent: 'flex-end',
                                              ml: { xs: 0, sm: 2 },
                                              mt: { xs: 1, sm: 0 },
                                              width: { xs: '100%', sm: 'auto', md: 'auto' },
                                            }}>
                                              {hasPOC && (
                                                <IconButton
                                                  size="small"
                                                  color="primary"
                                                  onClick={() => togglePOCDetails(time, dignitaryId)}
                                                  sx={{ ml: 1 }}
                                                >
                                                  {isPOCDetailsExpanded ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                                                </IconButton>
                                              )}
                                              {renderCheckinButton(time, parseInt(dignitaryId), status, appointmentDignitaryIds)}
                                            </Box>
                                          </Box>
                                          
                                          {/* POC details in collapsible section */}
                                          {hasPOC && (
                                            <Collapse in={isPOCDetailsExpanded}>
                                              <Box 
                                                sx={{ 
                                                  mt: 1, 
                                                  pl: 2, 
                                                  py: 1, 
                                                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                                                  borderRadius: 1
                                                }}
                                              >
                                                <Box sx={{ pl: 1, color: 'text.secondary' }}>
                                                  <Grid container spacing={1}>
                                                    <Grid item xs={12} md={4}>
                                                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                                                        <UserIconSquareCircleV2 sx={{ mr: 1, width: '1.2rem', height: '1.2rem' }} /> Point of Contact: {requester.first_name} {requester.last_name} 
                                                      </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} md={4}>
                                                      <Typography component="a" variant="body2" href={`tel:${requester.phone_number}`} sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'flex-start',
                                                        textDecoration: 'none',
                                                        color: theme.palette.text.secondary
                                                      }}>
                                                        <CirclePhoneFlipIconV2 sx={{ mr: 1, width: '1.2rem', height: '1.2rem' }} /> {requester.phone_number}
                                                      </Typography>
                                                    </Grid>
                                                  </Grid>
                                                </Box>
                                              </Box>
                                            </Collapse>
                                          )}
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                </Box>
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