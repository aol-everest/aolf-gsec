import React from 'react';
import { IconButton, IconButtonProps } from '@mui/material';

interface ActionButtonProps extends Omit<IconButtonProps, 'size'> {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
  children, 
  onClick, 
  sx = {}, 
  ...props 
}) => {
  return (
    <IconButton
      size="small"
      onClick={onClick}
      sx={{
        borderRadius: '12px',
        border: '1px solid #e9e9e9',
        width: 40,
        height: 40,
        backgroundColor: '#f7f7f7',
        '&:hover': {
          backgroundColor: 'rgba(0,0,0,0.08)',
        },
        ...sx
      }}
      {...props}
    >
      {children}
    </IconButton>
  );
};

export default ActionButton; 