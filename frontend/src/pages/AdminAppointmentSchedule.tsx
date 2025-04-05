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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import format from 'date-fns/format';
import isToday from 'date-fns/isToday';
import parseISO from 'date-fns/parseISO';
import isPast from 'date-fns/isPast';
import isFuture from 'date-fns/isFuture';
import Layout from '../components/Layout';
import { getLocalDateString, formatTime } from '../utils/dateUtils';
import { formatHonorificTitle, getStatusChipSx } from '../utils/formattingUtils';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Appointment, AppointmentDignitary, StatusMap, SubStatusMap, StatusSubStatusMapping } from '../models/types';
import AppointmentCard from '../components/AppointmentCard';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { AdminAppointmentUpdate } from '../models/types';

const AdminAppointmentSchedule: React.FC = () => {
  
  const [appointmentUpdateData, setAppointmentUpdateData] = useState<AdminAppointmentUpdate>({});

  const { data: statusMap } = useQuery<StatusMap>({
    queryKey: ['status-map'],
    queryFn: async () => {
      const { data } = await api.get<StatusMap>('/appointments/status-options-map');
      return data;
    }
  });

  const { data: subStatusMap } = useQuery<SubStatusMap>({
    queryKey: ['sub-status-map'],
    queryFn: async () => {
      const { data } = await api.get<SubStatusMap>('/appointments/sub-status-options-map');
      return data;
    }
  });

  console.log('subStatusMap', subStatusMap);

  const [selectedDate, setSelectedDate] = useState(getLocalDateString(0));
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<number | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const theme = useTheme();
  const api = useApi();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: async () => {
      try {
        const { data } = await api.get<Appointment[]>('/admin/appointments/all', {
          params: {
            status: 'APPROVED,COMPLETED'
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

  // Fetch status-substatus mapping from the API
  const { data: statusSubStatusMapping } = useQuery<StatusSubStatusMapping>({
    queryKey: ['status-substatus-mapping'],
    queryFn: async () => {
      const { data } = await api.get<StatusSubStatusMapping>('/appointments/status-substatus-mapping');
      return data;
    }
  });

  // Get completed substatus options
  const completedSubStatusOptions = statusSubStatusMapping && 'COMPLETED' in statusSubStatusMapping 
    ? statusSubStatusMapping['COMPLETED'].valid_sub_statuses 
    : ['No further action', 'Follow-up required'];

  const handleAppointmentClick = (appointmentId: number) => {
    setExpandedAppointmentId(expandedAppointmentId === appointmentId ? null : appointmentId);
  };

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AdminAppointmentUpdate) => {
      const { data: response } = await api.patch(`/admin/appointments/update/${data.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', selectedDate] });
      enqueueSnackbar('Appointment marked as completed', { variant: 'success' });
      setCompletionDialogOpen(false);
      setSelectedAppointment(null);
      setAppointmentUpdateData({});
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      enqueueSnackbar('Failed to update appointment', { variant: 'error' });
    },
  });

  const openCompletionDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentUpdateData({
      id: appointment.id,
      status: (statusMap ? statusMap['COMPLETED'] : ''),
      sub_status: (subStatusMap ? subStatusMap['NO_FURTHER_ACTION'] : (appointment.sub_status || '')),
      secretariat_meeting_notes: appointment.secretariat_meeting_notes || '',
      secretariat_follow_up_actions: appointment.secretariat_follow_up_actions || ''
    });
    setCompletionDialogOpen(true);
  };

  const handleMarkAsCompleted = () => {
    if (selectedAppointment && statusMap) {
      updateAppointmentMutation.mutate(appointmentUpdateData);
    }
  };

  const handleEditAppointment = () => {
    if (selectedAppointment && statusMap) {
      const navigationState = {
        status: appointmentUpdateData?.status || '',
        sub_status: appointmentUpdateData?.sub_status || '',
        secretariat_meeting_notes: appointmentUpdateData?.secretariat_meeting_notes || '', 
        secretariat_follow_up_actions: appointmentUpdateData?.secretariat_follow_up_actions || ''
      };
      
      console.log('Navigating to edit with state:', navigationState);
      
      navigate(`/admin/appointments/edit/${selectedAppointment.id}`, {
        state: navigationState
      });
      setCompletionDialogOpen(false);
    }
  };

  // Helper function to check if appointment is in the past
  const isAppointmentInPast = (appointment: Appointment): boolean => {
    if (!appointment.appointment_date || !appointment.appointment_time) return false;
    
    const appointmentDateTime = new Date(
      `${appointment.appointment_date}T${appointment.appointment_time}`
    );
    return isPast(appointmentDateTime);
  };

  // Helper function to render dignitary info for display
  const renderDignitaryInfo = (appointment: Appointment) => {
    // First check if appointment has appointment_dignitaries
    if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
      const primaryDignitary = appointment.appointment_dignitaries[0].dignitary;
      const dignitaryCount = appointment.appointment_dignitaries.length;
      
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
          <Typography variant="h6" gutterBottom>
            {formatHonorificTitle(primaryDignitary.honorific_title)} {primaryDignitary.first_name} {primaryDignitary.last_name}
            {dignitaryCount > 1 && (
              <Typography component="span" color="text.secondary" sx={{ ml: 1, fontSize: '0.8rem' }}>
                (+{dignitaryCount - 1} more)
              </Typography>
            )}
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            Title: {primaryDignitary.title_in_organization}, Organization: {primaryDignitary.organization}
          </Typography>
        </Box>
      );
    }
    // No dignitary information available
    else {
      return (
        <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No dignitary information available
        </Typography>
      );
    }
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
                min: getLocalDateString(-7),
                max: getLocalDateString(365),
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                    <Grid container spacing={1.3}>
                      {/* Time and Status */}
                      <Grid item xs={5} sm={6} md={6}>
                        <Chip
                          label={formatTime(appointment.appointment_time)}
                          sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                        />
                      </Grid>
                      <Grid item xs={7} sm={6} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 0 }}>
                        {statusMap && appointment.status === statusMap['COMPLETED'] ? (
                          <Chip
                            label={appointment.status}
                            sx={getStatusChipSx(appointment.status, theme)}
                          />
                        ) : statusMap && isAppointmentInPast(appointment) && appointment.status === statusMap['APPROVED'] && (
                          <PrimaryButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCompletionDialog(appointment);
                            }}
                          >
                            Mark as Completed
                          </PrimaryButton>
                        )}
                      </Grid>

                      {/* Dignitary and Purpose */}
                      <Grid item xs={12} sm={12}>
                        {renderDignitaryInfo(appointment)}
                        <Box sx={{ mt: 0 }}>
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

      {/* Mark As Completed Dialog */}
      <Dialog 
        open={completionDialogOpen} 
        onClose={() => setCompletionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mark Appointment as Completed</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography gutterBottom>
              Please select the appropriate sub-status for this completed appointment:
            </Typography>
            <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
              <InputLabel>Sub-Status</InputLabel>
              <Select
                value={appointmentUpdateData?.sub_status || (subStatusMap ? subStatusMap['NO_FURTHER_ACTION'] : '')}
                onChange={(e) => setAppointmentUpdateData({
                  ...appointmentUpdateData,
                  sub_status: e.target.value
                })}
                label="Sub-Status"
              >
                {completedSubStatusOptions.map((option: string) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Meeting Notes"
              multiline
              rows={3}
              fullWidth
              value={appointmentUpdateData?.secretariat_meeting_notes || ''}
              onChange={(e) => setAppointmentUpdateData({
                ...appointmentUpdateData,
                secretariat_meeting_notes: e.target.value
              })}
              placeholder="Enter any notes from the meeting"
              sx={{ mb: 3 }}
            />
            
            {subStatusMap && appointmentUpdateData?.sub_status === subStatusMap['FOLLOW_UP_REQUIRED'] && (
              <TextField
                label="Follow-up Actions"
                multiline
                rows={3}
                fullWidth
                value={appointmentUpdateData?.secretariat_follow_up_actions || ''}
                onChange={(e) => setAppointmentUpdateData({
                  ...appointmentUpdateData,
                  secretariat_follow_up_actions: e.target.value
                })}
                placeholder="Enter required follow-up actions"
                required
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <SecondaryButton size="small" onClick={() => setCompletionDialogOpen(false)} color="inherit">
            Cancel
          </SecondaryButton>
          <SecondaryButton size="small" onClick={handleEditAppointment} color="primary">
            Edit Details
          </SecondaryButton>
          <PrimaryButton size="small" onClick={handleMarkAsCompleted} color="primary">
            Save
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default AdminAppointmentSchedule; 
