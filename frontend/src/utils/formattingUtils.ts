import { alpha, Theme, PaletteColor } from '@mui/material/styles';

export const getStatusColor = (status: string, theme: Theme) => {
    return getStatusTheme(status, theme).main;
};


export const getStatusTheme = (status: string, theme: Theme) => {
    const statusThemes: Record<string, PaletteColor> = {
        'Pending': theme.palette.warning,

        'Approved': theme.palette.success,
        'Appointment Scheduled': theme.palette.success,
        'Scheduled': theme.palette.success,
        'Confirmed': theme.palette.success,
  
        'Rejected': theme.palette.error,
  
        'Follow Up': theme.palette.info,
        'To Be Rescheduled': theme.palette.info,
  
        'Completed': theme.palette.success,
        'Appointment Completed': theme.palette.success,
  
        'Cancelled': theme.palette.error,
        'Appointment Cancelled': theme.palette.error,
  
        'Need More Info': theme.palette.warning,
    };
    return statusThemes[status] || theme.palette.info;
};

export const getSubStatusChipSx = (subStatus: string, theme: Theme) => {
    return {
        bgcolor: alpha(getStatusColor(subStatus, theme), 0.081),
        color: getStatusColor(subStatus, theme),
        fontWeight: 500,
        borderRadius: '10px',
        fontSize: 'inherit',
    };
};

export const formatHonorificTitle = (honorificTitle: string) => {
    if (!honorificTitle) {
        return '';
    }
    return honorificTitle.toLowerCase().includes('not applicable') ? '' : honorificTitle;
};

export const formatPrimaryDomain = (primaryDomain: string, otherDomain: string) => {
    if (!primaryDomain) {
        return '';
    }
    return primaryDomain.toLowerCase().includes('other') ? (otherDomain || '') : primaryDomain;
};
