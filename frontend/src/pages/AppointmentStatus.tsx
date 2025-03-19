import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Chip,
  CircularProgress,
  Button
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import Layout from '../components/Layout';
import { formatHonorificTitle, getStatusChipSx, getStatusColor } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { formatDate } from '../utils/dateUtils';
import CommonDataGrid from '../components/GenericDataGrid';
import { Appointment, Dignitary, Location } from '../models/types';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FilterListIcon from '@mui/icons-material/FilterList';

const AppointmentStatus: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  // Fetch status options
  const { data: statusOptions = [] } = useQuery({
    queryKey: ['status-options'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/appointments/status-options');
        return data;
      } catch (error) {
        console.error('Error fetching status options:', error);
        enqueueSnackbar('Failed to fetch status options', { variant: 'error' });
        return [];
      }
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
        enqueueSnackbar('Failed to fetch locations', { variant: 'error' });
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
        enqueueSnackbar('Failed to fetch appointments', { variant: 'error' });
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

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 56,
      renderCell: (params: GridRenderCellParams) => params.value,
    },
    {
      field: 'dignitary',
      headerName: 'Dignitary Name',
      width: 200,
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        // Check for appointment_dignitaries first (multiple dignitaries case)
        if (params.row.appointment_dignitaries?.length > 0) {
          const dignitariesNames = params.row.appointment_dignitaries.map((ad: any) => {
            const dig = ad.dignitary;
            return `${formatHonorificTitle(dig.honorific_title)} ${dig.first_name} ${dig.last_name}`;
          });
          
          // Display only first dignitary with count if there are multiple
          if (dignitariesNames.length > 1) {
            return (
              <div>
                <div>{dignitariesNames[0]}</div>
                <div style={{ color: 'gray', fontSize: '0.8rem' }}>+{dignitariesNames.length - 1} more</div>
              </div>
            );
          } else {
            return dignitariesNames[0];
          }
        } 
        else {
          return 'N/A';
        }
      },
    },
    // { field: 'purpose', headerName: 'Purpose', width: 200 },
    {
      field: 'appointment_date_and_time',
      headerName: 'Date & Time',
      width: 130,
      flex: 1,
      editable: false,
      renderCell: (params: GridRenderCellParams) => {
        let dateDisplay = formatDate(params.row.preferred_date, false) + ' ' + params.row.preferred_time_of_day;
        let suffix = <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}><span className="small-font">(requested)</span></div>;
        if (params.row.appointment_date && params.row.appointment_time) {
          dateDisplay = formatDate(params.row.appointment_date, false) + ' ' + params.row.appointment_time;
          suffix = <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}><span className="small-font">(confirmed)</span></div>;
        }
        return <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{dateDisplay}<br />{suffix}</div>;
      },
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 150,
      flex: 1.1,
      renderCell: (params: GridRenderCellParams) => {
        const location = params.row.location;
        return location ? `${location.name} - ${location.city}, ${location.state}` : 'N/A';
      },
    },
    // {
    //   field: 'status',
    //   headerName: 'Status',
    //   width: 130,
    //   renderCell: (params: GridRenderCellParams) => (
    //     <Chip
    //       label={params.value}
    //       size="small"
    //       sx={getStatusChipSx(params.value as string, theme)}
    //     />
    //   ),
    // },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 110,
      renderCell: (params: GridRenderCellParams) => 
        formatDate(params.value as string, true),
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      width: 110,
      renderCell: (params: GridRenderCellParams) => 
        formatDate(params.value as string, true),
    },
    {
      field: 'secretariat_notes_to_requester',
      headerName: 'Notes from Secretariat',
      width: 200,
      flex: 2,
      editable: false,
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Appointment Status
          </Typography>

          {/* Filters Section */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon fontSize="small" />
                Filters
              </Typography>
              
              {/* Status Filters */}
              {/* <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Status</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  flexWrap: 'wrap'
                }}>
                  {statusOptions.map((status) => (
                    <Chip
                      key={status}
                      label={`${status} (${appointments.filter(a => a.status === status).length})`}
                      onClick={() => handleStatusFilter(status)}
                      variant={selectedStatus === status ? 'filled' : 'outlined'}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8,
                        },
                        bgcolor: selectedStatus === status ? theme.palette.primary.light : 'white',
                        color: selectedStatus === status ? 'white' : getStatusColor(status, theme),
                        border: `1px solid ${getStatusColor(status, theme)}`,
                        borderRadius: '10px',
                      }}
                    />
                  ))}
                </Box>
              </Box> */}
              
              {/* Location Filters */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Location</Typography>
                {isLoadingLocations ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading locations...</Typography>
                  </Box>
                ) : locations.length > 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1, 
                    flexWrap: 'wrap'
                  }}>
                    {locations.map((location) => (
                      <Chip
                        key={location.id}
                        icon={<LocationOnIcon />}
                        label={`${location.name} (${getLocationAppointmentCount(location.id)})`}
                        onClick={() => handleLocationFilter(location.id)}
                        variant={selectedLocation === location.id ? 'filled' : 'outlined'}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8,
                          },
                          bgcolor: selectedLocation === location.id ? theme.palette.primary.light : 'white',
                          color: selectedLocation === location.id ? 'white' : theme.palette.primary.main,
                          borderRadius: '10px',
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No locations available.
                  </Typography>
                )}
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

          <CommonDataGrid
            rows={selectedStatus || selectedLocation ? filteredAppointments : appointments}
            columns={columns}
            loading={isLoading}
            // defaultVisibleColumns={['id', 'dignitary', 'appointment_date_and_time', 'location', 'status', 'secretariat_notes_to_requester']}
            defaultVisibleColumns={['id', 'dignitary', 'appointment_date_and_time', 'location', 'secretariat_notes_to_requester']}
          />
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentStatus; 