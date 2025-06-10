import React, { memo } from 'react';
import { Typography, Box, Grid } from '@mui/material';
import { Appointment } from '../../models/types';
import AppointmentCardSection from '../AppointmentCardSection';
import { useTheme, useMediaQuery } from '@mui/material';

interface SecretariatNotesSectionProps {
    appointment: Appointment;
}

export const SecretariatNotesSection: React.FC<SecretariatNotesSectionProps> = memo(({ appointment }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <AppointmentCardSection isMobile={isMobile} theme={theme} header="Secretariat Notes">
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                        <Box component="span" sx={{ 
                            width: isMobile ? '100%' : '150px', 
                            fontWeight: 'medium',
                            mb: isMobile ? 0.5 : 0
                        }}>
                            Notes:
                        </Box>
                        <Typography component="span" sx={{ 
                            color: theme.palette.text.primary, 
                            whiteSpace: 'pre-line' as const,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                        }}>
                            {appointment.secretariat_notes_to_requester || 'N/A'}
                        </Typography>
                    </Box>
                </Grid>
                {appointment.status === 'Approved' && appointment.appointment_date && new Date(appointment.appointment_date) >= new Date() && (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                            <Box component="span" sx={{ 
                                width: isMobile ? '100%' : '150px', 
                                fontWeight: 'medium',
                                mb: isMobile ? 0.5 : 0
                            }}>
                                Meeting Notes:
                            </Box>
                            <Typography component="span" sx={{ 
                                color: theme.palette.text.primary, 
                                whiteSpace: 'pre-line' as const,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            }}>
                                {appointment.secretariat_meeting_notes || 'N/A'}
                            </Typography>
                        </Box>
                    </Grid>
                )}
                {appointment.status === 'Approved' && appointment.appointment_date && new Date(appointment.appointment_date) >= new Date() && (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                            <Box component="span" sx={{ 
                                width: isMobile ? '100%' : '150px', 
                                fontWeight: 'medium',
                                mb: isMobile ? 0.5 : 0
                            }}>
                                Follow-up Actions:
                            </Box>
                            <Typography component="span" sx={{ 
                                color: theme.palette.text.primary, 
                                whiteSpace: 'pre-line' as const,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            }}>
                                {appointment.secretariat_follow_up_actions || 'N/A'}
                            </Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>
        </AppointmentCardSection>
    );
});

SecretariatNotesSection.displayName = 'SecretariatNotesSection';

export default SecretariatNotesSection; 