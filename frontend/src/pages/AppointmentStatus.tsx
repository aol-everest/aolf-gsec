import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Chip } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import Layout from '../components/Layout';

interface Dignitary {
  honorific_title: string;
  first_name: string;
  last_name: string;
}

interface Appointment {
  id: number;
  dignitary: Dignitary;
  purpose: string;
  preferred_date: string;
  preferred_time: string;
  duration: string;
  location: string;
  pre_meeting_notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const AppointmentStatus: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch('http://localhost:8001/appointments/my', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
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

    fetchAppointments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

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
        let date = new Date(params.row.preferred_date + 'T' + params.row.preferred_time);
        let dateDisplay = "";
        if (params.row.appointment_date && params.row.appointment_time) {
          date = new Date(params.row.appointment_date + 'T' + params.row.appointment_time);
          dateDisplay = date.toLocaleString();
        } else {
          return <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{date.toLocaleString()}<br /><span className="small-font">(requested)</span></div>;
        }
      },
    },
    { field: 'duration', headerName: 'Duration', width: 100 },
    { field: 'location', headerName: 'Location', width: 150 },
    // { field: 'pre_meeting_notes', headerName: 'Notes', width: 200 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value as string) as any}
          size="small"
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
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ 
          // py: 4 
        }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Appointment Status
          </Typography>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={appointments}
                columns={columns}
                // rowCount={appointments.length}
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
                loading={loading}
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