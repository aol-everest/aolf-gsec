import React from 'react';
import { AdminAppointmentCreateForm } from '../components/AdminAppointmentCreateForm';
import { Container, Typography, Box } from '@mui/material';
import Layout from '../components/Layout';

const AdminAppointmentCreate: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h1" component="h1" gutterBottom align="center">
            Create Appointment
          </Typography>
          <AdminAppointmentCreateForm />
        </Box>
      </Container>
    </Layout>
  );
};

export default AdminAppointmentCreate;
