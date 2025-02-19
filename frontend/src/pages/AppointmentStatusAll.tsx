import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Chip,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  DataGrid,
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
import Layout from '../components/Layout';
import { getStatusChipSx } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';

export interface Dignitary {
  honorific_title: string;
  first_name: string;
  last_name: string;
}

export interface Appointment {
  id: number;
  dignitary_id: number;
  dignitary: Dignitary;
  purpose: string;
  preferred_date: string;
  preferred_time: string;
  appointment_date: string;
  appointment_time: string;
  duration: string;
  location: string;
  pre_meeting_notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const theme = useTheme();

  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const response = await fetch('http://localhost:8001/appointments/status-options', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch status options');
        const data = await response.json();
        setStatusOptions(data);
      } catch (error) {
        console.error('Error fetching status options:', error);
      }
    };

    fetchStatusOptions();
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('http://localhost:8001/admin/appointments/all', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      } else {
        console.error('Failed to fetch appointments');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => async () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  // const handleDeleteClick = (id: GridRowId) => async () => {
  //   try {
  //     const response = await fetch(`http://localhost:8001/admin/appointments/${id}`, {
  //       method: 'DELETE',
  //       headers: {
  //         Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  //       },
  //     });
  //     if (response.ok) {
  //       setAppointments((prev) => prev.filter((appointment) => appointment.id !== id));
  //     } else {
  //       console.error('Failed to delete appointment');
  //     }
  //   } catch (error) {
  //     console.error('Error deleting appointment:', error);
  //   }
  // };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const processRowUpdate = async (newRow: Appointment, oldRow: Appointment) => {
    try {
      // Convert the date to the format expected by the backend (YYYY-MM-DD)
      const response = await fetch(`http://localhost:8001/admin/appointments/update/${newRow.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dignitary_id: newRow.dignitary_id,
          purpose: newRow.purpose,
          preferred_date: newRow.preferred_date,
          appointment_date: newRow.appointment_date ? new Date(newRow.appointment_date).toISOString().split('T')[0] : null,
          appointment_time: newRow.appointment_time,
          duration: newRow.duration,
          location: newRow.location,
          status: newRow.status,
          // last_updated_by: null, // This will be set by the backend
        }),
      });
      if (response.ok) {
        await fetchAppointments();
        return newRow;
      } else {
        const errorData = await response.json();
        console.error('Failed to update appointment:', errorData);
        throw new Error(errorData.detail || 'Failed to update appointment');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
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
          // <GridActionsCellItem
          //   key="delete"
          //   icon={<DeleteIcon />}
          //   label="Delete"
          //   onClick={handleDeleteClick(id)}
          //   color="inherit"
          // />,
        ];
      },
    },
    {
      field: 'id',
      headerName: 'Request ID',
      width: 100,
      editable: false,
    },
    {
      field: 'dignitary',
      headerName: 'Dignitary',
      width: 200,
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
      width: 180,
      editable: false,
      valueGetter: (value, row, column, apiRef) => {
        const date = new Date(row.preferred_date + 'T' + row.preferred_time);
        return date.toLocaleString();
      },
    },
    {
      field: 'appointment_date',
      headerName: 'Appointment Date',
      width: 130,
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
      width: 100,
      editable: true,
    },
    {
      field: 'duration',
      headerName: 'Duration',
      width: 100,
      editable: true,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 150,
      editable: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
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
      field: 'created_at',
      headerName: 'Requested',
      width: 180,
      editable: false,
      valueGetter: (value, row, column, apiRef) => {
        const date = new Date(row.created_at);
        return date.toLocaleString();
      },
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      width: 180,
      editable: false,
      valueGetter: (value, row, column, apiRef) => {
        const date = new Date(row.updated_at);
        return date.toLocaleString();
      },
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ 
          // py: 4 
        }}>
          <Typography variant="h4" component="h1" gutterBottom>
            All Appointments
          </Typography>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box
              sx={{
                height: 500,
                width: '100%',
                '& .actions': { color: 'text.secondary' },
                '& .textPrimary': { color: 'text.primary' },
              }}
            >
              <DataGrid<Appointment>
                rows={appointments}
                columns={columns}
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
                // pageSize={10}
                // rowsPerPageOptions={[10]}
                loading={loading}
                // experimentalFeatures={{ newEditingApi: true }}
              />
            </Box>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentStatusAll;