import React from 'react';
import { Container, Typography, Button, Box, useTheme, Paper } from '@mui/material';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

const Landing: React.FC = () => {
  const { login } = useAuth();
  const theme = useTheme();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: login,
    onError: (error) => {
      console.error('Login Failed:', error);
    },
    flow: 'auth-code',
    scope: 'openid email profile',
    redirect_uri: window.location.origin,
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#FFFAF5',
        animation: 'fadeIn 0.8s ease-in',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          borderRadius: 2,
          maxWidth: 536,
          width: { xs: '90%', sm: '100%' },
          backgroundColor: '#fff',
          textAlign: 'center',
          boxShadow: '0px -1px 6px -2px #514D4A08, 0px 4px 16px -4px #514D4A14',
        }}
      >
        <Box 
          component="img"
          src="/aolf-logo.png"
          alt="The Art of Living"
          sx={{
            width: '180px',
            height: 'auto',
            mb: 3,
          }}
        />
        
        <Typography 
          variant="h4" 
          component="h1"
          sx={{
            fontWeight: 500,
            color: '#333',
            mb: 1,
          }}
        >
          Welcome to the Gurudev Meeting Request Portal
        </Typography>
        
        <Typography 
          variant="body1"
          sx={{
            color: '#6F7283',
            mb: 4,
          }}
        >
          Schedule appointments with Gurudev Sri Sri Ravi Shankar
        </Typography>
        
        <Button 
          variant="contained" 
          fullWidth
          onClick={() => handleGoogleLogin()}
          sx={{
            padding: '12px',
            borderRadius: 28,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            backgroundColor: '#fff',
            color: '#757575',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            '&:hover': {
              backgroundColor: '#f5f5f5',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            },
            mb: 3,
          }}
          startIcon={
            <img 
              src="/Google__G__logo.svg"
              alt="Google Logo" 
              style={{ width: 20, height: 20 }} 
            />
          }
        >
          Sign in with Google
        </Button>
        
        <Box
          component="img"
          src="/landing-gurudev.png"
          alt="Gurudev Sri Sri Ravi Shankar"
          sx={{
            width: '100%',
            borderRadius: 1,
            mt: 1,
            mb: 2,
          }}
        />

      <Typography 
        variant="body2"
        sx={{
          color: '#6F7283',
          mt: 1,
          textAlign: 'center',
          fontSize: '0.9rem',
        }}
      >
        If you have an <Typography component="span" sx={{ fontWeight: 'bold' }}>@artofliving.org</Typography> or <Typography component="span" sx={{ fontWeight: 'bold' }}>@iahv.org</Typography> email, please use that.<br />
        Otherwise, you may log in with any Gmail or other Google-based email address.<br />
        Non-Google emails are not supported.
      </Typography>

      </Paper>

    </Box>
  );
};

export default Landing; 