import React from 'react';
import { AdminAppointmentCreateForm } from '../components/AdminAppointmentCreateForm';
import { Container, Typography, Box, Paper } from '@mui/material';
import Layout from '../components/Layout';

const AdminAppointmentCreate: React.FC = () => {
  return (
    <Layout>
      <Container>
        <Box
          sx={{
            minHeight: '100vh',
          }}
        >
          <Typography variant="h1" component="h1" gutterBottom>
            Create Appointment
          </Typography>
          <Paper 
            elevation={0}
            sx={{ 
              p: 4,
              // borderRadius: 2,
              // backgroundColor: 'rgba(255, 255, 255, 0.9)',
              // boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            <AdminAppointmentCreateForm />
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default AdminAppointmentCreate;
