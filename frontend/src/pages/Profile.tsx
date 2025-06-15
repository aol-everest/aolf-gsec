import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Avatar, 
  Grid,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PrimaryButton } from '../components/PrimaryButton';
import WarningButton from '../components/WarningButton';
import { LogoutIconV2 } from '../components/iconsv2';
import ProfileBackground from '../components/ProfileBackground';
import ProfileFieldsForm, { UserUpdateData } from '../components/ProfileFieldsForm';

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

  const handleSave = (updateData: UserUpdateData) => {
    updateProfileMutation.mutate(updateData);
  };

  const handleCancel = () => {
    setIsEditing(false);
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
      <ProfileBackground />
      <Container maxWidth="md">
        <Box sx={{ zIndex: 1 }}>
          <Paper sx={{ p: 4, position: 'relative' }}>
            {/* Logout button in top right corner */}
            <Box sx={{ position: 'absolute', top: 30, right: 30 }}>
              <WarningButton 
                size="small" 
                onClick={logout}
                leftIcon={<LogoutIconV2 sx={{ width: 24, height: 24 }} />}
              >
                Logout
              </WarningButton>
            </Box>

            {/* User info section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md="auto" sx={{ maxWidth: 160 }}>
                  {userData?.picture && (
                    <Avatar
                      src={userData.picture}
                      alt={userData.name}
                      sx={{ width: 130, height: 130, mr: 4, border: '5px solid #fff', boxShadow: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)' }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} md>
                  <Typography variant="h1" gutterBottom>
                    {(userData?.first_name || 'User Name') + " " + (userData?.last_name || 'User Name')}
                  </Typography>
                  <Typography color="textSecondary" sx={{ textWrap: 'break-word' }}>
                    {userData?.email || ''}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Profile form or edit button */}
            {!isEditing ? (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <PrimaryButton onClick={() => setIsEditing(true)}>
                  Edit Profile
                </PrimaryButton>
              </Box>
            ) : (
              <ProfileFieldsForm
                initialData={userData}
                onSubmit={handleSave}
                onCancel={handleCancel}
                submitButtonText="Save Changes"
                showCancelButton={true}
                isSubmitting={updateProfileMutation.isPending}
                variant="profile"
                showNotificationPreferences={true}
                showInternalButton={true}
              />
            )}
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default Profile; 