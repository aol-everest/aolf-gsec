import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled } from '@mui/material';

export interface WarningButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

interface StyledButtonProps {
  customSize?: 'small' | 'medium' | 'large';
}

const StyledWarningButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'customSize',
})<StyledButtonProps>(({ theme, customSize = 'medium' }) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '6px',
  background: '#FFFFFF',
  border: '1px solid #E9E9E9',
  borderRadius: '81px',
  fontFamily: 'Work Sans',
  fontStyle: 'normal',
  fontWeight: 600,
  color: '#F16462', // Danger/error color from the image
  textTransform: 'none',
  boxShadow: 'none',
  '&:hover': {
    background: '#FFF8F8', // Slight red tint on hover
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
    border: '1px solid #E9E9E9',
  },
  
  ...(customSize === 'small' && {
    padding: '3px 20px',
    height: '40px',
    fontSize: '13px',
    lineHeight: '20px',
  }),
  
  ...(customSize === 'medium' && {
    padding: '6px 28px',
    height: '42px',
    fontSize: '15px',
    lineHeight: '22px',
  }),
  
  ...(customSize === 'large' && {
    padding: '10px 35px',
    height: '44px',
    fontSize: '17px',
    lineHeight: '24px',
  }),
}));

export const WarningButton: React.FC<WarningButtonProps> = ({
  children,
  leftIcon,
  rightIcon,
  size = 'medium',
  ...props
}) => {
  return (
    <StyledWarningButton 
      variant="outlined" 
      customSize={size}
      {...props}
    >
      {leftIcon && (
        <span style={{ display: 'flex', marginRight: leftIcon && !children ? 0 : 8 }}>
          {leftIcon}
        </span>
      )}
      {children}
      {rightIcon && (
        <span style={{ display: 'flex', marginLeft: rightIcon && !children ? 0 : 8 }}>
          {rightIcon}
        </span>
      )}
    </StyledWarningButton>
  );
};

export default WarningButton; 