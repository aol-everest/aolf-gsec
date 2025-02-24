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
import { formatDate } from '../utils/dateUtils';
import CommonDataGrid from '../components/GenericDataGrid';
import { Appointment, Dignitary } from '../models/types';

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
          <CommonDataGrid
            rows={appointments}
            columns={columns}
            loading={isLoading}
            defaultVisibleColumns={['id', 'dignitary', 'appointment_date_and_time', 'location', 'status', 'secretariat_notes_to_requester']}
          />
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentStatus; 