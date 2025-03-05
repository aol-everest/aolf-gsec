import React from 'react';
import { Container, Typography, Paper, Box, Alert } from '@mui/material';
import { AppointmentRequestForm } from '../components/AppointmentRequestForm';
import Layout from '../components/Layout';

const AppointmentForm: React.FC = () => {
  return (
    <Layout>
      <Container>
        <Box
          sx={{
            minHeight: '100vh',
            // background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
            // py: 4,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Request an Appointment
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            You can now add multiple dignitaries to a single appointment request. All dignitaries are treated equally with no primary dignitary.
          </Alert>
          
          <Paper 
            elevation={0}
            sx={{ 
              p: 4,
              // borderRadius: 2,
              // backgroundColor: 'rgba(255, 255, 255, 0.9)',
              // boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            <AppointmentRequestForm />
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentForm; 
