import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, Alert } from '@mui/material';
import { AppointmentRequestForm } from '../components/AppointmentRequestForm';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { isProfileComplete, getMissingFieldsDisplay } from '../utils/profileValidation';

const AppointmentRequest: React.FC = () => {
  const { userInfo } = useAuth();
  const [profileComplete, setProfileComplete] = useState<boolean>(true);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (userInfo) {
      const complete = isProfileComplete(userInfo);
      setProfileComplete(complete);
      if (!complete) {
        setMissingFields(getMissingFieldsDisplay(userInfo));
      }
    }
  }, [userInfo]);

  return (
    <Layout>
      <Container>
        <Box
          sx={{
            minHeight: '100vh',
          }}
        >
          <Typography variant="h1" component="h1" gutterBottom>
            Request an Appointment
          </Typography>
          
          {/* {!profileComplete && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Complete Your Profile First</strong>
              </Typography>
              <Typography variant="body2">
                Please complete your profile information before requesting an appointment. Missing fields: {missingFields.join(', ')}.
              </Typography>
            </Alert>
          )} */}
          
          <Paper 
            elevation={0}
            sx={{ 
              p: 4,
            }}
          >
            <AppointmentRequestForm showProfileStep={!profileComplete} />
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentRequest; 
