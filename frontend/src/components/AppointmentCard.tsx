import { Paper, Typography, Box, Chip, IconButton, Grid, Theme, CardContent, Card, useMediaQuery } from "@mui/material"
import { formatDate } from "../utils/dateUtils"
import { getStatusChipSx, getSubStatusChipSx } from "../utils/formattingUtils"
import { EmailIconSmall, ContactPhoneIconSmall, WorkIcon } from "./icons"
import EditIcon from "@mui/icons-material/Edit"
import { Appointment, AppointmentAttachment, AppointmentDignitary } from "../models/types"
import { useNavigate } from "react-router-dom";
import { AdminAppointmentsEditRoute } from "../config/routes";
import { useEffect, useState, useMemo } from "react";
import AttachmentSection from "./AttachmentSection";
import { useApi } from "../hooks/useApi";

export const AppointmentCard: React.FC<{ appointment: Appointment, theme: Theme }> = ({ appointment, theme }) => {
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<AppointmentAttachment[]>(appointment.attachments || []);
    const api = useApi();

    // Separate attachments by type
    const businessCardAttachments = useMemo(() => {
        return attachments.filter(attachment => attachment.attachment_type === 'business_card');
    }, [attachments]);

    const generalAttachments = useMemo(() => {
        return attachments.filter(attachment => attachment.attachment_type === 'general');
    }, [attachments]);

    // Fetch attachments if they're not already included in the appointment data
    useEffect(() => {
        const fetchAttachments = async () => {
            if (!appointment.attachments || appointment.attachments.length === 0) {
                setLoading(true);
                try {
                    const response = await api.get<AppointmentAttachment[]>(`/appointments/${appointment.id}/attachments`);
                    setAttachments(response.data);
                    // Also update the appointment object for consistency
                    appointment.attachments = response.data;
                } catch (error) {
                    console.error("Error fetching attachments:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                // If attachments are already in the appointment, use those
                setAttachments(appointment.attachments);
            }
        };
        
        fetchAttachments();
    }, [appointment, appointment.attachments, api]);

    const handleEdit = (appointmentId: number) => {
        navigate(AdminAppointmentsEditRoute.path?.replace(':id', appointmentId.toString()) || '');
        console.log(`Editing appointment with ID: ${appointmentId}`);
    };

    // Helper function to get dignitaries display information
    const renderDignitariesSection = () => {
        // Check if appointment has appointment_dignitaries array
        if (appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0) {
            // If there are multiple dignitaries, display them all
            return (
                <>
                    <Typography variant="h6" gutterBottom color="primary">
                        Dignitaries ({appointment.appointment_dignitaries.length})
                    </Typography>
                    {appointment.appointment_dignitaries.map((appointmentDignitary: AppointmentDignitary, index: number) => {
                        const dig = appointmentDignitary.dignitary;
                        return (
                            <Paper elevation={0} 
                                sx={{ 
                                    p: 2, 
                                    mb: index < appointment.appointment_dignitaries!.length - 1 ? 2 : 0, 
                                    borderRadius: 2, 
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }} 
                                key={dig.id}
                            >
                                <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="bold">
                                    {dig.honorific_title || ''} {dig.first_name} {dig.last_name}
                                </Typography>
                                <Grid container spacing={1} sx={{ color: theme.palette.text.secondary }}>
                                    <Grid item xs={12} sm={6}>
                                        <EmailIconSmall />
                                        <Typography 
                                            component="a" 
                                            href={`mailto:${dig.email}`} 
                                            sx={{ textDecoration: 'none', color: theme.palette.text.primary }}
                                        >
                                            {" " + dig.email}
                                        </Typography>
                                        <Box sx={{ color: 'text.secondary', display: 'inline-block', mx: 1 }}>|</Box>
                                        <ContactPhoneIconSmall />
                                        <Typography 
                                            component="a" 
                                            href={`tel:${dig.phone}`} 
                                            sx={{ textDecoration: 'none', color: theme.palette.text.primary }}
                                        >
                                            {" " + dig.phone || 'N/A'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        Title: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{dig.title_in_organization}</Typography>    
                                        <Box sx={{ color: 'text.secondary', display: 'inline-block', mx: 1 }}>|</Box>
                                        Organization: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{dig.organization}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        LinkedIn: <Typography component="a" href={`${dig.linked_in_or_website}`}  sx={{ color: theme.palette.text.primary, textDecoration: 'none' }}>{dig.linked_in_or_website}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={12}>
                                        Bio: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{dig.bio_summary}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        Has Met Gurudev? <Typography component="span" sx={{ fontWeight: 'bold', color: dig.has_dignitary_met_gurudev ? theme.palette.success.main : theme.palette.error.main }}>{dig.has_dignitary_met_gurudev ? 'Yes' : 'No'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        Gurudev Meeting Date: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{dig.gurudev_meeting_date ? formatDate(dig.gurudev_meeting_date, false) : 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        Gurudev Meeting Location: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{dig.gurudev_meeting_location || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={12}>
                                        Gurudev Meeting Notes: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{dig.gurudev_meeting_notes || 'N/A'}</Typography>
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
            elevation={3}
            sx={{ 
            // m: 2,
            pl: { xs: 0, sm: 2 },
            pr: { xs: 0, sm: 2 },
            pt: { xs: 0, sm: 0 },
            pb: { xs: 1, sm: 1 },
            borderRadius: 2,
            position: 'relative',
            minHeight: isMobile ? 'auto' : '600px',
            bgcolor: 'grey.50', 
            }}
        >
            <CardContent>
    
                <Paper elevation={0} sx={{ p: 2, mb: 0, border: 'none', boxShadow: 'none', borderRadius: 0, bgcolor: 'transparent' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" gutterBottom color="primary">
                        Request #: {appointment.id}
                    </Typography>
                    </Box>
                    <Box sx={{ position: 'absolute', top: 25, right: 25 }}>
                        <Chip 
                            label={appointment.status} 
                            sx={getStatusChipSx(appointment.status, theme)}
                        />
                        <Chip 
                            label={appointment.sub_status}
                            sx={{ ml: 1, ...getSubStatusChipSx(appointment.sub_status, theme) }}
                        />
                        <IconButton 
                            color="primary"
                            onClick={() => handleEdit(appointment.id)}
                            sx={{ ml: 1, mt: 1 }}
                        >
                            <EditIcon />
                        </IconButton>
                    </Box>          
                </Paper>

                {/* Point of Contact Information */}
                <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                    Point of Contact: <span style={{ fontWeight: 'bold', color: theme.palette.primary.dark }}>{appointment.requester.first_name} {appointment.requester.last_name}</span>
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', my: 0.5, }}>
                    <EmailIconSmall />{' '}
                    <Typography 
                        component="a" 
                        href={`mailto:${appointment.requester.email}`} 
                        sx={{ textDecoration: 'none', color: theme.palette.text.primary }}
                    >
                        {appointment.requester.email}
                    </Typography>
                    <Box sx={{ color: 'text.secondary', display: 'inline-block', mx: 1 }}>|</Box>
                    <ContactPhoneIconSmall />{' '}
                    <Typography 
                        component="a" 
                        href={`tel:${appointment.requester.phone_number}`} 
                        sx={{ textDecoration: 'none', color: theme.palette.text.primary }}
                    >
                        {appointment.requester.phone_number || 'N/A'}
                    </Typography>
                    </Typography>
                </Paper>

                {/* Dignitary Information */}
                <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                    {renderDignitariesSection()}
                </Paper>

                {/* Appointment Information */}
                <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                        Requested Appointment Details
                    </Typography>
                    <Grid container spacing={1} sx={{ color: theme.palette.text.secondary }}>
                        <Grid item xs={12} sm={6}>
                            Preferred Date and Time: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{formatDate(appointment.preferred_date, false)} {appointment.preferred_time_of_day || 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            Location: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{appointment.location ? (appointment.location.name + ' - ' + appointment.location.city + ', ' + appointment.location.state) : 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            Purpose: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{appointment.purpose}</Typography>
                        </Grid>
                        {appointment.requester_notes_to_secretariat && (
                            <Grid item xs={12}>
                                Notes from Point of Contact: <Typography component="span" sx={{ color: theme.palette.text.primary }}>{appointment.requester_notes_to_secretariat}</Typography>
                            </Grid>
                        )}
                    </Grid>
                </Paper>

                {/* Secretariat Notes */}
                <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                    Secretariat Notes
                    </Typography>
                    <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        Notes to Point of Contact: 
                        <Typography component="span" sx={{ color: theme.palette.text.primary }}>{' ' + (appointment.secretariat_notes_to_requester || 'N/A')}</Typography>
                    </Grid>
                    {appointment.status === 'Approved' && appointment.appointment_date && new Date(appointment.appointment_date) >= new Date() && (
                        <Grid item xs={12} sm={6}>
                            Meeting Notes: 
                            <Typography component="span" sx={{ color: theme.palette.text.primary }}>{' ' + (appointment.secretariat_meeting_notes || 'N/A')}</Typography>
                        </Grid>
                    )}
                    {appointment.status === 'Approved' && appointment.appointment_date && new Date(appointment.appointment_date) >= new Date() && (
                        <Grid item xs={12} sm={6}>
                            Meeting Follow-up Actions: 
                            <Typography component="span" sx={{ color: theme.palette.text.primary }}>{' ' + (appointment.secretariat_follow_up_actions || 'N/A')}</Typography>
                        </Grid>
                    )}
                    </Grid>
                </Paper>

                {/* Attachments Section */}
                {attachments && attachments.length > 0 && (
                    <>
                        {/* Business Card Attachments */}
                        {businessCardAttachments.length > 0 && (
                            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                                <Typography variant="h6" gutterBottom color="primary">
                                    Business Cards
                                </Typography>
                                <AttachmentSection attachments={businessCardAttachments} />
                            </Paper>
                        )}
                        
                        {/* General Attachments */}
                        {generalAttachments.length > 0 && (
                            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                                <Typography variant="h6" gutterBottom color="primary">
                                    Other Attachments
                                </Typography>
                                <AttachmentSection attachments={generalAttachments} />
                            </Paper>
                        )}
                    </>
                )}

                <Paper elevation={0} sx={{ p: 2, mb: 0, border: 'none', boxShadow: 'none', borderRadius: 0, bgcolor: 'transparent' }}>
                    <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        {appointment.last_updated_by_user && (
                        <Typography> Last Updated by: {appointment.last_updated_by_user?.first_name} {appointment.last_updated_by_user?.last_name} at {formatDate(appointment.updated_at)}</Typography>
                        )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {appointment.approved_by_user && (
                        <Typography> Approved by: {appointment.approved_by_user?.first_name} {appointment.approved_by_user?.last_name} at {formatDate(appointment.approved_datetime)}</Typography>
                        )}
                    </Grid>
                    </Grid>
                </Paper>
            </CardContent>
        </Card>
    );
};

export default AppointmentCard;