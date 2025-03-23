import React from 'react';
import { SecretariatAppointmentRequestForm } from '../components/SecretariatAppointmentRequestForm';
import { Container, Typography, Box } from '@mui/material';
import Layout from '../components/Layout';

const SecretariatAppointmentRequest: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Create Appointment Request
          </Typography>
          <SecretariatAppointmentRequestForm />
        </Box>
      </Container>
    </Layout>
  );
};

export default SecretariatAppointmentRequest; 