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
import { Appointment, AppointmentContact } from '../models/types';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';

interface AppointmentContactDisplayProps {
  appointment: Appointment;
  includeRequesterNotes?: boolean;
}

const AppointmentContactDisplay: React.FC<AppointmentContactDisplayProps> = ({
  appointment,
  includeRequesterNotes = true
}) => {
  const [expandedContactList, setExpandedContactList] = useState(false);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));
  const api = useApi();

  // Fetch relationship type map from the API
  const { data: relationshipTypeMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['relationship-type-map'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string>>('/user-contacts/relationship-type-options-map');
      return data;
    },
  });

  // Helper function to get display name for contact
  const getContactDisplayName = (contact: any) => {
    const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
    const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
      (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
    return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
  };
  
  // Check if appointment has appointment_contacts array
  if (appointment.appointment_contacts && appointment.appointment_contacts.length > 0) {
    const totalContacts = appointment.appointment_contacts.length;
    
    // Determine how many contacts to show initially based on screen size
    let initialVisibleCount = 1; // Default for small screens
    if (isMediumScreen) initialVisibleCount = 2;
    if (isLargeScreen) initialVisibleCount = 3;
    
    // Ensure we don't try to show more than we have
    initialVisibleCount = Math.min(initialVisibleCount, totalContacts);
    
    // Calculate how many are hidden
    const hiddenCount = totalContacts - initialVisibleCount;
    
    return (
      <>
        <Typography variant="h6" gutterBottom color="primary">
          Attendees ({totalContacts})
        </Typography>
        
        {/* Grid container for responsive layout */}
        <Grid container spacing={2}>
          {/* Show initial set of contacts based on screen size */}
          {appointment.appointment_contacts.slice(0, initialVisibleCount).map((appointmentContact: AppointmentContact) => {
            const contact = appointmentContact.contact;
            return (
              <Grid item xs={12} sm={6} md={4} key={contact.id}>
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
                    {getContactDisplayName(contact)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    {contact.email && contact.email} {contact.phone && `| ${contact.phone}`}<br />
                    {contact.relationship_to_owner && `Relationship: ${contact.relationship_to_owner}`}
                    {appointmentContact.role_in_team_project && (
                      <>
                        <br />
                        Role: {appointmentContact.role_in_team_project}
                        {appointmentContact.role_in_team_project_other && ` (${appointmentContact.role_in_team_project_other})`}
                      </>
                    )}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
        
        {/* Collapsible section for additional contacts */}
        {hiddenCount > 0 && (
          <Collapse in={expandedContactList} timeout="auto" unmountOnExit>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {appointment.appointment_contacts.slice(initialVisibleCount).map((appointmentContact: AppointmentContact) => {
                const contact = appointmentContact.contact;
                return (
                  <Grid item xs={12} sm={6} md={4} key={contact.id}>
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
                        {getContactDisplayName(contact)}
                      </Typography>
                      <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                        {contact.email && <>{contact.email}<br /></>}
                        {contact.phone && <>{contact.phone}<br /></>}
                        {contact.relationship_to_owner && <>Relationship: {contact.relationship_to_owner}<br /></>}
                        {appointmentContact.role_in_team_project && (
                          <>
                            Role: {appointmentContact.role_in_team_project}
                            {appointmentContact.role_in_team_project_other && ` (${appointmentContact.role_in_team_project_other})`}
                          </>
                        )}
                        {(contact.notes || appointmentContact.comments) && (
                          <>
                            <br />
                            Notes: {contact.notes || appointmentContact.comments}
                          </>
                        )}
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
            onClick={() => setExpandedContactList(!expandedContactList)}
            startIcon={expandedContactList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mt: 2 }}
          >
            {expandedContactList 
              ? "Show less" 
              : `Show ${hiddenCount} more ${hiddenCount === 1 ? "contact" : "contacts"}`
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
  // No contact information available
  else {
    return (
      <>
        <Typography variant="h6" gutterBottom color="primary">
          Contacts
        </Typography>
        <Typography color="text.secondary">
          No contact information available
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

export default AppointmentContactDisplay; 