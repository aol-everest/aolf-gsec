import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Grid,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { useAppointmentSummary } from '../hooks/useAppointmentSummary';
const drawerWidth = 260;

const Home: React.FC = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { data: appointmentSummary, isLoading: summaryLoading } = useAppointmentSummary();

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box
          component="main"
          sx={{
            // flexGrow: 1,
            // p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            // mt: 8,
            // py: 4,
            p: 0,
          }}
        >
          <Paper sx={{ p: 4, mb: 4 }}>
            <Typography variant="h1" gutterBottom>
              Welcome, {userInfo?.first_name}!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You can manage appointment requests with Gurudev Sri Sri Ravi Shankar.
              Use the navigation menu to create new appointments, view existing requests, or manage your profile.
            </Typography>
            
            {/* Appointment Summary Section */}
            {!summaryLoading && appointmentSummary && Object.keys(appointmentSummary).length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Your Open Appointment Requests
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(appointmentSummary).map(([requestType, summary]) => (
                    <Grid item xs={12} sm={6} md={4} key={requestType}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {requestType}
                            </Typography>
                            <Chip 
                              label={`${summary.count} request${summary.count > 1 ? 's' : ''}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {summary.count === 1 
                              ? 'You have 1 open request of this type'
                              : `You have ${summary.count} open requests of this type`
                            }
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
            
            <img src={'/desktop-bg-1.png'} alt="logo" style={{ width: '100%', height: 'auto', borderRadius: '13px', border: '1px solid #eee' }} />
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default Home; 