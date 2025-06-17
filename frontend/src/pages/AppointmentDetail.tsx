import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  CircularProgress,
  Box,
  Typography,
  Paper
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { Appointment } from '../models/types';
import UserAppointmentCard from '../components/UserAppointmentCard';
import Layout from '../components/Layout';

interface AppointmentDetailProps {
  appointmentId?: number;
  isDialog?: boolean;
  onClose?: () => void;
}

const AppointmentDetail: React.FC<AppointmentDetailProps> = ({ 
  appointmentId: propAppointmentId, 
  isDialog = false, 
  onClose 
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const api = useApi();
  
  // Determine if this is a dialog based on props or URL state
  const isDialogMode = isDialog || location.state?.isDialog;
  const appointmentId = propAppointmentId || (paramId ? parseInt(paramId, 10) : null);
  
  const [open, setOpen] = useState(isDialogMode);

  // Fetch all user appointments and find the specific one
  const { data: allAppointments, isLoading, error } = useQuery<Appointment[]>({
    queryKey: ['appointments', 'my'],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>('/appointments/my');
      return data;
    },
    retry: 1,
  });

  // Find the specific appointment
  const appointment = useMemo(() => {
    if (!allAppointments || !appointmentId) return null;
    return allAppointments.find(apt => apt.id === appointmentId) || null;
  }, [allAppointments, appointmentId]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setOpen(false);
      // Navigate back to appointments page
      navigate('/appointments');
    }
  };

  if (isLoading) {
    const loadingContent = (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );

    if (isDialogMode) {
      return (
        <Dialog 
          open={open} 
          onClose={handleClose} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
              maxHeight: '95vh',
              minHeight: '80vh',
              width: '70vw',
              maxWidth: '800px',
            }
          }}
        >
          <DialogContent sx={{ 
            p: 0, 
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {loadingContent}
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Layout>
        <Paper sx={{ p: 3 }}>
          {loadingContent}
        </Paper>
      </Layout>
    );
  }

  if (error || !appointment) {
    const errorContent = (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Appointment Not Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The appointment you're looking for could not be found or you don't have permission to view it.
        </Typography>
      </Paper>
    );

    if (isDialogMode) {
      return (
        <Dialog 
          open={open} 
          onClose={handleClose} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
              maxHeight: '95vh',
              // minHeight: '80vh',
              width: '96vw',
              maxWidth: '900px',
            }
          }}
        >
          <DialogContent sx={{ 
            p: 0, 
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {errorContent}
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Layout>
        {errorContent}
      </Layout>
    );
  }

  const appointmentContent = (
    <UserAppointmentCard 
      appointment={appointment}
      showCloseButton={isDialogMode}
      onClose={isDialogMode ? handleClose : undefined}
      displayMode={isDialogMode ? "dialog" : "regular"}
    />
  );

  if (isDialogMode) {
    return (
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            maxHeight: '95vh',
            // minHeight: '80vh',
            width: '96vw',
            maxWidth: '900px',
            mx: 2,
          }
        }}
      >
        <DialogContent sx={{ 
          p: 0, 
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {appointmentContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Layout>
      <Box sx={{ maxWidth: '1000px', mx: 'auto', p: 2 }}>
        {appointmentContent}
      </Box>
    </Layout>
  );
};

export default AppointmentDetail; 