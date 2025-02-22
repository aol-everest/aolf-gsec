import React from 'react';
import { Container, Typography, Paper, Box, Checkbox } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';

interface Dignitary {
  id: number;
  honorific_title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  primary_domain: string;
  title_in_organization: string;
  organization: string;
  country: string;
  state: string;
  city: string;
  has_dignitary_met_gurudev: boolean;
}

const DignitaryList: React.FC = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  const { data: dignitaries = [], isLoading } = useQuery({
    queryKey: ['assigned-dignitaries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Dignitary[]>('/dignitaries/assigned');
        return data;
      } catch (error) {
        console.error('Error fetching dignitaries:', error);
        enqueueSnackbar('Failed to fetch assigned dignitaries', { variant: 'error' });
        throw error;
      }
    },
  });

  const columns: GridColDef[] = [
    { 
      field: 'Name', 
      headerName: 'Name', 
      width: 200,
      renderCell: (params) => `${params.row.honorific_title} ${params.row.first_name} ${params.row.last_name}`
    },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    { field: 'primary_domain', headerName: 'Domain', width: 130 },
    { field: 'title_in_organization', headerName: 'Position', width: 150 },
    { field: 'organization', headerName: 'Organization', width: 200 },
    { field: 'country', headerName: 'Country', width: 130 },
    { field: 'state', headerName: 'State', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
    { 
      field: 'has_dignitary_met_gurudev', 
      headerName: 'Met Gurudev?', 
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Checkbox 
          checked={params.row.has_dignitary_met_gurudev} 
          disabled
        />
      ),
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dignitaries
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom>
            Dignitaries assigned to you
          </Typography>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={dignitaries}
                columns={columns}
                rowCount={dignitaries.length}
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

export default DignitaryList; 