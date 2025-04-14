import { Box, Theme, Typography } from "@mui/material";
import { BadgeCount } from "./BadgeCount";

interface AppointmentCardSectionProps {
    isMobile: boolean;
    header: string;
    subheader?: string;
    headerIcon?: React.ReactNode;
    headerCountBadge?: number;
    theme: Theme;
    children: React.ReactNode;
}

const AppointmentCardSection: React.FC<AppointmentCardSectionProps> = ({ isMobile, theme, children, header, headerIcon, subheader, headerCountBadge }) => (
    <Box sx={{ 
        mt: 1,
        mb: 1,
        borderTop: '1px solid',
        borderColor: theme.palette.divider,
        pb: 3,
        pt: 3,
    }}>
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
        {children}
    </Box>
);

export default AppointmentCardSection;
