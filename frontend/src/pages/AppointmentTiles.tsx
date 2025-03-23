import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Paper,
  SwipeableDrawer,
  MobileStepper,
  Container,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Theme,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EditIcon from '@mui/icons-material/Edit';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Layout from '../components/Layout';
import { formatDate } from '../utils/dateUtils';
import { getStatusChipSx, getStatusColor } from '../utils/formattingUtils';
import { EmailIcon, ContactPhoneIcon, EmailIconSmall, ContactPhoneIconSmall, WorkIcon, LocationIconV2 } from '../components/icons';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import { useEnums } from '../hooks/useEnums';
import { FilterChip, FilterChipGroup } from '../components/FilterChip';
import { EnumFilterChipGroup } from '../components/EnumFilterChipGroup';
import SwipeableViews from 'react-swipeable-views';
import { virtualize, bindKeyboard } from 'react-swipeable-views-utils';
import ButtonWithBadge from '../components/ButtonWithBadge';

import { Appointment, AppointmentDignitary } from '../models/types';

import { AppointmentCard } from '../components/AppointmentCard';
import { subDays, addDays } from 'date-fns';

// Search configuration - customize this to include or exclude fields from search
const SEARCH_CONFIG = {
  // Fields directly on the appointment object
  appointmentFields: [
    'id',
    'purpose',
    'appointment_type',
    'appointment_date',
    'status',
    'sub_status',
    'requester_notes_to_secretariat',
    'secretariat_meeting_notes',
    'secretariat_follow_up_actions',
    'secretariat_notes_to_requester'
  ] as const,

  requesterFields: [
    'first_name',
    'last_name',
    'email',
    'phone_number'
  ] as const,
  
  // Fields to search within the dignitary object
  dignitaryFields: [
    'honorific_title',
    'first_name',
    'last_name',
    'email',
    'phone',
    'organization',
    'title_in_organization',
    'primary_domain',
    'primary_domain_other',
    'country',
    'state',
    'city'
  ] as const,
  
  // Fields to search within the location object
  locationFields: [
    'name',
    'city',
    'state',
    'country'
  ] as const
};

// Create enhanced SwipeableViews with keyboard navigation and virtualization
const VirtualizedSwipeableViews = bindKeyboard(virtualize(SwipeableViews));

// Define interface for slide renderer params to match react-swipeable-views types
interface SlideRendererParams {
  index: number;
  key: number | string;
}

// Additional helper component for swipe indicators
const SwipeIndicators: React.FC<{ 
  currentIndex: number, 
  totalCount: number 
}> = ({ currentIndex, totalCount }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  if (!isMobile) return null;
  
  return (
    <>
      {currentIndex > 0 && (
        <Box sx={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
        }}>
          <ChevronLeftIcon />
        </Box>
      )}
      {currentIndex < totalCount - 1 && (
        <Box sx={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
        }}>
          <ChevronRightIcon />
        </Box>
      )}
    </>
  );
};

