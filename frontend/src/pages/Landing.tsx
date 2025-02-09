import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const Landing: React.FC = () => {
  const { login } = useAuth();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: login,
    onError: (error) => {
      console.error('Login Failed:', error);
    },
  });

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to AOLF GSEC
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Schedule appointments with Gurudev Sri Sri Ravi Shankar
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          onClick={() => handleGoogleLogin()}
          startIcon={
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
              alt="Google Logo" 
              style={{ width: 20, height: 20, marginRight: 8 }} 
            />
          }
        >
          Sign in with Google
        </Button>
      </Box>
    </Container>
  );
};

export default Landing; 