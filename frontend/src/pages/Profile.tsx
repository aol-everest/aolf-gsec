import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, Button, Avatar, TextField, Snackbar, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const Profile: React.FC = () => {
  const { userInfo, logout, updateUserInfo } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(userInfo?.phone_number || '');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Update phone number when userInfo changes
  useEffect(() => {
    if (userInfo?.phone_number !== undefined) {
      setPhoneNumber(userInfo.phone_number);
    }
  }, [userInfo?.phone_number]);

  const handleSave = async () => {
    try {
      await updateUserInfo({ phone_number: phoneNumber });
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
    console.log(userInfo);
  };

  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Paper sx={{ p: 3, mt: 2, position: 'relative' }}>
            {/* Logout button in top right corner */}
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
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

            {/* Form section */}
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

              {/* Add more fields here in the future */}
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