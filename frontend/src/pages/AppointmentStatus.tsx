import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Chip,
  CircularProgress,
  Grid,
  useMediaQuery
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getStatusColor } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { Appointment, Location, StatusMap, SubStatusMap } from '../models/types';
import { LocationThinIconV2 } from '../components/iconsv2';
import { FilterChipGroup } from '../components/FilterChip';
import AppointmentTable from '../components/AppointmentTable';
import AppointmentDetailDialog from '../components/AppointmentDetailDialog';

const AppointmentStatus: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const theme = useTheme();
  const api = useApi();
  const navigate = useNavigate();
  
  // Check if we're on mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch status options
  const { data: statusOptions = [] } = useQuery({
    queryKey: ['status-options'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/appointments/status-options');
        return data;
      } catch (error) {
        console.error('Error fetching status options:', error);
        return [];
      }
    },
  });

  // Fetch status map for consistent status checking
  const { data: statusMap } = useQuery<StatusMap>({
    queryKey: ['status-map'],
    queryFn: async () => {
      const { data } = await api.get<StatusMap>('/appointments/status-options-map');
      return data;
    }
  });

  // Fetch sub status map for consistent sub status checking
  const { data: subStatusMap } = useQuery<SubStatusMap>({
    queryKey: ['sub-status-map'],
    queryFn: async () => {
      const { data } = await api.get<SubStatusMap>('/appointments/sub-status-options-map');
      return data;
    }
  });

  // Fetch relationship type map from the API
  const { data: relationshipTypeMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['relationship-type-map'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string>>('/user-contacts/relationship-type-options-map');
      return data;
    },
  });

  // Fetch locations - using regular user API
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations-user'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Location[]>('/locations/all');
        return data;
      } catch (error) {
        console.error('Error fetching locations:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['my-appointments'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Appointment[]>('/appointments/my', {
          params: {
            include_location: true
          }
        });
        return data;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 1, // Data is considered fresh for 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
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
  }, [selectedStatus, selectedLocation, appointments]);

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
  };

  const handleLocationFilter = (locationId: number | null) => {
    setSelectedLocation(locationId === selectedLocation ? null : locationId);
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

  // Handle row click to open appointment detail dialog
  const handleRowClick = (appointment: Appointment) => {
    setSelectedAppointmentId(appointment.id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAppointmentId(null);
  };

  // Define responsive column visibility
  const getColumnVisibility = () => {
    if (isMobile) {
      // Mobile: show only id, date_time, and status
      return {
        id: true,
        attendees: false,
        date_time: true,
        location: false,
        status: true,
        requested: false,
      };
    } else {
      // Desktop: show all columns
      return {
        id: true,
        attendees: true,
        date_time: true,
        location: true,
        status: true,
        requested: true,
      };
    }
  };

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h1" component="h1" gutterBottom>
            Appointment Status
          </Typography>

          {/* Filters Section */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 1,
            mb: 4
          }}>
            {/* Location Filters */}
            <Box>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={1} md={0.4} sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationThinIconV2 sx={{ width: 22, height: 22 }} />
                </Grid>
                <Grid item xs={11} md={1.6} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ m: 0 }}>Location</Typography>
                </Grid>
                <Grid item xs={12} md={10} sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  {isLoadingLocations ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2">Loading locations...</Typography>
                    </Box>
                  ) : locations.length > 0 ? (
                    <FilterChipGroup
                      options={locations.filter(loc => getLocationAppointmentCount(loc.id)).map(loc => loc.id)}
                      selectedValue={selectedLocation}
                      getLabel={(locationId) => {
                        const location = locations.find(l => l.id === locationId);
                        return location ? location.name : `Location ${locationId}`;
                      }}
                      getCount={(locationId) => getLocationAppointmentCount(locationId)}
                      getColor={(_, theme) => theme.palette.primary.dark}
                      onToggle={handleLocationFilter}
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
                          border: '1px solid rgba(61, 139, 232, 0.2)',
                        }
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No locations available.
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>


          </Box>

          <AppointmentTable
            appointments={selectedStatus || selectedLocation ? filteredAppointments : appointments}
            onRowClick={handleRowClick}
            statusMap={statusMap}
            subStatusMap={subStatusMap}
            relationshipTypeMap={relationshipTypeMap}
            enableColumnVisibility={true}
            initialColumnVisibility={getColumnVisibility()}
          />
        </Box>
      </Container>

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        open={dialogOpen}
        onClose={handleDialogClose}
      />
    </Layout>
  );
};

export default AppointmentStatus; 