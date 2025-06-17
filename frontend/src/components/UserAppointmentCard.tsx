import { Paper, Typography, Box, IconButton, Grid, Theme, CardContent, Card, useMediaQuery, useTheme, Collapse } from "@mui/material"
import { formatDate } from "../utils/dateUtils"
import { Appointment, AppointmentAttachment } from "../models/types"
import { useEffect, useState, useRef, useMemo } from "react";
import { useApi } from "../hooks/useApi";
import { 
    CloseIconFilledCircleV2,
} from "./iconsv2";
import { createDebugLogger } from '../utils/debugUtils';
import { AppointmentStatusChip } from "./AppointmentStatusChip"
import AppointmentCardSection from "./AppointmentCardSection"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { 
    RequesterSection,
    AppointmentDetailsSection,
    DignitariesSection,
    ContactsSection,
    PurposeSection,
    SecretariatNotesSection,
    AttachmentsSection
} from './appointment-sections';

type UserAppointmentCardDisplayMode = 'regular' | 'dialog'

export const UserAppointmentCard: React.FC<{ 
    appointment: Appointment, 
    showCloseButton?: boolean,
    onClose?: () => void,
    displayMode?: UserAppointmentCardDisplayMode
}> = ({ appointment, showCloseButton = false, onClose, displayMode = 'regular' }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<AppointmentAttachment[]>(appointment.attachments || []);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
    const api = useApi();
    const cardContainerRef = useRef<HTMLDivElement>(null);
    
    // Create a component-specific logger
    const logger = createDebugLogger(`UserAppointmentCard:${appointment.id}`);

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

    return (
        <Card 
            elevation={1}
            sx={{ 
                position: 'relative',
                minHeight: isMobile ? 'auto' : '400px',
                mx: 'auto',
                width: '100%',
                border: displayMode === 'dialog' ? (isMobile ? '3px solid #E9E9E9' : '5px solid #E9E9E9') : '1px solid #E9E9E9',
                boxShadow: isMobile && displayMode === 'dialog' ? '0px 4px 16px -4px rgba(81, 77, 74, 0.81), 0px -1px 6px -2px rgba(81, 77, 74, 0.81)' : '0px 4px 16px -4px rgba(81, 77, 74, 0.08), 0px -1px 6px -2px rgba(81, 77, 74, 0.03)',
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
                {showCloseButton && onClose && (
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
                    }}>
                        <Box>
                            <Typography variant="h3">
                                Request #{appointment.id}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <AppointmentStatusChip status={appointment.status} size='small' />
                        </Box>          
                    </Box>

                    {/* Point of Contact Information */}
                    {
                        displayMode === 'dialog' ? (
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
                                    // Enable minimize/maximize behavior on both mobile and desktop
                                    // Switch to below commented code to keep this for mobile only
                                    // isMobile && setIsDetailsExpanded(isSummaryExpanded);
                                    setIsDetailsExpanded(isSummaryExpanded);
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
                                        <AppointmentDetailsSection appointment={appointment} displayMode={displayMode} cardContainerRef={cardContainerRef} />
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
                                        // Enable minimize/maximize behavior on both mobile and desktop
                                        // Switch to below commented code to keep this for mobile only
                                        // isMobile && setIsSummaryExpanded(isDetailsExpanded);
                                        setIsSummaryExpanded(isDetailsExpanded);
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
                                            <RequesterSection appointment={appointment} displayMode={displayMode} cardContainerRef={cardContainerRef} />
                                            {/* Dignitary Information */}
                                            <DignitariesSection appointment={appointment} cardContainerRef={cardContainerRef} />
                                            {/* Contact Information */}
                                            <ContactsSection appointment={appointment} cardContainerRef={cardContainerRef} />
                                            {/* Purpose */}
                                            <PurposeSection appointment={appointment} />
                                            {/* Secretariat Notes */}
                                            <SecretariatNotesSection appointment={appointment} />
                                            {/* Attachments Section */}
                                            <AttachmentsSection appointment={appointment} attachments={attachments} />
                                        </Box>
                                    </Collapse>
                                </Box>
                            </>
                        ) : (
                            <>
                                {/* Requester Information */}
                                <RequesterSection appointment={appointment} displayMode={displayMode} cardContainerRef={cardContainerRef} />
                                {/* Dignitary Information */}
                                <DignitariesSection appointment={appointment} cardContainerRef={cardContainerRef} />
                                {/* Contact Information */}
                                <ContactsSection appointment={appointment} cardContainerRef={cardContainerRef} />
                                {/* Appointment Information */}
                                <AppointmentDetailsSection appointment={appointment} displayMode={displayMode} cardContainerRef={cardContainerRef} />
                                {/* Purpose */}
                                <PurposeSection appointment={appointment} />
                                {/* Secretariat Notes */}
                                <SecretariatNotesSection appointment={appointment} />
                                {/* Attachments Section */}
                                <AttachmentsSection appointment={appointment} attachments={attachments} />
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

export default UserAppointmentCard; 