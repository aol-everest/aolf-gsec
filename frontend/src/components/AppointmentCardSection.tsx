import { Box, Collapse, Theme, Typography } from "@mui/material";
import { BadgeCount } from "./BadgeCount";
import { useState } from "react";
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';


interface AppointmentCardSectionProps {
    isMobile: boolean;
    header: string;
    subheader?: string;
    headerIcon?: React.ReactNode;
    headerCountBadge?: number;
    rightIcon?: React.ReactNode;
    rightStatus?: React.ReactNode;
    theme: Theme;
    children?: React.ReactNode;
    isExpandable?: boolean;
}

const AppointmentCardSection: React.FC<AppointmentCardSectionProps> = ({ isMobile, theme, children, header, headerIcon, subheader, headerCountBadge, rightIcon, rightStatus, isExpandable = false }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const renderHeader = () => {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h4" sx={{ display: 'flex', p: 0, m: 0, color: theme.palette.primary.main, alignItems: 'center', gap: 1, justifyContent: 'flex-start' }}>
                    {headerIcon !== undefined && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {headerIcon}
                        </Box>
                    )}
                    {header}
                    {subheader !== undefined && (
                        <Typography variant="h4" sx={{ color: theme.palette.text.primary, display: 'inline', p: 0, m: 0 }}>{subheader}</Typography>
                    )}
                    {headerCountBadge !== undefined && headerCountBadge > 0 && (
                        <BadgeCount 
                            count={headerCountBadge} 
                            color={theme.palette.text.primary} 
                            backgroundColor={theme.palette.secondary.light} 
                            borderColor={theme.palette.divider}
                            style="bold"
                        />
                    )}
                </Typography>
                
                {/* Right side content */}
                {(rightIcon || rightStatus) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {rightStatus && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {rightStatus}
                            </Box>
                        )}
                        {rightIcon && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {rightIcon}
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        )
    }

    return (
        <Box sx={{ 
            mt: 1,
            mb: 1,
            borderTop: '1px solid',
            borderColor: theme.palette.divider,
            pb: isMobile ? 1 : 3,
            pt: isMobile ? 1 : 3,
        }}>
            {isExpandable ? (
                <>
                <Box
                    sx={{
                        cursor: 'pointer',
                    }}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h4" sx={{ display: 'flex', p: 0, m: 0, color: theme.palette.primary.main, alignItems: 'center', gap: 1, justifyContent: 'flex-start' }}>
                            {headerIcon !== undefined && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    {headerIcon}
                                </Box>
                            )}
                            {header}
                            {subheader !== undefined && (
                                <Typography variant="h4" sx={{ color: theme.palette.text.primary, display: 'inline', p: 0, m: 0 }}>{subheader}</Typography>
                            )}
                            {headerCountBadge !== undefined && headerCountBadge > 0 && (
                                <BadgeCount 
                                    count={headerCountBadge} 
                                    color={theme.palette.text.primary} 
                                    backgroundColor={theme.palette.secondary.light} 
                                    borderColor={theme.palette.divider}
                                    style="bold"
                                />
                            )}
                        </Typography>
                        
                        {/* Right side content with expand/collapse icon */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {rightStatus && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {rightStatus}
                                </Box>
                            )}
                            {rightIcon && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {rightIcon}
                                </Box>
                            )}
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </Box>
                    </Box>
                </Box>
                {children && (
                    <Collapse in={isExpanded}>
                        {children}
                    </Collapse>
                )}
                </>
            ) : (
                <>
                    {renderHeader()}
                    {children}
                </>
            )}
        </Box>
    )
};

export default AppointmentCardSection;
