import { Paper, Typography, Box, IconButton, Grid, Theme, CardContent, Card, useMediaQuery, useTheme, Collapse } from "@mui/material"
import { formatDate, formatDateWithTimezone } from "../utils/dateUtils"
import { formatHonorificTitle, formatPrimaryDomain } from "../utils/formattingUtils"
import { validateUrl } from "../utils/urlUtils"
import EditIcon from "@mui/icons-material/Edit"
import { Appointment, AppointmentAttachment, AppointmentDignitary } from "../models/types"
import { useNavigate } from "react-router-dom";
import { AdminAddNewDignitaryRoute, AdminAppointmentsEditRoute, AdminEditDignitaryRoute } from "../config/routes";
import { useEffect, useState, useMemo, useRef } from "react";
import AttachmentSection from "./AttachmentSection";
import { useApi } from "../hooks/useApi";
import { 
    MailIconV2, 
    PhoneIconV2, 
    ContactCardIconV2, 
    LocationThinIconV2, 
    WebsiteIconV2,
    EditIconV2,
    CloseIconFilledCircleV2,
    CalendarIconV2,
    LocationIconV2,
    TagsIconV2,
    PeopleMenuIconV2,
    MemberListIconV2,
    FileEditIconV2,
    PlainDocumentIconV2,
    ListIconV2
} from "./iconsv2";
import { createDebugLogger } from '../utils/debugUtils';
import { AppointmentStatusChip } from "./AppointmentStatusChip"
import { BadgeCount } from "./BadgeCount"
import AppointmentCardSection from "./AppointmentCardSection"
import GridItemIconText from "./GridItemIconText"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

type AppointmentCardDisplayMode = 'regular' | 'calendar'

