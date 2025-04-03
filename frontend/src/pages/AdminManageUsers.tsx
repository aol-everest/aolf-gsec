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
  Divider,
  FormControlLabel,
  Switch,
  Popover
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
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useEnums } from '../hooks/useEnums';
import { RoleMap, AccessLevelMap, EntityTypeMap } from '../models/types';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { PencilIconV2 } from '../components/icons';
import { createDebugLogger } from '../utils/debugUtils';

interface User {
  id: number;
  google_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  country_code?: string;
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
  country_code: string;
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

const initialFormData: UserFormData = {
  email: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  role: 'GENERAL', // Default role
  country_code: '', // Default empty country code
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

const AdminManageUsers: React.FC = () => {
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
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  
  // Get user role from localStorage
  const userRole = localStorage.getItem('role');

  // Create a component-specific logger
  const logger = createDebugLogger(`AdminManageUsers`);
  
  // Using useEnums hooks for all needed enums
  const { values: userRoles, isLoading: rolesLoading } = useEnums('userRole');
  const { values: accessLevels, isLoading: accessLevelsLoading } = useEnums('accessLevel');
  const { values: entityTypes, isLoading: entityTypesLoading } = useEnums('entityType');
  
  // Fetch role map from the API
  const { data: roleMap = {} } = useQuery<RoleMap>({
    queryKey: ['role-map'],
    queryFn: async () => {
      try {
        const { data } = await api.get<RoleMap>('/admin/user-role-options-map');
        return data;
      } catch (error) {
        console.error('Error fetching role map:', error);
        return {};
      }
    },
  });
  
  // Fetch access level map from the API
  const { data: accessLevelMap = {} } = useQuery<AccessLevelMap>({
    queryKey: ['access-level-map'],
    queryFn: async () => {
      try {
        const { data } = await api.get<AccessLevelMap>('/admin/access-level-options-map');
        return data;
      } catch (error) {
        console.error('Error fetching access level map:', error);
        return {};
      }
    },
  });
  
  // Fetch entity type map from the API
  const { data: entityTypeMap = {} } = useQuery<EntityTypeMap>({
    queryKey: ['entity-type-map'],
    queryFn: async () => {
      try {
        const { data } = await api.get<EntityTypeMap>('/admin/entity-type-options-map');
        return data;
      } catch (error) {
        console.error('Error fetching entity type map:', error);
        return {};
      }
    },
  });
  
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
        const { data } = await api.get<any[]>('/admin/countries/enabled');
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

  // Mutation for creating/updating users
  const userMutation = useMutation({
    mutationFn: async (variables: { id?: number; data: UserFormData }) => {
      try {
        if (variables.id) {
          logger(`Updating user ${variables.id} with data:`, variables.data);
          const { data } = await api.patch<User>(`/admin/users/update/${variables.id}`, variables.data);
          return data;
        } else {
          logger('Creating new user with data:', variables.data);
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
    mutationFn: async (variables: { id?: number; userId: number; data: UserAccessFormData }) => {
      try {
        if (variables.id) {
          const { data } = await api.patch<UserAccess>(
            `/admin/users/${variables.userId}/access/update/${variables.id}`, 
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
                `/admin/users/${variables.userId}/access/new`, 
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
              `/admin/users/${variables.userId}/access/new`, 
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
    mutationFn: async (variables: { accessId: number; userId: number; isActive: boolean }) => {
      try {
        const { data } = await api.patch<UserAccess>(
          `/admin/users/${variables.userId}/access/update/${variables.accessId}`, 
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
      logger('Editing user:', user);
      setFormData({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number || '',
        role: user.role,
        country_code: user.country_code || '',
      });
      setEditingId(user.id);
    } else {
      logger('Adding new user');
      setFormData(initialFormData);
      setEditingId(null);
    }
    setFormErrors({});
    setFormOpen(true);
  };
  
  const resetAccessForm = () => {
    logger('Resetting access form');
    setShowAccessForm(false);
    setAccessFormData({
      ...initialAccessFormData,
      user_id: editingId || 0
    });
    setEditingAccessId(null);
    setAccessFormErrors({});
  };
  
  // Function to determine access level and entity type based on user role
  const determineAccessSettings = (role: string): { access_level: string; entity_type: string } => {
    logger('Determining access settings for role:', role);
    switch (role) {
      case roleMap['USHER']:
        return {
          access_level: accessLevelMap['READ'],
          entity_type: entityTypeMap['APPOINTMENT']
        };
      case roleMap['SECRETARIAT']:
        return {
          access_level: accessLevelMap['READ_WRITE'],
          entity_type: entityTypeMap['APPOINTMENT_AND_DIGNITARY']
        };
      default:
        return {
          access_level: accessLevelMap['READ'],
          entity_type: entityTypeMap['APPOINTMENT']
        };
    }
  };

  const handleAccessFormOpen = (accessRecord?: UserAccess) => {
    logger('Opening access form with access record:', accessRecord);
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
      // Creating new access - determine settings based on user role
      const user = users.find(u => u.id === editingId);
      logger('Setting up new access for user:', user);
      if (user) {
        const { access_level, entity_type } = determineAccessSettings(user.role);
        logger('Access settings:', { access_level, entity_type });
        setAccessFormData({
          ...initialAccessFormData,
          user_id: editingId || 0,
          access_level,
          entity_type
        });
      }
      setEditingAccessId(null);
    }
    setAccessFormErrors({});
    setShowAccessForm(true);
  };
  
  const handleToggleAccessStatus = (accessId: number, currentStatus: boolean) => {
    toggleAccessStatusMutation.mutate({
      accessId: accessId,
      userId: editingId || 0,
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
    
    if (!formData.country_code) {
      errors.country_code = 'Country is required';
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

    logger('accessFormData', accessFormData);
    
    // Check if the current user being edited is an USHER
    const user = users.find(u => u.id === editingId);
    if (user && (user.role === roleMap['USHER'] || user.role === 'USHER')) {
      if (!accessFormData.location_ids || accessFormData.location_ids.length === 0) {
        errors.location_ids = 'At least one location must be selected for USHER users';
      }
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
      userId: editingId || 0,
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
  
  // Add the effect after the filteredLocations declaration
  useEffect(() => {
    if (showAccessForm && editingId) {
      const user = users.find(u => u.id === editingId);
      
      // If user is an USHER and no location is selected, check for any pre-fill 
      // opportunities or at least mark it as an error
      if (user && (user.role === roleMap['USHER'] || user.role === 'USHER') && 
          accessFormData.country_code && 
          (!accessFormData.location_ids || accessFormData.location_ids.length === 0)) {
        
        // If there's only one location for the country, auto-select it
        if (filteredLocations.length === 1) {
          setAccessFormData(prev => ({
            ...prev,
            location_ids: [filteredLocations[0].id]
          }));
        }
        // Otherwise, just note that the selection is required
        else if (filteredLocations.length > 0) {
          setAccessFormErrors(prev => ({
            ...prev,
            location_ids: 'At least one location must be selected for USHER users'
          }));
        }
      }
    }
  }, [showAccessForm, editingId, users, accessFormData.country_code, filteredLocations, roleMap]);

  const columns: GridColDef[] = [
    { 
        field: 'name', 
        headerName: 'Name', 
        width: 130,
        flex: 1,
        renderCell: (params) => `${params.row.first_name} ${params.row.last_name}`
    },
    { field: 'email', headerName: 'Email', width: 200, flex: 1 },
    { field: 'phone_number', headerName: 'Phone Number', width: 130, flex: 1 },
    { 
      field: 'role', 
      headerName: 'Role', 
      width: 130, 
      flex: 0.81,
      renderCell: (params) => {
        // Display the user-friendly value from the map if available
        return Object.keys(roleMap).find(key => roleMap[key] === params.value) || params.value;
      }
    },
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
      flex: 0.7,
      renderCell: (params) => formatDate(params.row.last_login_at, true)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      flex: 0.3,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<PencilIconV2 />}
          label="Edit"
          onClick={() => handleOpen(params.row)}
        />
      ],
    },
  ];
  
  // Access record data grid columns
  const basicAccessColumns: GridColDef[] = [
    { field: 'country_code', headerName: 'Country', width: 100, flex: 0.5 },
    { 
      field: 'location_id', 
      headerName: 'Location', 
      width: 180,
      flex: 1,
      renderCell: (params) => {
        if (!params.value) return 'All Locations';
        const location = locations.find(loc => loc.id === params.value);
        return location ? location.name : `Location #${params.value}`;
      }
    },
    { 
      field: 'expiry_date', 
      headerName: 'Expires', 
      width: 120,
      flex: 0.81,
      renderCell: (params) => params.value ? formatDate(params.value, false) : 'Never'
    },
    { 
      field: 'is_active', 
      headerName: 'Status', 
      width: 100,
      flex: 0.5,
      renderCell: (params) => params.value ? 
        <Chip label="Active" color="success" size="small" /> : 
        <Chip label="Inactive" color="error" size="small" />
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Edit',
      width: 150,
      flex: 0.5,
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
  
  // Update access record columns to use maps
  const advancedAccessColumns: GridColDef[] = [
    ...basicAccessColumns.slice(0, 2), // Include country and location columns
    { 
      field: 'access_level', 
      headerName: 'Access Level', 
      width: 120, 
      flex: 0.81,
      renderCell: (params) => {
        // Display the user-friendly value from the map if available
        return Object.keys(accessLevelMap).find(key => accessLevelMap[key] === params.value) || params.value;
      }
    },
    { 
      field: 'entity_type', 
      headerName: 'Entity Type', 
      width: 180, 
      flex: 0.81,
      renderCell: (params) => {
        // Display the user-friendly value from the map if available
        return Object.keys(entityTypeMap).find(key => entityTypeMap[key] === params.value) || params.value;
      }
    },
    ...basicAccessColumns.slice(2), // Include expiry date, status, and actions columns
  ];

  // Use the appropriate columns based on mode
  const accessColumns = isAdvancedMode && userRole === 'ADMIN' ? advancedAccessColumns : basicAccessColumns;

  // Get role explanation text based on selected role
  const getRoleExplanationText = (role: string): string => {
    switch (role) {
      case roleMap['USHER']:
        return 'Users with the USHER role will have Read-only access to Appointments. You can control which locations they can access.';
      case roleMap['SECRETARIAT']:
        return 'Users with the SECRETARIAT role will have Read and Edit access to Appointments and Dignitaries. You can control which countries or locations they can access.';
      case roleMap['GENERAL']:
        return 'Users with the GENERAL role have default access permissions and do not require specific access configuration.';
      case roleMap['ADMIN']:
        return 'Users with the ADMIN role have full access to all features and can manage all users and access permissions.';
      default:
        return '';
    }
  };

  const handleRoleInfoClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleRoleInfoClose = () => {
    setAnchorEl(null);
  };

  const openRoleInfo = Boolean(anchorEl);

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              All Users
            </Typography>
            {!formOpen && (
              <PrimaryButton
                size="medium"
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
              >
                Add User
              </PrimaryButton>
            )}
          </Box>

          <Collapse in={formOpen}>
            <Card sx={{ backgroundColor: 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3">{editingId ? 'Edit User' : 'Add New User'}</Typography>
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
                      required={editingId ? false : true}
                      disabled={editingId ? true : false}
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
                      required={editingId ? false : true}
                      disabled={editingId ? true : false}
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
                      required={editingId ? false : true}
                      disabled={editingId ? true : false}
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
                      disabled={editingId ? true : false}
                    />
                  </Grid>
                  <Grid item xs={12} md={6} lg={4}>
                    <TextField
                      select
                      fullWidth
                      label="Residing Country"
                      name="country_code"
                      value={formData.country_code}
                      onChange={handleChange}
                      disabled={countriesLoading}
                      error={!!formErrors.country_code}
                      helperText={formErrors.country_code || (countriesLoading ? "Loading countries..." : "")}
                      required
                    >
                      {countries.map((country) => (
                        <MenuItem key={country.iso2_code} value={country.iso2_code}>
                          {country.name} ({country.iso2_code})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6} lg={4}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
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
                        {Object.entries(roleMap).length > 0 ? (
                          Object.entries(roleMap).map(([key, value]) => (
                            <MenuItem key={key} value={value}>
                              {value}
                            </MenuItem>
                          ))
                        ) : userRoles.length > 0 ? (
                          userRoles.map((role) => (
                            <MenuItem key={role} value={role}>
                              {role}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>Loading roles...</MenuItem>
                        )}
                      </TextField>
                      <IconButton 
                        size="small" 
                        onClick={handleRoleInfoClick}
                        sx={{ mt: 1, ml: 1 }}
                        aria-describedby="role-info-popover"
                      >
                        <HelpOutlineIcon color="primary" />
                      </IconButton>
                      <Popover
                        id="role-info-popover"
                        open={openRoleInfo}
                        anchorEl={anchorEl}
                        onClose={handleRoleInfoClose}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'left',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'left',
                        }}
                      >
                        <Box sx={{ p: 2, maxWidth: 320 }}>
                          <Typography variant="subtitle2" gutterBottom>Role Information</Typography>
                          <Typography variant="body2">
                            {getRoleExplanationText(formData.role)}
                          </Typography>
                        </Box>
                      </Popover>
                    </Box>
                  </Grid>
                </Grid>
                
                {/* Access Management Section - Only show for existing users that are NOT GENERAL role */}
                {editingId && formData.role !== (roleMap['GENERAL']) && (
                  <Box sx={{ mt: 4 }}>
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Access Records Table - Show this first */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">Access Management</Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          {userRole === 'ADMIN' && (
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={isAdvancedMode}
                                  onChange={(e) => setIsAdvancedMode(e.target.checked)}
                                  name="advancedMode"
                                />
                              }
                              label="Advanced Mode"
                            />
                          )}
                        </Box>
                      </Box>
                      
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
                          slots={{
                            toolbar: null
                          }}
                          disableRowSelectionOnClick
                          customRowHeight={45}
                        />
                      ) : (
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f9f9f9', borderRadius: 1 }}>
                          <Typography variant="body1" color="text.secondary">
                            No access records found for this user
                          </Typography>
                          <PrimaryButton
                            startIcon={<AddIcon />}
                            onClick={() => handleAccessFormOpen()}
                            size="small"
                            sx={{ mt: 2 }}
                          >
                            Grant Access
                          </PrimaryButton>
                        </Paper>
                      )}
                    </Box>
                    {!showAccessForm && (
                          <PrimaryButton
                            startIcon={<AddIcon />}
                            onClick={() => handleAccessFormOpen()}
                            size="small"
                          >
                            Add Access
                          </PrimaryButton>
                    )}

                    {/* New/Edit Access Form - Show this after the table */}
                    <Collapse in={showAccessForm}>
                      <Card variant="outlined" sx={{ mb: 3 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">{editingAccessId ? 'Edit Access' : 'Add New Access'}</Typography>
                            <IconButton onClick={resetAccessForm} size="small">
                              <CloseIcon />
                            </IconButton>
                          </Box>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6} lg={4}>
                              <TextField
                                select
                                fullWidth
                                label="Country"
                                name="country_code"
                                value={accessFormData.country_code}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setAccessFormData(prev => ({
                                    ...prev,
                                    country_code: value,
                                    location_ids: []
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
                            <Grid item xs={12} md={6} lg={5}>
                              <TextField
                                select
                                fullWidth
                                label="Locations (select multiple if needed)"
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
                                error={!!accessFormErrors.location_ids}
                                helperText={
                                  accessFormErrors.location_ids || 
                                  (() => {
                                    const user = users.find(u => u.id === editingId);
                                    const isUsherUser = user && (user.role === roleMap['USHER'] || user.role === 'USHER');
                                    return accessFormData.country_code ? 
                                      `${filteredLocations.length} locations available${isUsherUser ? ' (required for USHER users)' : ''}` : 
                                      'Select a country first';
                                  })()
                                }
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
                            </Grid>
                            <Grid item xs={12} md={6} lg={3}>
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
                            {isAdvancedMode && userRole === 'ADMIN' && (
                              <>
                                <Grid item xs={12} md={6} lg={4}>
                                  <TextField
                                    select
                                    fullWidth
                                    label="Access Level"
                                    name="access_level"
                                    value={accessFormData.access_level}
                                    onChange={handleAccessFormChange}
                                    required
                                    disabled={accessLevelsLoading}
                                    error={!!accessFormErrors.access_level}
                                    helperText={accessFormErrors.access_level || ''}
                                  >
                                    {Object.entries(accessLevelMap).length > 0 ? (
                                      Object.entries(accessLevelMap).map(([key, value]) => (
                                        <MenuItem key={key} value={value}>
                                          {value}
                                        </MenuItem>
                                      ))
                                    ) : accessLevels.length > 0 ? (
                                      accessLevels.map((level) => (
                                        <MenuItem key={level} value={level}>
                                          {level}
                                        </MenuItem>
                                      ))
                                    ) : (
                                      <MenuItem disabled>Loading access levels...</MenuItem>
                                    )}
                                  </TextField>
                                </Grid>
                                <Grid item xs={12} md={6} lg={4}>
                                  <TextField
                                    select
                                    fullWidth
                                    label="Entity Type"
                                    name="entity_type"
                                    value={accessFormData.entity_type}
                                    onChange={handleAccessFormChange}
                                    required
                                    disabled={entityTypesLoading}
                                    error={!!accessFormErrors.entity_type}
                                    helperText={accessFormErrors.entity_type || ''}
                                  >
                                    {Object.entries(entityTypeMap).length > 0 ? (
                                      Object.entries(entityTypeMap).map(([key, value]) => (
                                        <MenuItem key={key} value={value}>
                                          {value}
                                        </MenuItem>
                                      ))
                                    ) : entityTypes.length > 0 ? (
                                      entityTypes.map((type) => (
                                        <MenuItem key={type} value={type}>
                                          {type}
                                        </MenuItem>
                                      ))
                                    ) : (
                                      <MenuItem disabled>Loading entity types...</MenuItem>
                                    )}
                                  </TextField>
                                </Grid>
                              </>
                            )}
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Reason"
                                name="reason"
                                value={accessFormData.reason}
                                onChange={handleAccessFormChange}
                                required
                                error={!!accessFormErrors.reason}
                                helperText={accessFormErrors.reason || ''}
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                          <SecondaryButton 
                            size="small"
                            onClick={resetAccessForm} 
                            disabled={accessMutation.isPending}
                          >
                            Cancel
                          </SecondaryButton>
                          <PrimaryButton 
                            onClick={handleAccessSubmit} 
                            size="small"
                            disabled={accessMutation.isPending}
                          >
                            {accessMutation.isPending ? (
                              <CircularProgress size={24} />
                            ) : editingAccessId ? 'Update Access' : 'Grant Access'}
                          </PrimaryButton>
                        </CardActions>
                      </Card>
                    </Collapse>
                  </Box>
                )}
                
                {/* Show explanation for GENERAL users */}
                {editingId && formData.role === (roleMap['GENERAL']) && (
                  <Box sx={{ mt: 4 }}>
                    <Divider sx={{ my: 2 }} />
                    <Paper sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Access Management
                      </Typography>
                      <Typography variant="body2">
                        Users with the GENERAL role have default access permissions and do not require specific access configuration.
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <SecondaryButton 
                  size="medium"
                  onClick={handleClose} 
                  disabled={userMutation.isPending}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton 
                  size="medium"
                  onClick={handleSubmit} 
                  disabled={userMutation.isPending}
                >
                  {userMutation.isPending ? (
                    <CircularProgress size={24} />
                  ) : editingId ? 'Update User' : 'Create User'}
                </PrimaryButton>
              </CardActions>
            </Card>
          </Collapse>

          <CommonDataGrid
            rows={users}
            columns={columns}
            loading={isLoading}
            defaultVisibleColumns={['name', 'email', 'phone_number', 'role', 'actions']}
            customRowHeight={56}
          />
        </Box>
      </Container>
    </Layout>
  );
};

export default AdminManageUsers; 
