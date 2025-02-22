import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Checkbox } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import Layout from '../components/Layout';

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

const DignitaryListAll: React.FC = () => {
  const [dignitaries, setDignitaries] = useState<Dignitary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDignitaries = async () => {
      try {
        const response = await fetch('http://localhost:8001/admin/dignitaries/all', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setDignitaries(data);
        } else {
          console.error('Failed to fetch dignitaries');
        }
      } catch (error) {
        console.error('Error fetching dignitaries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDignitaries();
  }, []);

  const columns: GridColDef[] = [
    { field: 'honorific_title', headerName: 'Title', width: 100 },
    { field: 'first_name', headerName: 'First Name', width: 130 },
    { field: 'last_name', headerName: 'Last Name', width: 130 },
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
        <Checkbox checked={params.row.has_dignitary_met_gurudev} />
      ),
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ 
          // py: 4 
        }}>
          <Typography variant="h4" component="h1" gutterBottom>
            All Dignitaries
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom>
            All Dignitaries
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

export default DignitaryListAll; 