export const AppointmentCard: React.FC<{ 
    appointment: Appointment, 
    showCloseButton?: boolean,
    onClose?: () => void,
    displayMode?: AppointmentCardDisplayMode
}> = ({ appointment, showCloseButton = false, onClose = () => {}, displayMode = 'regular' }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<AppointmentAttachment[]>(appointment.attachments || []);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
    const api = useApi();
    const cardContainerRef = useRef<HTMLDivElement>(null);
    
    // Create a component-specific logger
    const logger = createDebugLogger(`AppointmentCard:${appointment.id}`);

    // Separate attachments by type
    const businessCardAttachments = useMemo(() => {
        return attachments.filter(attachment => attachment.attachment_type === 'business_card');
    }, [attachments]);

    const generalAttachments = useMemo(() => {
        return attachments.filter(attachment => attachment.attachment_type !== 'business_card');
    }, [attachments]);

    // Fetch attachments if they're not already included in the appointment data
    useEffect(() => {
        // Keep track of whether the component is mounted
        let isMounted = true;

        const fetchAttachments = async () => {
            // Check if appointment exists and has an id
            if (!appointment || !appointment.id) {
                logger('Skipping attachment fetch - no appointment or id');
                return;
            }
            
            // Defensive check: don't fetch again if we already have attachments
            if (Array.isArray(attachments) && attachments.length > 0) {
                logger('Skipping attachment fetch - attachments already loaded');
                return;
            }
            
            // Only fetch if we don't have attachments
            if ((!appointment.attachments || appointment.attachments.length === 0) && !loading) {
                setLoading(true);
                try {
                    logger('Fetching attachments');
                    const response = await api.get<AppointmentAttachment[]>(`/appointments/${appointment.id}/attachments`);
                    
                    // Only update state if the component is still mounted
                    if (isMounted) {
                        logger(`Fetched ${response.data.length} attachments`);
                        setAttachments(response.data);
                        // Create a new reference for the appointment object to avoid issues
                        // We use a mutable approach because the appointment object might be 
                        // shared between different component instances
                        if (!appointment.attachments) {
                            appointment.attachments = [];
                        }
                        appointment.attachments = [...response.data];
                    }
                } catch (error) {
                    console.error('Error fetching attachments:', error);
                } finally {
                    if (isMounted) {
                        setLoading(false);
                    }
                }
            } else if (appointment.attachments && appointment.attachments.length > 0) {
                // Use existing attachments
                logger('Using existing attachments from appointment object');
                setAttachments(appointment.attachments);
            }
        };

        fetchAttachments();
        
        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [appointment.id]); // Only depend on appointment.id, not the entire appointment object or api

    const handleEdit = (appointmentId: number) => {
        // Include the current URL with all query parameters as a redirectTo parameter
        const currentUrl = window.location.pathname + window.location.search;
        navigate(`${AdminAppointmentsEditRoute.path?.replace(':id', appointmentId.toString())}?redirectTo=${encodeURIComponent(currentUrl)}` || '');
        logger(`Editing appointment with ID: ${appointmentId}`);
    };

    // New function to handle dignitary editing
    const handleEditDignitary = (dignitaryId: number) => {
        // Include the current URL with all query parameters as a redirectTo parameter
        const currentUrl = window.location.pathname + window.location.search;
        // Navigate to the Add/Edit dignitary page with the dignitary ID and redirectTo parameter
        navigate(`${AdminEditDignitaryRoute.path?.replace(':id', dignitaryId.toString())}?redirectTo=${encodeURIComponent(currentUrl)}`);
        logger(`Editing dignitary with ID: ${dignitaryId}`);
    };

    // Helper function to get dignitaries display information
    const renderDignitariesSectionDetails = (appointment: Appointment) => {
        // Check if appointment has appointment_dignitaries array
        if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
            // If there are multiple dignitaries, display them all
            return (
                <>
                    {appointment.appointment_dignitaries.map((appointmentDignitary: AppointmentDignitary, index: number) => {
                        const dig = appointmentDignitary.dignitary;
                        return (
                            <Box
                                sx={{ 
                                    pt: 1, 
                                    pb: 1, 
                                    mb: index < appointment.appointment_dignitaries!.length - 1 ? 1 : 0, 
                                    position: 'relative' // Added for absolute positioning of edit button
                                }} 
                                key={dig.id}
                            >
                                {/* Add Edit button for the dignitary */}

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
                                        <EditIconV2 width="16px" height="16px" />
                                    </IconButton>
                                </Box>
                                <Box sx={{ 
                                    pl: 1, 
                                    pr: 1, 
                                    pt: 1, 
                                    pb: 1 
                                }}>
                                    <Grid container spacing={1}>
                                        <GridItemIconText containerRef={cardContainerRef} icon={<MailIconV2 />} text={dig.email} theme={theme} maxGridWidth={6} />
                                        <GridItemIconText containerRef={cardContainerRef} icon={<PhoneIconV2 />} text={dig.phone || 'N/A'} theme={theme} maxGridWidth={6} />
                                        <GridItemIconText containerRef={cardContainerRef} icon={<ContactCardIconV2 />} text={[dig.title_in_organization, dig.organization].filter(Boolean).join(', ')} theme={theme} maxGridWidth={6} />
                                        <GridItemIconText containerRef={cardContainerRef} icon={<WebsiteIconV2 width="20px" height="20px" />} text={dig.linked_in_or_website || 'N/A'} theme={theme} maxGridWidth={6} />
                                        <GridItemIconText containerRef={cardContainerRef} icon={<LocationThinIconV2 width="20px" height="20px" />} text={[dig.country, dig.state, dig.city].filter(Boolean).join(', ')} theme={theme} maxGridWidth={6} />
                                        <Grid item xs={12} sm={6}>
                                            <Typography sx={{ color: theme.palette.text.primary }}>
                                                <Typography sx={{ fontWeight: 500, color: theme.palette.secondary.dark, display: 'inline', mr: 1 }}>Domain:</Typography> 
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
                                            }}>{dig.bio_summary}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={12} md={12}>
                                            <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>Has Met Gurudev?</Typography>
                                            <Typography sx={{ fontWeight: 'bold', display: 'inline', color: dig.has_dignitary_met_gurudev ? theme.palette.success.main : theme.palette.error.main }}>
                                                {dig.has_dignitary_met_gurudev ? 'Yes' : 'No'}
                                                {dig.has_dignitary_met_gurudev && (
                                                    <>
                                                        <Typography sx={{ ml: 1, color: theme.palette.text.primary, display: 'inline' }}>{dig.gurudev_meeting_date ? "on " + formatDateWithTimezone(dig.gurudev_meeting_date, 'UTC', false) : ''}</Typography>
                                                        <Typography sx={{ ml: 1, color: theme.palette.text.primary, display: 'inline' }}>{dig.gurudev_meeting_location ? "at " + dig.gurudev_meeting_location : ''}</Typography>
                                                    </>
                                                )}
                                            </Typography>
                                        </Grid>
                                        {dig.has_dignitary_met_gurudev && (
                                            <Grid item xs={12}>
                                                <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>Gurudev Meeting Notes:</Typography>
                                                <Typography sx={{ 
                                                    color: theme.palette.text.primary, 
                                                    display: 'inline', 
                                                    whiteSpace: 'pre-line' as const,
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word'
                                                }}>{dig.gurudev_meeting_notes || 'N/A'}</Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>
                            </Box>
                        );
                    })}
                </>
            );
        } else {
            return (
                <Typography variant="body1" color="text.secondary">
                    No dignitary information available
                </Typography>
            );
        }
    };

    const renderRequesterSection = (appointment: Appointment, displayMode: AppointmentCardDisplayMode) => {
        if (appointment.requester) {
            return (
                <AppointmentCardSection isMobile={isMobile} theme={theme} header="Point of Contact" subheader={appointment.requester ? appointment.requester?.first_name + ' ' + appointment.requester?.last_name : 'N/A'}>
                    {appointment.requester ? (
                        <>
                        <Grid container spacing={1}>
                        <GridItemIconText containerRef={cardContainerRef} icon={<MailIconV2 />} text={appointment.requester?.email} theme={theme} maxGridWidth={6} />
                        <GridItemIconText containerRef={cardContainerRef} icon={<PhoneIconV2 />} text={appointment.requester?.phone_number || 'N/A'} theme={theme} maxGridWidth={6} />
                    </Grid>
                    </>
                ) : (
                    <Typography variant="body1" color="text.secondary">
                        No POC information available
                    </Typography>
                )}
            </AppointmentCardSection>
        )}
    }

    const renderDignitariesSection = (appointment: Appointment, displayMode: AppointmentCardDisplayMode) => {
        if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
            return (
                <AppointmentCardSection isMobile={isMobile} theme={theme} header="Dignitaries" headerCountBadge={appointment.appointment_dignitaries?.length}>
                    {renderDignitariesSectionDetails(appointment)}
                </AppointmentCardSection>
            )
        }
    }
    
    const renderAppointmentDetailsSection = (appointment: Appointment, displayMode: AppointmentCardDisplayMode) => {
        let dignitariesCount = 0;
        let dignitariesNames: string[] = [];
        if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
            appointment.appointment_dignitaries.map((appointmentDignitary: AppointmentDignitary, index: number) => {
                const dig = appointmentDignitary.dignitary;
                dignitariesCount++;
                dignitariesNames.push(formatHonorificTitle(dig.honorific_title) + ' ' + dig.first_name + ' ' + dig.last_name);
            });
        }
        const dignitariesNamesString = dignitariesNames.join(', ');
        return (
            <AppointmentCardSection isMobile={isMobile} theme={theme} header={displayMode === 'calendar' ? '' : (['approved', 'completed'].includes(appointment.status.toLowerCase()) ? 'Approved ' : 'Requested ') + 'Appointment Details'}>
                <Grid container spacing={1}>

                    <GridItemIconText 
                        containerRef={cardContainerRef} 
                        icon={<CalendarIconV2 />} 
                        text={['approved', 'completed'].includes(appointment.status.toLowerCase()) && appointment.appointment_date ? formatDateWithTimezone(appointment.appointment_date, 'UTC', false) + ' ' + (appointment.appointment_time || '') + ' ' + (appointment.duration ? '(' + appointment.duration + ' mins)' : '') : formatDateWithTimezone(appointment.preferred_date, 'UTC', false) + ' ' + (appointment.preferred_time_of_day || '')} 
                        theme={theme} 
                    />

                    <GridItemIconText 
                        containerRef={cardContainerRef} 
                        icon={<LocationThinIconV2 width="20px" height="20px" />} 
                        text={appointment.location ? (appointment.location.name + ' - ' + appointment.location.city + ', ' + appointment.location.state) : 'N/A'} 
                        theme={theme} 
                    />

                    <GridItemIconText 
                        containerRef={cardContainerRef} 
                        icon={<TagsIconV2 width="20px" height="20px" />} 
                        text={appointment.appointment_type || 'Not Specified'} 
                        theme={theme} 
                    />

                    {displayMode === 'calendar' && (
                        <>
                            {dignitariesNamesString && (
                                <GridItemIconText 
                                    containerRef={cardContainerRef} 
                                    icon={<PeopleMenuIconV2 width="20px" height="20px" />} 
                                    text={dignitariesNamesString} 
                                    theme={theme} 
                                />
                            )}
                            <GridItemIconText 
                                containerRef={cardContainerRef} 
                                icon={<ListIconV2 width="20px" height="20px" />} 
                                text={appointment.purpose || ''} 
                                theme={theme} 
                            />
                        </>
                    )}
                </Grid>
            </AppointmentCardSection>
        )
    }

    const renderPurposeSection = (appointment: Appointment, displayMode: AppointmentCardDisplayMode) => {
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

        )
    }

    const renderSecretariatNotesSection = (appointment: Appointment, displayMode: AppointmentCardDisplayMode) => {
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
        )
    }

    const renderAttachmentsSection = (appointment: Appointment, displayMode: AppointmentCardDisplayMode) => {
        if (appointment.attachments && Array.isArray(appointment.attachments) && appointment.attachments.length > 0) {
            return (
                <AppointmentCardSection isMobile={isMobile} theme={theme} header="Attachments">
                    {/* Business Card Attachments */}
                    {businessCardAttachments.length > 0 && (
                        <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 2, bgcolor: 'grey.50', width: '100%', boxSizing: 'border-box' }}>
                            <Typography variant="h6" gutterBottom color="primary" fontWeight="medium">
                                Business Cards
                            </Typography>
                            <AttachmentSection attachments={businessCardAttachments} />
                        </Paper>
                    )}
                    
                    {/* General Attachments */}
                    {generalAttachments.length > 0 && (
                        <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 2, bgcolor: 'grey.50', width: '100%', boxSizing: 'border-box' }}>
                            <Typography variant="h6" gutterBottom color="primary" fontWeight="medium">
                                Other Attachments
                            </Typography>
                            <AttachmentSection attachments={generalAttachments} />
                        </Paper>
                    )}
                </AppointmentCardSection>
            )
        }
    }

    return (
        <Card 
            elevation={1}
            sx={{ 
                position: 'relative',
                minHeight: isMobile ? 'auto' : '400px',
                mx: 'auto',
                width: '100%',
                // maxWidth: '900px', 
                border: displayMode === 'calendar' ? (isMobile ? '3px solid #E9E9E9' : '5px solid #E9E9E9') : '1px solid #E9E9E9',
                boxShadow: isMobile && displayMode === 'calendar' ? '0px 4px 16px -4px rgba(81, 77, 74, 0.81), 0px -1px 6px -2px rgba(81, 77, 74, 0.81)' : '0px 4px 16px -4px rgba(81, 77, 74, 0.08), 0px -1px 6px -2px rgba(81, 77, 74, 0.03)',
                borderRadius: '20px',
                gap: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                overflow: 'hidden',
                maxWidth: '100%',
                bgcolor: '#E9E9E9',
                p: 0,
                pt: showCloseButton ? 6 : 0,
                pb: isMobile ? 9 : 8,
            }}
            ref={cardContainerRef}
        >
            <CardContent sx={{ 
                width: '100%', 
                boxSizing: 'border-box',
                p: 0,
            }}>
                {/* Header with Request # and Status */}
                {showCloseButton && (
                    <IconButton
                        onClick={() => onClose()}
                        sx={{
                            position: 'absolute',
                            right: 13,
                            top: 13,
                            padding: 0,
                        }}
                        size="small"
                    >
                        <CloseIconFilledCircleV2 width="16px" height="16px" />
                    </IconButton>
                )}
                <Box sx={{ 
                    bgcolor: 'white',
                    // padding: isMobile ? '10px 0px 0px' : '20px 0px 0px',
                    pl: isMobile ? 2 : 3,
                    pr: isMobile ? 2 : 3,
                    pt: isMobile ? 2 : 3,
                    borderBottom: '1px solid #E9E9E9',
                    borderRadius: '13px',
                }}>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 3,
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                        gap: 1,
                        // p: isMobile ? 2 : 3, 
                    }}>
                        <Box>
                            <Typography variant="h3">
                                Request #{appointment.id}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AppointmentStatusChip status={appointment.status} size='small' />
                            <IconButton 
                                onClick={() => handleEdit(appointment.id)}
                                sx={{ 
                                    ml: 1,
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '8px',
                                    gap: '8px',
                                    margin: '0 auto',
                                    width: '36px',
                                    height: '36px',
                                    background: '#F7F7F7',
                                    border: '1px solid #E9E9E9',
                                    borderRadius: '12px',
                                    flex: 'none',
                                    order: 1,
                                    flexGrow: 0,
                                }}
                            >
                                <EditIconV2 />
                            </IconButton>
                        </Box>          
                    </Box>

                    {/* Point of Contact Information */}
                    {
                        displayMode === 'calendar' ? (
                            <>
                                {/* Appointment Information */}
                                <Box sx={{ 
                                    display: isSummaryExpanded ? 'none' : 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    p: 0,
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    mb: 1
                                }} onClick={() => {
                                    setIsSummaryExpanded(!isSummaryExpanded)
                                    isMobile && setIsDetailsExpanded(isSummaryExpanded);
                                }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                        {!isSummaryExpanded ? 'Show Summary' : ''}
                                    </Typography>
                                    {!isSummaryExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </Box>
                                <Collapse in={isSummaryExpanded}>
                                    <Box sx={{
                                        maxHeight: isMobile ? '400px' : '350px',
                                        overflowY: 'auto',
                                        pr: 1, // Add some padding for the scrollbar
                                        mr: -1, // Offset the padding to maintain alignment
                                        // Custom scrollbar styling
                                        '&::-webkit-scrollbar': {
                                            width: '8px',
                                        },
                                        '&::-webkit-scrollbar-track': {
                                            backgroundColor: 'transparent',
                                        },
                                        '&::-webkit-scrollbar-thumb': {
                                            backgroundColor: theme.palette.grey[300],
                                            borderRadius: '4px',
                                            '&:hover': {
                                                backgroundColor: theme.palette.grey[400],
                                            },
                                        },
                                    }}>
                                        {renderAppointmentDetailsSection(appointment, displayMode)}
                                    </Box>
                                </Collapse>
                                <Box>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        p: 0,
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        mb: 1
                                    }} onClick={() => {
                                        setIsDetailsExpanded(!isDetailsExpanded);
                                        isMobile && setIsSummaryExpanded(isDetailsExpanded);
                                    }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                            {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
                                        </Typography>
                                        {isDetailsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </Box>
                                    <Collapse in={isDetailsExpanded}>
                                        <Box sx={{
                                            maxHeight: isMobile ? '400px' : '350px',
                                            overflowY: 'auto',
                                            pr: 1, // Add some padding for the scrollbar
                                            mr: -1, // Offset the padding to maintain alignment
                                            // Custom scrollbar styling
                                            '&::-webkit-scrollbar': {
                                                width: '8px',
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                backgroundColor: 'transparent',
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                backgroundColor: theme.palette.grey[300],
                                                borderRadius: '4px',
                                                '&:hover': {
                                                    backgroundColor: theme.palette.grey[400],
                                                },
                                            },
                                        }}>
                                            {/* Requester Information */}
                                            {renderRequesterSection(appointment, displayMode)}
                                            {/* Dignitary Information */}
                                            {renderDignitariesSection(appointment, displayMode)}
                                            {/* Purpose */}
                                            {renderPurposeSection(appointment, displayMode)}
                                            {/* Secretariat Notes */}
                                            {renderSecretariatNotesSection(appointment, displayMode)}
                                            {/* Attachments Section */}
                                            {renderAttachmentsSection(appointment, displayMode)}
                                        </Box>
                                    </Collapse>
                                </Box>
                            </>
                        ) : (
                            <>
                                {/* Requester Information */}
                                {renderRequesterSection(appointment, displayMode)}
                                {/* Dignitary Information */}
                                {renderDignitariesSection(appointment, displayMode)}
                                {/* Appointment Information */}
                                {renderAppointmentDetailsSection(appointment, displayMode)}
                                {/* Purpose */}
                                {renderPurposeSection(appointment, displayMode)}
                                {/* Secretariat Notes */}
                                {renderSecretariatNotesSection(appointment, displayMode)}
                                {/* Attachments Section */}
                                {renderAttachmentsSection(appointment, displayMode)}
                            </>
                        )
                    }


                </Box>
                {/* Footer with update information */}
                <Box sx={{ 
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    pb: 2,
                    pl: 3, 
                    pr: 3, 
                    mb: 0, 
                    border: 'none', 
                    borderRadius: 0, 
                    bgcolor: 'transparent', 
                    width: '100%', 
                    boxSizing: 'border-box' 
                }}>
                    <Grid container spacing={1} sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                        <Grid item xs={12} sm={12}>
                            {appointment.requester === null && appointment.created_by_user && (
                                <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.75rem' }}>
                                    Created by: {appointment.created_by_user?.first_name} {appointment.created_by_user?.last_name} at {formatDate(appointment.created_at)}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={12}>
                            {appointment.last_updated_by_user && (
                                <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.75rem' }}>
                                    Last Updated by: {appointment.last_updated_by_user?.first_name} {appointment.last_updated_by_user?.last_name} at {formatDate(appointment.updated_at)}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={12}>
                            {appointment.approved_by_user && (
                                <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.75rem' }}>
                                    Approved by: {appointment.approved_by_user?.first_name} {appointment.approved_by_user?.last_name} at {formatDate(appointment.approved_datetime)}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </Box>
            </CardContent>
        </Card>
    );
};

export default AppointmentCard;