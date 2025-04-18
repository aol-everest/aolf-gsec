import React, { useState, useEffect, useRef } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  useMediaQuery,
  Backdrop,
  Portal,
} from '@mui/material';
import format from 'date-fns/format';
import isToday from 'date-fns/isToday';
import parseISO from 'date-fns/parseISO';
import isPast from 'date-fns/isPast';
import isFuture from 'date-fns/isFuture';
import addDays from 'date-fns/addDays';
import subDays from 'date-fns/subDays';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import SwipeableViews from 'react-swipeable-views';
import Layout from '../components/Layout';
import { getLocalDateString, formatTime } from '../utils/dateUtils';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Appointment, AppointmentDignitary, StatusMap, SubStatusMap, StatusSubStatusMapping } from '../models/types';
import AppointmentCard from '../components/AppointmentCard';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { AdminAppointmentUpdate } from '../models/types';
import { CheckSquareCircleFilledIconV2, ClockSquareCircleIconV2, CloseIconFilledCircleV2, ContactCardIconV2, ListIconV2, PeopleMenuIconV2 } from '../components/iconsv2';
import { debugLog } from '../utils/debugUtils';
import { AppointmentStatusChip } from '../components/AppointmentStatusChip';
import { AppointmentTimeChip } from '../components/AppointmentTimeChip';
import GridItemIconText from '../components/GridItemIconText';

type AppointmentCardDimensions = {
  left: number | null;
  right: number | null;
  top: number | null;
  bottom: number | null;
  width: number | null;
  height: number | null;
};

