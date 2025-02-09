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
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
        animation: 'fadeIn 0.8s ease-in',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Box
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 4,
              padding: 8,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              width: '100%',
              maxWidth: 600,
            }}
          >
            <img
              src="/AOLF_Logo.png"
              alt="AOLF Logo"
              style={{ width: 200, height: 'auto', marginBottom: 24 }}
            />
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(45deg, #1a237e, #534bae)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                marginBottom: 3,
              }}
            >
              Welcome to AOLF GSEC
            </Typography>
            <Typography 
              variant="h5" 
              component="h2" 
              gutterBottom
              sx={{
                color: 'text.secondary',
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              Schedule appointments with Gurudev Sri Sri Ravi Shankar
            </Typography>
            <Button 
              variant="contained" 
              size="large" 
              onClick={() => handleGoogleLogin()}
              sx={{
                padding: '12px 32px',
                borderRadius: 28,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 500,
                backgroundColor: '#fff',
                color: '#757575',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                },
              }}
              startIcon={
                <img 
                  src="/Google__G__logo.svg"
                  alt="Google Logo" 
                  style={{ width: 24, height: 24 }} 
                />
              }
            >
              Sign in with Google
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Landing; 