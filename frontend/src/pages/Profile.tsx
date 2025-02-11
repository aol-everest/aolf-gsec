import React, { useState } from 'react';
import { Container, Typography, Paper, Box, Button, Avatar, TextField, Snackbar, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const Profile: React.FC = () => {
  const { userInfo, logout } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(userInfo?.phone_number || '');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:8001/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Phone number updated successfully' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to update phone number' });
      }
    } catch (error) {
      console.error('Error updating phone number:', error);
      setMessage({ type: 'error', text: 'Error updating phone number' });
    }
  };

  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Profile
          </Typography>
          <Paper sx={{ p: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              {userInfo?.picture && (
                <Avatar
                  src={userInfo.picture}
                  alt={userInfo.name}
                  sx={{ width: 80, height: 80, mr: 2 }}
                />
              )}
              <Box>
                <Typography variant="h6" gutterBottom>
                  {userInfo?.name || 'User Name'}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  {userInfo?.email || 'email@example.com'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Contact Information
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TextField
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isEditing}
                  fullWidth
                  sx={{ maxWidth: 300 }}
                />
                {!isEditing ? (
                  <Button variant="outlined" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button variant="contained" onClick={handleSave}>
                      Save
                    </Button>
                    <Button variant="outlined" onClick={() => {
                      setIsEditing(false);
                      setPhoneNumber(userInfo?.phone_number || '');
                    }}>
                      Cancel
                    </Button>
                  </>
                )}
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Button variant="contained" color="error" onClick={logout}>
                Logout
              </Button>
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