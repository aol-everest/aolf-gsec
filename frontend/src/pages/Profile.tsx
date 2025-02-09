import React from 'react';
import { Container, Typography, Paper, Box, Button, Avatar } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { userInfo, logout } = useAuth();

  return (
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
              <Typography color="textSecondary">
                {userInfo?.email || 'email@example.com'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" color="error" onClick={logout}>
              Logout
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Profile; 