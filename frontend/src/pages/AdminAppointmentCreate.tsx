import React from 'react';
import { AdminAppointmentCreateSimple } from '../components/AdminAppointmentCreateSimple';
import { Container, Typography, Box } from '@mui/material';
import Layout from '../components/Layout';

const AdminAppointmentCreate: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Typography variant="h1" component="h1" gutterBottom>
            Create Appointment
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Create a new appointment or calendar event. The system will check for time conflicts and guide you through the process.
          </Typography>
          <AdminAppointmentCreateSimple />
        </Box>
      </Container>
    </Layout>
  );
};

export default AdminAppointmentCreate;
