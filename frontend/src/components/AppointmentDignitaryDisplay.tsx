import React, { useState } from 'react';
import {
  Typography,
  Grid,
  Box,
  Button,
  Collapse,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { Appointment, AppointmentDignitary, Dignitary } from '../models/types';

interface AppointmentDignitaryDisplayProps {
  appointment: Appointment;
  includeRequesterNotes?: boolean;
}

const AppointmentDignitaryDisplay: React.FC<AppointmentDignitaryDisplayProps> = ({
  appointment,
  includeRequesterNotes = true
}) => {
  const [expandedDignitaryList, setExpandedDignitaryList] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));
  
  // First check if appointment has appointment_dignitaries array
  if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
    const totalDignitaries = appointment.appointment_dignitaries.length;
    
    // Determine how many dignitaries to show initially based on screen size
    let initialVisibleCount = 1; // Default for small screens
    if (isMediumScreen) initialVisibleCount = 2;
    if (isLargeScreen) initialVisibleCount = 3;
    
    // Ensure we don't try to show more than we have
    initialVisibleCount = Math.min(initialVisibleCount, totalDignitaries);
    
    // Calculate how many are hidden
    const hiddenCount = totalDignitaries - initialVisibleCount;
    
    return (
      <>
        <Typography variant="h6" gutterBottom color="primary">
          Dignitaries ({totalDignitaries})
        </Typography>
        
        {/* Grid container for responsive layout */}
        <Grid container spacing={2}>
          {/* Show initial set of dignitaries based on screen size */}
          {appointment.appointment_dignitaries.slice(0, initialVisibleCount).map((appointmentDignitary: AppointmentDignitary) => {
            const dig = appointmentDignitary.dignitary;
            return (
              <Grid item xs={12} sm={6} md={4} key={dig.id}>
                <Box 
                  sx={{ 
                    height: '100%',
                    p: 2, 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    backgroundColor: 'transparent',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    {formatHonorificTitle(dig.honorific_title)} {dig.first_name} {dig.last_name}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    {dig.organization && dig.organization} | {dig.title_in_organization && dig.title_in_organization}<br />
                    {dig.email && dig.email} | {dig.phone && dig.phone}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
        
        {/* Collapsible section for additional dignitaries */}
        {hiddenCount > 0 && (
          <Collapse in={expandedDignitaryList} timeout="auto" unmountOnExit>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {appointment.appointment_dignitaries.slice(initialVisibleCount).map((appointmentDignitary: AppointmentDignitary) => {
                const dig = appointmentDignitary.dignitary;
                return (
                  <Grid item xs={12} sm={6} md={4} key={dig.id}>
                    <Box 
                      sx={{ 
                        height: '100%',
                        p: 2, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        backgroundColor: 'transparent',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {formatHonorificTitle(dig.honorific_title)} {dig.first_name} {dig.last_name}
                      </Typography>
                      <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                        {dig.organization && <>{dig.organization}<br /></>}
                        {dig.title_in_organization && <>{dig.title_in_organization}<br /></>}
                        {dig.email && <>{dig.email}<br /></>}
                        {dig.phone && <>{dig.phone}</>}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Collapse>
        )}
        
        {hiddenCount > 0 && (
          <Button
            variant="text" 
            color="primary"
            onClick={() => setExpandedDignitaryList(!expandedDignitaryList)}
            startIcon={expandedDignitaryList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mt: 2 }}
          >
            {expandedDignitaryList 
              ? "Show less" 
              : `Show ${hiddenCount} more ${hiddenCount === 1 ? "dignitary" : "dignitaries"}`
            }
          </Button>
        )}

        {/* Requester notes section */}
        {includeRequesterNotes && appointment.requester_notes_to_secretariat && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Pre-meeting Notes</Typography>
            <Typography>{appointment.requester_notes_to_secretariat}</Typography>
          </Box>
        )}
      </>
    );
  } 
  // Fall back to using the deprecated dignitary field for backward compatibility
  else if (appointment.dignitary) {
    return (
      <>
        <Typography variant="h6" gutterBottom color="primary">
          Dignitary
        </Typography>
        <Typography>
          {formatHonorificTitle(appointment.dignitary.honorific_title)} {appointment.dignitary.first_name} {appointment.dignitary.last_name}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {appointment.dignitary.organization} - {appointment.dignitary.title_in_organization} | {appointment.dignitary.email} | {appointment.dignitary.phone}
        </Typography>
        
        {/* Requester notes section */}
        {includeRequesterNotes && appointment.requester_notes_to_secretariat && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Pre-meeting Notes</Typography>
            <Typography>{appointment.requester_notes_to_secretariat}</Typography>
          </Box>
        )}
      </>
    );
  }
  // No dignitary information available
  else {
    return (
      <>
        <Typography variant="h6" gutterBottom color="primary">
          Dignitary
        </Typography>
        <Typography color="text.secondary">
          No dignitary information available
        </Typography>
        
        {/* Requester notes section */}
        {includeRequesterNotes && appointment.requester_notes_to_secretariat && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Pre-meeting Notes</Typography>
            <Typography>{appointment.requester_notes_to_secretariat}</Typography>
          </Box>
        )}
      </>
    );
  }
};

export default AppointmentDignitaryDisplay; 