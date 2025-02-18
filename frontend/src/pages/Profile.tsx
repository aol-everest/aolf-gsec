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
  Divider
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

interface NotificationPreferences {
  appointment_created: boolean;
  appointment_updated: boolean;
  new_appointment_request: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  appointment_created: true,
  appointment_updated: true,
  new_appointment_request: false,
};

const Profile: React.FC = () => {
  const { userInfo, logout, updateUserInfo } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(userInfo?.phone_number || '');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    userInfo?.notification_preferences || DEFAULT_PREFERENCES
  );

  // Update values when userInfo changes
  useEffect(() => {
    if (userInfo) {
      setPhoneNumber(userInfo.phone_number || '');
      setNotificationPreferences(userInfo.notification_preferences || DEFAULT_PREFERENCES);
    }
  }, [userInfo]);

  const handleSave = async () => {
    try {
      await updateUserInfo({ 
        phone_number: phoneNumber,
        notification_preferences: notificationPreferences
      });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Error updating profile' });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPhoneNumber(userInfo?.phone_number || '');
    setNotificationPreferences(userInfo?.notification_preferences || DEFAULT_PREFERENCES);
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
      default:
        return key;
    }
  };

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
              {userInfo?.picture && (
                <Avatar
                  src={userInfo.picture}
                  alt={userInfo.name}
                  sx={{ width: 80, height: 80, mr: 2 }}
                />
              )}
              <Box>
                <Typography variant="h5" gutterBottom>
                  {(userInfo?.first_name || 'User Name') + " " + (userInfo?.last_name || 'User Name')}
                </Typography>
                <Typography color="textSecondary">
                  {userInfo?.email || 'email@example.com'}
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
                  // Only show new_appointment_request to secretariat users
                  if (key === 'new_appointment_request' && userInfo?.role !== 'SECRETARIAT') {
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
                  <Button variant="contained" onClick={handleSave}>
                    Save Changes
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Box>

        {message && (
          <Snackbar
            open={true}
            autoHideDuration={6000}
            onClose={() => setMessage(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setMessage(null)}
              severity={message.type}
              sx={{ width: '100%' }}
            >
              {message.text}
            </Alert>
          </Snackbar>
        )}
      </Container>
    </Layout>
  );
};

export default Profile; 