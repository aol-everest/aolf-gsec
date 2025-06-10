import { Typography, Box, IconButton, Grid, CardContent, Card, useMediaQuery, useTheme, Collapse, Button } from "@mui/material"
import { formatDate, formatDateWithTimezone } from "../utils/dateUtils"
import { formatHonorificTitle } from "../utils/formattingUtils"
import { CalendarEventWithAppointments, AppointmentSummary, Appointment } from "../models/types"
import { useNavigate } from "react-router-dom"
import { AdminAppointmentsEditRoute } from "../config/routes"
import { useState, useRef } from "react"
import { 
    EditIconV2,
    CloseIconFilledCircleV2,
    CalendarIconV2,
    LocationThinIconV2,
    ClockSquareCircleIconV2,
    PeopleMenuIconV2,
    ListIconV2
} from "./iconsv2"
import { createDebugLogger } from '../utils/debugUtils'
import { AppointmentStatusChip } from "./AppointmentStatusChip"
import AppointmentCardSection from "./AppointmentCardSection"
import GridItemIconText from "./GridItemIconText"
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

type CalendarEventCardDisplayMode = 'regular' | 'calendar'

export const CalendarEventCard: React.FC<{ 
    calendarEvent: CalendarEventWithAppointments,
    convertAppointmentSummaryToAppointment: (summary: AppointmentSummary, event: CalendarEventWithAppointments) => Appointment,
    showCloseButton?: boolean,
    onClose?: () => void,
    displayMode?: CalendarEventCardDisplayMode
}> = ({ calendarEvent, convertAppointmentSummaryToAppointment, showCloseButton = false, onClose, displayMode = 'regular' }) => {
    const theme = useTheme()
    const navigate = useNavigate()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true)
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
    const [showAllDignitaries, setShowAllDignitaries] = useState(false)
    const [showAllPurposes, setShowAllPurposes] = useState(false)
    const cardContainerRef = useRef<HTMLDivElement>(null)
    
    // Create a component-specific logger
    const logger = createDebugLogger(`CalendarEventCard:${calendarEvent.id}`)

    const handleEditCalendarEvent = () => {
        // TODO: Add calendar event edit route when available
        logger(`Editing calendar event with ID: ${calendarEvent.id}`)
        // For now, we can just log since we don't have calendar event edit functionality yet
        console.log(`Edit calendar event ${calendarEvent.id}`)
    }

    const handleEditAppointment = (appointmentId: number) => {
        const currentUrl = window.location.pathname + window.location.search
        navigate(`${AdminAppointmentsEditRoute.path?.replace(':id', appointmentId.toString())}?redirectTo=${encodeURIComponent(currentUrl)}` || '')
        logger(`Editing appointment with ID: ${appointmentId}`)
    }

    // Get all dignitary names from all appointments
    const getAllDignitaryNames = () => {
        const names: string[] = []
        calendarEvent.appointments?.forEach((appointmentSummary) => {
            appointmentSummary.appointment_dignitaries?.forEach((appointmentDignitary) => {
                const dig = appointmentDignitary.dignitary
                const formattedName = formatHonorificTitle(dig.honorific_title) + ' ' + dig.first_name + ' ' + dig.last_name
                if (!names.includes(formattedName)) {
                    names.push(formattedName)
                }
            })
        })
        return names
    }

    // Get all purposes from appointments
    const getAllPurposes = () => {
        const purposes: string[] = []
        calendarEvent.appointments?.forEach((appointmentSummary) => {
            if (appointmentSummary.purpose && !purposes.includes(appointmentSummary.purpose)) {
                purposes.push(appointmentSummary.purpose)
            }
        })
        return purposes
    }

    const renderCalendarEventHeader = () => {
        const eventTitle = calendarEvent.title || 'Calendar Event'
        const eventIdentifier = `${eventTitle} (#${calendarEvent.id})`
        
        return (
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
                        {eventIdentifier}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <AppointmentStatusChip status={calendarEvent.status} size='small' />
                    <IconButton 
                        onClick={handleEditCalendarEvent}
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
                        <EditIconV2 sx={{ width: 20, height: 20 }} />
                    </IconButton>
                </Box>          
            </Box>
        )
    }

    const renderCalendarEventDetails = (displayMode: CalendarEventCardDisplayMode) => {
        const locationName = calendarEvent.location ? 
            (calendarEvent.location.name + ' (' + calendarEvent.location.city + ', ' + calendarEvent.location.state + ')') 
            : 'N/A'
        const fullLocationName = calendarEvent.meeting_place ? 
            calendarEvent.meeting_place.name + ' @ ' + locationName 
            : locationName

        const dignitaryNames = getAllDignitaryNames()
        const purposes = getAllPurposes()

        // For dignitary display - show only first line if more than one line
        const dignitaryText = dignitaryNames.join(', ')
        const shouldShowDignitaryMore = dignitaryText.length > 60 && !showAllDignitaries
        const displayedDignitaryText = shouldShowDignitaryMore ? 
            dignitaryNames.slice(0, Math.min(2, dignitaryNames.length)).join(', ') : 
            dignitaryText

        return (
            <Grid container spacing={1}>
                <GridItemIconText 
                    containerRef={cardContainerRef} 
                    icon={<CalendarIconV2 sx={{ width: 22, height: 22 }} />} 
                    text={calendarEvent.start_date ? formatDateWithTimezone(calendarEvent.start_date, 'UTC', false) + ' ' + (calendarEvent.start_time || '') : 'N/A'} 
                    theme={theme} 
                />

                {calendarEvent.duration && calendarEvent.duration > 15 && (
                    <GridItemIconText 
                        containerRef={cardContainerRef} 
                        icon={<ClockSquareCircleIconV2 sx={{ width: 22, height: 22 }} />} 
                        text={`${calendarEvent.duration} mins`} 
                        theme={theme} 
                    />
                )}

                <GridItemIconText 
                    containerRef={cardContainerRef} 
                    icon={<LocationThinIconV2 sx={{ width: 22, height: 22 }} />} 
                    text={fullLocationName} 
                    theme={theme} 
                />

                {/* Dignitaries - comma separated with more functionality */}
                {dignitaryNames.length > 0 && (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PeopleMenuIconV2 sx={{ width: 22, height: 22, color: theme.palette.secondary.dark }} />
                                <Typography sx={{ color: theme.palette.text.primary }}>
                                    {displayedDignitaryText}
                                </Typography>
                            </Box>
                            {shouldShowDignitaryMore && (
                                <Button 
                                    size="small" 
                                    onClick={() => setShowAllDignitaries(true)}
                                    sx={{ 
                                        minWidth: 'auto', 
                                        p: 0.5, 
                                        fontSize: '0.75rem',
                                        textTransform: 'none'
                                    }}
                                >
                                    more
                                </Button>
                            )}
                            {showAllDignitaries && dignitaryNames.length > 2 && (
                                <Button 
                                    size="small" 
                                    onClick={() => setShowAllDignitaries(false)}
                                    sx={{ 
                                        minWidth: 'auto', 
                                        p: 0.5, 
                                        fontSize: '0.75rem',
                                        textTransform: 'none'
                                    }}
                                >
                                    less
                                </Button>
                            )}
                        </Box>
                    </Grid>
                )}

                {/* Purposes - newline separated with more functionality */}
                {purposes.length > 0 && (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {(showAllPurposes ? purposes : purposes.slice(0, 1)).map((purpose, index) => (
                                <GridItemIconText 
                                    key={index}
                                    containerRef={cardContainerRef} 
                                    icon={<ListIconV2 sx={{ width: 22, height: 22 }} />} 
                                    text={purpose} 
                                    theme={theme} 
                                />
                            ))}
                            {purposes.length > 1 && (
                                <Box sx={{ ml: 3 }}>
                                    {!showAllPurposes ? (
                                        <Button 
                                            size="small" 
                                            onClick={() => setShowAllPurposes(true)}
                                            sx={{ 
                                                minWidth: 'auto', 
                                                p: 0.5, 
                                                fontSize: '0.75rem',
                                                textTransform: 'none'
                                            }}
                                        >
                                            more ({purposes.length - 1} more)
                                        </Button>
                                    ) : (
                                        <Button 
                                            size="small" 
                                            onClick={() => setShowAllPurposes(false)}
                                            sx={{ 
                                                minWidth: 'auto', 
                                                p: 0.5, 
                                                fontSize: '0.75rem',
                                                textTransform: 'none'
                                            }}
                                        >
                                            less
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Grid>
                )}
            </Grid>
        )
    }

    const renderAppointmentsSection = (displayMode: CalendarEventCardDisplayMode) => {
        if (!calendarEvent.appointments || calendarEvent.appointments.length === 0) {
            return renderNoAppointmentsSection()
        }

        return (
            <AppointmentCardSection isMobile={isMobile} theme={theme} header="Appointments" headerCountBadge={calendarEvent.appointments.length}>
                {calendarEvent.appointments.map((appointmentSummary, index) => 
                    renderAppointmentSection(appointmentSummary, index)
                )}
            </AppointmentCardSection>
        )
    }

    const renderAppointmentSection = (appointmentSummary: AppointmentSummary, index: number) => {
        const appointment = convertAppointmentSummaryToAppointment(appointmentSummary, calendarEvent)
        
        return (
            <Box key={appointmentSummary.id} sx={{ mb: index < (calendarEvent.appointments?.length || 0) - 1 ? 2 : 0 }}>
                <AppointmentCardSection 
                    isMobile={isMobile} 
                    theme={theme} 
                    header={`Appointment #${appointmentSummary.id}`}
                >
                    <Grid container spacing={2}>
                        {/* Appointment Actions Row */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
                                <AppointmentStatusChip status={appointment.status} size="extrasmall" />
                                <IconButton 
                                    onClick={() => handleEditAppointment(appointmentSummary.id)}
                                    size="small"
                                    sx={{ 
                                        background: '#F7F7F7',
                                        border: '1px solid #E9E9E9',
                                        borderRadius: '8px',
                                        width: '28px',
                                        height: '28px',
                                    }}
                                >
                                    <EditIconV2 sx={{ width: 16, height: 16 }} />
                                </IconButton>
                            </Box>
                        </Grid>

                        {/* Purpose */}
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
                                    {appointment.purpose || 'N/A'}
                                </Typography>
                            </Box>
                        </Grid>

                        {/* Dignitary Names for this appointment */}
                        {appointment.appointment_dignitaries && appointment.appointment_dignitaries.length > 0 && (
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                                    <Box component="span" sx={{ 
                                        width: isMobile ? '100%' : '150px', 
                                        fontWeight: 'medium',
                                        mb: isMobile ? 0.5 : 0
                                    }}>
                                        Dignitaries:
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {appointment.appointment_dignitaries.map((appointmentDignitary, digIndex) => {
                                            const dig = appointmentDignitary.dignitary
                                            const formattedName = formatHonorificTitle(dig.honorific_title) + ' ' + dig.first_name + ' ' + dig.last_name
                                            return (
                                                <Typography key={digIndex} sx={{ 
                                                    color: theme.palette.text.primary 
                                                }}>
                                                    • {formattedName}
                                                </Typography>
                                            )
                                        })}
                                    </Box>
                                </Box>
                            </Grid>
                        )}

                        {/* Type */}
                        {appointment.appointment_type && (
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                                    <Box component="span" sx={{ 
                                        width: isMobile ? '100%' : '150px', 
                                        fontWeight: 'medium',
                                        mb: isMobile ? 0.5 : 0
                                    }}>
                                        Type:
                                    </Box>
                                    <Typography component="span" sx={{ 
                                        color: theme.palette.text.primary 
                                    }}>
                                        {appointment.appointment_type}
                                    </Typography>
                                </Box>
                            </Grid>
                        )}

                        {/* Requester Notes */}
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
            </Box>
        )
    }

    const renderNoAppointmentsSection = () => {
        return (
            <AppointmentCardSection isMobile={isMobile} theme={theme} header="Event Details">
                <Grid container spacing={2}>
                    {calendarEvent.description ? (
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                                <Typography component="span" sx={{ 
                                    color: theme.palette.text.primary, 
                                    whiteSpace: 'pre-line' as const,
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word'
                                }}>
                                    {calendarEvent.description}
                                </Typography>
                            </Box>
                        </Grid>
                    ) : (
                        <Grid item xs={12}>
                            <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Calendar event without appointments
                            </Typography>
                        </Grid>
                    )}
                </Grid>
            </AppointmentCardSection>
        )
    }

    return (
        <Card 
            elevation={1}
            sx={{ 
                position: 'relative',
                minHeight: isMobile ? 'auto' : '400px',
                mx: 'auto',
                width: '100%',
                border: isMobile ? '3px solid #E9E9E9' : '5px solid #E9E9E9',
                boxShadow: isMobile ? '0px 4px 16px -4px rgba(81, 77, 74, 0.81), 0px -1px 6px -2px rgba(81, 77, 74, 0.81)' : '0px 4px 16px -4px rgba(81, 77, 74, 0.08), 0px -1px 6px -2px rgba(81, 77, 74, 0.03)',
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
                {/* Close Button */}
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
                    {/* Header */}
                    {renderCalendarEventHeader()}

                    {/* Calendar Event Summary */}
                    <Box sx={{ 
                        display: isSummaryExpanded ? 'block' : 'none'
                    }}>
                        <Box sx={{
                            maxHeight: isMobile ? '400px' : '350px',
                            overflowY: 'auto',
                            pr: 1,
                            mr: -1,
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
                            {renderCalendarEventDetails(displayMode)}
                        </Box>
                    </Box>

                    {/* Show/Hide Details Toggle */}
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
                            setIsDetailsExpanded(!isDetailsExpanded)
                            // Collapse summary when details expand (both mobile and desktop)
                            if (!isDetailsExpanded) {
                                setIsSummaryExpanded(false)
                            } else {
                                setIsSummaryExpanded(true)
                            }
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
                                pr: 1,
                                mr: -1,
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
                                {renderAppointmentsSection(displayMode)}
                            </Box>
                        </Collapse>
                    </Box>
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
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.75rem' }}>
                                Calendar Event Created: {formatDate(calendarEvent.created_at)}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={12}>
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', fontSize: '0.75rem' }}>
                                Last Updated: {formatDate(calendarEvent.updated_at)}
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            </CardContent>
        </Card>
    )
}

export default CalendarEventCard 