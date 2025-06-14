import React, { useRef } from 'react';
import {
  Paper,
  Grid,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import { CalendarEventWithAppointments, Appointment, EventTypeMap } from '../models/types';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { AppointmentStatusChip } from './AppointmentStatusChip';
import { AppointmentTimeChip } from './AppointmentTimeChip';
import GridItemIconText from './GridItemIconText';
import PrimaryButton from './PrimaryButton';
import {
  CheckSquareCircleFilledIconV2,
  ClockSquareCircleIconV2,
  ContactCardIconV2,
  ListIconV2,
  LocationThinIconV2,
  PeopleMenuIconV2,
  BlankIconV2,
  MemberListIconV2,
  CalendarIconV2,
  } from './iconsv2';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';

interface CalendarEventScheduleCardProps {
  calendarEvent: CalendarEventWithAppointments;
  daysToShow: number;
  isMobile: boolean;
  onCalendarEventClick: (calendarEvent: CalendarEventWithAppointments, event: React.MouseEvent) => void;
  onAppointmentCompletion: (appointment: Appointment) => void;
  isAppointmentInPast: (appointment: Appointment) => boolean;
  convertAppointmentSummaryToAppointment: (summary: any, event: CalendarEventWithAppointments) => Appointment;
  statusMap: any;
  subStatusMap?: any;
  // Selection props
  isSelectable?: boolean;
  isSelected?: boolean;
  selectionBarColor?: string;
  selectionBorderColor?: string;
}

const CalendarEventScheduleCard: React.FC<CalendarEventScheduleCardProps> = ({
  calendarEvent,
  daysToShow,
  isMobile,
  onCalendarEventClick,
  onAppointmentCompletion,
  isAppointmentInPast,
  convertAppointmentSummaryToAppointment,
  statusMap,
  subStatusMap,
  // Selection props with defaults
  isSelectable = false,
  isSelected = false,
  selectionBarColor = '#DAA520', // Mustard yellow
  selectionBorderColor = 'rgba(218, 165, 32, 0.3)', // Light mustard
  }) => {
    const theme = useTheme();
    const cardContainerRef = useRef<HTMLDivElement>(null);
    const api = useApi();

    // Fetch event type map from the API
    const { data: eventTypeMap = {} } = useQuery<EventTypeMap>({
      queryKey: ['calendar-event-type-map'],
      queryFn: async () => {
        const { data } = await api.get<EventTypeMap>('/calendar/event-type-options-map');
        return data;
      },
    });

  // Render calendar event status chip using the same style as appointment status
  const renderCalendarEventStatusChip = (event: CalendarEventWithAppointments) => {
    return (
      <AppointmentStatusChip 
        size={daysToShow > 3 ? "extrasmall" : "small"}
        status={event.status} 
      />
    );
  };

  // Render calendar event time chip using the same style as appointment time  
  const renderCalendarEventTimeChip = (event: CalendarEventWithAppointments, includeDuration: boolean) => {
    // Create a mock appointment object for the time chip component
    const mockAppointment = {
      appointment_time: event.start_time,
      duration: event.duration
    } as Appointment;
    
    return <AppointmentTimeChip appointment={mockAppointment} includeDuration={includeDuration} />;
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

  return (
    <Paper
      className="appointment-card-trigger"
      elevation={1}
      sx={{
        p: isMobile ? 1.5 : 2,
        borderRadius: 2,
        // borderTopLeftRadius: isSelectable ? 0 : 2,
        // borderBottomLeftRadius: isSelectable ? 0 : 2,
        position: 'relative',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-1px)',
          transition: 'all 0.2s ease-in-out',
        },
        ml: 1,
        mr: 1,
        // Selection styling
        ...(isSelectable && {
          border: isSelected ? `2px solid ${selectionBorderColor}` : '2px solid transparent',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: 1,
            transform: 'translateY(-1px)',
            border: isSelected ? `2px solid ${selectionBorderColor}` : `2px solid ${selectionBorderColor}`,
          },
        }),
        // Selection bar
        ...(isSelectable && isSelected && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            backgroundColor: selectionBarColor,
            borderRadius: '2px 0 0 2px',
            zIndex: 1,
          },
        }),
      }}
      onClick={(e) => {
        onCalendarEventClick(calendarEvent, e);
      }}
    >
      <Grid container spacing={1} ref={cardContainerRef}>
        {/* Calendar Event Header - Time, Duration, and Status */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {renderCalendarEventTimeChip(calendarEvent, true)}
            {/* {renderCalendarEventStatusChip(calendarEvent)} */}
          </Box>
        </Grid>

        {/* Calendar Event Duration (if significant) */}
        {/* {calendarEvent.duration && calendarEvent.duration > 15 && (
          <GridItemIconText 
            containerRef={cardContainerRef} 
            icon={<ClockSquareCircleIconV2 sx={{ width: 20, height: 20 }} />} 
            text={`${calendarEvent.duration} mins`} 
            theme={theme} 
          />
        )} */}

        {/* Calendar Event Location */}
        {calendarEvent.location && (
          <GridItemIconText 
            containerRef={cardContainerRef} 
            icon={<LocationThinIconV2 sx={{ width: 20, height: 20 }} />} 
            text={
              calendarEvent.meeting_place && calendarEvent.location ? 
                calendarEvent.meeting_place.name + ' - ' + calendarEvent.location.name : 
                calendarEvent.location ? calendarEvent.location.name : ''
            }
            theme={theme} 
          />
        )}


          {/* Event Content - Different display for "other" and "darshan" types */}
          {calendarEvent.event_type === eventTypeMap['OTHER'] || calendarEvent.event_type === eventTypeMap['DARSHAN'] ? (
          /* For "other" and "darshan" events, show summary details instead of individual appointments */
          <>
            {/* Number of appointments */}
            {calendarEvent.appointments && calendarEvent.appointments.length > 0 && (
              <GridItemIconText 
                containerRef={cardContainerRef} 
                icon={<CalendarIconV2 sx={{ width: 20, height: 20 }} />} 
                text={`${calendarEvent.appointments.length} appointment${calendarEvent.appointments.length !== 1 ? 's' : ''}`} 
                theme={theme} 
              />
            )}

            {/* Capacity information */}
            {calendarEvent.max_capacity && (
              <GridItemIconText 
                containerRef={cardContainerRef} 
                icon={<MemberListIconV2 sx={{ width: 20, height: 20 }} />} 
                text={`Capacity: ${calendarEvent.max_capacity}`} 
                theme={theme} 
              />
            )}

            {/* Number of people attending */}
            {calendarEvent.total_attendees !== undefined && (
              <GridItemIconText 
                containerRef={cardContainerRef} 
                icon={<PeopleMenuIconV2 sx={{ width: 20, height: 20 }} />} 
                text={`${calendarEvent.total_attendees} attendee${calendarEvent.total_attendees !== 1 ? 's' : ''}`} 
                theme={theme} 
              />
            )}

            {/* Event description */}
            {calendarEvent.description && (
              <GridItemIconText 
                containerRef={cardContainerRef} 
                icon={<ListIconV2 sx={{ width: 20, height: 20 }} />} 
                text={calendarEvent.description} 
                theme={theme} 
              />
            )}
          </>
        ) : (
          /* For regular appointments, show individual appointment details */
          calendarEvent.appointments && calendarEvent.appointments.length > 0 ? (
            calendarEvent.appointments.map((appointmentSummary, index) => {
              const appointment = convertAppointmentSummaryToAppointment(appointmentSummary, calendarEvent);
              
              return (
                <React.Fragment key={appointmentSummary.id}>
                  {/* Horizontal divider between appointments (not before first one) */}
                  {index > 0 && (
                    <Grid item xs={12}>
                      <Box sx={{ 
                        borderTop: 1, 
                        borderColor: 'divider', 
                        my: 1,
                        mx: -0.56 
                      }} />
                    </Grid>
                  )}

                  {calendarEvent.appointments.length > 1 && (
                    <Typography variant="caption" color="text.secondary">
                      Appointment #{index + 1}
                    </Typography>
                  )}

                  {/* Dignitary Information */}
                  {renderDignitaryInfo(appointment)}

                  <GridItemIconText 
                    containerRef={cardContainerRef} 
                    icon={<ListIconV2 sx={{ width: 20, height: 20 }} />} 
                    text={appointment.purpose || ''} 
                    theme={theme} 
                  />

                  {/* Appointment Details Section */}
                  <Grid item xs={12}>
                    <Box sx={{ pl: 1 }}>
                      {/* Appointment Status (secondary to calendar event status) */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        {(statusMap && isAppointmentInPast(appointment) && appointment.status === statusMap['APPROVED']) ? (
                          <PrimaryButton 
                            size="extrasmall"
                            sx={{
                              pl: 1.5,
                              pr: 1.5,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentCompletion(appointment);
                            }}
                          >
                            <CheckSquareCircleFilledIconV2 sx={{ fontSize: '1rem' }} /> Mark complete
                          </PrimaryButton>
                        ) : (
                          <AppointmentStatusChip 
                            size="small"
                            status={appointment.status} 
                          />
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </React.Fragment>
              );
            })
          ) : (
            /* Calendar event without appointments */
            <GridItemIconText 
              containerRef={cardContainerRef} 
              icon={<ListIconV2 sx={{ width: 20, height: 20 }} />} 
              text={calendarEvent.description || 'Calendar event without appointments'} 
              theme={theme} 
            />
          )
        )}
      </Grid>
    </Paper>
  );
};

export default CalendarEventScheduleCard; 