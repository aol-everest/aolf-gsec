import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled } from '@mui/material';

export interface PrimaryButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'extrasmall' | 'small' | 'medium' | 'large';
}

interface StyledButtonProps {
  customSize?: 'extrasmall' | 'small' | 'medium' | 'large';
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
  
  ...(customSize === 'extrasmall' && {
    padding: '3px 3px',
    height: '30px',
    fontSize: '10px',
    lineHeight: '18px',
    minWidth: '30px',
  }),

  ...(customSize === 'small' && {
    padding: '3px 20px',
    height: '40px',
    fontSize: '13px',
    lineHeight: '20px',
  }),
  
  ...(customSize === 'medium' && {
    padding: '6px 25px',
    height: '42px',
    fontSize: '15px',
    lineHeight: '22px',
  }),
  
  ...(customSize === 'large' && {
    padding: '10px 30px',
    height: '44px',
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