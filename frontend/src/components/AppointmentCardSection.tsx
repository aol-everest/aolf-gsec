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
    theme: Theme;
    children: React.ReactNode;
    isExpandable?: boolean;
}

const AppointmentCardSection: React.FC<AppointmentCardSectionProps> = ({ isMobile, theme, children, header, headerIcon, subheader, headerCountBadge, isExpandable = false }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const renderHeader = () => {
        return (
            <Typography variant="h4" sx={{ display: 'flex', p: 0, m: 0, mb: 2, color: theme.palette.primary.main, alignItems: 'center', gap: 1, justifyContent: 'flex-start' }}>
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                    }}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {renderHeader()}
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
                <Collapse in={isExpanded}>
                    {children}
                </Collapse>
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
