import React, { memo } from 'react';
import { Typography, Grid } from '@mui/material';
import { Appointment } from '../../models/types';
import AppointmentCardSection from '../AppointmentCardSection';
import GridItemIconText from '../GridItemIconText';
import { MailIconV2, PhoneIconV2 } from '../iconsv2';
import { useTheme, useMediaQuery } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';

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
    const api = useApi();

    // Fetch relationship type map from the API
    const { data: relationshipTypeMap = {} } = useQuery<Record<string, string>>({
        queryKey: ['relationship-type-map'],
        queryFn: async () => {
            const { data } = await api.get<Record<string, string>>('/user-contacts/relationship-type-options-map');
            return data;
        },
    });

    if (!appointment.requester) {
        return null;
    }

    // Check if this is a dignitary appointment
    const isDignitaryAppointment = appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0;

    // For non-dignitary appointments, check if requester is in the attendees list
    if (!isDignitaryAppointment) {
        const requesterInAttendees = appointment.appointment_contacts?.some(appointmentContact => {
            const contact = appointmentContact.contact;
            // Check if the contact has SELF relationship (indicating they are the requester)
            return contact.relationship_to_owner === relationshipTypeMap['SELF'];
        });

        // Skip showing the requester section if they're already in the attendees list
        if (requesterInAttendees) {
            return null;
        }
    }

    // Determine the header text
    const headerText = isDignitaryAppointment ? "Point of Contact" : "Requester";

    return (
        <AppointmentCardSection 
            isMobile={isMobile} 
            theme={theme} 
            header={headerText} 
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