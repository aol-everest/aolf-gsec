import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
import { LocationThinIconV2, CalendarIconV2 } from '../components/iconsv2';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEnums } from '../hooks/useEnums';
import { FilterChip, FilterChipGroup } from '../components/FilterChip';
import { EnumFilterChipGroup } from '../components/EnumFilterChipGroup';
import SwipeableViews from 'react-swipeable-views';
import { virtualize, bindKeyboard } from 'react-swipeable-views-utils';
import ButtonWithBadge from '../components/ButtonWithBadge';
import { AdminAppointmentsEditRoute } from '../config/routes';
import { debugLog, createDebugLogger } from '../utils/debugUtils';

import { Appointment, AppointmentDignitary } from '../models/types';

import { AppointmentCard } from '../components/AppointmentCard';
import { subDays, addDays } from 'date-fns';
import { SecondaryButton } from '../components/SecondaryButton';

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

// Edge navigation buttons component for desktop
const EdgeNavigationButtons: React.FC<{
  onPrev: () => void,
  onNext: () => void,
  hasPrev: boolean,
  hasNext: boolean
}> = ({ onPrev, onNext, hasPrev, hasNext }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Hide on mobile since we already have swipe indicators
  if (isMobile) return null;
  
  return (
    <>
      {hasPrev && (
        <IconButton
          onClick={onPrev}
          sx={{
            position: 'absolute',
            left: 8,
            top: '230px', // Position in viewport rather than relative to parent
            transform: 'translateY(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(255,255,255,0.8)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.95)',
            },
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
            width: 48,
            height: 48,
          }}
          aria-label="Previous appointment"
        >
          <ChevronLeftIcon />
        </IconButton>
      )}
      {hasNext && (
        <IconButton
          onClick={onNext}
          sx={{
            position: 'absolute',
            right: 8,
            top: '230px', // Position in viewport rather than relative to parent
            transform: 'translateY(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(255,255,255,0.8)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.95)',
            },
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
            width: 48,
            height: 48,
          }}
          aria-label="Next appointment"
        >
          <ChevronRightIcon />
        </IconButton>
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

// Define interface for filters state object
interface FilterState {
  status: string | null;
  locationId: number | null;
  searchTerm: string;
  startDate: Date | null;
  endDate: Date | null;
}

const AdminAppointmentTiles: React.FC = () => {
  // Create a component-specific logger
  const logger = createDebugLogger('AdminAppointmentTiles');
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [activeStep, setActiveStep] = useState(0);
  // Combine all filter states into a single object to reduce re-renders
  const [filters, setFilters] = useState<FilterState>({
    status: null,
    locationId: null,
    searchTerm: '',
    startDate: subDays(new Date(), 1),
    endDate: addDays(new Date(), 7)
  });
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
  const isInitialLoadRef = useRef(true);
  
  // Define searchable fields based on the config
  const searchableFields = SEARCH_CONFIG.appointmentFields as unknown as (keyof Appointment)[];
  
  // Fetch status options using useEnums hook
  const { values: statusOptions = [], isLoading: isLoadingStatusOptions } = useEnums('appointmentStatus');

  // Helper function to update URL with current filters
  const updateUrlWithFilters = useCallback(() => {
    if (isNavigatingRef.current || isInitialLoadRef.current) return;
    
    // Debug the status of filters when updating URL
    logger('Updating URL with filters', filters);
    
    const searchParams = new URLSearchParams();
    
    logger(`Selected status: ${filters.status}`);
    if (filters.status) {
      searchParams.set('status', filters.status);
      logger(`Adding status parameter to URL: ${filters.status}`);
    }
    
    if (filters.locationId) {
      searchParams.set('locationId', filters.locationId.toString());
    }
    
    if (filters.searchTerm) {
      searchParams.set('search', filters.searchTerm);
    }
    
    if (filters.startDate) {
      searchParams.set('startDate', filters.startDate.toISOString().split('T')[0]);
    }
    
    if (filters.endDate) {
      searchParams.set('endDate', filters.endDate.toISOString().split('T')[0]);
    }
    
    const paramString = searchParams.toString();
    logger(`URL params: ${paramString}`);
    
    // Don't update URL if we're in an appointment detail view (with ID)
    // as we only want to update filter params without changing the ID
    const url = id 
      ? `/admin/appointments/review/${id}?${paramString}`
      : `/admin/appointments/review?${paramString}`;
    
    // Use replace to avoid building up browser history
    isNavigatingRef.current = true;
    navigate(url, { replace: true });
    logger(`Navigated to: ${url}`);
    
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  }, [navigate, filters, id]);

  // Parse URL parameters on initial load
  useEffect(() => {
    if (!isInitialLoadRef.current) return;
    logger('Parsing URL parameters on initial load');
    
    const searchParams = new URLSearchParams(window.location.search);
    let hasAppliedFilters = false;
    
    // Build a new filters object from URL parameters
    const newFilters: FilterState = {
      status: null,
      locationId: null,
      searchTerm: '',
      startDate: filters.startDate,
      endDate: filters.endDate
    };
    
    // Parse status filter
    const statusParam = searchParams.get('status');
    if (statusParam) {
      logger(`Setting status from URL: ${statusParam}`);
      newFilters.status = statusParam;
      hasAppliedFilters = true;
    }
    
    // Parse location filter
    const locationParam = searchParams.get('locationId');
    if (locationParam) {
      logger(`Setting location from URL: ${locationParam}`);
      newFilters.locationId = parseInt(locationParam, 10);
      hasAppliedFilters = true;
    }
    
    // Parse search term
    const searchParam = searchParams.get('search');
    if (searchParam) {
      logger(`Setting search term from URL: ${searchParam}`);
      newFilters.searchTerm = searchParam;
      hasAppliedFilters = true;
    }
    
    // Parse date filters
    const startDateParam = searchParams.get('startDate');
    if (startDateParam) {
      logger(`Setting start date from URL: ${startDateParam}`);
      newFilters.startDate = new Date(startDateParam);
      hasAppliedFilters = true;
    }
    
    const endDateParam = searchParams.get('endDate');
    if (endDateParam) {
      logger(`Setting end date from URL: ${endDateParam}`);
      newFilters.endDate = new Date(endDateParam);
      hasAppliedFilters = true;
    }
    
    // Set all filters at once to avoid multiple re-renders
    if (hasAppliedFilters) {
      logger('Applying filters from URL parameters', newFilters);
      setFilters(newFilters);
      // Reset this flag after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 300);
    } else {
      logger('No filters applied from URL parameters');
      isInitialLoadRef.current = false;
    }
  }, []);

  // Update URL whenever filters change - but protect against initial load race conditions
  useEffect(() => {
    if (isInitialLoadRef.current) {
      logger('Skipping URL update during initial load');
      return;
    }
    
    // Add an extra check for recent initialization
    // This gives time for the state updates from URL parsing to be applied
    // This subtracts the result of performance.now() (which gives time in milliseconds 
    // since page load) from Date.now() (which gives the current time in Unix epoch milliseconds).
    const isRecentlyInitialized = Date.now() - performance.now() < 500;
    if (isRecentlyInitialized) {
      logger('Skipping URL update - recently initialized');
      return;
    }
    
    logger('Running updateUrlWithFilters with current state', filters);
    updateUrlWithFilters();
  }, [filters, updateUrlWithFilters]);

  // Check if we're returning from an edit with a specific appointment to refresh
  useEffect(() => {
    const state = location.state as { refreshAppointmentId?: number } | null;
    if (state?.refreshAppointmentId) {
      logger(`Returning from edit, refreshing appointment ${state.refreshAppointmentId}`);
      // Invalidate the specific appointment query
      queryClient.invalidateQueries({
        queryKey: ['appointment', state.refreshAppointmentId]
      });
      // Also invalidate the appointments list to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['appointments']
      });
      // Clear the state to prevent repeated refreshes
      navigate(location.pathname + location.search, { replace: true });
    }
  }, [location, queryClient, navigate]);

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
    queryKey: ['appointments', filters.startDate, filters.endDate],
    queryFn: async () => {
      try {
        logger('Fetching appointments');
        const params: Record<string, any> = {
          include_location: true,
          include_attachments: true
        };

        if (filters.startDate) {
          params.start_date = filters.startDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        }
        if (filters.endDate) {
          params.end_date = filters.endDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        }

        const { data } = await api.get<Appointment[]>('/admin/appointments/all', { params });
        logger(`Fetched ${data.length} appointments`);

        // For each appointment, set up an individual query
        data.forEach(appointment => {
          queryClient.setQueryData(['appointment', appointment.id], appointment);
        });

        return data;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        enqueueSnackbar('Failed to fetch appointments', { variant: 'error' });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Add individual appointment query for the current appointment
  const currentAppointmentId = filteredAppointments[activeStep]?.id;
  const { data: currentAppointment } = useQuery({
    queryKey: ['appointment', currentAppointmentId],
    queryFn: async () => {
      if (!currentAppointmentId) return null;
      const { data } = await api.get<Appointment>(`/admin/appointments/${currentAppointmentId}`);
      return data;
    },
    enabled: !!currentAppointmentId,
    staleTime: 5 * 60 * 1000
  });

  // Use the individual appointment data if available, otherwise fall back to the list data
  const getCurrentAppointment = useCallback(() => {
    if (!currentAppointmentId) return null;
    return currentAppointment || filteredAppointments[activeStep];
  }, [currentAppointment, filteredAppointments, activeStep, currentAppointmentId]);

  // Memoized function to get filtered appointments
  const getFilteredAppointments = useCallback(() => {
    logger(`Called getFilteredAppointments`);

    let filtered = [...appointments];
   
    // Apply status filter if selected
    if (filters.status) {
      logger(`Filtering by status: ${filters.status}`);
      filtered = filtered.filter(appointment => appointment.status === filters.status);
    }
    
    // Apply location filter if selected
    if (filters.locationId) {
      logger(`Filtering by location: ${filters.locationId}`);
      filtered = filtered.filter(appointment => 
        appointment.location && appointment.location.id === filters.locationId
      );
    }
    
    // Apply search filter if search term exists
    if (filters.searchTerm.trim()) {
      logger(`Filtering by search term: ${filters.searchTerm}`);
      const searchLower = filters.searchTerm.toLowerCase().trim();
      
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
  }, [appointments, filters, searchableFields]);

  // Apply filters and handle appointment selection
  useEffect(() => {
    if (appointments.length === 0) return;
    
    logger('Filtering appointments', filters);
    
    const filtered = getFilteredAppointments();
    setFilteredAppointments(filtered);
    
    // Handle ID from URL if present
    if (id && !isManualNavigationRef.current && !isFilteringRef.current) {
      const appointmentId = parseInt(id, 10);
      const index = filtered.findIndex(apt => apt.id === appointmentId);
      
      if (index !== -1) {
        // ID exists in filtered results
        logger(`Setting activeStep to ${index} for appointment ID ${appointmentId}`);
        setActiveStep(index);
      } else {
        // ID doesn't exist in filtered results - check if it exists at all
        const existsInAllAppointments = appointments.some(apt => apt.id === appointmentId);
        
        if (existsInAllAppointments && (filters.status || filters.locationId || filters.searchTerm || filters.startDate || filters.endDate)) {
          // It exists but is filtered out - clear filters
          logger(`Clearing filters to show appointment ID ${appointmentId}`);
          // Don't clear status if that's the filter that was just applied from URL
          if (!isInitialLoadRef.current) {
            setFilters(prev => ({
              ...prev,
              status: null,
              locationId: null,
              searchTerm: '',
              startDate: null,
              endDate: null
            }));
          }
          return; // Exit early - the effect will run again with cleared filters
        } else {
          // It doesn't exist at all - go to first appointment
          logger(`Appointment ID ${appointmentId} not found, going to first appointment`);
          setActiveStep(0);
          if (filtered.length > 0) {
            // Navigate to the first appointment
            const firstAppointmentId = filtered[0].id;
            isNavigatingRef.current = true;
            // Preserve any filter parameters that were set
            const currentParams = new URLSearchParams(window.location.search);
            const url = `/admin/appointments/review/${firstAppointmentId}?${currentParams.toString()}`;
            navigate(url, { replace: true });
            logger(`Navigated to first appointment: ${url}`);
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 100);
          } else {
            // No appointments after filtering
            // Preserve filter parameters in the URL
            const currentParams = new URLSearchParams(window.location.search);
            navigate(`/admin/appointments/review?${currentParams.toString()}`, { replace: true });
            logger(`No appointments to show, navigated to review page with filters preserved`);
          }
        }
      }
    } else if (filtered.length > 0) {
      // No ID in URL or manual navigation - ensure activeStep is valid
      if (activeStep >= filtered.length) {
        logger('Resetting activeStep to 0 - current step is invalid');
        setActiveStep(0);
      }
      
      // If there's no ID in URL but we have appointments, update URL
      if (!id && !isNavigatingRef.current && filtered.length > 0) {
        const appointmentId = filtered[activeStep < filtered.length ? activeStep : 0].id;
        logger(`Updating URL to appointment ID ${appointmentId}`);
        
        // Get current search params and preserve them
        const searchParams = new URLSearchParams(window.location.search);
        
        isNavigatingRef.current = true;
        navigate(`/admin/appointments/review/${appointmentId}?${searchParams.toString()}`, { replace: true });
        logger(`Navigated to: /admin/appointments/review/${appointmentId}?${searchParams.toString()}`);
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 100);
      }
    } else {
      logger('No appointments after filtering');
      // Preserve filter parameters in the URL
      const currentParams = new URLSearchParams(window.location.search);
      navigate(`/admin/appointments/review?${currentParams.toString()}`, { replace: true });
      logger(`Navigated to review page with filters preserved`);
    }
    
    // Always reset the manual navigation flag when filtering completes
    isManualNavigationRef.current = false;
    
    // Reset the filtering flag after a delay
    setTimeout(() => {
      isFilteringRef.current = false;
    }, 100);
    
  }, [appointments, filters, id, navigate, getFilteredAppointments]);

  // Update URL when activeStep changes
  useEffect(() => {
    logger(`Updating URL after step change to ${activeStep} - pre check`);
    // Skip if we're in the middle of filtering or navigating or initial load
    if (isFilteringRef.current || isNavigatingRef.current || isInitialLoadRef.current) {
      logger(`Skipping URL update - ${isFilteringRef.current ? 'filtering' : ''}${isNavigatingRef.current ? ' navigating' : ''}${isInitialLoadRef.current ? ' initial load' : ''}`);
      return;
    }
    
    // Skip invalid states
    if (filteredAppointments.length === 0 || activeStep >= filteredAppointments.length) {
      logger(`Skipping URL update - invalid state: ${filteredAppointments.length === 0 ? 'no appointments' : 'step out of range'}`);
      return;
    }
    
    logger(`Updating URL after step change to ${activeStep}`);
    const appointment = filteredAppointments[activeStep];
    
    if (appointment && appointment.id) {
      // Check if the URL already has the correct ID
      if (id && parseInt(id, 10) === appointment.id) {
        return;
      }
      
      // Get current search params and preserve them
      const searchParams = new URLSearchParams(window.location.search);
      
      // Update URL with appointment ID while preserving filter params
      isNavigatingRef.current = true;
      navigate(`/admin/appointments/review/${appointment.id}?${searchParams.toString()}`, { replace: true });
      
      // Reset flags after navigation
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    }
  }, [activeStep, filteredAppointments, navigate, id]);

  // Simplified Next/Back handlers
  const handleNext = () => {
    if (activeStep < filteredAppointments.length - 1) {
      logger('Next button clicked');
      isManualNavigationRef.current = true;
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      logger('Back button clicked');
      isManualNavigationRef.current = true;
      const prevStep = activeStep - 1;
      setActiveStep(prevStep);
    }
  };

  const handleStatusFilter = (status: string | null) => {
    logger(`Setting status filter: ${status}`);
    isFilteringRef.current = true;
    setFilters(prev => ({ ...prev, status }));
    setActiveStep(0);
  };

  const handleLocationFilter = (locationId: number | null) => {
    logger(`Setting location filter: ${locationId}`);
    isFilteringRef.current = true;
    setFilters(prev => ({ ...prev, locationId }));
    setActiveStep(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    logger(`Setting search term: ${event.target.value}`);
    isFilteringRef.current = true;
    setFilters(prev => ({ ...prev, searchTerm: event.target.value }));
    setActiveStep(0);
  };

  // Handle date filter changes
  const handleStartDateChange = (date: Date | null) => {
    logger(`Setting start date: ${date}`);
    isFilteringRef.current = true;
    setFilters(prev => ({ ...prev, startDate: date }));
    setActiveStep(0);
  };

  const handleEndDateChange = (date: Date | null) => {
    logger(`Setting end date: ${date}`);
    isFilteringRef.current = true;
    setFilters(prev => ({ ...prev, endDate: date }));
    setActiveStep(0);
  };

  const clearDateFilters = () => {
    logger('Clearing date filters');
    isFilteringRef.current = true;
    setFilters(prev => ({ ...prev, startDate: null, endDate: null }));
    setActiveStep(0);
  };

  // Get count of appointments for a specific location
  const getLocationAppointmentCount = (locationId: number, status: string) => {
    try {
      return appointments.filter(a => a.location && a.location.id === locationId && (a.status === status || status === 'All')).length;
    } catch (error) {
      console.error('Error counting appointments for location:', error);
      return 0;
    }
  };

  // Get count of appointments for a specific status
  const getStatusAppointmentCount = (status: string) => {
    return appointments.filter(a => (a.status === status || status === 'All')).length;
  };

  // Updated AppointmentTile component to safely handle undefined appointments
  const AppointmentTile: React.FC<{ appointment: Appointment }> = ({ appointment }) => {
    const navigate = useNavigate();
    const theme = useTheme();

    const handleEdit = (appointmentId: number) => {
      const currentUrl = window.location.pathname + window.location.search;
      navigate(`${AdminAppointmentsEditRoute.path?.replace(':id', appointmentId.toString())}?redirectTo=${encodeURIComponent(currentUrl)}` || '');
      logger(`Editing appointment with ID: ${appointmentId}`);
    };

    // Get the most up-to-date appointment data
    const currentData = appointment.id === currentAppointmentId ? getCurrentAppointment() || appointment : appointment;

    if (!currentData) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No appointment found with the current filters.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please try different filters or go back to the previous appointment.
          </Typography>
        </Paper>
      );
    }
    
    return <AppointmentCard appointment={currentData} displayMode="regular" />;
  };

  return (
    <Layout>
      <Container>
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 1,
            mb: 4
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Typography variant="h1">All Appointments</Typography>
                </Grid>
                <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <DatePicker
                        label="Start Date"
                        value={filters.startDate}
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
                        value={filters.endDate}
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
                      {(filters.startDate || filters.endDate) && (
                        <SecondaryButton 
                          size="small" 
                          onClick={clearDateFilters}
                        >
                          Clear Dates
                        </SecondaryButton>
                      )}
                    </Stack>
                  </LocalizationProvider>

                </Grid>
              </Grid>
            </Box>
            
            {/* Status Filters as Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
              <Tabs 
                value={filters.status || 'All'} 
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
                      isSelected={filters.status === null}
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
                        isSelected={filters.status === status}
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
                value={filters.searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: filters.searchTerm && (
                    <InputAdornment position="end">
                      <SecondaryButton 
                        onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                        size="small"
                      >
                        Clear
                      </SecondaryButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1 }}
              />
              
              {/* Show search results count when searching */}
              {filters.searchTerm && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Found {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} 
                    {filters.status ? ` with status "${filters.status}"` : ''} 
                    {filters.locationId ? ` at ${locations.find(l => l.id === filters.locationId)?.name || 'selected location'}` : ''}
                    {filters.startDate ? ` from ${filters.startDate.toLocaleDateString()}` : ''}
                    {filters.endDate ? ` to ${filters.endDate.toLocaleDateString()}` : ''}
                    {filters.searchTerm ? ` matching "${filters.searchTerm}"` : ''}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Location Filters */}
            <Box>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={1} md={0.4} sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationThinIconV2 sx={{ width: 22, height: 22 }} />
                </Grid>
                <Grid item xs={11} md={1.6} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ m: 0 }}>Filter by Location</Typography>
                </Grid>
                <Grid item xs={12} md={10} sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  {isLoadingLocations ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Loading locations...</Typography>
                    </Box>
                  ) : locations.length > 0 ? (
                    <FilterChipGroup
                      key={`location-filter-group-${filters.status || 'all'}`}
                      options={locations.filter(loc => getLocationAppointmentCount(loc.id, filters.status || 'All')).map(loc => loc.id)}
                      selectedValue={filters.locationId}
                      getLabel={(locationId) => {
                        const location = locations.find(l => l.id === locationId);
                        return location ? location.name : `Location ${locationId}`;
                      }}
                      getCount={(locationId) => getLocationAppointmentCount(locationId, filters.status || 'All')}
                      getColor={(_, theme) => theme.palette.primary.dark}
                      onToggle={handleLocationFilter}
                      // getIcon={() => <LocationThinIconV2 />}
                      sx={{
                        pl: 0.5,
                        pr: 0.5,
                        color: '#9598A6',
                        border: `1px solid rgba(149, 152, 166, 0.2)`,
                        fontSize: '0.81rem',
                        fontWeight: '500',
                        backgroundColor: '#fff',
                        borderRadius: '13px',
                        '&:hover': {
                          color: '#3D8BE8',
                          border: '1px solid rgba(61, 139, 232, 0.2)',
                          fontWeight: '500',
                          backgroundColor: 'rgba(61, 139, 232, 0.1)',
                        },
                        '&.MuiChip-filled': {
                          color: '#3D8BE8',
                          fontWeight: '600',
                          // backgroundColor: '#3D8BE8',
                          // fontWeight: '600',
                          border: '1px solid rgba(61, 139, 232, 0.2)',
                          // color: '#fff',
                        }
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No locations available. Please check with your administrator.
                    </Typography>
                  )}
                </Grid>

                {/* Active Date Filters */}
                {(filters.startDate || filters.endDate) && (
                  <>
                    <Grid item xs={1} md={0.4} sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarIconV2 sx={{ width: 22, height: 22 }} />
                    </Grid>
                    <Grid item xs={11} md={1.6} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ m: 0, fontSize: '0.81rem' }}>Active Date Filters</Typography>
                    </Grid>
                    <Grid item xs={12} md={10} sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1 }}>
                      {filters.startDate && (
                        <Chip 
                          label={`From: ${filters.startDate.toLocaleDateString()}`}
                          size="small" 
                          onDelete={() => setFilters(prev => ({ ...prev, startDate: null }))}
                          sx={{ 
                            color: '#3D8BE8', 
                            borderRadius: '8px',
                            pl:0, pt:0,
                            backgroundColor: '#f9f9f9',
                            border: '1px solid rgba(61, 139, 232, 0.2)',
                          }}
                        />
                      )}
                      {filters.endDate && (
                        <Chip 
                          label={`To: ${filters.endDate.toLocaleDateString()}`}
                          size="small" 
                          onDelete={() => setFilters(prev => ({ ...prev, endDate: null }))}
                          sx={{ 
                            color: '#3D8BE8', 
                            borderRadius: '8px',
                            pl:0, pt:0,
                            backgroundColor: '#f9f9f9',
                            border: '1px solid rgba(61, 139, 232, 0.2)',
                          }}
                        />
                      )}
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>

            {/* Active Date Filters Summary */}
            {/* {(filters.startDate || filters.endDate) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
                <Typography variant="body2">Active Date Filters:</Typography>
                <Button 
                  size="small" 
                  onClick={clearDateFilters}
                >
                  Clear All
                </Button>
              </Box>
            )} */}

            {/* Active Location Filters Summary - Only shown for location filters */}
            {/* {filters.locationId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Active Location Filters:</Typography>
                <Chip 
                  label={locations.find(l => l.id === filters.locationId)?.name || `Location ID: ${filters.locationId}`} 
                  size="small" 
                  onDelete={() => setFilters(prev => ({ ...prev, locationId: null }))}
                  icon={<LocationOnIcon fontSize="small" />}
                  sx={{ 
                    color: theme.palette.primary.main,
                  }}
                />
                <Button 
                  size="small" 
                  onClick={() => {
                    setFilters(prev => ({ ...prev, locationId: null }));
                  }}
                >
                  Clear
                </Button>
              </Box>
            )} */}
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
                {/* Add the edge navigation buttons */}
                <EdgeNavigationButtons
                  onPrev={handleBack}
                  onNext={handleNext}
                  hasPrev={activeStep > 0}
                  hasNext={activeStep < filteredAppointments.length - 1}
                />
                
                {/* For smaller number of items use regular SwipeableViews */}
                {filteredAppointments.length <= 20 ? (
                  <SwipeableViews
                    index={activeStep}
                    onChangeIndex={(index) => {
                      logger(`Swipe detected, changing to index ${index}`);
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
                      logger(`Virtualized swipe detected, changing to index ${index}`);
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

export default AdminAppointmentTiles; 