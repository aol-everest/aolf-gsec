import { Paper, Typography, Box, Chip, IconButton, Grid, Theme, CardContent, Card, useMediaQuery } from "@mui/material"
import { formatDate, formatDateWithTimezone } from "../utils/dateUtils"
import { formatHonorificTitle, getStatusChipSx, getSubStatusChipSx, formatPrimaryDomain } from "../utils/formattingUtils"
import { validateUrl } from "../utils/urlUtils"
import EditIcon from "@mui/icons-material/Edit"
import { Appointment, AppointmentAttachment, AppointmentDignitary } from "../models/types"
import { useNavigate } from "react-router-dom";
import { AdminAppointmentsEditRoute } from "../config/routes";
import { useEffect, useState, useMemo } from "react";
import AttachmentSection from "./AttachmentSection";
import { useApi } from "../hooks/useApi";
import { 
    MailIconV2, 
    PhoneIconV2, 
    ContactCardIconV2, 
    LocationIconV2, 
    MemoCheckIconV2,
    WebsiteIconV2
} from "./icons";
import { createDebugLogger } from '../utils/debugUtils';

export const AppointmentCard: React.FC<{ appointment: Appointment, theme: Theme }> = ({ appointment, theme }) => {
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<AppointmentAttachment[]>(appointment.attachments || []);
    const api = useApi();
    
    // Create a component-specific logger
    const logger = createDebugLogger(`AppointmentCard:${appointment.id}`);

    // Separate attachments by type
    const businessCardAttachments = useMemo(() => {
        return attachments.filter(attachment => attachment.attachment_type === 'business_card');
    }, [attachments]);

    const generalAttachments = useMemo(() => {
        return attachments.filter(attachment => attachment.attachment_type === 'general');
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

    // Helper function to get dignitaries display information
    const renderDignitariesSection = () => {
        // Check if appointment has appointment_dignitaries array
        if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
            // If there are multiple dignitaries, display them all
            return (
                <>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                            <Typography variant="h5" gutterBottom>
                                Dignitaries ({appointment.appointment_dignitaries.length})
                            </Typography>
                        </Grid>
                    </Grid>
                    {appointment.appointment_dignitaries.map((appointmentDignitary: AppointmentDignitary, index: number) => {
                        const dig = appointmentDignitary.dignitary;
                        return (
                            <Paper elevation={0}
                                sx={{ 
                                    p: isMobile ? 2 : 3, 
                                    mb: index < appointment.appointment_dignitaries!.length - 1 ? 2 : 0, 
                                    borderRadius: 2, 
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }} 
                                key={dig.id}
                            >
                                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                                    {formatHonorificTitle(dig.honorific_title)} {dig.first_name} {dig.last_name}
                                </Typography>
                                <Grid container spacing={1}>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mr: 2, mb: 1 }}>
                                            <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                                                <MailIconV2 />
                                            </Box>
                                            <Typography 
                                                component="a" 
                                                href={`mailto:${dig.email}`} 
                                                sx={{ 
                                                    ml: 1, 
                                                    textDecoration: 'none', 
                                                    color: theme.palette.text.primary,
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word'
                                                }}
                                            >
                                                {dig.email}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <Box sx={{ flexShrink: 0 }}>
                                                <PhoneIconV2 />
                                            </Box>
                                            <Typography 
                                                component="a" 
                                                href={`tel:${dig.phone}`} 
                                                sx={{ 
                                                    ml: 1, 
                                                    textDecoration: 'none', 
                                                    color: theme.palette.text.primary
                                                }}
                                            >
                                                {dig.phone || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                                            <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                                                <ContactCardIconV2 />
                                            </Box>
                                            <Typography sx={{ 
                                                color: theme.palette.text.primary, 
                                                ml: 1,
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word'
                                            }}>
                                                {dig.title_in_organization}, {dig.organization}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                                            <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                                                <WebsiteIconV2 />
                                            </Box>
                                            {(() => {
                                                const { isValid, url } = validateUrl(dig.linked_in_or_website);
                                                return isValid ? (
                                                    <Typography 
                                                        component="a" 
                                                        href={url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        sx={{ 
                                                            color: theme.palette.text.primary, 
                                                            textDecoration: 'none', 
                                                            ml: 1, 
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'break-word'
                                                        }}
                                                    >
                                                        {dig.linked_in_or_website}
                                                    </Typography>
                                                ) : (
                                                    <Typography sx={{ 
                                                        color: theme.palette.text.primary, 
                                                        ml: 1, 
                                                        wordBreak: 'break-word',
                                                        overflowWrap: 'break-word'
                                                    }}>
                                                        {dig.linked_in_or_website || 'N/A'}
                                                    </Typography>
                                                );
                                            })()}
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                                            <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                                                <LocationIconV2 />
                                            </Box>
                                            <Typography sx={{ 
                                                color: theme.palette.text.primary, 
                                                ml: 1,
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word'
                                            }}>
                                                {dig.country}{dig.state ? ', ' + dig.state : ''}{dig.city ? ', ' + dig.city : ''}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography sx={{ color: theme.palette.text.primary }}>
                                            <Typography sx={{ fontWeight: 500, color: theme.palette.secondary.dark, display: 'inline', mr: 1 }}>Domain:</Typography> 
                                            {formatPrimaryDomain(dig.primary_domain, dig.primary_domain_other)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>Bio:</Typography>
                                        <Typography sx={{ color: theme.palette.text.primary, display: 'inline', whiteSpace: 'pre-line' as const }}>{dig.bio_summary}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>Has Met Gurudev?</Typography>
                                        <Typography sx={{ fontWeight: 'bold', display: 'inline', color: dig.has_dignitary_met_gurudev ? theme.palette.success.main : theme.palette.error.main }}>{dig.has_dignitary_met_gurudev ? 'Yes' : 'No'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>Gurudev Meeting Date:</Typography>
                                        <Typography sx={{ color: theme.palette.text.primary, display: 'inline' }}>{dig.gurudev_meeting_date ? formatDateWithTimezone(dig.gurudev_meeting_date, 'UTC', false) : 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>Gurudev Meeting Location:</Typography>
                                        <Typography sx={{ color: theme.palette.text.primary, display: 'inline' }}>{dig.gurudev_meeting_location || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography sx={{ fontWeight: 500, mr: 1, display: 'inline' }}>Gurudev Meeting Notes:</Typography>
                                        <Typography sx={{ color: theme.palette.text.primary, display: 'inline', whiteSpace: 'pre-line' as const }}>{dig.gurudev_meeting_notes || 'N/A'}</Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
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

    return (
        <Card 
            elevation={1}
            sx={{ 
                position: 'relative',
                minHeight: isMobile ? 'auto' : '600px',
                bgcolor: 'white',
                mx: 'auto',
                width: '100%',
                // maxWidth: '900px', 
                border: '1px solid #E9E9E9',
                boxShadow: '0px 4px 16px -4px rgba(81, 77, 74, 0.08), 0px -1px 6px -2px rgba(81, 77, 74, 0.03)',
                borderRadius: '20px',
                padding: isMobile ? '10px 0px 0px' : '20px 0px 0px',
                gap: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                overflow: 'hidden',
                maxWidth: '100%',
            }}
        >
            <CardContent sx={{ p: isMobile ? 2 : 3, width: '100%', boxSizing: 'border-box' }}>
                {/* Header with Request # and Status */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3,
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    gap: 1
                }}>
                    <Box>
                        <Typography variant={isMobile ? "h5" : "h3"}>
                            Request #{appointment.id}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                            label={appointment.status} 
                            sx={getStatusChipSx(appointment.status, theme)}
                        />
                        <IconButton 
                            color="primary"
                            onClick={() => handleEdit(appointment.id)}
                            sx={{ ml: 1 }}
                        >
                            <EditIcon />
                        </IconButton>
                    </Box>          
                </Box>

                {/* Point of Contact Information */}
                <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 2, bgcolor: 'grey.50', width: '100%', boxSizing: 'border-box' }}>
                    <Typography variant="h5">
                        Point of Contact: {appointment.requester?.first_name} {appointment.requester?.last_name}
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                                    <MailIconV2 />
                                </Box>
                                <Typography 
                                    component="a" 
                                    href={`mailto:${appointment.requester?.email}`} 
                                    sx={{ 
                                        ml: 1, 
                                        textDecoration: 'none', 
                                        color: theme.palette.text.primary,
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word'
                                    }}
                                >
                                    {appointment.requester?.email}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ flexShrink: 0 }}>
                                    <PhoneIconV2 />
                                </Box>
                                <Typography 
                                    component="a" 
                                    href={`tel:${appointment.requester?.phone_number}`} 
                                    sx={{ 
                                        ml: 1, 
                                        textDecoration: 'none', 
                                        color: theme.palette.text.primary
                                    }}
                                >
                                    {appointment.requester?.phone_number || 'N/A'}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Dignitary Information */}
                <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 2, bgcolor: 'grey.50', width: '100%', boxSizing: 'border-box' }}>
                    {renderDignitariesSection()}
                </Paper>

                {/* Appointment Information */}
                <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 2, bgcolor: 'grey.50', width: '100%', boxSizing: 'border-box' }}>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                            <Typography variant="h5" gutterBottom>
                                {appointment.status.toLowerCase() === 'approved' ? 'Approved Appointment Details' : 'Requested Appointment Details'}
                            </Typography>
                        </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <Box component="span" sx={{ 
                                    width: isMobile ? '100%' : '150px', 
                                    fontWeight: 'medium',
                                    mb: isMobile ? 0.5 : 0 
                                }}>
                                    Date & Time:
                                </Box>
                                <Typography component="span" sx={{ 
                                    color: theme.palette.text.primary,
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word'
                                }}>
                                    {appointment.status.toLowerCase() === 'approved' && appointment.appointment_date ? formatDateWithTimezone(appointment.appointment_date, 'UTC', false) + ' ' + (appointment.appointment_time || '') : formatDateWithTimezone(appointment.preferred_date, 'UTC', false) + ' ' + (appointment.preferred_time_of_day || '')}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                                    <LocationIconV2 />
                                </Box>
                                <Typography component="span" sx={{ 
                                    ml: 1, 
                                    color: theme.palette.text.primary,
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word'
                                }}>
                                    {appointment.location ? (appointment.location.name + ' - ' + appointment.location.city + ', ' + appointment.location.state) : 'N/A'}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <Box component="span" sx={{ 
                                    width: isMobile ? '100%' : '150px', 
                                    fontWeight: 'medium',
                                    mb: isMobile ? 0.5 : 0
                                }}>
                                    Type:
                                </Box>
                                <Typography component="span" sx={{ 
                                    color: theme.palette.text.primary,
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word'
                                }}>
                                    {appointment.appointment_type || 'Not Specified'}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                                <Box component="span" sx={{ 
                                    width: isMobile ? '100%' : '150px', 
                                    fontWeight: 'medium',
                                    mb: isMobile ? 0.5 : 0
                                }}>
                                    Purpose:
                                </Box>
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
                </Paper>

                {/* Secretariat Notes */}
                <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 2, bgcolor: 'grey.50', width: '100%', boxSizing: 'border-box' }}>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                            <Typography variant="h5">
                                Secretariat Notes
                            </Typography>
                        </Grid>
                    </Grid>
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
                </Paper>

                {/* Attachments Section */}
                {attachments && Array.isArray(attachments) && attachments.length > 0 && (
                    <>
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
                    </>
                )}

                {/* Footer with update information */}
                <Box sx={{ p: 2, mb: 0, border: 'none', borderRadius: 0, bgcolor: 'transparent', width: '100%', boxSizing: 'border-box' }}>
                    <Grid container spacing={2} sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                        <Grid item xs={12} sm={6}>
                            {appointment.last_updated_by_user && (
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                    Last Updated by: {appointment.last_updated_by_user?.first_name} {appointment.last_updated_by_user?.last_name} at {formatDate(appointment.updated_at)}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            {appointment.approved_by_user && (
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
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