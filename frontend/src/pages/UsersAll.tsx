import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import {
  DataGrid,
  GridColDef,
} from '@mui/x-data-grid';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '../utils/dateUtils';
import CommonDataGrid from '../components/GenericDataGrid';

interface User {
  id: number;
  google_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  created_at: string;
  last_login_at: string;
}

const UsersAll: React.FC = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const { data } = await api.get<User[]>('/admin/users/all');
        return data;
      } catch (error) {
        console.error('Error fetching users:', error);
        enqueueSnackbar('Failed to fetch users', { variant: 'error' });
        throw error;
      }
    },
  });

  const columns: GridColDef[] = [
    { 
        field: 'name', 
        headerName: 'Name', 
        width: 130,
        renderCell: (params) => `${params.row.first_name} ${params.row.last_name}`
    },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone_number', headerName: 'Phone Number', width: 130 },
    { field: 'role', headerName: 'Role', width: 130 },
    { 
      field: 'created_at', 
      headerName: 'Created On', 
      width: 110,
      renderCell: (params) => formatDate(params.row.created_at, false)
    },
    {
      field: 'last_login_at',
      headerName: 'Last Login',
      width: 170,
      renderCell: (params) => formatDate(params.row.last_login_at, true)
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            All Users
          </Typography>
          <CommonDataGrid
            rows={users}
            columns={columns}
            loading={isLoading}
            defaultVisibleColumns={['name', 'email', 'role']}
          />
        </Box>
      </Container>
    </Layout>
  );
};

export default UsersAll; 