import React from 'react';
import { Container, Typography, Paper, Box, List, ListItem, ListItemText, Chip } from '@mui/material';

const AppointmentStatus: React.FC = () => {
  // TODO: Fetch this data from API
  const appointments = [
    {
      id: 1,
      dignitary: 'Sri Sri Ravi Shankar',
      date: '2024-02-15',
      time: '10:00 AM',
      status: 'Pending',
    },
    {
      id: 2,
      dignitary: 'John Doe',
      date: '2024-02-16',
      time: '2:00 PM',
      status: 'Approved',
    },
    {
      id: 3,
      dignitary: 'Jane Smith',
      date: '2024-02-17',
      time: '11:00 AM',
      status: 'Rejected',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Appointment Status
        </Typography>
        <Paper>
          <List>
            {appointments.map((appointment) => (
              <ListItem key={appointment.id} divider>
                <ListItemText
                  primary={appointment.dignitary}
                  secondary={`${appointment.date} at ${appointment.time}`}
                />
                <Chip
                  label={appointment.status}
                  color={getStatusColor(appointment.status) as any}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default AppointmentStatus; 