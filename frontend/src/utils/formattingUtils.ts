import { alpha, Theme } from '@mui/material/styles';

export const getStatusColor = (status: string, theme: Theme) => {
    const statusColors: Record<string, string> = {
      'Pending': theme.palette.warning.main,

      'Approved': theme.palette.success.main,
      'Appointment Scheduled': theme.palette.success.main,
      'Scheduled': theme.palette.success.main,

      'Rejected': theme.palette.error.main,

      'Follow Up': theme.palette.info.main,
      'To Be Rescheduled': theme.palette.info.main,

      'Completed': theme.palette.success.main,
      'Appointment Completed': theme.palette.success.main,

      'Cancelled': theme.palette.error.main,
      'Appointment Cancelled': theme.palette.error.main,

      'Need More Info': theme.palette.warning.main,
    };
    return statusColors[status] || theme.palette.grey[500];
  };

export const getStatusChipSx = (status: string, theme: Theme) => {
    return {
        bgcolor: alpha(getStatusColor(status, theme), 0.081),
        color: getStatusColor(status, theme),
        fontWeight: 500,
        borderRadius: '10px',
        fontSize: 'inherit',
    };
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
