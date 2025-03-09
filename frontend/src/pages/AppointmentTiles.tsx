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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Layout from '../components/Layout';
import { formatDate } from '../utils/dateUtils';
import { getStatusChipSx, getStatusColor } from '../utils/formattingUtils';
import { EmailIcon, ContactPhoneIcon, EmailIconSmall, ContactPhoneIconSmall, WorkIcon } from '../components/icons';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import { useEnums } from '../hooks/useEnums';
import { FilterChip, FilterChipGroup } from '../components/FilterChip';
import { EnumFilterChipGroup } from '../components/EnumFilterChipGroup';

import { Appointment, AppointmentDignitary } from '../models/types';

import { AppointmentCard } from '../components/AppointmentCard';

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
    queryKey: ['appointments'],
    queryFn: async () => {
      try {
        debugLog('Fetching appointments');
        // Make sure we're getting the full appointment data including location
        const { data } = await api.get<Appointment[]>('/admin/appointments/all', {
          params: {
            include_location: true,
            include_attachments: true // Request attachments with the appointments to reduce API calls
          }
        });
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
    
    return filtered;
  }, [appointments, selectedStatus, selectedLocation]);

  // Apply filters and handle URL ID
  useEffect(() => {
    if (appointments.length === 0) return;
    
    // isFilteringRef.current = true;
    debugLog('Filtering appointments', { selectedStatus, selectedLocation });
    
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
        
        if (existsInAllAppointments && (selectedStatus || selectedLocation)) {
          // It exists but is filtered out - clear filters
          debugLog(`Clearing filters to show appointment ID ${appointmentId}`);
          setSelectedStatus(null);
          setSelectedLocation(null);
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
    
  }, [appointments, selectedStatus, selectedLocation, id, navigate, getFilteredAppointments]);

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

  return (
    <Layout>
      <Container>
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2,
            mb: 2
          }}>
            <Typography variant="h4">Appointment Details</Typography>
            
            {/* Status Filters */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Filter by Status</Typography>
              <EnumFilterChipGroup
                enumType="appointmentStatus"
                selectedValue={selectedStatus}
                getCount={getStatusAppointmentCount}
                getColor={(status, theme) => getStatusColor(status, theme)}
                onToggle={handleStatusFilter}
              />
            </Box>
            
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
                  getIcon={() => <LocationOnIcon />}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No locations available. Please check with your administrator.
                </Typography>
              )}
            </Box>
            
            {/* Active Filters Summary */}
            {(selectedStatus || selectedLocation) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Active Filters:</Typography>
                {selectedStatus && (
                  <Chip 
                    label={selectedStatus} 
                    size="small" 
                    onDelete={() => setSelectedStatus(null)}
                    sx={{ 
                      color: getStatusColor(selectedStatus, theme),
                      borderColor: getStatusColor(selectedStatus, theme),
                    }}
                  />
                )}
                {selectedLocation && (
                  <Chip 
                    label={locations.find(l => l.id === selectedLocation)?.name || `Location ID: ${selectedLocation}`} 
                    size="small" 
                    onDelete={() => setSelectedLocation(null)}
                    icon={<LocationOnIcon fontSize="small" />}
                    sx={{ 
                      color: theme.palette.primary.main,
                    }}
                  />
                )}
                <Button 
                  size="small" 
                  onClick={() => {
                    setSelectedStatus(null);
                    setSelectedLocation(null);
                  }}
                >
                  Clear All
                </Button>
              </Box>
            )}
          </Box>

          <Box sx={{ 
            maxWidth: '100%', 
            flexGrow: 1,
            position: 'relative',
            touchAction: 'pan-y pinch-zoom',
          }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredAppointments.length > 0 ? (
              <>
                {/* Added safety check: only render if activeStep is valid */}
                {activeStep < filteredAppointments.length ? (
                  <AppointmentTile appointment={filteredAppointments[activeStep]} />
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography>Invalid appointment index.</Typography>
                    <Button onClick={() => setActiveStep(0)} sx={{ mt: 2 }}>
                      Go to first appointment
                    </Button>
                  </Paper>
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
                    mt: 2
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