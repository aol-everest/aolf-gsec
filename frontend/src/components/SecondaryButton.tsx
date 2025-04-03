import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled } from '@mui/material';

export interface SecondaryButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

interface StyledButtonProps {
  customSize?: 'small' | 'medium' | 'large';
}

const StyledSecondaryButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'customSize',
})<StyledButtonProps>(({ theme, customSize = 'large' }) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '8px',
  background: '#F7F7F7',
  border: '1px solid #E9E9E9',
  borderRadius: '81px',
  fontFamily: 'Work Sans',
  fontStyle: 'normal',
  fontWeight: 600,
  color: '#6F7283',
  textTransform: 'none',
  boxShadow: 'none',
  '&:hover': {
    background: '#EEEEEE',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
    border: '1px solid #E9E9E9',
  },
  
  ...(customSize === 'small' && {
    padding: '3px 20px',
    height: '36px',
    fontSize: '14px',
    lineHeight: '20px',
  }),
  
  ...(customSize === 'medium' && {
    padding: '6px 28px',
    height: '42px',
    fontSize: '16px',
    lineHeight: '22px',
  }),
  
  ...(customSize === 'large' && {
    padding: '10px 35px',
    height: '47px',
    fontSize: '17px',
    lineHeight: '24px',
  }),
}));

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  leftIcon,
  rightIcon,
  size = 'large',
  ...props
}) => {
  return (
    <StyledSecondaryButton 
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
    </StyledSecondaryButton>
  );
};

export default SecondaryButton; 