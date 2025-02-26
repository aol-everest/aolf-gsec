import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Paper,
  SwipeableDrawer,
  MobileStepper,
  Container,
  CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Layout from '../components/Layout';
import { formatDate } from '../utils/dateUtils';
import { getStatusChipSx, getStatusColor } from '../utils/formattingUtils';
import { EmailIcon, ContactPhoneIcon, EmailIconSmall, ContactPhoneIconSmall, WorkIcon } from '../components/icons';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';

import { Appointment } from '../models/types';

import { AppointmentCard } from '../components/AppointmentCard';

const AppointmentTiles: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const theme = useTheme();
  const navigate = useNavigate();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  // Fetch status options using React Query
  const { data: statusOptions = [] } = useQuery({
    queryKey: ['statusOptions'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/appointments/status-options');
        return data;
      } catch (error) {
        console.error('Error fetching status options:', error);
        enqueueSnackbar('Failed to fetch status options', { variant: 'error' });
        return [];
      }
    }
  });

  // Fetch appointments using React Query
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Appointment[]>('/admin/appointments/all');
        return data;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        enqueueSnackbar('Failed to fetch appointments', { variant: 'error' });
        throw error;
      }
    }
  });

  // Filter appointments based on selected status
  useEffect(() => {
    if (selectedStatus) {
      const filtered = appointments.filter(appointment => appointment.status === selectedStatus);
      setFilteredAppointments(filtered);
      setActiveStep(0); // Reset to first appointment when filter changes
    } else {
      setFilteredAppointments(appointments);
    }
  }, [selectedStatus, appointments]);

  const handleNext = () => {
    setActiveStep((prevStep) => Math.min(prevStep + 1, filteredAppointments.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prevStep) => Math.max(prevStep - 1, 0));
  };

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
  };

  const AppointmentTile = ({ appointment }: { appointment: Appointment }) => (
    <AppointmentCard appointment={appointment} theme={theme} />
  );

  return (
    <Layout>
      <Container>
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2,
            mb: 2
          }}>
            <Typography variant="h4">Appointment Details</Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              flexWrap: 'wrap'
            }}>
              {statusOptions.map((status) => (
                <Chip
                  key={status}
                  label={`${status} (${appointments.filter(a => a.status === status).length})`}
                  onClick={() => handleStatusFilter(status)}
                  variant={selectedStatus === status ? 'filled' : 'outlined'}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8,
                    },
                    bgcolor: 'white',
                    color: getStatusColor(status, theme),
                    border: `1px solid ${getStatusColor(status, theme)}`,
                    borderRadius: '10px',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ 
            maxWidth: '100%', 
            flexGrow: 1,
            position: 'relative',
            touchAction: 'pan-y pinch-zoom',
          }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredAppointments.length > 0 ? (
              <>
                <AppointmentTile appointment={filteredAppointments[activeStep]} />
                <MobileStepper
                  variant="dots"
                  steps={filteredAppointments.length}
                  position="static"
                  activeStep={activeStep}
                  sx={{ 
                    maxWidth: '100%', 
                    flexGrow: 1,
                    justifyContent: 'center',
                    background: 'transparent',
                    mt: 2
                  }}
                  nextButton={
                    <Button
                      size="small"
                      onClick={handleNext}
                      disabled={activeStep === filteredAppointments.length - 1}
                    >
                      Next
                      <NavigateNextIcon />
                    </Button>
                  }
                  backButton={
                    <Button 
                      size="small" 
                      onClick={handleBack} 
                      disabled={activeStep === 0}
                    >
                      <NavigateBeforeIcon />
                      Back
                    </Button>
                  }
                />
              </>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography>No appointments found for the selected status.</Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default AppointmentTiles; 