import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import {
  DataGrid,
  GridColDef,
} from '@mui/x-data-grid';
import Layout from '../components/Layout';

interface User {
  id: number;
  google_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  created_at: string;
}

const UsersAll: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:8001/users/all', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error('Failed to fetch users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const columns: GridColDef[] = [
    { field: 'first_name', headerName: 'First Name', width: 130 },
    { field: 'last_name', headerName: 'Last Name', width: 130 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'phone_number', headerName: 'Phone Number', width: 130 },
    { field: 'role', headerName: 'Role', width: 130 },
    { 
        field: 'created_at', 
        headerName: 'Created On', 
        width: 130,
        renderCell: (params) => {
            const date = new Date(params.value);
            return date.toLocaleDateString();
        }
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            All Users
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom>
            All Users
          </Typography>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={users}
                columns={columns}
                rowCount={users.length}
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

export default UsersAll; 