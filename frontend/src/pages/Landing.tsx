import React from 'react';
import { Container, Typography, Button, Box, useTheme, Paper } from '@mui/material';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import GurudevLogo from '../components/Images';

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
    redirect_uri: 'http://localhost:3000'
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
      <Container 
        maxWidth={false}
      >
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
              backgroundImage: `url(${'/desktop-bg-1.png'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 4,
              padding: 8,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              width: '100%',
              maxWidth: 600,
            }}
          >
            <img
              src="/aolf-logo.png"
              alt="AOLF Logo"
              style={{ width: 200, height: 'auto', marginBottom: 24 }}
            />
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{
                background: 'linear-gradient(45deg, #1a237e, #534bae)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: theme.palette.text.primary,
                marginBottom: 3,
                fontFamily: 'Lato',
                fontWeight: 400,
                fontStyle: 'italic',
              }}
            >
              Welcome to Art of Living GSEC
            </Typography>
            <Typography 
              variant="h5" 
              component="h2" 
              gutterBottom
              sx={{
                color: theme.palette.text.secondary,
                marginBottom: 4,
                lineHeight: 1.5,
                fontFamily: 'Lato',
                fontWeight: 500,
              }}
            >
              Schedule appointments with <br />
              <Paper elevation={0} sx={{ 
                display: 'inline-block', 
                backgroundColor: 'rgba(206, 167, 11, 0.81)', 
                boxShadow: 'none', 
                width: '100%', 
                margin: '0 auto',  
                borderRadius: '23px',
                p: 1,
                mt: 2,
                mb: 0,
              }}>
                <GurudevLogo 
                  sx={{ 
                    height: '100%', 
                    maxHeight: '56px', 
                    width: 'auto', 
                    maxWidth: '70%',
                    mt: 13, 
                    mb: 8, 
                    ml: 13, 
                    mr: 13, 
                  }}
                />
              </Paper>
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