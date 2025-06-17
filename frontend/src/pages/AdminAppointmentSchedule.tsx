import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Grid,
  useTheme,
  alpha,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  useMediaQuery,
  Backdrop,
  Portal,
} from '@mui/material';
import format from 'date-fns/format';
import isToday from 'date-fns/isToday';
import parseISO from 'date-fns/parseISO';
import isPast from 'date-fns/isPast';
import addDays from 'date-fns/addDays';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ViewDayIcon from '@mui/icons-material/ViewDay';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import SwipeableViews from 'react-swipeable-views';
import Layout from '../components/Layout';
import { IconTab, TabOption } from '../components/IconTab';
import { getLocalDateString } from '../utils/dateUtils';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Appointment, StatusMap, SubStatusMap, StatusSubStatusMapping, CalendarEventWithAppointments, ScheduleResponse, AppointmentSummary } from '../models/types';
import AppointmentCard from '../components/AppointmentCard';
import CalendarEventCard from '../components/CalendarEventCard';
import CalendarEventScheduleCard from '../components/CalendarEventScheduleCard';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { AdminAppointmentUpdate } from '../models/types';
import { debugLog } from '../utils/debugUtils';
import { AppointmentStatusChip } from '../components/AppointmentStatusChip';
import { AppointmentTimeChip } from '../components/AppointmentTimeChip';
import GridItemIconText from '../components/GridItemIconText';
import { PeopleMenuIconV2, ContactCardIconV2, AddCircleFilledIconV2 } from '../components/iconsv2';

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
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('xl'));
  const [appointmentUpdateData, setAppointmentUpdateData] = useState<AdminAppointmentUpdate>({});
  const [daysToShow, setDaysToShow] = useState<number>(isMobile ? 1 : 3);
  const [viewMode, setViewMode] = useState<string>(isMobile ? 'day' : '3days');
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
    setViewMode(isMobile ? 'day' : '3days');
  }, [isMobile]);

  // Create tab options based on screen size
  const tabOptions: TabOption[] = [
    {
      key: 'day',
      label: 'Day',
      icon: <ViewDayIcon sx={{ width: '20px', height: '20px' }} />
    },
    ...((!isMobile) ? [{
      key: '3days',
      label: '3 Days',
      icon: <ViewWeekIcon sx={{ width: '20px', height: '20px' }} />
    }] : []),
    // ...(isLargeScreen ? [{
    //   key: 'week',
    //   label: 'Week',
    //   icon: <ViewWeekIcon sx={{ width: '20px', height: '20px' }} />
    // }] : [])
  ];

  const [expandedAppointment, setExpandedAppointment] = useState<Appointment | null>(null);
  const [expandedCalendarEvent, setExpandedCalendarEvent] = useState<CalendarEventWithAppointments | null>(null);
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

  const { data: scheduleData, isLoading } = useQuery<ScheduleResponse>({
    queryKey: ['calendar-events-schedule', datesToShow.join(',')],
    queryFn: async () => {
      try {
        const startDate = datesToShow[0];
        const endDate = datesToShow[datesToShow.length - 1];
        
        const { data } = await api.get<ScheduleResponse>('/admin/calendar-events/schedule', {
          params: {
            start_date: startDate,
            end_date: endDate
          }
        });
        
        return data;
      } catch (error) {
        console.error('Error fetching calendar events schedule:', error);
        enqueueSnackbar('Failed to fetch schedule', { variant: 'error' });
        throw error;
      }
    }
  });

  // Transform calendar events to display format and group by date
  const calendarEventsByDate = React.useMemo(() => {
    if (!scheduleData?.calendar_events) return {};
    
    const eventsByDate: Record<string, CalendarEventWithAppointments[]> = {};
    
    // Group calendar events by date
    scheduleData.calendar_events.forEach((event) => {
      const date = event.start_date;
      if (!eventsByDate[date]) {
        eventsByDate[date] = [];
      }
      eventsByDate[date].push(event);
    });
    
    // Sort events within each date by start time
    Object.keys(eventsByDate).forEach(date => {
      eventsByDate[date].sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
      });
    });
    
    return eventsByDate;
  }, [scheduleData]);

  // Helper function to convert appointment summary to full appointment for compatibility
  const convertAppointmentSummaryToAppointment = (summary: AppointmentSummary, event: CalendarEventWithAppointments): Appointment => {
    return {
      ...summary,
      // Use calendar event data as authoritative source
      appointment_date: event.start_date,
      appointment_time: event.start_time,
      duration: event.duration,
      location: event.location!,
      location_id: event.location?.id || 0,
      meeting_place: event.meeting_place!,
      meeting_place_id: event.meeting_place?.id || 0,
      // Required fields for Appointment interface
      created_at: event.created_at,
      updated_at: event.updated_at,
      dignitary: summary.appointment_dignitaries?.[0]?.dignitary || {} as any, // Legacy compatibility
    } as Appointment;
  };

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
    setExpandedCalendarEvent(null); // Close calendar event if open
  };

  const handleCalendarEventClick = (calendarEvent: CalendarEventWithAppointments, event: React.MouseEvent) => {
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
      if (rect.left > window.innerWidth - rect.right) {
        // Position to the left
        availableWidth = rect.left - (gapToEdge * 2);
        dimensions.left = null;
        dimensions.right = window.innerWidth - rect.left + gapToEdge;
      } else {
        // Position to the right
        availableWidth = window.innerWidth - rect.right - (gapToEdge * 2);
        dimensions.left = rect.right + gapToEdge;
        dimensions.right = null;
      }
      dimensions.width = availableWidth > maxCardWidth ? maxCardWidth : availableWidth;
      dimensions.height = availableHeight > maxCardHeight ? maxCardHeight : availableHeight;
      dimensions.top = rect.top + dimensions.height < availableHeight ? rect.top : gapToEdge + bannerOffset + filtersOffset;
    }

    setAppointmentCardDimensions(dimensions);
    setExpandedCalendarEvent(expandedCalendarEvent?.id === calendarEvent.id ? null : calendarEvent);
    setExpandedAppointment(null); // Close appointment if open
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedAppointment || expandedCalendarEvent) {
        const target = event.target as HTMLElement;
        const detailsCard = document.getElementById('appointment-details-card') || document.getElementById('calendar-event-details-card');
        if (detailsCard && !detailsCard.contains(target) && !target.closest('.appointment-card-trigger')) {
          setExpandedAppointment(null);
          setExpandedCalendarEvent(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandedAppointment, expandedCalendarEvent]);

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AdminAppointmentUpdate) => {
      const { data: response } = await api.patch(`/admin/appointments/update/${data.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events-schedule', datesToShow.join(',')] });
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

  // Handle view mode change for IconTab
  const handleViewModeChange = (tabKey: string) => {
    setViewMode(tabKey);
    
    // Update daysToShow based on tab selection
    switch (tabKey) {
      case 'day':
        setDaysToShow(1);
        break;
      case '3days':
        setDaysToShow(3);
        break;
      case 'week':
        setDaysToShow(7);
        break;
      default:
        setDaysToShow(1);
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



  // Render a single day column with calendar events
  const renderDayColumn = (date: string) => {
    const calendarEvents = calendarEventsByDate[date] || [];
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
        
        {calendarEvents.length === 0 ? (
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
              No calendar events
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%', overflow: 'auto' }}>
            {calendarEvents.map((calendarEvent: CalendarEventWithAppointments) => {
              return (
                <CalendarEventScheduleCard
                  key={calendarEvent.id}
                  calendarEvent={calendarEvent}
                  daysToShow={daysToShow}
                  isMobile={isMobile}
                  onCalendarEventClick={handleCalendarEventClick}
                  onAppointmentCompletion={openCompletionDialog}
                  isAppointmentInPast={isAppointmentInPast}
                  convertAppointmentSummaryToAppointment={convertAppointmentSummaryToAppointment}
                  statusMap={statusMap}
                  subStatusMap={subStatusMap}
                />
              );
            })}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, }}>
              <Typography variant="h1" component="h1">
                Appointment Schedule
              </Typography>
              <PrimaryButton
                onClick={() => navigate('/admin/appointments/new')}
                size="extrasmall"
                sx={{
                  color: '#fff',
                  mb: 2,
                }}
              >
                <AddCircleFilledIconV2 />
              </PrimaryButton>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              width: { xs: '100%', md: 'auto' },
              justifyContent: { xs: 'space-between', md: 'flex-end' }
            }}>
              <IconTab
                tabs={tabOptions}
                activeTab={viewMode}
                onTabChange={handleViewModeChange}
                autoWidth={true}
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={handlePrevDay}>
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <TextField
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  inputProps={{
                    min: getLocalDateString(-365),
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

      {/* Floating Cards */}
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
        {expandedCalendarEvent && appointmentCardDimensions && (
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
              id="calendar-event-details-card"
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
              <CalendarEventCard 
                calendarEvent={expandedCalendarEvent}
                convertAppointmentSummaryToAppointment={convertAppointmentSummaryToAppointment}
                showCloseButton={true}
                onClose={() => setExpandedCalendarEvent(null)}
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
