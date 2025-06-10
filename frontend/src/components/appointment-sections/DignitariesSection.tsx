import React, { memo } from 'react';
import { Typography, Box, IconButton, Grid, Theme } from '@mui/material';
import { Appointment, AppointmentDignitary } from '../../models/types';
import AppointmentCardSection from '../AppointmentCardSection';
import GridItemIconText from '../GridItemIconText';
import { 
    MailIconV2, 
    PhoneIconV2, 
    ContactCardIconV2, 
    LocationThinIconV2, 
    WebsiteIconV2,
    EditIconV2
} from '../iconsv2';
import { formatHonorificTitle, formatPrimaryDomain } from '../../utils/formattingUtils';
import { formatDateWithTimezone } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { AdminEditDignitaryRoute } from '../../config/routes';
import { createDebugLogger } from '../../utils/debugUtils';
import { useTheme, useMediaQuery } from '@mui/material';

interface DignitariesSectionProps {
    appointment: Appointment;
    cardContainerRef: React.RefObject<HTMLDivElement>;
}

export const DignitariesSection: React.FC<DignitariesSectionProps> = memo(({ 
    appointment, 
    cardContainerRef 
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const logger = createDebugLogger(`DignitariesSection:${appointment.id}`);

    const handleEditDignitary = (dignitaryId: number) => {
        const currentUrl = window.location.pathname + window.location.search;
        navigate(`${AdminEditDignitaryRoute.path?.replace(':id', dignitaryId.toString())}?redirectTo=${encodeURIComponent(currentUrl)}`);
        logger(`Editing dignitary with ID: ${dignitaryId}`);
    };

    if (!appointment.appointment_dignitaries || appointment.appointment_dignitaries.length === 0) {
        return null;
    }

    return (
        <AppointmentCardSection 
            isMobile={isMobile} 
            theme={theme} 
            header="Dignitaries" 
            headerCountBadge={appointment.appointment_dignitaries?.length}
        >
            {appointment.appointment_dignitaries.map((appointmentDignitary: AppointmentDignitary, index: number) => {
                const dig = appointmentDignitary.dignitary;
                return (
                    <Box
                        sx={{ 
                            pt: 1, 
                            pb: 1, 
                            mb: index < appointment.appointment_dignitaries!.length - 1 ? 1 : 0, 
                            position: 'relative'
                        }} 
                        key={dig.id}
                    >
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: 1,
                            border: '1px solid #f1f1f1',
                            borderRadius: '10px',
                            bgcolor: 'grey.50',
                            pl: 2,
                            pr: 1,
                            pt: 0.5,
                            pb: 0.5,
                            mb: 1.3
                        }}>
                            <Typography variant="h5" sx={{ 
                                fontWeight: 600, 
                                p: 0,
                                m: 0,
                                color: theme.palette.text.primary
                            }}>
                                {index + 1}. {formatHonorificTitle(dig.honorific_title)} {dig.first_name} {dig.last_name}
                            </Typography>
                            <IconButton 
                                color="primary"
                                onClick={() => handleEditDignitary(dig.id)}
                                size="small"
                                aria-label="Edit Dignitary"
                            >
                                <EditIconV2 sx={{ width: 20, height: 20 }} />
                            </IconButton>
                        </Box>
                        <Box sx={{ 
                            pl: 1, 
                            pr: 1, 
                            pt: 1, 
                            pb: 1 
                        }}>
                            <Grid container spacing={1}>
                                <GridItemIconText 
                                    containerRef={cardContainerRef} 
                                    icon={<MailIconV2 sx={{ width: 22, height: 22 }} />} 
                                    text={dig.email} 
                                    theme={theme} 
                                    maxGridWidth={6} 
                                />
                                <GridItemIconText 
                                    containerRef={cardContainerRef} 
                                    icon={<PhoneIconV2 sx={{ width: 22, height: 22 }} />} 
                                    text={dig.phone || 'N/A'} 
                                    theme={theme} 
                                    maxGridWidth={6} 
                                />
                                <GridItemIconText 
                                    containerRef={cardContainerRef} 
                                    icon={<ContactCardIconV2 sx={{ width: 22, height: 22 }} />} 
                                    text={[dig.title_in_organization, dig.organization].filter(Boolean).join(', ')} 
                                    theme={theme} 
                                    maxGridWidth={6} 
                                />
                                <GridItemIconText 
                                    containerRef={cardContainerRef} 
                                    icon={<WebsiteIconV2 sx={{ width: 22, height: 22 }} />} 
                                    text={dig.linked_in_or_website || 'N/A'} 
                                    theme={theme} 
                                    maxGridWidth={6} 
                                />
                                <GridItemIconText 
                                    containerRef={cardContainerRef} 
                                    icon={<LocationThinIconV2 sx={{ width: 22, height: 22 }} />} 
                                    text={[dig.country, dig.state, dig.city].filter(Boolean).join(', ')} 
                                    theme={theme} 
                                    maxGridWidth={6} 
                                />
                                <Grid item xs={12} sm={6}>
                                    <Typography sx={{ color: theme.palette.text.primary }}>
                                        <Typography sx={{ 
                                            fontWeight: 500, 
                                            color: theme.palette.secondary.dark, 
                                            display: 'inline', 
                                            mr: 1 
                                        }}>
                                            Domain:
                                        </Typography> 
                                        {formatPrimaryDomain(dig.primary_domain, dig.primary_domain_other)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>Bio:</Typography>
                                    <Typography sx={{ 
                                        color: theme.palette.text.primary, 
                                        display: 'inline', 
                                        whiteSpace: 'pre-line' as const,
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word'
                                    }}>
                                        {dig.bio_summary}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={12} md={12}>
                                    <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>
                                        Has Met Gurudev?
                                    </Typography>
                                    <Typography sx={{ 
                                        fontWeight: 'bold', 
                                        display: 'inline', 
                                        color: dig.has_dignitary_met_gurudev ? theme.palette.success.main : theme.palette.error.main 
                                    }}>
                                        {dig.has_dignitary_met_gurudev ? 'Yes' : 'No'}
                                        {dig.has_dignitary_met_gurudev && (
                                            <>
                                                <Typography sx={{ 
                                                    ml: 1, 
                                                    color: theme.palette.text.primary, 
                                                    display: 'inline' 
                                                }}>
                                                    {dig.gurudev_meeting_date ? "on " + formatDateWithTimezone(dig.gurudev_meeting_date, 'UTC', false) : ''}
                                                </Typography>
                                                <Typography sx={{ 
                                                    ml: 1, 
                                                    color: theme.palette.text.primary, 
                                                    display: 'inline' 
                                                }}>
                                                    {dig.gurudev_meeting_location ? "at " + dig.gurudev_meeting_location : ''}
                                                </Typography>
                                            </>
                                        )}
                                    </Typography>
                                </Grid>
                                {dig.has_dignitary_met_gurudev && (
                                    <Grid item xs={12}>
                                        <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>
                                            Gurudev Meeting Notes:
                                        </Typography>
                                        <Typography sx={{ 
                                            color: theme.palette.text.primary, 
                                            display: 'inline', 
                                            whiteSpace: 'pre-line' as const,
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word'
                                        }}>
                                            {dig.gurudev_meeting_notes || 'N/A'}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    </Box>
                );
            })}
        </AppointmentCardSection>
    );
});

DignitariesSection.displayName = 'DignitariesSection';

export default DignitariesSection; 