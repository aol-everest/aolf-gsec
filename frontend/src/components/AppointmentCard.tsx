import { Paper, Typography, Box, Chip, IconButton, Grid, Theme } from "@mui/material"
import { formatDate } from "../utils/dateUtils"
import { getStatusChipSx } from "../utils/formattingUtils"
import { EmailIconSmall, ContactPhoneIconSmall, WorkIcon } from "./icons"
import EditIcon from "@mui/icons-material/Edit"
import { Appointment } from "../models/types"
import { useNavigate } from "react-router-dom";
import { AdminAppointmentsEditRoute } from "../config/routes";

export const AppointmentCard: React.FC<{ appointment: Appointment, theme: Theme }> = ({ appointment, theme }) => {
    const navigate = useNavigate();

    const handleEdit = (appointmentId: number) => {
        navigate(AdminAppointmentsEditRoute.path?.replace(':id', appointmentId.toString()) || '');
        console.log(`Editing appointment with ID: ${appointmentId}`);
    };

    return (
        <>
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
                Point of Contact: <b>{appointment.requester.first_name} {appointment.requester.last_name}</b>
                </Typography>
                <Typography sx={{ color: 'text.secondary', my: 0.5, }}>
                <EmailIconSmall />{' '}
                <Typography 
                    component="a" 
                    href={`mailto:${appointment.requester.email}`} 
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                >
                    {appointment.requester.email}
                </Typography>
                <Box sx={{ color: 'text.secondary', display: 'inline-block', mx: 1 }}>|</Box>
                <ContactPhoneIconSmall />{' '}
                <Typography 
                    component="a" 
                    href={`tel:${appointment.requester.phone_number}`} 
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                >
                    {appointment.requester.phone_number || 'N/A'}
                </Typography>
                </Typography>
            </Paper>

            {/* Dignitary Information */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">
                Dignitary: <b>{appointment.dignitary.honorific_title} {appointment.dignitary.first_name} {appointment.dignitary.last_name}</b>
                </Typography>
                <Typography sx={{ color: 'text.secondary', my: 0.5, }}>
                <EmailIconSmall />{' '}
                <Typography 
                    component="a" 
                    href={`mailto:${appointment.dignitary.email}`} 
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                >
                    {appointment.dignitary.email}
                </Typography>
                <Box sx={{ color: 'text.secondary', display: 'inline-block', mx: 1 }}>|</Box>
                <ContactPhoneIconSmall />{' '}
                <Typography 
                    component="a" 
                    href={`tel:${appointment.dignitary.phone}`} 
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                >
                    {appointment.dignitary.phone || 'N/A'}
                </Typography>
                </Typography>
                <Typography sx={{ color: 'text.secondary', my: 0.5, }}>
                <WorkIcon /> {appointment.dignitary.title_in_organization}
                <Box sx={{ color: 'text.secondary', display: 'inline-block', mx: 1 }}>|</Box>
                {appointment.dignitary.organization}
                </Typography>
                <Typography sx={{ color: 'text.secondary', my: 0.5, }}>
                {appointment.dignitary.bio_summary}
                </Typography>
                <Typography sx={{ color: 'text.secondary', my: 0.5, }}>
                {appointment.dignitary.linked_in_or_website}
                </Typography>
                <Typography sx={{ color: 'text.secondary', my: 0.5, }}>
                Has Dignitary Met Gurudev? {appointment.dignitary.has_dignitary_met_gurudev ? 'Yes' : 'No'}
                </Typography>
            </Paper>

            {/* Appointment Information */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
            Requested Appointment Details
            </Typography>
            <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Preferred Date</Typography>
                <Typography>{formatDate(appointment.preferred_date, false)}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Preferred Time</Typography>
                <Typography>{appointment.preferred_time_of_day || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                <Typography>{appointment.location ? (appointment.location.name + ' - ' + appointment.location.city + ', ' + appointment.location.state) : 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Purpose</Typography>
                <Typography>{appointment.purpose}</Typography>
            </Grid>
            {appointment.requester_notes_to_secretariat && (
                <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Notes from Point of Contact</Typography>
                <Typography>{appointment.requester_notes_to_secretariat}</Typography>
                </Grid>
            )}
            </Grid>
            </Paper>

            {/* Secretariat Notes */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">
                Secretariat Notes
                </Typography>
                <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                    <Typography>{appointment.secretariat_comments || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Follow-up Actions</Typography>
                    <Typography>{appointment.follow_up_actions || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Meeting Notes</Typography>
                    <Typography>{appointment.meeting_notes || 'N/A'}</Typography>
                </Grid>
                </Grid>
            </Paper>

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
        </>
    );
};

export default AppointmentCard;