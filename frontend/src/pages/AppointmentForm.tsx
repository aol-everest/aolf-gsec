import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import AppointmentRequestForm from '../components/AppointmentRequestForm';

const AppointmentForm: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Request an Appointment
        </Typography>
        <Paper sx={{ p: 3 }}>
          <AppointmentRequestForm />
        </Paper>
      </Box>
    </Container>
  );
};

export default AppointmentForm; 