import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
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
          }}
        >
          <Container maxWidth="lg">
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
      </Container>
    </Layout>
  );
};

export default AppointmentForm; 
