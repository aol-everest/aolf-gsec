import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import AppointmentRequestForm from '../components/AppointmentRequestForm';

const AppointmentForm: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
      }}
    >
      <Container maxWidth="lg">
        {/* Header with Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            pt: 3,
            pb: 4,
          }}
        >
          <img
            src="/aolf-logo.png"
            alt="AOLF Logo"
            style={{ width: 120, height: 'auto', marginRight: 24 }}
          />
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            pb: 6,
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              mb: 2,
            }}
          >
            Request an Appointment
          </Typography>
          
          <Paper 
            elevation={0}
            sx={{ 
              p: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            <AppointmentRequestForm />
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default AppointmentForm; 
