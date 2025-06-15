import React, { useState, useEffect, useMemo } from 'react';
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
  IconButton,
  Collapse,
  Button,
} from '@mui/material';
import { format, addDays, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { USHER_START_DATE_OFFSET, USHER_END_DATE_OFFSET } from '../constants/formConstants';
import { FilterChip } from '../components/FilterChip';
import { formatHonorificTitle } from '../utils/formattingUtils';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import { formatTime } from '../utils/dateUtils';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import { SearchBox } from '../components/SearchBox';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import { UserIconSquareCircleV2, CirclePhoneFlipIconV2, CheckSquareCircleFilledIconV2 } from '../components/iconsv2';
import { IconTab, TabOption } from '../components/IconTab';

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

interface AppointmentContactUsherView {
  id: number;
  first_name: string;
  last_name: string;
  attendance_status: string;
  checked_in_at?: string;
  created_at: string;
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
  appointment_dignitaries?: AppointmentDignitaryUsherView[];
  appointment_contacts?: AppointmentContactUsherView[];
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

// Type for grouped contacts by time slot
type ContactByTimeSlot = {
  [timeSlot: string]: {
    [contactId: number]: {
      appointmentContactIds: number[];
      contact: AppointmentContactUsherView;
      status: string;
      locations: Set<string>;
      appointmentIds: Set<number>;
      requester: RequesterUsherView | null;
    }
  }
};

// Tab types
type TabType = 'dignitaries' | 'contacts';

const UsherAppointmentSchedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedPOCs, setExpandedPOCs] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TabType>('dignitaries');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const today = new Date();
  const queryClient = useQueryClient();

  // Define tab options for the reusable component
  const tabOptions: TabOption[] = [
    {
      key: 'dignitaries',
      label: 'Dignitaries',
      icon: <PersonIcon sx={{ width: '20px', height: '20px' }} />
    },
    {
      key: 'contacts',
      label: 'Other Appts',
      icon: <GroupIcon sx={{ width: '20px', height: '20px' }} />
    }
  ];

  // Handle expanding/collapsing POC details
  const togglePOCDetails = (timeSlot: string, entityId: string) => {
    const key = `${timeSlot}-${entityId}`;
    setExpandedPOCs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Check if POC details are expanded
  const isPOCExpanded = (timeSlot: string, entityId: string) => {
    const key = `${timeSlot}-${entityId}`;
    return !!expandedPOCs[key];
  };

  // Format dates for display
  const formatDisplayDate = (date: Date) => {
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  // Generate date options for pills (today and next 2 days)
  const dateOptions = [];
  for (let i = USHER_START_DATE_OFFSET; i < USHER_END_DATE_OFFSET; i++) {
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
  }, [selectedDate, today]);

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

  // Update dignitary attendance status mutation
  const updateDignitaryAttendanceStatusMutation = useMutation({
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
      console.error('Error updating dignitary attendance status:', error);
      enqueueSnackbar('Failed to update dignitary attendance status', { variant: 'error' });
    }
  });

  // Update contact attendance status mutation
  const updateContactAttendanceStatusMutation = useMutation({
    mutationFn: async ({ appointmentContactId, status }: { appointmentContactId: number, status: string }) => {
      const response = await api.patch('/usher/contacts/checkin', {
        appointment_contact_id: appointmentContactId,
        attendance_status: status
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usher-appointments', selectedDate] });
    },
    onError: (error) => {
      console.error('Error updating contact attendance status:', error);
      enqueueSnackbar('Failed to update contact attendance status', { variant: 'error' });
    }
  });

  // Bulk check-in mutations
  const bulkCheckInAllMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await api.post(`/usher/appointments/${appointmentId}/check-in-all`);
      return response.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['usher-appointments', selectedDate] });
      enqueueSnackbar(`Checked in ${data.total_checked_in} attendees`, { variant: 'success' });
    },
    onError: (error) => {
      console.error('Error in bulk check-in:', error);
      enqueueSnackbar('Failed to check in all attendees', { variant: 'error' });
    }
  });

  // Filter appointments based on search query
  const filteredAppointments = useMemo(() => {
    if (!appointments || !searchQuery.trim()) {
      return appointments || [];
    }

    const query = searchQuery.toLowerCase().trim();
    
    return appointments.filter(appointment => {
      // Search in appointment dignitaries
      const dignitaryMatch = appointment.appointment_dignitaries?.some(appointmentDignitary => {
        const dignitary = appointmentDignitary.dignitary;
        
        // Check individual fields
        const individualFieldMatch = (
          dignitary.first_name?.toLowerCase().includes(query) ||
          dignitary.last_name?.toLowerCase().includes(query) ||
          formatHonorificTitle(dignitary.honorific_title || '').toLowerCase().includes(query)
        );
        
        // Check full name combinations
        const fullNameWithTitle = `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name || ''} ${dignitary.last_name || ''}`.trim().toLowerCase();
        const fullNameWithoutTitle = `${dignitary.first_name || ''} ${dignitary.last_name || ''}`.trim().toLowerCase();
        
        const fullNameMatch = (
          fullNameWithTitle.includes(query) ||
          fullNameWithoutTitle.includes(query)
        );
        
        return individualFieldMatch || fullNameMatch;
      });

      // Search in appointment contacts
      const contactMatch = appointment.appointment_contacts?.some(contact => {
        // Check individual fields
        const individualFieldMatch = (
          contact.first_name?.toLowerCase().includes(query) ||
          contact.last_name?.toLowerCase().includes(query)
        );
        
        // Check full name
        const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim().toLowerCase();
        const fullNameMatch = fullName.includes(query);
        
        return individualFieldMatch || fullNameMatch;
      });

      // Search in requester info
      const requesterMatch = appointment.requester && (
        // Check individual fields
        appointment.requester.first_name?.toLowerCase().includes(query) ||
        appointment.requester.last_name?.toLowerCase().includes(query) ||
        appointment.requester.phone_number?.includes(query) ||
        // Check full name
        `${appointment.requester.first_name || ''} ${appointment.requester.last_name || ''}`.trim().toLowerCase().includes(query)
      );

      // Search in location
      const locationMatch = appointment.location?.name?.toLowerCase().includes(query);

      // Search in time
      const timeMatch = appointment.appointment_time && formatTime(appointment.appointment_time).toLowerCase().includes(query);

      return dignitaryMatch || contactMatch || requesterMatch || locationMatch || timeMatch;
    });
  }, [appointments, searchQuery]);

  // Extract unique names for typeahead suggestions
  const searchSuggestions = useMemo(() => {
    if (!appointments) return [];
    
    const suggestions = new Set<string>();
    
    appointments.forEach(appointment => {
      // Add dignitary names
      appointment.appointment_dignitaries?.forEach(appointmentDignitary => {
        const dignitary = appointmentDignitary.dignitary;
        if (dignitary.first_name && dignitary.last_name) {
          const fullName = `${formatHonorificTitle(dignitary.honorific_title || '')} ${dignitary.first_name} ${dignitary.last_name}`.trim();
          suggestions.add(fullName);
          suggestions.add(`${dignitary.first_name} ${dignitary.last_name}`);
        }
      });
      
      // Add contact names
      appointment.appointment_contacts?.forEach(contact => {
        if (contact.first_name && contact.last_name) {
          suggestions.add(`${contact.first_name} ${contact.last_name}`);
        }
      });
      
      // Add requester names
      if (appointment.requester?.first_name && appointment.requester?.last_name) {
        suggestions.add(`${appointment.requester.first_name} ${appointment.requester.last_name}`);
      }
    });
    
    return Array.from(suggestions).sort();
  }, [appointments]);

  // Group appointments by date
  const groupedAppointments = filteredAppointments?.reduce((acc, appointment) => {
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

  // Group contacts by time slot
  const groupContactsByTimeSlot = (dayAppointments: UsherAppointmentSchedule[]): ContactByTimeSlot => {
    return dayAppointments.reduce((acc, appointment) => {
      const time = appointment.appointment_time || 'No time specified';
      
      if (!acc[time]) {
        acc[time] = {};
      }
      
      // Process each contact in the appointment
      if (appointment.appointment_contacts && appointment.appointment_contacts.length > 0) {
        appointment.appointment_contacts.forEach(appointmentContact => {
          const contactId = appointmentContact.id;
          
          if (!acc[time][contactId]) {
            // First time seeing this contact at this time slot
            acc[time][contactId] = {
              appointmentContactIds: [appointmentContact.id],
              contact: appointmentContact,
              status: appointmentContact.attendance_status,
              locations: new Set([appointment.location?.name || 'Location not specified']),
              appointmentIds: new Set([appointment.id]),
              requester: appointment.requester || null
            };
          } else {
            // Contact already exists in this time slot, add this appointment
            acc[time][contactId].appointmentContactIds.push(appointmentContact.id);
            
            // Update status if any appointment has checked in the contact
            if (appointmentContact.attendance_status === AttendanceStatus.CHECKED_IN) {
              acc[time][contactId].status = AttendanceStatus.CHECKED_IN;
            }
            
            // Add location if not already in the set
            if (appointment.location?.name) {
              acc[time][contactId].locations.add(appointment.location.name);
            }
            
            acc[time][contactId].appointmentIds.add(appointment.id);
          }
        });
      }
      
      return acc;
    }, {} as ContactByTimeSlot);
  };

  // Handle date change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  // Handle tab change
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey as TabType);
  };

  // Handle dignitary check-in/undo check-in
  const handleDignitaryAttendanceStatusChange = async (
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
      updateDignitaryAttendanceStatusMutation.mutateAsync({ 
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
      enqueueSnackbar('Not all appointment records were updated, but dignitary status was changed', { variant: 'warning' });
    }
  };

  // Handle contact check-in/undo check-in
  const handleContactAttendanceStatusChange = async (
    timeSlot: string, 
    contactId: number, 
    currentStatus: string, 
    appointmentContactIds: number[]
  ) => {
    const newStatus = currentStatus === AttendanceStatus.CHECKED_IN 
      ? AttendanceStatus.PENDING 
      : AttendanceStatus.CHECKED_IN;
    
    // Create an array of promises for all appointment_contact updates
    const updatePromises = appointmentContactIds.map(id => 
      updateContactAttendanceStatusMutation.mutateAsync({ 
        appointmentContactId: id, 
        status: newStatus 
      })
    );

    try {
      // Wait for all updates to complete
      await Promise.allSettled(updatePromises);
      
      // Show success message
      const action = newStatus === AttendanceStatus.CHECKED_IN ? 'checked in' : 'marked as pending';
      enqueueSnackbar(`Contact ${action} successfully`, { variant: 'success' });
    } catch (error) {
      console.error('Error updating some contact attendance statuses:', error);
      enqueueSnackbar('Not all contact records were updated, but contact status was changed', { variant: 'warning' });
    }
  };

  // Handle bulk check-in for all attendees in an appointment
  const handleBulkCheckIn = async (appointmentIds: Set<number>) => {
    try {
      const appointmentIdArray = Array.from(appointmentIds);
      const promises = appointmentIdArray.map(id => bulkCheckInAllMutation.mutateAsync(id));
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error in bulk check-in:', error);
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
    entityId: number, 
    status: string, 
    entityIds: number[],
    isContact: boolean = false
  ) => {
    const isCheckedIn = status === AttendanceStatus.CHECKED_IN;
    
    return isCheckedIn ? (
      <SecondaryButton
        size="small"
        startIcon={<UndoIcon />}
        onClick={() => isContact 
          ? handleContactAttendanceStatusChange(timeSlot, entityId, status, entityIds)
          : handleDignitaryAttendanceStatusChange(timeSlot, entityId, status, entityIds)
        }
        sx={{ ml: 1 }}
      >
        Undo Check-in
      </SecondaryButton>
    ) : (
      <PrimaryButton
        size="small"
        startIcon={<CheckCircleIcon />}
        onClick={() => isContact 
          ? handleContactAttendanceStatusChange(timeSlot, entityId, status, entityIds)
          : handleDignitaryAttendanceStatusChange(timeSlot, entityId, status, entityIds)
        }
        sx={{ ml: 1 }}
      >
        Check-in
      </PrimaryButton>
    );
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
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
            <Typography variant="h1" component="h1">
              Usher Schedule
            </Typography>
          </Box>

          {/* Date filters */}
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

          {/* Search and Tabs */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'column', md: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'stretch', md: 'center' },
            mb: 4,
            gap: 2
          }}>
            {/* Search Input */}
            <Box sx={{ 
                flexGrow: 1, 
                maxWidth: { xs: '100%', md: '400px' }, 
                width: { xs: '100%', md: 'auto' },
            }}>
              <SearchBox
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search appointments, names, or phone numbers..."
                variant="autocomplete"
                suggestions={searchSuggestions}
                maxSuggestions={10}
                iconVariant="filled"
                onClear={clearSearch}
              />
            </Box>

            {/* Custom Tabs */}
            <Box sx={{ width: { xs: '100%', md: 'auto' } }}>
              <IconTab
                tabs={tabOptions}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                autoWidth={true}
              />
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
                {searchQuery ? 'No appointments found matching your search' : `No appointments found for ${selectedDate ? getDateLabel(selectedDate) : 'the selected date'}`}
              </Typography>
              {searchQuery && (
                <Button onClick={clearSearch} sx={{ mt: 2 }}>
                  Clear Search
                </Button>
              )}
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.keys(groupedAppointments).sort().map((date) => {
                const dignitariesByTimeSlot = groupDignitariesByTimeSlot(groupedAppointments[date]);
                const contactsByTimeSlot = groupContactsByTimeSlot(groupedAppointments[date]);
                
                const timeSlots = activeTab === 'dignitaries' 
                  ? Object.keys(dignitariesByTimeSlot)
                  : Object.keys(contactsByTimeSlot);

                if (timeSlots.length === 0) {
                  return null;
                }
                
                return (
                  <Box key={date} sx={{ mb: 4 }}>
                    <Grid container spacing={2}>
                      {timeSlots
                        .sort((timeA, timeB) => timeA.localeCompare(timeB))
                        .map((time) => {
                          const entities = activeTab === 'dignitaries' 
                            ? dignitariesByTimeSlot[time]
                            : contactsByTimeSlot[time];

                          if (!entities || Object.keys(entities).length === 0) {
                            return null;
                          }

                          return (
                            <React.Fragment key={`${date}-${time}`}>
                              <Grid item xs={12} sm={12} md={12}>
                                <Chip
                                  label={formatTime(time)}
                                  sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
                                />
                              </Grid>
                      
                              <Grid item xs={12}>
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
                                    <Box sx={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      mb: 2
                                    }}>
                                      <Typography variant="h5" color="text.secondary">
                                        {activeTab === 'dignitaries' ? 'Dignitaries:' : 'Contacts:'}
                                      </Typography>
                                      
                                      {/* Bulk Check-in Button */}
                                      {(() => {
                                        // Check if all entities in this time slot are already checked in
                                        const allCheckedIn = Object.values(entities).every(entity => 
                                          entity.status === AttendanceStatus.CHECKED_IN
                                        );
                                        
                                        return (
                                          <PrimaryButton
                                            size="small"
                                            startIcon={<CheckCircleIcon />}
                                            disabled={allCheckedIn}
                                            onClick={() => {
                                              const appointmentIds = new Set<number>();
                                              Object.values(entities).forEach(entity => {
                                                entity.appointmentIds.forEach((id: number) => appointmentIds.add(id));
                                              });
                                              handleBulkCheckIn(appointmentIds);
                                            }}
                                            sx={{
                                              ...(allCheckedIn && {
                                                backgroundColor: theme.palette.action.disabledBackground,
                                                color: theme.palette.action.disabled,
                                                '&:hover': {
                                                  backgroundColor: theme.palette.action.disabledBackground,
                                                }
                                              })
                                            }}
                                          >
                                            {allCheckedIn ? 'All Checked In' : 'Check-in All'}
                                          </PrimaryButton>
                                        );
                                      })()}
                                    </Box>
                                    
                                    {Object.entries(entities).map(([entityId, data]) => {
                                      const isContact = activeTab === 'contacts';
                                      const entity = isContact 
                                        ? (data as any).contact 
                                        : (data as any).dignitary;
                                      const entityIds = isContact 
                                        ? (data as any).appointmentContactIds 
                                        : (data as any).appointmentDignitaryIds;
                                      const { status, requester } = data;
                                      const isCheckedIn = status === AttendanceStatus.CHECKED_IN;
                                      const isPOCDetailsExpanded = isPOCExpanded(time, entityId);
                                      const hasPOC = !!requester;
                                      
                                      return (
                                        <Box 
                                          key={entityId} 
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
                                          {/* Main entity info with responsive layout */}
                                          <Box sx={{ 
                                            display: 'flex', 
                                            flexDirection: { xs: 'column', sm: 'row' },
                                            justifyContent: 'space-between', 
                                            alignItems: { xs: 'flex-start', sm: 'center' },
                                          }}>
                                            {/* Entity name and POC toggle */}
                                            <Box sx={{ flexGrow: 1, width: { xs: '100%', sm: 'auto', md: 'auto' } }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: '500', color: theme.palette.text.primary }}>
                                                  {isCheckedIn && (
                                                    <CheckSquareCircleFilledIconV2 sx={{ color: 'success.main', mr: 1 }} />
                                                  )}
                                                  {isContact 
                                                    ? `${entity.first_name} ${entity.last_name}`
                                                    : `${formatHonorificTitle(entity.honorific_title || '')} ${entity.first_name} ${entity.last_name}`
                                                  }
                                                </Typography>                                                
                                              </Box>
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
                                                  onClick={() => togglePOCDetails(time, entityId)}
                                                  sx={{ ml: 1 }}
                                                >
                                                  {isPOCDetailsExpanded ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                                                </IconButton>
                                              )}
                                              {renderCheckinButton(time, parseInt(entityId), status, entityIds, isContact)}
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
                                </Paper>
                              </Grid>
                            </React.Fragment>
                          );
                        })}
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