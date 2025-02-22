import React from 'react';
import { Container, Typography, Paper, Box, Chip } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import Layout from '../components/Layout';
import { getStatusChipSx } from '../utils/formattingUtils';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';

interface Dignitary {
  honorific_title: string;
  first_name: string;
  last_name: string;
}

interface Location {
  id: number;
  name: string;
  street_address: string;
  state: string;
  city: string;
  country: string;
  zip_code: string;
  driving_directions?: string;
  parking_info?: string;
}

interface Appointment {
  id: number;
  dignitary: Dignitary;
  purpose: string;
  preferred_date: string;
  preferred_time_of_day: string;
  appointment_date: string;
  appointment_time: string;
  location_id: number;
  location: Location;
  requester_notes_to_secretariat: string;
  status: string;
  created_at: string;
  updated_at: string;
  secretariat_notes_to_requester: string;
}

const AppointmentStatus: React.FC = () => {
  const theme = useTheme();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['my-appointments'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Appointment[]>('/appointments/my');
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

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'Request ID',
      width: 100,
      renderCell: (params: GridRenderCellParams) => params.value,
    },
    {
      field: 'dignitary',
      headerName: 'Dignitary',
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        const dignitary = params.row.dignitary as Dignitary;
        if (dignitary) {
          return `${dignitary.honorific_title} ${dignitary.first_name} ${dignitary.last_name}`;
        } else {
          return 'N/A';
        }
      },
    },
    // { field: 'purpose', headerName: 'Purpose', width: 200 },
    {
      field: 'appointment_date_and_time',
      headerName: 'Appointment Date & Time',
      width: 180,
      editable: false,
      renderCell: (params: GridRenderCellParams) => {
        let date = new Date(params.row.preferred_date);
        let dateDisplay = date.toLocaleString() + ' ' + params.row.preferred_time_of_day;
        let suffix = <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}><span className="small-font">(requested)</span></div>;
        if (params.row.appointment_date && params.row.appointment_time) {
          date = new Date(params.row.appointment_date + 'T' + params.row.appointment_time);
          dateDisplay = date.toLocaleString();
          suffix = <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}><span className="small-font">(confirmed)</span></div>;
        }
        return <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{dateDisplay}<br />{suffix}</div>;
      },
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const location = params.row.location;
        return location ? `${location.name} - ${location.city}, ${location.state}` : 'N/A';
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          sx={getStatusChipSx(params.value as string, theme)}
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 180,
      renderCell: (params: GridRenderCellParams) => 
        new Date(params.value as string).toLocaleString(),
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      width: 180,
      renderCell: (params: GridRenderCellParams) => 
        new Date(params.value as string).toLocaleString(),
    },
    {
      field: 'secretariat_notes_to_requester',
      headerName: 'Notes from Secretariat',
      width: 200,
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
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={appointments}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 10,
                      page: 0,
                    },
                  },
                }}
                pageSizeOptions={[10]}
                disableRowSelectionOnClick
                loading={isLoading}
                paginationMode="client"
              />
            </Box>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentStatus; 