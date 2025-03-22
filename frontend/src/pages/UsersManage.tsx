import React, { useState, useEffect, useMemo } from 'react';
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
  Paper,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
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
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
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
  created_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  updated_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
}

interface UserAccess {
  id: number;
  user_id: number;
  country_code: string;
  location_id?: number;
  access_level: string;
  entity_type: string;
  expiry_date?: string;
  reason: string;
  is_active: boolean;
  created_at: string;
  created_by: number;
  updated_at?: string;
  updated_by?: number;
}

interface UserAccessFormData {
  user_id: number;
  country_code: string;
  location_ids: number[];
  access_level: string;
  entity_type: string;
  expiry_date?: string | null;
  reason: string;
  is_active: boolean;
}

interface Location {
  id: number;
  name: string;
  country: string;
  country_code: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  is_active?: boolean;
}

interface UserAccessSummary {
  user_id: number;
  user_email: string;
  user_name: string;
  countries: string[];
  location_count: number;
  entity_types: string[];
  max_access_level: string | null;
  access_count: number;
}

const initialFormData: UserFormData = {
  email: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  role: 'GENERAL', // Default role
};

const initialAccessFormData: UserAccessFormData = {
  user_id: 0,
  country_code: '',
  location_ids: [],
  access_level: 'Read',
  entity_type: 'Appointment',
  expiry_date: null,
  reason: '',
  is_active: true,
};

