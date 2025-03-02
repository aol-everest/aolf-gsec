import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  Collapse, 
  TextField, 
  Grid, 
  IconButton,
  MenuItem,
  CircularProgress,
  SelectChangeEvent,
  Paper
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem
} from '@mui/x-data-grid';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '../utils/dateUtils';
import CommonDataGrid from '../components/GenericDataGrid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useEnums } from '../hooks/useEnums';

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
  created_by: number;
  updated_by: number;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
}

const initialFormData: UserFormData = {
  email: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  role: 'GENERAL', // Default role
};

const UsersAll: React.FC = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Using useEnums hook for user roles
  const { values: userRoles, isLoading: rolesLoading } = useEnums('userRole');

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

  // Mutation for creating/updating users
  const userMutation = useMutation({
    mutationFn: async (variables: { id?: number; data: UserFormData }) => {
      try {
        if (variables.id) {
          console.log(`Updating user ${variables.id} with data:`, variables.data);
          const { data } = await api.patch<User>(`/admin/users/update/${variables.id}`, variables.data);
          return data;
        } else {
          console.log('Creating new user with data:', variables.data);
          const { data } = await api.post<User>('/admin/users/new', variables.data);
          return data;
        }
      } catch (error) {
        console.error('Error saving user:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      enqueueSnackbar(
        editingId 
          ? `User "${data.first_name} ${data.last_name}" updated successfully` 
          : `User "${data.first_name} ${data.last_name}" created successfully`, 
        { variant: 'success' }
      );
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Failed to save user';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  });

  // Function to close the form and reset state
  const handleClose = () => {
    setFormOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
    setFormErrors({});
  };

  const handleOpen = (user?: User) => {
    if (user) {
      console.log('Editing user:', user);
      setFormData({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number || '',
        role: user.role,
      });
      setEditingId(user.id);
    } else {
      console.log('Adding new user');
      setFormData(initialFormData);
      setEditingId(null);
    }
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    if (!formData.first_name) {
      errors.first_name = 'First name is required';
    }
    
    if (!formData.last_name) {
      errors.last_name = 'Last name is required';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      enqueueSnackbar('Please correct the errors in the form', { variant: 'warning' });
      return;
    }

    userMutation.mutate({
      id: editingId || undefined,
      data: formData
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Clear validation error when field is edited
      if (formErrors[name]) {
        setFormErrors(prev => {
          const updated = { ...prev };
          delete updated[name];
          return updated;
        });
      }
    }
  };

  const columns: GridColDef[] = [
    { 
        field: 'name', 
        headerName: 'Name', 
        width: 130,
        flex: 1.3,
        renderCell: (params) => `${params.row.first_name} ${params.row.last_name}`
    },
    { field: 'email', headerName: 'Email', width: 200, flex: 1 },
    { field: 'phone_number', headerName: 'Phone Number', width: 130, flex: 1 },
    { field: 'role', headerName: 'Role', width: 130, flex: 0.81 },
    { 
      field: 'created_at', 
      headerName: 'Created On', 
      width: 110,
      flex: 0.5,
      renderCell: (params) => formatDate(params.row.created_at, false)
    },
    {
      field: 'last_login_at',
      headerName: 'Last Login',
      width: 170,
      flex: 0.81,
      renderCell: (params) => formatDate(params.row.last_login_at, true)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpen(params.row)}
        />,
      ],
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              All Users
            </Typography>
            {!formOpen && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
              >
                Add User
              </Button>
            )}
          </Box>

          <Collapse in={formOpen}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{editingId ? 'Edit User' : 'Add New User'}</Typography>
                  <IconButton onClick={handleClose} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
                
                {userMutation.isError && (
                  <Paper 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      bgcolor: 'error.light', 
                      color: 'error.dark' 
                    }}
                    variant="outlined"
                  >
                    <Typography variant="body2">
                      There was an error saving the user. Please try again.
                    </Typography>
                  </Paper>
                )}
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      error={!!formErrors.first_name}
                      helperText={formErrors.first_name || ''}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      error={!!formErrors.last_name}
                      helperText={formErrors.last_name || ''}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      error={!!formErrors.email}
                      helperText={formErrors.email || ''}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      disabled={rolesLoading}
                      error={!!formErrors.role}
                      helperText={formErrors.role || (rolesLoading ? "Loading roles..." : "")}
                    >
                      {userRoles.length > 0 ? (
                        userRoles.map((role) => (
                          <MenuItem key={role} value={role}>
                            {role}
                          </MenuItem>
                        ))
                      ) : (
                        // Fallback options if API fails
                        ['SECRETARIAT', 'GENERAL', 'USHER'].map((role) => (
                          <MenuItem key={role} value={role}>
                            {role}
                          </MenuItem>
                        ))
                      )}
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <Button onClick={handleClose} disabled={userMutation.isPending}>Cancel</Button>
                <Button 
                  onClick={handleSubmit} 
                  variant="contained"
                  disabled={userMutation.isPending}
                >
                  {userMutation.isPending ? (
                    <CircularProgress size={24} />
                  ) : editingId ? 'Update' : 'Create'}
                </Button>
              </CardActions>
            </Card>
          </Collapse>

          <CommonDataGrid
            rows={users}
            columns={columns}
            loading={isLoading}
            defaultVisibleColumns={['name', 'email', 'role', 'actions']}
          />
        </Box>
      </Container>
    </Layout>
  );
};

export default UsersAll; 