// Helper function for slide rendering with virtualization
const slideRenderer = (
  filteredAppointments: Appointment[], 
  AppointmentTileComponent: React.FC<{ appointment: Appointment }>, 
  theme: Theme,
  currentIndex: number
) => ({ index, key }: SlideRendererParams) => {
  // Safety check for valid index
  if (index < 0 || index >= filteredAppointments.length) {
    return (
      <div key={key} style={{ padding: '0 4px' }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No appointment found.</Typography>
        </Paper>
      </div>
    );
  }
  
  // Get appointment at current index
  const appointment = filteredAppointments[index];
  
  return (
    <div key={key} style={{ overflow: 'hidden', padding: '0 4px', position: 'relative' }}>
      <SwipeIndicators currentIndex={index} totalCount={filteredAppointments.length} />
      <AppointmentTileComponent appointment={appointment} />
    </div>
  );
};

// Interface for location data
interface Location {
  id: number;
  name: string;
  city: string;
  state: string;
}

const AppointmentTiles: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 7));
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  
  // Use refs to track navigation state and prevent race conditions
  const isNavigatingRef = useRef(false);
  const isFilteringRef = useRef(false);
  const isManualNavigationRef = useRef(false); // Track Next/Back button clicks
  
  // Define searchable fields based on the config
  const searchableFields = SEARCH_CONFIG.appointmentFields as unknown as (keyof Appointment)[];
  
  // DEBUG: Add console logs for important state changes
  const debugLog = (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AppointmentTiles] ${message}`, data || '');
    }
  };

  // Fetch status options using useEnums hook
  const { values: statusOptions = [], isLoading: isLoadingStatusOptions } = useEnums('appointmentStatus');

  // Fetch locations using React Query
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Location[]>('/admin/locations/all');
        return data;
      } catch (error) {
        console.error('Error fetching locations:', error);
        enqueueSnackbar('Failed to fetch locations', { variant: 'error' });
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch appointments using React Query with proper configuration
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', startDate, endDate],
    queryFn: async () => {
      try {
        debugLog('Fetching appointments');
        // Prepare parameters with optional date range
        const params: Record<string, any> = {
          include_location: true,
          include_attachments: true
        };

        // Add date range parameters if they exist
        if (startDate) {
          params.start_date = startDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        }
        if (endDate) {
          params.end_date = endDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        }

        // Make sure we're getting the full appointment data including location
        const { data } = await api.get<Appointment[]>('/admin/appointments/all', { params });
        debugLog(`Fetched ${data.length} appointments`);
        return data;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        enqueueSnackbar('Failed to fetch appointments', { variant: 'error' });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (gcTime is the replacement for cacheTime)
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  });

  // Memoized function to get filtered appointments
  const getFilteredAppointments = useCallback(() => {
    console.log(`Called getFilteredAppointments`);

    let filtered = [...appointments];
   
    // Apply status filter if selected
    if (selectedStatus) {
      console.log(`Filtering by status: ${selectedStatus}`);
      filtered = filtered.filter(appointment => appointment.status === selectedStatus);
    }
    
    // Apply location filter if selected
    if (selectedLocation) {
      console.log(`Filtering by location: ${selectedLocation}`);
      filtered = filtered.filter(appointment => 
        appointment.location && appointment.location.id === selectedLocation
      );
    }
    
    // Apply search filter if search term exists
    if (searchTerm.trim()) {
      console.log(`Filtering by search term: ${searchTerm}`);
      const searchLower = searchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(appointment => {
        // Check each searchable field
        const matchesSearchableFields = searchableFields.some(field => {
          const value = appointment[field];
          // Handle different types of fields
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchLower);
          } else if (typeof value === 'number') {
            return value.toString().includes(searchLower);
          } else if (value && typeof value === 'object' && 'name' in value) {
            // For objects with name property (like location)
            return (value.name as string).toLowerCase().includes(searchLower);
          }
          return false;
        });

        // Also search in location name if available
        const locationMatch = appointment.location && 
          SEARCH_CONFIG.locationFields.some(field => 
            appointment.location[field]?.toLowerCase().includes(searchLower)
          );

        // Search in requester information if available
        const requesterMatch = appointment.requester && 
          SEARCH_CONFIG.requesterFields.some(field => 
            appointment.requester?.[field]?.toLowerCase().includes(searchLower)
          );

        // Search in appointment dignitaries if available
        const appointmentDignitariesMatch = appointment.appointment_dignitaries && 
          appointment.appointment_dignitaries.some(ad => 
            ad.dignitary && SEARCH_CONFIG.dignitaryFields.some(field => 
              ad.dignitary[field]?.toLowerCase().includes(searchLower)
            )
          );

        return matchesSearchableFields || locationMatch || requesterMatch || appointmentDignitariesMatch;
      });
    }
    
    return filtered;
  }, [appointments, selectedStatus, selectedLocation, searchTerm, searchableFields]);

  // Apply filters and handle URL ID
  useEffect(() => {
    if (appointments.length === 0) return;
    
    // isFilteringRef.current = true;
    debugLog('Filtering appointments', { selectedStatus, selectedLocation, searchTerm, startDate, endDate });
    
    const filtered = getFilteredAppointments();
    setFilteredAppointments(filtered);
    
    // Handle ID from URL if present
    if (id && !isManualNavigationRef.current && !isFilteringRef.current) {
      const appointmentId = parseInt(id, 10);
      const index = filtered.findIndex(apt => apt.id === appointmentId);
      
      if (index !== -1) {
        // ID exists in filtered results
        debugLog(`Setting activeStep to ${index} for appointment ID ${appointmentId}`);
        setActiveStep(index);
      } else {
        // ID doesn't exist in filtered results - check if it exists at all
        const existsInAllAppointments = appointments.some(apt => apt.id === appointmentId);
        
        if (existsInAllAppointments && (selectedStatus || selectedLocation || startDate || endDate)) {
          // It exists but is filtered out - clear filters
          debugLog(`Clearing filters to show appointment ID ${appointmentId}`);
          setSelectedStatus(null);
          setSelectedLocation(null);
          setStartDate(null);
          setEndDate(null);
          return; // Exit early - the effect will run again with cleared filters
        } else {
          // It doesn't exist at all - go to first appointment
          debugLog(`Appointment ID ${appointmentId} not found, going to first appointment`);
          setActiveStep(0);
          if (filtered.length > 0) {
            // Navigate to the first appointment
            const firstAppointmentId = filtered[0].id;
            isNavigatingRef.current = true;
            navigate(`/admin/appointments/review/${firstAppointmentId}`, { replace: true });
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 100);
          } else {
            // No appointments after filtering
            navigate('/admin/appointments/review', { replace: true });
          }
        }
      }
    } else if (filtered.length > 0) {
      // No ID in URL or manual navigation - ensure activeStep is valid
      if (activeStep >= filtered.length) {
        debugLog('Resetting activeStep to 0 - current step is invalid');
        setActiveStep(0);
      }
      
      // If there's no ID in URL but we have appointments, update URL
      // if (!id && !isNavigatingRef.current && filtered.length > 0 && !isManualNavigationRef.current) {
      if (!isNavigatingRef.current && (isFilteringRef.current || isManualNavigationRef.current)) {
        const appointmentId = filtered[activeStep < filtered.length ? activeStep : 0].id;
        debugLog(`Updating URL to appointment ID ${appointmentId}`);
        isNavigatingRef.current = true;
        navigate(`/admin/appointments/review/${appointmentId}`, { replace: true });
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 100);
      }
    } else {
      debugLog('No appointments after filtering');
      navigate('/admin/appointments/review', { replace: true });
    }
    
    // Always reset the manual navigation flag when filtering completes
    isManualNavigationRef.current = false;
    
    // Reset the filtering flag after a delay
    setTimeout(() => {
      isFilteringRef.current = false;
    }, 100);
    
  }, [appointments, selectedStatus, selectedLocation, searchTerm, startDate, endDate, id, navigate, getFilteredAppointments]);

  // Update URL when activeStep changes due to Next/Back button clicks
  useEffect(() => {
    // Only run this effect when manual navigation occurred
    if (!isManualNavigationRef.current) return;
    
    // Skip if we're in the middle of filtering or navigating
    if (isFilteringRef.current || isNavigatingRef.current) return;
    
    // Skip invalid states
    if (filteredAppointments.length === 0 || activeStep >= filteredAppointments.length) return;
    
    debugLog(`Updating URL after manual navigation to step ${activeStep}`);
    const appointment = filteredAppointments[activeStep];
    
    if (appointment && appointment.id) {
      // Check if the URL already has the correct ID
      if (id && parseInt(id, 10) === appointment.id) {
        return;
      }
      
      // Update URL
      isNavigatingRef.current = true;
      navigate(`/admin/appointments/review/${appointment.id}`, { replace: true });
      
      // Reset flags after navigation
      setTimeout(() => {
        isNavigatingRef.current = false;
        isManualNavigationRef.current = false;
      }, 100);
    }
  }, [activeStep, filteredAppointments, navigate, id]);

  // Simplified Next/Back handlers
  const handleNext = () => {
    if (activeStep < filteredAppointments.length - 1) {
      debugLog('Next button clicked');
      isManualNavigationRef.current = true;
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      debugLog('Back button clicked');
      isManualNavigationRef.current = true;
      const prevStep = activeStep - 1;
      setActiveStep(prevStep);
    }
  };

  const handleStatusFilter = (status: string | null) => {
    debugLog(`Setting status filter: ${status}`);
    isFilteringRef.current = true;
    setSelectedStatus(status);
    setActiveStep(0);
  };

  const handleLocationFilter = (locationId: number | null) => {
    debugLog(`Setting location filter: ${locationId}`);
    isFilteringRef.current = true;
    setSelectedLocation(locationId);
    setActiveStep(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    debugLog(`Setting search term: ${event.target.value}`);
    isFilteringRef.current = true;
    setSearchTerm(event.target.value);
    setActiveStep(0);
  };

  // Get count of appointments for a specific location
  const getLocationAppointmentCount = (locationId: number) => {
    try {
      return appointments.filter(a => a.location && a.location.id === locationId).length;
    } catch (error) {
      console.error('Error counting appointments for location:', error);
      return 0;
    }
  };

  // Get count of appointments for a specific status
  const getStatusAppointmentCount = (status: string) => {
    return appointments.filter(a => a.status === status).length;
  };

  // Updated AppointmentTile component to safely handle undefined appointments
  const AppointmentTile = ({ appointment }: { appointment: Appointment }) => {
    // Safety check - if appointment is undefined, show a message instead
    if (!appointment) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No appointment found with the current filters.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please try different filters or go back to the previous appointment.
          </Typography>
        </Paper>
      );
    }
    
    // If we have a valid appointment, render the normal card
    return <AppointmentCard appointment={appointment} theme={theme} />;
  };

  // Handle date filter changes
  const handleStartDateChange = (date: Date | null) => {
    debugLog(`Setting start date: ${date}`);
    isFilteringRef.current = true;
    setStartDate(date);
    setActiveStep(0);
  };

  const handleEndDateChange = (date: Date | null) => {
    debugLog(`Setting end date: ${date}`);
    isFilteringRef.current = true;
    setEndDate(date);
    setActiveStep(0);
  };

  const clearDateFilters = () => {
    debugLog('Clearing date filters');
    isFilteringRef.current = true;
    setStartDate(null);
    setEndDate(null);
    setActiveStep(0);
  };

  return (
    <Layout>
      <Container>
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2,
            mb: 4
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4">All Appointments</Typography>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    slotProps={{
                      textField: {
                        size: "small",
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarTodayIcon fontSize="small" />
                            </InputAdornment>
                          )
                        }
                      }
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    slotProps={{
                      textField: {
                        size: "small",
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarTodayIcon fontSize="small" />
                            </InputAdornment>
                          )
                        }
                      }
                    }}
                  />
                  {(startDate || endDate) && (
                    <Button 
                      size="small" 
                      onClick={clearDateFilters}
                      variant="outlined"
                    >
                      Clear Dates
                    </Button>
                  )}
                </Stack>
              </LocalizationProvider>
            </Box>
            
            {/* Status Filters as Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
              <Tabs 
                value={selectedStatus || 'All'} 
                // Commenting this out because it's handled by the Tab component
                // Using below onChange event had issues when deploying to UAT
                // onChange={(_, newValue) => {
                //   if (newValue === 'All') {
                //     handleStatusFilter(null);
                //   } else {
                //     handleStatusFilter(newValue);
                //   }
                // }}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ minHeight: '48px' }}
                TabIndicatorProps={{style: {backgroundColor: "#3D8BE8"}}}
              >
                <Tab 
                  label={
                    <ButtonWithBadge
                      label="All"
                      count={appointments.length}
                      isSelected={selectedStatus === null}
                      onClick={() => {
                        handleStatusFilter(null);
                      }}
                    />
                  }
                  value="All" 
                  sx={{ padding: 0 }}
                />
                {statusOptions.map((status) => (
                  <Tab 
                    key={status} 
                    label={
                      <ButtonWithBadge
                        label={status}
                        count={getStatusAppointmentCount(status)}
                        isSelected={selectedStatus === status}
                        onClick={() => {
                          handleStatusFilter(status);
                        }}
                      />
                    }
                    value={status}
                    sx={{ padding: 0 }}
                  />
                ))}
              </Tabs>
            </Box>
            
            {/* Search Bar */}
            <Box>
              <TextField
                fullWidth
                placeholder="Search appointments..."
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <Button 
                        onClick={() => setSearchTerm('')}
                        size="small"
                      >
                        Clear
                      </Button>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1 }}
              />
              
              {/* Show search results count when searching */}
              {searchTerm && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Found {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} 
                    {selectedStatus ? ` with status "${selectedStatus}"` : ''} 
                    {selectedLocation ? ` at ${locations.find(l => l.id === selectedLocation)?.name || 'selected location'}` : ''}
                    {startDate ? ` from ${startDate.toLocaleDateString()}` : ''}
                    {endDate ? ` to ${endDate.toLocaleDateString()}` : ''}
                    {searchTerm ? ` matching "${searchTerm}"` : ''}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Active Date Filters Summary */}
            {(startDate || endDate) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="body2">Date Filters:</Typography>
                {startDate && (
                  <Chip 
                    label={`From: ${startDate.toLocaleDateString()}`}
                    size="small" 
                    onDelete={() => setStartDate(null)}
                    icon={<CalendarTodayIcon fontSize="small" />}
                    sx={{ color: theme.palette.primary.main }}
                  />
                )}
                {endDate && (
                  <Chip 
                    label={`To: ${endDate.toLocaleDateString()}`}
                    size="small" 
                    onDelete={() => setEndDate(null)}
                    icon={<CalendarTodayIcon fontSize="small" />}
                    sx={{ color: theme.palette.primary.main }}
                  />
                )}
                <Button 
                  size="small" 
                  onClick={clearDateFilters}
                >
                  Clear All
                </Button>
              </Box>
            )}

            {/* Location Filters */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Filter by Location</Typography>
              {isLoadingLocations ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Loading locations...</Typography>
                </Box>
              ) : locations.length > 0 ? (
                <FilterChipGroup
                  options={locations.map(loc => loc.id)}
                  selectedValue={selectedLocation}
                  getLabel={(locationId) => {
                    const location = locations.find(l => l.id === locationId);
                    return location ? location.name : `Location ${locationId}`;
                  }}
                  getCount={(locationId) => getLocationAppointmentCount(locationId)}
                  getColor={(_, theme) => theme.palette.primary.main}
                  onToggle={handleLocationFilter}
                  getIcon={() => <LocationIconV2 />}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No locations available. Please check with your administrator.
                </Typography>
              )}
            </Box>
            
            {/* Active Location Filters Summary - Only shown for location filters */}
            {selectedLocation && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Active Filters:</Typography>
                <Chip 
                  label={locations.find(l => l.id === selectedLocation)?.name || `Location ID: ${selectedLocation}`} 
                  size="small" 
                  onDelete={() => setSelectedLocation(null)}
                  icon={<LocationOnIcon fontSize="small" />}
                  sx={{ 
                    color: theme.palette.primary.main,
                  }}
                />
                <Button 
                  size="small" 
                  onClick={() => {
                    setSelectedLocation(null);
                  }}
                >
                  Clear
                </Button>
              </Box>
            )}
          </Box>

          <Box sx={{ 
            maxWidth: '100%', 
            flexGrow: 1,
            position: 'relative',
            touchAction: 'pan-y pinch-zoom',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredAppointments.length > 0 ? (
              <>
                {/* For smaller number of items use regular SwipeableViews */}
                {filteredAppointments.length <= 20 ? (
                  <SwipeableViews
                    index={activeStep}
                    onChangeIndex={(index) => {
                      debugLog(`Swipe detected, changing to index ${index}`);
                      isManualNavigationRef.current = true;
                      setActiveStep(index);
                    }}
                    enableMouseEvents
                    resistance
                    style={{ overflow: 'hidden', width: '100%' }}
                    animateTransitions
                    springConfig={{
                      duration: '0.35s',
                      easeFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                      delay: '0s',
                    }}
                  >
                    {filteredAppointments.map((appointment, index) => (
                      <div key={appointment.id} style={{ overflow: 'hidden', padding: '0 4px', position: 'relative' }}>
                        {/* Add swipe indicators for mobile devices */}
                        <SwipeIndicators currentIndex={index} totalCount={filteredAppointments.length} />
                        {Math.abs(activeStep - index) <= 1 ? (
                          <AppointmentTile appointment={appointment} />
                        ) : null}
                      </div>
                    ))}
                  </SwipeableViews>
                ) : (
                  /* Use virtualized version for larger datasets */
                  <VirtualizedSwipeableViews
                    index={activeStep}
                    onChangeIndex={(index) => {
                      debugLog(`Virtualized swipe detected, changing to index ${index}`);
                      isManualNavigationRef.current = true;
                      setActiveStep(index);
                    }}
                    slideRenderer={slideRenderer(filteredAppointments, AppointmentTile, theme, activeStep)}
                    slideCount={filteredAppointments.length}
                    enableMouseEvents
                    resistance
                    style={{ overflow: 'hidden', width: '100%' }}
                  />
                )}
                
                <MobileStepper
                  variant="dots"
                  steps={filteredAppointments.length}
                  position="static"
                  activeStep={Math.min(activeStep, filteredAppointments.length - 1)}
                  sx={{ 
                    maxWidth: '100%', 
                    flexGrow: 1,
                    justifyContent: 'center',
                    background: 'transparent',
                    mt: 3
                  }}
                  nextButton={
                    <Button
                      size="small"
                      onClick={handleNext}
                      disabled={activeStep >= filteredAppointments.length - 1}
                    >
                      Next
                      <NavigateNextIcon />
                    </Button>
                  }
                  backButton={
                    <Button 
                      size="small" 
                      onClick={handleBack} 
                      disabled={activeStep === 0}
                    >
                      <NavigateBeforeIcon />
                      Back
                    </Button>
                  }
                />
              </>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography>No appointments found for the selected filters.</Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentTiles; 