const UsersManage: React.FC = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Access management states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [accessFormData, setAccessFormData] = useState<UserAccessFormData>(initialAccessFormData);
  const [accessFormErrors, setAccessFormErrors] = useState<Record<string, string>>({});
  const [editingAccessId, setEditingAccessId] = useState<number | null>(null);
  const [showAccessForm, setShowAccessForm] = useState(false);
  
  // Using useEnums hooks for all needed enums
  const { values: userRoles, isLoading: rolesLoading } = useEnums('userRole');
  const { values: accessLevels, isLoading: accessLevelsLoading } = useEnums('accessLevel');
  const { values: entityTypes, isLoading: entityTypesLoading } = useEnums('entityType');
  
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
  
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Location[]>('/admin/locations/all');
        return data;
      } catch (error) {
        console.error('Error fetching locations:', error);
        enqueueSnackbar('Failed to fetch locations', { variant: 'error' });
        return [];
      }
    },
  });

  // Add countries query
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<any[]>('/countries');
        return data;
      } catch (error) {
        console.error('Error fetching countries:', error);
        enqueueSnackbar('Failed to fetch countries', { variant: 'error' });
        return [];
      }
    },
  });

  // User Access queries and mutations
  const { 
    data: userAccess = [], 
    isLoading: userAccessLoading,
    refetch: refetchUserAccess
  } = useQuery({
    queryKey: ['user-access', editingId],
    queryFn: async () => {
      if (!editingId) return [];
      try {
        const { data } = await api.get<UserAccess[]>(`/admin/users/${editingId}/access/all`);
        return data;
      } catch (error) {
        console.error('Error fetching user access:', error);
        enqueueSnackbar('Failed to fetch user access', { variant: 'error' });
        return [];
      }
    },
    enabled: !!editingId,
  });
  
  const { 
    data: userAccessSummary, 
    isLoading: userAccessSummaryLoading 
  } = useQuery({
    queryKey: ['user-access-summary', editingId],
    queryFn: async () => {
      if (!editingId) return null;
      try {
        const { data } = await api.get<UserAccessSummary>(`/admin/users/${editingId}/access/summary`);
        return data;
      } catch (error) {
        console.error('Error fetching user access summary:', error);
        return null;
      }
    },
    enabled: !!editingId,
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
  
  // Mutation for creating/updating access
  const accessMutation = useMutation({
    mutationFn: async (variables: { id?: number; data: UserAccessFormData }) => {
      try {
        if (variables.id) {
          const { data } = await api.patch<UserAccess>(
            `/admin/users/${variables.id}/access/update/${variables.id}`, 
            { 
              ...variables.data, 
              location_id: variables.data.location_ids.length > 0 ? variables.data.location_ids[0] : null 
            }
          );
          return data;
        } else {
          if (variables.data.location_ids.length > 0) {
            const promises = variables.data.location_ids.map(locationId => {
              return api.post<UserAccess>(
                `/admin/users/${variables.id}/access/new`, 
                { 
                  ...variables.data, 
                  location_id: locationId 
                }
              );
            });
            const results = await Promise.all(promises);
            return results[0].data;
          } else {
            const { data } = await api.post<UserAccess>(
              `/admin/users/${variables.id}/access/new`, 
              { 
                ...variables.data, 
                location_id: null 
              }
            );
            return data;
          }
        }
      } catch (error) {
        console.error('Error saving access:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-access', editingId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-summary', editingId] });
      enqueueSnackbar(
        editingAccessId 
          ? 'Access updated successfully'
          : 'Access granted successfully', 
        { variant: 'success' }
      );
      resetAccessForm();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Failed to save access';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  });

  // Mutation for toggling access status
  const toggleAccessStatusMutation = useMutation({
    mutationFn: async (variables: { id: number; isActive: boolean }) => {
      try {
        const { data } = await api.patch<UserAccess>(
          `/admin/users/${variables.id}/access/update/${variables.id}`, 
          { is_active: variables.isActive }
        );
        return data;
      } catch (error) {
        console.error('Error toggling access status:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-access', editingId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-summary', editingId] });
      enqueueSnackbar(
        data.is_active 
          ? 'Access activated successfully'
          : 'Access deactivated successfully', 
        { variant: 'success' }
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Failed to update access status';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  });
  
  // Mutation for deleting access
  const deleteAccessMutation = useMutation({
    mutationFn: async (accessId: number) => {
      try {
        await api.delete(`/admin/users/${editingId}/access/${accessId}`);
        return accessId;
      } catch (error) {
        console.error('Error deleting access:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-access', editingId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-summary', editingId] });
      enqueueSnackbar('Access removed successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Failed to remove access';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  });

  // Function to close the form and reset state
  const handleClose = () => {
    setFormOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
    setFormErrors({});
    setShowAccessForm(false);
    resetAccessForm();
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
  
  const resetAccessForm = () => {
    setShowAccessForm(false);
    setAccessFormData({
      ...initialAccessFormData,
      user_id: editingId || 0
    });
    setEditingAccessId(null);
    setAccessFormErrors({});
  };
  
  const handleAccessFormOpen = (accessRecord?: UserAccess) => {
    if (accessRecord) {
      // Editing existing access
      setAccessFormData({
        user_id: accessRecord.user_id,
        country_code: accessRecord.country_code,
        location_ids: accessRecord.location_id ? [accessRecord.location_id] : [],
        access_level: accessRecord.access_level,
        entity_type: accessRecord.entity_type,
        expiry_date: accessRecord.expiry_date || null,
        reason: accessRecord.reason,
        is_active: accessRecord.is_active
      });
      setEditingAccessId(accessRecord.id);
    } else {
      // Creating new access
      setAccessFormData({
        ...initialAccessFormData,
        user_id: editingId || 0
      });
      setEditingAccessId(null);
    }
    setAccessFormErrors({});
    setShowAccessForm(true);
  };
  
  const handleToggleAccessStatus = (accessId: number, currentStatus: boolean) => {
    toggleAccessStatusMutation.mutate({
      id: accessId,
      isActive: !currentStatus
    });
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
  
  const validateAccessForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!accessFormData.country_code) {
      errors.country_code = 'Country code is required';
    }
    
    if (!accessFormData.access_level) {
      errors.access_level = 'Access level is required';
    }
    
    if (!accessFormData.entity_type) {
      errors.entity_type = 'Entity type is required';
    }
    
    if (!accessFormData.reason) {
      errors.reason = 'Reason is required';
    }
    
    setAccessFormErrors(errors);
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
  
  const handleAccessSubmit = () => {
    if (!validateAccessForm()) {
      enqueueSnackbar('Please correct the errors in the form', { variant: 'warning' });
      return;
    }

    accessMutation.mutate({
      id: editingAccessId || undefined,
      data: accessFormData
    });
  };
  
  const handleDeleteAccess = (accessId: number) => {
    if (window.confirm('Are you sure you want to delete this access record?')) {
      deleteAccessMutation.mutate(accessId);
    }
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
  
  const handleAccessFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setAccessFormData(prev => ({ ...prev, [name]: value }));
      
      // Clear validation error when field is edited
      if (accessFormErrors[name]) {
        setAccessFormErrors(prev => {
          const updated = { ...prev };
          delete updated[name];
          return updated;
        });
      }
    }
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccessFormData(prev => ({ 
      ...prev, 
      expiry_date: e.target.value || null 
    }));
  };

  // Add a memoized filtered locations array
  const filteredLocations = useMemo(() => {
    if (!accessFormData.country_code) return [];
    
    return locations.filter(loc => loc.country_code === accessFormData.country_code);
  }, [locations, accessFormData.country_code]);

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
      field: 'created_by_name',
      headerName: 'Created By',
      width: 150,
      flex: 0.8,
      renderCell: (params) => params.row.created_by_user 
        ? `${params.row.created_by_user.first_name} ${params.row.created_by_user.last_name}`
        : 'System'
    },
    {
      field: 'updated_by_name',
      headerName: 'Updated By',
      width: 150,
      flex: 0.8,
      renderCell: (params) => params.row.updated_by_user 
        ? `${params.row.updated_by_user.first_name} ${params.row.updated_by_user.last_name}`
        : 'System'
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
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpen(params.row)}
        />
      ],
    },
  ];
  
  // Access record data grid columns
  const accessColumns: GridColDef[] = [
    { field: 'country_code', headerName: 'Country', width: 100 },
    { 
      field: 'location_id', 
      headerName: 'Location', 
      width: 180,
      renderCell: (params) => {
        if (!params.value) return 'All Locations';
        const location = locations.find(loc => loc.id === params.value);
        return location ? location.name : `Location #${params.value}`;
      }
    },
    { field: 'access_level', headerName: 'Access Level', width: 120 },
    { field: 'entity_type', headerName: 'Entity Type', width: 180 },
    { 
      field: 'expiry_date', 
      headerName: 'Expires', 
      width: 120,
      renderCell: (params) => params.value ? formatDate(params.value, false) : 'Never'
    },
    { 
      field: 'is_active', 
      headerName: 'Status', 
      width: 100,
      renderCell: (params) => params.value ? 
        <Chip label="Active" color="success" size="small" /> : 
        <Chip label="Inactive" color="error" size="small" />
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={params.row.is_active ? <LockIcon /> : <LockOpenIcon />}
          label={params.row.is_active ? "Deactivate" : "Activate"}
          onClick={() => handleToggleAccessStatus(params.row.id, params.row.is_active)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleAccessFormOpen(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDeleteAccess(params.row.id)}
          showInMenu
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
                  <Grid item xs={12} md={6} lg={4}>
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
                  <Grid item xs={12} md={6} lg={4}>
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
                  <Grid item xs={12} md={6} lg={4}>
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
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} md={6} lg={4}>
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
                
                {/* Access Management Section - Only show for existing users */}
                {editingId && (
                  <Box sx={{ mt: 4 }}>
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Access Management</Typography>
                      {!showAccessForm && (
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => handleAccessFormOpen()}
                          size="small"
                        >
                          Add Access
                        </Button>
                      )}
                    </Box>
                    
                    {/* USHER role restriction notice */}
                    {formData.role === 'USHER' && (
                      <Paper 
                        sx={{ 
                          p: 2, 
                          mb: 3, 
                          color: 'info.dark' 
                        }}
                      >
                        <Typography variant="body2">
                          <strong>Note:</strong> Users with the USHER role will only have Read access and can only access Appointments, regardless of the settings below. Access level and entity type selections will be overridden by the system.
                        </Typography>
                      </Paper>
                    )}
                    
                    {userAccessSummaryLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : userAccessSummary ? (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>Access Summary</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="body2" color="text.secondary">Countries</Typography>
                              <Typography variant="body1">
                                {userAccessSummary.countries.length > 0 
                                  ? userAccessSummary.countries.join(', ') 
                                  : 'None'}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="body2" color="text.secondary">Max Access Level</Typography>
                              <Typography variant="body1">
                                {userAccessSummary.max_access_level || 'None'}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="body2" color="text.secondary">Entity Types</Typography>
                              <Typography variant="body1">
                                {userAccessSummary.entity_types.length > 0 
                                  ? userAccessSummary.entity_types.join(', ') 
                                  : 'None'}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    ) : null}
                    
                    {/* New/Edit Access Form */}
                    <Collapse in={showAccessForm}>
                      <Card variant="outlined" sx={{ mb: 3 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1">{editingAccessId ? 'Edit Access' : 'Add New Access'}</Typography>
                            <IconButton onClick={resetAccessForm} size="small">
                              <CloseIcon />
                            </IconButton>
                          </Box>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                select
                                fullWidth
                                label="Country"
                                name="country_code"
                                value={accessFormData.country_code}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  console.log("Selected country:", value);
                                  // Clear any previously selected locations when changing country
                                  setAccessFormData(prev => ({
                                    ...prev,
                                    country_code: value,
                                    location_ids: [] // Reset selected locations
                                  }));
                                }}
                                required
                                disabled={countriesLoading}
                                error={!!accessFormErrors.country_code}
                                helperText={accessFormErrors.country_code || (countriesLoading ? 'Loading countries...' : '')}
                              >
                                {countriesLoading ? (
                                  <MenuItem disabled>Loading countries...</MenuItem>
                                ) : countries.length > 0 ? (
                                  countries.map((country) => (
                                    <MenuItem key={country.iso2_code} value={country.iso2_code}>
                                      {country.name} ({country.iso2_code})
                                    </MenuItem>
                                  ))
                                ) : (
                                  <MenuItem disabled>No countries available</MenuItem>
                                )}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                select
                                fullWidth
                                label="Locations (Multiple)"
                                name="location_ids"
                                value={accessFormData.location_ids}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setAccessFormData(prev => ({
                                    ...prev,
                                    location_ids: Array.isArray(value) ? value : []
                                  }));
                                }}
                                SelectProps={{
                                  multiple: true
                                }}
                              >
                                {accessFormData.country_code ? (
                                  filteredLocations.length > 0 ? (
                                    filteredLocations.map((location) => (
                                      <MenuItem key={location.id} value={location.id}>
                                        {location.name} - {location.country_code}
                                      </MenuItem>
                                    ))
                                  ) : (
                                    <MenuItem disabled>No locations found for {accessFormData.country_code}</MenuItem>
                                  )
                                ) : (
                                  <MenuItem disabled>Select a country first</MenuItem>
                                )}
                              </TextField>
                              <Typography variant="caption" color="text.secondary">
                                Leave empty for all locations. {filteredLocations.length} locations available for this country.
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                select
                                fullWidth
                                label="Access Level"
                                name="access_level"
                                value={formData.role === 'USHER' ? 'Read' : accessFormData.access_level}
                                onChange={handleAccessFormChange}
                                required
                                disabled={accessLevelsLoading || formData.role === 'USHER'}
                                error={!!accessFormErrors.access_level}
                                helperText={
                                  formData.role === 'USHER' 
                                    ? 'USHER users are restricted to Read access' 
                                    : accessFormErrors.access_level || ''
                                }
                              >
                                {accessLevels.length > 0 ? (
                                  accessLevels.map((level) => (
                                    <MenuItem key={level} value={level}>
                                      {level}
                                    </MenuItem>
                                  ))
                                ) : (
                                  // Fallback options
                                  ['Read', 'ReadWrite', 'Admin'].map((level) => (
                                    <MenuItem key={level} value={level}>
                                      {level}
                                    </MenuItem>
                                  ))
                                )}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                select
                                fullWidth
                                label="Entity Type"
                                name="entity_type"
                                value={formData.role === 'USHER' ? 'Appointment' : accessFormData.entity_type}
                                onChange={handleAccessFormChange}
                                required
                                disabled={entityTypesLoading || formData.role === 'USHER'}
                                error={!!accessFormErrors.entity_type}
                                helperText={
                                  formData.role === 'USHER' 
                                    ? 'USHER users are restricted to Appointment access only' 
                                    : accessFormErrors.entity_type || ''
                                }
                              >
                                {entityTypes.length > 0 ? (
                                  entityTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                      {type}
                                    </MenuItem>
                                  ))
                                ) : (
                                  // Fallback options
                                  ['Appointment', 'Appointment and Dignitary'].map((type) => (
                                    <MenuItem key={type} value={type}>
                                      {type}
                                    </MenuItem>
                                  ))
                                )}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Expiry Date (Optional)"
                                name="expiry_date"
                                type="date"
                                value={accessFormData.expiry_date || ''}
                                onChange={handleDateChange}
                                InputLabelProps={{
                                  shrink: true,
                                }}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Reason"
                                name="reason"
                                value={accessFormData.reason}
                                onChange={handleAccessFormChange}
                                required
                                multiline
                                rows={2}
                                error={!!accessFormErrors.reason}
                                helperText={accessFormErrors.reason || ''}
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                          <Button onClick={resetAccessForm} disabled={accessMutation.isPending}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAccessSubmit} 
                            variant="contained"
                            disabled={accessMutation.isPending}
                          >
                            {accessMutation.isPending ? (
                              <CircularProgress size={24} />
                            ) : editingAccessId ? 'Update Access' : 'Create Access'}
                          </Button>
                        </CardActions>
                      </Card>
                    </Collapse>
                    
                    {/* Access Records Table */}
                    {userAccessLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : userAccess.length > 0 ? (
                      <CommonDataGrid
                        rows={userAccess}
                        columns={accessColumns}
                        loading={userAccessLoading}
                        autoHeight
                        hideFooter={userAccess.length <= 10}
                      />
                    ) : (
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body1" color="text.secondary">
                          No access records found for this user
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}
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

export default UsersManage; 