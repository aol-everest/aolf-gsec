import React, { memo } from 'react';
import { Typography, Box, Grid } from '@mui/material';
import { Appointment } from '../../models/types';
import AppointmentCardSection from '../AppointmentCardSection';
import { useTheme, useMediaQuery } from '@mui/material';

interface PurposeSectionProps {
    appointment: Appointment;
}

export const PurposeSection: React.FC<PurposeSectionProps> = memo(({ appointment }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <AppointmentCardSection isMobile={isMobile} theme={theme} header="Purpose">
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                        <Typography component="span" sx={{ 
                            color: theme.palette.text.primary, 
                            whiteSpace: 'pre-line' as const,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                        }}>
                            {appointment.purpose}
                        </Typography>
                    </Box>
                </Grid>
                {appointment.requester_notes_to_secretariat && (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                            <Box component="span" sx={{ 
                                width: isMobile ? '100%' : '150px', 
                                fontWeight: 'medium',
                                mb: isMobile ? 0.5 : 0
                            }}>
                                Note to Secretariat:
                            </Box>
                            <Typography component="span" sx={{ 
                                color: theme.palette.text.primary, 
                                whiteSpace: 'pre-line' as const,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            }}>
                                {appointment.requester_notes_to_secretariat}
                            </Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>
        </AppointmentCardSection>
    );
});

PurposeSection.displayName = 'PurposeSection';

export default PurposeSection; 