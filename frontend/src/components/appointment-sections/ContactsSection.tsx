import React, { memo } from 'react';
import { Typography, Box, Grid } from '@mui/material';
import { Appointment, AppointmentContact } from '../../models/types';
import AppointmentCardSection from '../AppointmentCardSection';
import GridItemIconText from '../GridItemIconText';
import { MailIconV2, PhoneIconV2 } from '../iconsv2';
import { useTheme, useMediaQuery } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';

interface ContactsSectionProps {
    appointment: Appointment;
    cardContainerRef: React.RefObject<HTMLDivElement>;
}

export const ContactsSection: React.FC<ContactsSectionProps> = memo(({ 
    appointment, 
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

    if (!appointment.appointment_contacts || appointment.appointment_contacts.length === 0) {
        return null;
    }

    // Helper function to get display name for contact
    const getContactDisplayName = (contact: any) => {
        const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
        const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
            (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
        return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
    };

    return (
        <AppointmentCardSection 
            isMobile={isMobile} 
            theme={theme} 
            header="Contacts" 
            headerCountBadge={appointment.appointment_contacts?.length}
        >
            {appointment.appointment_contacts.map((appointmentContact: AppointmentContact, index: number) => {
                const contact = appointmentContact.contact;
                return (
                    <Box
                        sx={{ 
                            pt: 1, 
                            pb: 1, 
                            mb: index < appointment.appointment_contacts!.length - 1 ? 1 : 0, 
                            position: 'relative'
                        }} 
                        key={contact.id}
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
                                {index + 1}. {getContactDisplayName(contact)}
                            </Typography>
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
                                    text={contact.email || 'N/A'} 
                                    theme={theme} 
                                    maxGridWidth={6} 
                                />
                                <GridItemIconText 
                                    containerRef={cardContainerRef} 
                                    icon={<PhoneIconV2 sx={{ width: 22, height: 22 }} />} 
                                    text={contact.phone || 'N/A'} 
                                    theme={theme} 
                                    maxGridWidth={6} 
                                />
                                {contact.relationship_to_owner && (
                                    <Grid item xs={12} sm={6}>
                                        <Typography sx={{ color: theme.palette.text.primary }}>
                                            <Typography sx={{ 
                                                fontWeight: 500, 
                                                color: theme.palette.secondary.dark, 
                                                display: 'inline', 
                                                mr: 1 
                                            }}>
                                                Relationship:
                                            </Typography> 
                                            {contact.relationship_to_owner}
                                        </Typography>
                                    </Grid>
                                )}
                                {appointmentContact.role_in_team_project && (
                                    <Grid item xs={12} sm={6}>
                                        <Typography sx={{ color: theme.palette.text.primary }}>
                                            <Typography sx={{ 
                                                fontWeight: 500, 
                                                color: theme.palette.secondary.dark, 
                                                display: 'inline', 
                                                mr: 1 
                                            }}>
                                                Role:
                                            </Typography> 
                                            {appointmentContact.role_in_team_project}
                                            {appointmentContact.role_in_team_project_other && ` (${appointmentContact.role_in_team_project_other})`}
                                        </Typography>
                                    </Grid>
                                )}
                                {(contact.notes || appointmentContact.comments) && (
                                    <Grid item xs={12}>
                                        <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>
                                            Notes:
                                        </Typography>
                                        <Typography sx={{ 
                                            color: theme.palette.text.primary, 
                                            display: 'inline', 
                                            whiteSpace: 'pre-line' as const,
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word'
                                        }}>
                                            {contact.notes || appointmentContact.comments || 'N/A'}
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

ContactsSection.displayName = 'ContactsSection';

export default ContactsSection; 