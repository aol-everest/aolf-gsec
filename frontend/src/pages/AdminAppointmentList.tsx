import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Chip,
  CircularProgress,
  Button,
  Grid,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FilterListIcon from '@mui/icons-material/FilterList';
import Layout from '../components/Layout';
import { getStatusColor, formatHonorificTitle } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';
import { useApi } from '../hooks/useApi';
import { enqueueSnackbar, useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '../utils/dateUtils';
import { Appointment } from '../models/types';
import { Location } from '../models/types';
import { FilterChipGroup } from '../components/FilterChip';
import AdminAppointmentListTable from '../components/AdminAppointmentListTable';



interface AppointmentWithNames extends Appointment {
  dignitary_names?: string;
}

const AdminAppointmentList: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithNames[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const theme = useTheme();
  const api = useApi();
  const queryClient = useQueryClient();

  // Fetch status options
  const { data: statusOptions = [] } = useQuery({
    queryKey: ['status-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/status-options');
      return data;
    },
  });

  // Fetch sub-status options
  const { data: subStatusOptions = [] } = useQuery({
    queryKey: ['sub-status-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/sub-status-options');
      return data;
    },
  });

  // Fetch appointment type options
  const { data: appointmentTypeOptions = [] } = useQuery({
    queryKey: ['appointment-type-options'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/appointments/type-options');
      return data;
    },
  });

  // Fetch locations
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get<Location[]>('/admin/locations/all');
      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments-all'],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>('/admin/appointments/all', {
        params: {
          include_location: true
        }
      });
      
      // Add calculated dignitary_names field
      return data.map(appointment => ({
        ...appointment,
        dignitary_names: appointment.appointment_dignitaries?.map(ad => {
          const dig = ad.dignitary;
          return `${formatHonorificTitle(dig.honorific_title)} ${dig.first_name} ${dig.last_name}`;
        }).join(', ') || 'N/A'
      }));
    },
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

  // Get count of appointments for a specific location
  const getLocationAppointmentCount = (locationId: number) => {
    try {
      return appointments.filter(a => a.location && a.location.id === locationId).length;
    } catch (error) {
      console.error('Error counting appointments for location:', error);
      return 0;
    }
  };

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
  };

  const handleLocationFilter = (locationId: number | null) => {
    setSelectedLocation(locationId === selectedLocation ? null : locationId);
  };

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (newRow: AppointmentWithNames) => {
      const updateData = {
        purpose: newRow.purpose,
        preferred_date: newRow.preferred_date,
        preferred_time_of_day: newRow.preferred_time_of_day,
        appointment_date: newRow.appointment_date ? new Date(newRow.appointment_date).toISOString().split('T')[0] : null,
        appointment_time: newRow.appointment_time,
        location_id: newRow.location_id,
        status: newRow.status,
        requester_notes_to_secretariat: newRow.requester_notes_to_secretariat,
      };
      
      const { data } = await api.patch(`/admin/appointments/update/${newRow.id}`, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-all'] });
      enqueueSnackbar('Appointment updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      enqueueSnackbar('Failed to update appointment', { variant: 'error' });
      throw error;
    },
  });

  // Handle appointment update
  const handleUpdateAppointment = async (appointment: AppointmentWithNames) => {
    await updateAppointmentMutation.mutateAsync(appointment);
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h1" component="h1" gutterBottom>
            All Appointments
          </Typography>

          {/* Filters Section */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon fontSize="small" />
                Filters
              </Typography>
              
              {/* Status Filters */}
              <Box>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <Typography variant="subtitle2">Filter by Status</Typography>
                  </Grid>
                  <Grid item xs={12} md={10}>
                    <FilterChipGroup
                      options={statusOptions}
                      selectedValue={selectedStatus}
                      getLabel={(status) => status}
                      getCount={(status) => appointments.filter(a => a.status === status).length}
                      getColor={(status) => getStatusColor(status, theme)}
                      onToggle={handleStatusFilter}
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
                  </Grid>
                </Grid>
              </Box>
              
              {/* Location Filters */}
              <Box>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <Typography variant="subtitle2">Filter by Location</Typography>
                  </Grid>
                  <Grid item xs={12} md={10}>
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
                        getColor={() => theme.palette.primary.main}
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
                        No locations available. Please check with your administrator.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>
              
              {/* Active Filters Summary */}
              {(selectedStatus || selectedLocation) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
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
          </Paper>

          <Box sx={{ width: '100%' }}>
            <AdminAppointmentListTable
              appointments={selectedStatus || selectedLocation ? filteredAppointments : appointments}
              loading={isLoading}
              statusOptions={statusOptions}
              subStatusOptions={subStatusOptions}
              appointmentTypeOptions={appointmentTypeOptions}
              locations={locations}
              onUpdateAppointment={handleUpdateAppointment}
              searchValue={searchValue}
              onSearchChange={handleSearchChange}
            />
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default AdminAppointmentList;