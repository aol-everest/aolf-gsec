import React, { memo } from 'react';
import { Grid } from '@mui/material';
import { Appointment, AppointmentDignitary } from '../../models/types';
import AppointmentCardSection from '../AppointmentCardSection';
import GridItemIconText from '../GridItemIconText';
import { CalendarIconV2, LocationThinIconV2, TagsIconV2, PeopleMenuIconV2, ListIconV2 } from '../iconsv2';
import { formatHonorificTitle } from '../../utils/formattingUtils';
import { formatDateWithTimezone } from '../../utils/dateUtils';
import { useTheme, useMediaQuery } from '@mui/material';

interface AppointmentDetailsSectionProps {
    appointment: Appointment;
    displayMode?: 'regular' | 'calendar';
    cardContainerRef: React.RefObject<HTMLDivElement>;
}

export const AppointmentDetailsSection: React.FC<AppointmentDetailsSectionProps> = memo(({ 
    appointment, 
    displayMode = 'regular',
    cardContainerRef 
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Calculate dignitaries information
    let dignitariesCount = 0;
    let dignitariesNames: string[] = [];
    if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
        appointment.appointment_dignitaries.map((appointmentDignitary: AppointmentDignitary) => {
            const dig = appointmentDignitary.dignitary;
            dignitariesCount++;
            dignitariesNames.push(formatHonorificTitle(dig.honorific_title) + ' ' + dig.first_name + ' ' + dig.last_name);
        });
    }
    const dignitariesNamesString = dignitariesNames.join(', ');

    // Calculate location information
    let locationName = appointment.location ? (appointment.location.name + ' (' + appointment.location.city + ', ' + appointment.location.state + ')') : 'N/A';
    if (appointment.meeting_place) {
        locationName = appointment.meeting_place.name + ' @ ' + locationName;
    }

    const headerText = displayMode === 'calendar' ? '' : 
        (['approved', 'completed'].includes(appointment.status.toLowerCase()) ? 'Approved ' : 'Requested ') + 'Appointment Details';

    return (
        <AppointmentCardSection isMobile={isMobile} theme={theme} header={headerText}>
            <Grid container spacing={1}>
                <GridItemIconText 
                    containerRef={cardContainerRef} 
                    icon={<CalendarIconV2 sx={{ width: 22, height: 22 }} />} 
                    text={['approved', 'completed'].includes(appointment.status.toLowerCase()) && appointment.appointment_date ? 
                        formatDateWithTimezone(appointment.appointment_date, 'UTC', false) + ' ' + 
                        (appointment.appointment_time || '') + ' ' + 
                        (appointment.duration ? '(' + appointment.duration + ' mins)' : '') 
                        : 
                        formatDateWithTimezone(appointment.preferred_date, 'UTC', false) + ' ' + 
                        (appointment.preferred_time_of_day || '')
                    } 
                    theme={theme} 
                />

                <GridItemIconText 
                    containerRef={cardContainerRef} 
                    icon={<LocationThinIconV2 sx={{ width: 22, height: 22 }} />} 
                    text={locationName} 
                    theme={theme} 
                />

                <GridItemIconText 
                    containerRef={cardContainerRef} 
                    icon={<TagsIconV2 sx={{ width: 22, height: 22 }} />} 
                    text={appointment.appointment_type || 'Not Specified'} 
                    theme={theme} 
                />

                {displayMode === 'calendar' && (
                    <>
                        {dignitariesNamesString && (
                            <GridItemIconText 
                                containerRef={cardContainerRef} 
                                icon={<PeopleMenuIconV2 sx={{ width: 22, height: 22 }} />} 
                                text={dignitariesNamesString} 
                                theme={theme} 
                            />
                        )}
                        <GridItemIconText 
                            containerRef={cardContainerRef} 
                            icon={<ListIconV2 sx={{ width: 22, height: 22 }} />} 
                            text={appointment.purpose || ''} 
                            theme={theme} 
                        />
                    </>
                )}
            </Grid>
        </AppointmentCardSection>
    );
});

AppointmentDetailsSection.displayName = 'AppointmentDetailsSection';

export default AppointmentDetailsSection; 