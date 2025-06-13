import React from 'react';
import { alpha, Button, useTheme } from '@mui/material';
import { getStatusTheme } from '../utils/formattingUtils';

interface StatusActionButtonProps {
  status: string;
  count: number;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'outlined' | 'contained' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  sx?: object;
}

export const StatusActionButton: React.FC<StatusActionButtonProps> = ({
  status,
  count,
  onClick,
  disabled = false,
  loading = false,
  variant = 'outlined',
  size = 'small',
  fullWidth = false,
  startIcon,
  endIcon,
  sx = {},
}) => {
  const theme = useTheme();
  const statusTheme = getStatusTheme(status, theme);

  // Don't render if no appointments to update
  if (count === 0) return null;

  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={{
        cursor: 'pointer',
        bgcolor: statusTheme.light,
        color: statusTheme.main,
        border: `1px solid ${alpha(statusTheme.main, 0.2)}`,
        borderRadius: '13px',
        px: 1.5,
        py: 0.5,
        fontSize: '0.81rem',
        fontWeight: '500',
        textTransform: 'none',
        '&:hover': {
          bgcolor: statusTheme.main,
          color: 'white',
          border: `1px solid ${statusTheme.main}`,
          opacity: 0.9,
        },
        '&:disabled': {
          opacity: 0.6,
          cursor: 'not-allowed',
        },
        ...sx,
      }}
    >
      Mark as {status} ({count})
    </Button>
  );
};

export default StatusActionButton; 