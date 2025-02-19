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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Layout from '../components/Layout';
import { formatDate } from '../utils/dateUtils';
import { getStatusChipSx, getStatusColor } from '../utils/formattingUtils';


interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
}

interface Dignitary {
  id: number;
  honorific_title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  primary_domain: string;
  title_in_organization: string;
  organization: string;
  bio_summary: string;
  poc_first_name: string;
  poc_last_name: string;
  poc_email: string;
  poc_phone: string;
}

interface Appointment {
  id: number;
  dignitary_id: number;
  dignitary: Dignitary;
  requester: User;
  purpose: string;
  preferred_date: string;
  preferred_time: string;
  appointment_date: string;
  appointment_time: string;
  duration: string;
  location: string;
  pre_meeting_notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  secretariat_comments: string;
  follow_up_actions: string;
  meeting_notes: string;
  approved_datetime: string;
  approved_by: number;
  approved_by_user: User;
  last_updated_by: number;
  last_updated_by_user: User;
}

const AppointmentTiles: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatusOptions = async () => {
      try {
        const response = await fetch('http://localhost:8001/appointments/status-options', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch status options');
        const data = await response.json();
        setStatusOptions(data);
      } catch (error) {
        console.error('Error fetching status options:', error);
      }
    };

    fetchStatusOptions();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch('http://localhost:8001/admin/appointments/all', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch appointments');
        const data = await response.json();
        setAppointments(data);
        setFilteredAppointments(data);
        // console.log(data);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };

    fetchAppointments();
  }, []);

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

  const handleEdit = (appointmentId: number) => {
    navigate(`/appointment-edit/${appointmentId}`);
  };

  const handleStatusFilter = (status: string | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
  };

  const AppointmentTile = ({ appointment }: { appointment: Appointment }) => (
    <Card 
      elevation={3}
      sx={{ 
        // m: 2,
        pl: { xs: 0, sm: 2 },
        pr: { xs: 0, sm: 2 },
        pt: { xs: 0, sm: 0 },
        pb: { xs: 1, sm: 1 },
        borderRadius: 2,
        position: 'relative',
        minHeight: isMobile ? 'auto' : '600px',
        bgcolor: 'grey.50', 
      }}
    >
      <CardContent>

        <Paper elevation={0} sx={{ p: 2, mb: 0, border: 'none', boxShadow: 'none', borderRadius: 0, bgcolor: 'transparent' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" gutterBottom color="primary">
              Request #: {appointment.id}
            </Typography>
          </Box>
          <Box sx={{ position: 'absolute', top: 25, right: 25 }}>
            <Chip 
                label={appointment.status} 
                sx={getStatusChipSx(appointment.status, theme)}
            />
            <IconButton 
                color="primary"
                onClick={() => handleEdit(appointment.id)}
                sx={{ ml: 1, mt: 1 }}
            >
                <EditIcon />
            </IconButton>
          </Box>          
        </Paper>

        {/* Point of Contact Information */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Point of Contact
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Name</Typography>
              <Typography>{appointment.requester.first_name} {appointment.requester.last_name}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Email</Typography>
              <Typography>{appointment.requester.email}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
              <Typography>{appointment.requester.phone_number || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Role</Typography>
              <Typography>{appointment.requester.role}</Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Dignitary Information */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Dignitary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Name</Typography>
              <Typography>{appointment.dignitary.honorific_title} {appointment.dignitary.first_name} {appointment.dignitary.last_name}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Email</Typography>
              <Typography>{appointment.dignitary.email}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
              <Typography>{appointment.dignitary.phone || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Organization</Typography>
              <Typography>{appointment.dignitary.organization}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Title</Typography>
              <Typography>{appointment.dignitary.title_in_organization}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Bio Summary</Typography>
              <Typography>{appointment.dignitary.bio_summary}</Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Appointment Information */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Appointment Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Preferred Date</Typography>
              <Typography>{new Date(appointment.preferred_date).toLocaleDateString()}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Preferred Time</Typography>
              <Typography>{appointment.preferred_time || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
              <Typography>{appointment.duration || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Location</Typography>
              <Typography>{appointment.location || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Purpose</Typography>
              <Typography>{appointment.purpose}</Typography>
            </Grid>
            {appointment.pre_meeting_notes && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Pre-meeting Notes</Typography>
                <Typography>{appointment.pre_meeting_notes}</Typography>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Secretariat Notes */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Secretariat Notes
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
              <Typography>{appointment.secretariat_comments || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Follow-up Actions</Typography>
              <Typography>{appointment.follow_up_actions || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Meeting Notes</Typography>
              <Typography>{appointment.meeting_notes || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, mb: 0, border: 'none', boxShadow: 'none', borderRadius: 0, bgcolor: 'transparent' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {appointment.last_updated_by_user && (
                <Typography> Last Updated by: {appointment.last_updated_by_user?.first_name} {appointment.last_updated_by_user?.last_name} at {formatDate(appointment.updated_at)}</Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              {appointment.approved_by_user && (
                <Typography> Approved by: {appointment.approved_by_user?.first_name} {appointment.approved_by_user?.last_name} at {formatDate(appointment.approved_datetime)}</Typography>
              )}
            </Grid>
          </Grid>
        </Paper>

      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <Container>
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 2,
            // px: 3,
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
            {filteredAppointments.length > 0 ? (
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