import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled } from '@mui/material';

export interface PrimaryButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

interface StyledButtonProps {
  customSize?: 'small' | 'medium' | 'large';
}

const StyledPrimaryButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'customSize',
})<StyledButtonProps>(({ theme, customSize = 'large' }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '8px',
  borderRadius: '81px',
  fontFamily: 'Work Sans',
  fontStyle: 'normal',
  fontWeight: 600,
  color: '#FFFFFF',
  textTransform: 'none',
  boxShadow: 'none',
  background: 'linear-gradient(102.78deg, #FFD16F -37.89%, #FF865B 100.28%)',
  '&:hover': {
    background: 'linear-gradient(102.78deg, #FFD16F -20%, #FF865B 80%)',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
  },
  
  ...(customSize === 'small' && {
    padding: '6px 20px',
    height: '36px',
    fontSize: '14px',
    lineHeight: '20px',
  }),
  
  ...(customSize === 'medium' && {
    padding: '8px 28px',
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

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  leftIcon,
  rightIcon,
  size = 'large',
  ...props
}) => {
  return (
    <StyledPrimaryButton 
      variant="contained" 
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
    </StyledPrimaryButton>
  );
};

export default PrimaryButton; 