const AdminAppointmentSchedule: React.FC = () => {
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [appointmentUpdateData, setAppointmentUpdateData] = useState<AdminAppointmentUpdate>({});
  const [daysToShow, setDaysToShow] = useState<number>(isMobile ? 1 : 3);
  const [startDate, setStartDate] = useState(getLocalDateString(0));
  const [datesToShow, setDatesToShow] = useState<string[]>([startDate]);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Update dates to show when start date or days to show changes
  useEffect(() => {
    const newDates = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = format(addDays(parseISO(startDate), i), 'yyyy-MM-dd');
      newDates.push(date);
    }
    setDatesToShow(newDates);
  }, [startDate, daysToShow]);

  // Update daysToShow when screen size changes
  useEffect(() => {
    setDaysToShow(isMobile ? 1 : 3);
  }, [isMobile]);

  const [expandedAppointment, setExpandedAppointment] = useState<Appointment | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const api = useApi();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [appointmentCardDimensions, setAppointmentCardDimensions] = useState<AppointmentCardDimensions>({
    left: null,
    right: null,
    top: null,
    bottom: null,
    width: null,
    height: null
  });

  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['appointments', datesToShow.join(',')],
    queryFn: async () => {
      try {
        const { data } = await api.get<Appointment[]>('/admin/appointments/all', {
          params: {
            status: 'APPROVED,COMPLETED'
          }
        });
        
        // Filter appointments for the selected dates
        return data
          .filter((apt) => datesToShow.includes(apt.appointment_date))
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

  // Group appointments by date
  const appointmentsByDate = datesToShow.reduce((acc, date) => {
    acc[date] = allAppointments.filter(apt => apt.appointment_date === date);
    return acc;
  }, {} as Record<string, Appointment[]>);

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

  const handleAppointmentClick = (appointment: Appointment, event: React.MouseEvent) => {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const gapToEdge = 16;
    const maxCardWidth = 650;
    const maxCardHeight = 700;
    const bannerOffset = 56;
    const filtersOffset = 130;
    
    let dimensions: AppointmentCardDimensions = {
      left: null,
      right: null,
      top: null,
      bottom: null,
      width: null,
      height: null
    };

    if (isMobile) {
      // Fixed position on mobile
      dimensions.width = window.innerWidth * 0.99;
      dimensions.height = (window.innerHeight - bannerOffset) * 0.99;
      dimensions.left = (window.innerWidth - dimensions.width) / 2;
      dimensions.top = (((window.innerHeight - bannerOffset) - dimensions.height) / 2) + bannerOffset;
    } else {
      let availableWidth = 0;
      const availableHeight = window.innerHeight - bannerOffset - filtersOffset - (gapToEdge * 2);
      debugLog('window.innerHeight', window.innerHeight);
      debugLog('window.innerWidth', window.innerWidth);
      if (rect.left > window.innerWidth - rect.right) {
        // Position to the left
        availableWidth = rect.left - (gapToEdge * 2);
        debugLog('availableWidth', availableWidth);
        dimensions.left = null;
        dimensions.right = window.innerWidth - rect.left + gapToEdge;
        debugLog('dimensions.left', dimensions.left);
        debugLog('dimensions.right', dimensions.right);
      } else {
        // Position to the right
        availableWidth = window.innerWidth - rect.right - (gapToEdge * 2);
        dimensions.left = rect.right + gapToEdge;
        dimensions.right = null;
        debugLog('dimensions.left', dimensions.left);
        debugLog('dimensions.right', dimensions.right);
      }
      dimensions.width = availableWidth > maxCardWidth ? maxCardWidth : availableWidth;
      dimensions.height = availableHeight > maxCardHeight ? maxCardHeight : availableHeight;
      debugLog('dimensions.width', dimensions.width);
      debugLog('dimensions.height', dimensions.height);
      dimensions.top = rect.top + dimensions.height < availableHeight ? rect.top : gapToEdge + bannerOffset + filtersOffset;
      debugLog('availableHeight', availableHeight);
      debugLog('dimensions.top', dimensions.top);
    }

    setAppointmentCardDimensions(dimensions);
    setExpandedAppointment(expandedAppointment?.id === appointment.id ? null : appointment);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedAppointment) {
        const target = event.target as HTMLElement;
        const detailsCard = document.getElementById('appointment-details-card');
        if (detailsCard && !detailsCard.contains(target) && !target.closest('.appointment-card-trigger')) {
          setExpandedAppointment(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedAppointment]);

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AdminAppointmentUpdate) => {
      const { data: response } = await api.patch(`/admin/appointments/update/${data.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', datesToShow.join(',')] });
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
      
      navigate(`/admin/appointments/edit/${selectedAppointment.id}`, {
        state: navigationState
      });
      setCompletionDialogOpen(false);
    }
  };

  // Navigation functions
  const handlePrevDay = () => {
    setStartDate(format(addDays(parseISO(startDate), -1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    setStartDate(format(addDays(parseISO(startDate), 1), 'yyyy-MM-dd'));
  };

  const handleDaySelectionChange = (
    event: React.MouseEvent<HTMLElement>,
    newDays: number | null,
  ) => {
    if (newDays !== null) {
      setDaysToShow(newDays);
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
      const dignitariesText = formatHonorificTitle(primaryDignitary.honorific_title) + ' ' + primaryDignitary.first_name + ' ' + primaryDignitary.last_name;
      const titleOrganizationText = [primaryDignitary.title_in_organization, primaryDignitary.organization].filter(Boolean).join(', ');
      
      return (
        <>
          {dignitariesText && (
            <GridItemIconText 
              containerRef={cardContainerRef} 
              icon={<PeopleMenuIconV2 sx={{ width: 20, height: 20 }} />} 
              text={dignitariesText} 
              theme={theme} 
            />
          )}
          {titleOrganizationText && (
            <GridItemIconText 
              containerRef={cardContainerRef} 
              icon={<ContactCardIconV2 sx={{ width: 20, height: 20 }} />} 
              text={titleOrganizationText} 
              theme={theme} 
            />
          )}
        </>
      );
    }
    // No dignitary information available
    else {
      return '';
    }
  };

  // Render a single day column
  const renderDayColumn = (date: string) => {
    const appointments = appointmentsByDate[date] || [];
    const isCurrentDate = isToday(parseISO(date));
    
    return (
      <Box sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <Typography variant="h6" sx={{ 
          textAlign: 'center', 
          mb: 2,
          fontWeight: isCurrentDate ? 'bold' : 'normal',
          color: isCurrentDate ? 'primary.main' : 'text.primary',
          fontSize: isMobile ? '1rem' : '1.25rem'
        }}>
          {format(parseISO(date), 'EEE, MMM d')}
        </Typography>
        
        {appointments.length === 0 ? (
          <Paper 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.03),
              borderRadius: 2,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No appointments
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%', overflow: 'auto' }}>
            {appointments.map((appointment: Appointment) => (
              <Paper
                key={appointment.id}
                className="appointment-card-trigger"
                elevation={1}
                sx={{
                  p: isMobile ? 1.5 : 2,
                  borderRadius: 2,
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s ease-in-out',
                  },
                  ml: 1,
                  mr: 1
                }}
                onClick={(e) => handleAppointmentClick(appointment, e)}
              >
                <Grid container 
                  spacing={1}
                  ref={cardContainerRef}
                >
                  {/* Time and Status */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AppointmentTimeChip appointment={appointment} />
                      {statusMap && appointment.status === statusMap['COMPLETED'] ? (
                        <AppointmentStatusChip 
                          size={daysToShow > 3 ? "extrasmall" : "small"}
                          status={appointment.status} 
                        />
                      ) : statusMap && isAppointmentInPast(appointment) && appointment.status === statusMap['APPROVED'] && (
                        <PrimaryButton 
                          size={daysToShow > 3 ? "extrasmall" : "small"}
                          sx={{ ml: 0.5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openCompletionDialog(appointment);
                          }}
                        >
                          {daysToShow === 1 ? "Complete Appointment" : (daysToShow === 3 ? "Complete" : <CheckSquareCircleFilledIconV2 sx={{ fontSize: '1.3rem' }} />)}
                        </PrimaryButton>
                      )}
                    </Box>
                  </Grid>

                  {appointment.duration && appointment.duration > 15 && (
                    <GridItemIconText 
                      containerRef={cardContainerRef} 
                      icon={<ClockSquareCircleIconV2 sx={{ width: 20, height: 20 }} />} 
                      text={appointment.duration ? appointment.duration.toString() + ' mins' : ''} 
                      theme={theme} 
                    />
                  )}

                  {/* Dignitary and Purpose */}
                  {renderDignitaryInfo(appointment)}
                  <GridItemIconText 
                      containerRef={cardContainerRef} 
                      icon={<ListIconV2 sx={{ width: 20, height: 20 }} />} 
                      text={appointment.purpose || ''} 
                      theme={theme} 
                  />

                </Grid>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4,
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography variant="h1" component="h1">
              Appointment Schedule
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ToggleButtonGroup
                value={daysToShow}
                exclusive
                onChange={handleDaySelectionChange}
                aria-label="days to display"
                size="small"
              >
                <ToggleButton value={1} aria-label="1 day">
                  Day
                </ToggleButton>
                {!isMobile && (
                  <ToggleButton value={3} aria-label="3 days">
                    3 Days
                  </ToggleButton>
                )}
                {!isMobile && (
                  <ToggleButton value={7} aria-label="7 days">
                    Week
                  </ToggleButton>
                )}
              </ToggleButtonGroup>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={handlePrevDay}>
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <TextField
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  inputProps={{
                    min: getLocalDateString(-30),
                    max: getLocalDateString(365),
                  }}
                  sx={{ width: 150 }}
                  size="small"
                />
                <IconButton onClick={handleNextDay}>
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <SwipeableViews
              enableMouseEvents
              onChangeIndex={(index) => {
                if (index > 0) {
                  handleNextDay();
                } else {
                  handlePrevDay();
                }
              }}
              index={1}
              resistance
            >
              <div>{/* Previous day placeholder for swipe */}</div>
              
              <Grid container spacing={2} sx={{ minHeight: isMobile ? '60vh' : '70vh' }}>
                {datesToShow.map((date) => (
                  <Grid item xs={12} md={daysToShow === 1 ? 12 : daysToShow === 3 ? 4 : 12/7} key={date}>
                    {renderDayColumn(date)}
                  </Grid>
                ))}
              </Grid>
              
              <div>{/* Next day placeholder for swipe */}</div>
            </SwipeableViews>
          )}
        </Box>
      </Container>

      {/* Floating Appointment Card */}
      <Portal>
        {expandedAppointment && appointmentCardDimensions && (
          <>
            {isMobile && (
              <Backdrop
                open={true}
                sx={{
                  zIndex: theme.zIndex.drawer,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                }}
              />
            )}
            <Box
              id="appointment-details-card"
              sx={{
                position: 'fixed',
                left: appointmentCardDimensions.left,
                right: appointmentCardDimensions.right,
                top: appointmentCardDimensions.top,
                bottom: appointmentCardDimensions.bottom,
                width: appointmentCardDimensions.width,
                height: appointmentCardDimensions.height,
                maxHeight: appointmentCardDimensions.height,
                overflow: 'none',
                zIndex: theme.zIndex.drawer + 1,
              }}
            >
              <AppointmentCard 
                appointment={expandedAppointment} 
                showCloseButton={true}
                onClose={() => setExpandedAppointment(null)}
                displayMode="calendar"
              />
            </Box>
          </>
        )}
      </Portal>

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
