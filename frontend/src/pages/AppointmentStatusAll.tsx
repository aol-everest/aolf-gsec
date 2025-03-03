import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Chip,
  Select,
  MenuItem,
  SelectChangeEvent,
  Checkbox,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  GridColDef,
  GridActionsCellItem,
  GridRowModesModel,
  GridRowModes,
  GridEventListener,
  GridRowId,
  GridRowModel,
  GridRowEditStopReasons,
  GridRenderCellParams,
  GridRenderEditCellParams,
  GridCellParams,
  useGridApiContext,
  GridRowParams,
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FilterListIcon from '@mui/icons-material/FilterList';
import Layout from '../components/Layout';
import { getStatusChipSx, getSubStatusChipSx, getStatusColor } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '../utils/dateUtils';
import GenericDataGrid from '../components/GenericDataGrid';
import { Appointment } from '../models/types';
import { Location } from '../models/types';

interface StatusEditCellProps extends GridRenderEditCellParams<Appointment> {
  statusOptions: string[];
}

const StatusEditCell = (props: StatusEditCellProps) => {
  const { id, value, field, statusOptions } = props;
  const apiRef = useGridApiContext();

  const handleChange = (event: SelectChangeEvent) => {
    apiRef.current.setEditCellValue({ id, field, value: event.target.value }, event);
  };

  return (
    <Select
      value={value as string}
      onChange={handleChange}
      fullWidth
      variant="standard"
    >
      {statusOptions.map((option: string) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </Select>
  );
};

const AppointmentStatusAll: React.FC = () => {
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
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
      const { data } = await api.get<Location[]>('/locations/all');
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
      return data;
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
    mutationFn: async (newRow: Appointment) => {
      const updateData = {
        dignitary_id: newRow.dignitary_id,
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

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const processRowUpdate = async (newRow: Appointment, oldRow: Appointment) => {
    try {
      await updateAppointmentMutation.mutateAsync(newRow);
      return newRow;
    } catch (error) {
      throw error;
    }
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const columns: GridColDef<Appointment>[] = [
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      width: 56,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem
              key="save"
              icon={<SaveIcon />}
              label="Save"
              sx={{ color: 'primary.main' }}
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              key="cancel"
              icon={<CancelIcon />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }
        return [
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
        ];
      },
    },
    {
      field: 'id',
      headerName: 'ID',
      width: 56,
      editable: false,
    },
    {
      field: 'dignitary',
      headerName: 'Dignitary',
      width: 130,
      flex: 1,
      editable: false,
      renderCell: (params: GridRenderCellParams<Appointment>) => {
        {
          const dignitary = params.row.dignitary;
          return dignitary
            ? `${dignitary.honorific_title} ${dignitary.first_name} ${dignitary.last_name}`
            : 'N/A';
        }
      },
    },
    {
      field: 'preferred_date_and_time',
      headerName: 'Requested Date & Time',
      width: 110,
      flex: 0.5,
      editable: false,
      valueGetter: (value, row, column, apiRef) => {
        return formatDate(row.preferred_date, false) + ' ' + row.preferred_time_of_day;
      },
    },
    {
      field: 'appointment_date',
      headerName: 'Appointment Date',
      width: 110,
      flex: 0.5,
      editable: true,
      type: 'date',
      valueGetter: (value: string) => {
        if (!value) return null;
        return new Date(value);
      },
    },
    {
      field: 'appointment_time',
      headerName: 'Appointment Time',
      width: 110,
      flex: 0.5,
      editable: true,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 150,
      flex: 1,
      editable: true,
      type: 'singleSelect',
      valueOptions: locations.map(loc => ({ value: loc.id, label: `${loc.name} - ${loc.city}, ${loc.state}` })),
      valueGetter: (value, row, column, apiRef) => row.location_id,
      valueSetter: (value, row) => {
        // const value = typeof params.value === 'number' ? params.value : null;
        return { ...row, location_id: value };
      },
      renderCell: (params: GridRenderCellParams<Appointment>) => {
        const location = params.row.location ? params.row.location : locations.find(loc => loc.id === params.row.location_id);
        return location ? `${location.name} - ${location.city}, ${location.state}` : 'N/A';
      },
    },
    {
      field: 'has_dignitary_met_gurudev',
      headerName: 'Met Gurudev?',
      width: 81,
      editable: true,
      renderCell: (params: GridRenderCellParams<Appointment>) => (
        <Checkbox checked={params.row.dignitary.has_dignitary_met_gurudev} />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      flex: 0.81,
      editable: true,
      type: 'singleSelect',
      valueOptions: statusOptions,
      renderCell: (params: GridRenderCellParams<Appointment>) => (
        <Chip
          label={params.value}
          sx={getStatusChipSx(params.value as string, theme)}
          size="small"
        />
      ),
      renderEditCell: (params: GridRenderEditCellParams<Appointment>) => (
        <StatusEditCell
          {...params}
          statusOptions={statusOptions}
        />
      ),
    },
    {
      field: 'sub_status',
      headerName: 'Sub-Status',
      width: 130,
      flex: 0.81,
      editable: true,
      type: 'singleSelect',
      valueOptions: subStatusOptions,
      renderCell: (params: GridRenderCellParams<Appointment>) => (
        <Chip
          label={params.value}
          sx={getSubStatusChipSx(params.value as string, theme)}
          size="small"
        />
      ),
      renderEditCell: (params: GridRenderEditCellParams<Appointment>) => (
        <StatusEditCell
          {...params}
          statusOptions={subStatusOptions}
        />
      ),
    },
    {
      field: 'appointment_type',
      headerName: 'Type',
      width: 130,
      flex: 0.81,
      editable: true,
      type: 'singleSelect',
      valueOptions: appointmentTypeOptions,
      renderCell: (params: GridRenderCellParams<Appointment>) => (
        <Chip
          label={params.value}
        />
      ),
      renderEditCell: (params: GridRenderEditCellParams<Appointment>) => (
        <StatusEditCell
          {...params}
          statusOptions={appointmentTypeOptions}
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Requested On',
      width: 110,
      flex: 0.5,
      editable: false,
      valueGetter: (value, row, column, apiRef) => {
        return formatDate(row.created_at, true);
      },
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      width: 110,
      flex: 0.5,
      editable: false,
      valueGetter: (value, row, column, apiRef) => {
        return formatDate(row.updated_at, true);
      },
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
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
              </Box>
              
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
                    No locations available. Please check with your administrator.
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

          <Box
            sx={{
              width: '100%',
              '& .actions': { color: 'text.secondary' },
              '& .textPrimary': { color: 'text.primary' },
            }}
          >
            <GenericDataGrid
              rows={selectedStatus || selectedLocation ? filteredAppointments : appointments}
              // getRowHeight={() => 'auto'}
              columns={columns}
              loading={isLoading}
              editMode="row"
              rowModesModel={rowModesModel}
              onRowModesModelChange={handleRowModesModelChange}
              onRowEditStop={handleRowEditStop}
              processRowUpdate={processRowUpdate}
              defaultVisibleColumns={['id', 'dignitary', 'has_dignitary_met_gurudev', 'preferred_date_and_time', 'appointment_date', 'appointment_time', 'status', 'sub_status']}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
                    page: 0,
                  },
                },
              }}
              getQuickFilterMatchesAmount={(filter: string, row: Appointment, isDetailPanel: boolean) => {
                if (!filter || filter.trim() === '') {
                  return 1;
                }

                const lowerFilter = filter.toLowerCase();
                const rowData = [
                  // ID
                  String(row.id || ''),
                  // Dignitary name
                  row.dignitary ? `${row.dignitary.honorific_title || ''} ${row.dignitary.first_name || ''} ${row.dignitary.last_name || ''}`.toLowerCase() : '',
                  // Preferred date and time
                  `${formatDate(row.preferred_date, false)} ${row.preferred_time_of_day || ''}`.toLowerCase(),
                  // Appointment date and time
                  `${formatDate(row.appointment_date, false)} ${row.appointment_time || ''}`.toLowerCase(),
                  // Location
                  row.location ? `${row.location.name || ''} ${row.location.city || ''} ${row.location.state || ''}`.toLowerCase() : '',
                  // Status
                  (row.status || '').toLowerCase(),
                  // Sub-status
                  (row.sub_status || '').toLowerCase(),
                  // Appointment type
                  (row.appointment_type || '').toLowerCase(),
                  // Created at and updated at
                  formatDate(row.created_at, true).toLowerCase(),
                  formatDate(row.updated_at, true).toLowerCase(),
                  // Purpose
                  (row.purpose || '').toLowerCase(),
                  // Requester notes
                  (row.requester_notes_to_secretariat || '').toLowerCase()
                ];

                // Check if any field contains the filter text
                return rowData.some(field => field.includes(lowerFilter)) ? 1 : 0;
              }}
            />
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentStatusAll;