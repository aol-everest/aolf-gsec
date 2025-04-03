import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Button, 
  Avatar, 
  TextField, 
  Snackbar, 
  Alert,
  FormGroup,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface NotificationPreferences {
  appointment_created: boolean;
  appointment_updated: boolean;
  new_appointment_request: boolean;
  bcc_on_all_emails: boolean;
}

interface UserUpdateData {
  phone_number: string;
  email_notification_preferences: NotificationPreferences;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  appointment_created: true,
  appointment_updated: true,
  new_appointment_request: false,
  bcc_on_all_emails: false,
};

const Profile: React.FC = () => {
  const { userInfo, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Fetch user profile data using React Query
  const { data: userData, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      try {
        // If your API has a specific endpoint for user profile, use that instead
        // This is a placeholder assuming userInfo from auth context is sufficient
        return userInfo;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        enqueueSnackbar('Failed to fetch user profile', { variant: 'error' });
        throw error;
      }
    },
    // Use initial data from auth context to avoid loading state if data is already available
    initialData: userInfo,
    enabled: !!userInfo // Only run the query if userInfo exists
  });

  const [phoneNumber, setPhoneNumber] = useState(userData?.phone_number || '');
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Update local state when userData changes
  useEffect(() => {
    if (userData) {
      setPhoneNumber(userData.phone_number || '');
      // Cast the empty object as a partial NotificationPreferences
      const userPrefs = (userData.email_notification_preferences || {}) as Partial<NotificationPreferences>;
      
      // Ensure all necessary properties are present
      setNotificationPreferences({
        appointment_created: userPrefs.appointment_created ?? DEFAULT_PREFERENCES.appointment_created,
        appointment_updated: userPrefs.appointment_updated ?? DEFAULT_PREFERENCES.appointment_updated,
        new_appointment_request: userPrefs.new_appointment_request ?? DEFAULT_PREFERENCES.new_appointment_request,
        bcc_on_all_emails: userPrefs.bcc_on_all_emails ?? DEFAULT_PREFERENCES.bcc_on_all_emails,
      });
    }
  }, [userData]);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updateData: UserUpdateData) => {
      const { data } = await api.patch('/users/me/update', updateData);
      return data;
    },
    onSuccess: () => {
      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      setIsEditing(false);
      // Invalidate and refetch user profile data
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      enqueueSnackbar('Error updating profile', { variant: 'error' });
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate({ 
      phone_number: phoneNumber,
      email_notification_preferences: notificationPreferences
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPhoneNumber(userData?.phone_number || '');
    
    // Cast the empty object as a partial NotificationPreferences
    const userPrefs = (userData?.email_notification_preferences || {}) as Partial<NotificationPreferences>;
    
    setNotificationPreferences({
      appointment_created: userPrefs.appointment_created ?? DEFAULT_PREFERENCES.appointment_created,
      appointment_updated: userPrefs.appointment_updated ?? DEFAULT_PREFERENCES.appointment_updated,
      new_appointment_request: userPrefs.new_appointment_request ?? DEFAULT_PREFERENCES.new_appointment_request,
      bcc_on_all_emails: userPrefs.bcc_on_all_emails ?? DEFAULT_PREFERENCES.bcc_on_all_emails,
    });
  };

  const handleNotificationChange = (key: keyof NotificationPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: event.target.checked
    }));
  };

  const getNotificationLabel = (key: keyof NotificationPreferences): string => {
    switch (key) {
      case 'appointment_created':
        return 'When I create a new appointment request';
      case 'appointment_updated':
        return 'When my appointment request is updated';
      case 'new_appointment_request':
        return 'When new appointment requests are created (Secretariat only)';
      case 'bcc_on_all_emails':
        return 'Receive BCC copies of all appointment-related emails sent to users (Secretariat only)';
      default:
        return key;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md">
        <Box>
          <Paper sx={{ p: 4, position: 'relative' }}>
            {/* Logout button in top right corner */}
            <Box sx={{ position: 'absolute', top: 30, right: 30 }}>
              <Button variant="outlined" color="error" onClick={logout}>
                Logout
              </Button>
            </Box>

            {/* User info section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              {userData?.picture && (
                <Avatar
                  src={userData.picture}
                  alt={userData.name}
                  sx={{ width: 80, height: 80, mr: 2 }}
                />
              )}
              <Box>
                <Typography variant="h5" gutterBottom>
                  {(userData?.first_name || 'User Name') + " " + (userData?.last_name || 'User Name')}
                </Typography>
                <Typography color="textSecondary">
                  {userData?.email || 'email@example.com'}
                </Typography>
              </Box>
            </Box>

            {/* Contact Information section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Contact Information
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isEditing}
                  fullWidth
                />
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Notification Preferences section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Email Notification Preferences
              </Typography>
              
              <FormGroup>
                {Object.keys(notificationPreferences).map((key) => {
                  // Only show new_appointment_request and bcc_on_all_emails to secretariat users
                  if ((key === 'new_appointment_request' || key === 'bcc_on_all_emails') && userData?.role !== 'SECRETARIAT' && userData?.role !== 'ADMIN') {
                    return null;
                  }
                  
                  return (
                    <FormControlLabel
                      key={key}
                      control={
                        <Switch
                          checked={notificationPreferences[key as keyof NotificationPreferences]}
                          onChange={handleNotificationChange(key as keyof NotificationPreferences)}
                          disabled={!isEditing}
                        />
                      }
                      label={getNotificationLabel(key as keyof NotificationPreferences)}
                    />
                  );
                })}
              </FormGroup>
            </Box>

            {/* Action buttons at bottom */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {!isEditing ? (
                <Button variant="contained" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default Profile; 