import React, { memo } from 'react';
import { Typography, Grid } from '@mui/material';
import { Appointment } from '../../models/types';
import AppointmentCardSection from '../AppointmentCardSection';
import GridItemIconText from '../GridItemIconText';
import { MailIconV2, PhoneIconV2 } from '../iconsv2';
import { useTheme, useMediaQuery } from '@mui/material';

interface RequesterSectionProps {
    appointment: Appointment;
    displayMode?: 'regular' | 'calendar';
    cardContainerRef: React.RefObject<HTMLDivElement>;
}

export const RequesterSection: React.FC<RequesterSectionProps> = memo(({ 
    appointment, 
    displayMode = 'regular',
    cardContainerRef 
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (!appointment.requester) {
        return null;
    }

    return (
        <AppointmentCardSection 
            isMobile={isMobile} 
            theme={theme} 
            header="Point of Contact" 
            subheader={appointment.requester?.first_name + ' ' + appointment.requester?.last_name}
        >
            {appointment.requester ? (
                <Grid container spacing={1}>
                    <GridItemIconText 
                        containerRef={cardContainerRef} 
                        icon={<MailIconV2 sx={{ width: 22, height: 22 }} />} 
                        text={appointment.requester?.email} 
                        theme={theme} 
                        maxGridWidth={6} 
                    />
                    <GridItemIconText 
                        containerRef={cardContainerRef} 
                        icon={<PhoneIconV2 sx={{ width: 22, height: 22 }} />} 
                        text={appointment.requester?.phone_number || 'N/A'} 
                        theme={theme} 
                        maxGridWidth={6} 
                    />
                </Grid>
            ) : (
                <Typography variant="body1" color="text.secondary">
                    No POC information available
                </Typography>
            )}
        </AppointmentCardSection>
    );
});

RequesterSection.displayName = 'RequesterSection';

export default RequesterSection; 