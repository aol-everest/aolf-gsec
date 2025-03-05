import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

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

  // Fetch appointments using React Query
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      try {
        // Make sure we're getting the full appointment data including location
        const { data } = await api.get<Appointment[]>('/admin/appointments/all', {
          params: {
            include_location: true
          }
        });
        return data;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        enqueueSnackbar('Failed to fetch appointments', { variant: 'error' });
        throw error;
      }
    },
    refetchOnMount: true,
    staleTime: 0 // Always consider data stale to ensure fresh data on navigation
  });

  // Filter appointments based on selected status and location
  useEffect(() => {
    let filtered = [...appointments];
    
    // Apply status filter if selected
    if (selectedStatus) {
      filtered = filtered.filter(appointment => appointment.status === selectedStatus);
    }
    
    // Apply location filter if selected
    if (selectedLocation) {
      filtered = filtered.filter(appointment => 
        appointment.location && appointment.location.id === selectedLocation
      );
    }
    
    setFilteredAppointments(filtered);
    setActiveStep(0); // Reset to first appointment when filters change
  }, [selectedStatus, selectedLocation, appointments]);

  const handleNext = () => {
    setActiveStep((prevStep) => Math.min(prevStep + 1, filteredAppointments.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prevStep) => Math.max(prevStep - 1, 0));
  };

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status);
  };

  const handleLocationFilter = (locationId: number | null) => {
    setSelectedLocation(locationId);
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

  const AppointmentTile = ({ appointment }: { appointment: Appointment }) => (
    <AppointmentCard appointment={appointment} theme={theme} />
  );

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
                <AppointmentTile appointment={filteredAppointments[activeStep]} />
                <MobileStepper
                  variant="dots"
                  steps={filteredAppointments.length}
                  position="static"
                  activeStep={activeStep}
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
                      disabled={activeStep === filteredAppointments.length - 1}
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