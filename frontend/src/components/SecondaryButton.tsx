import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled } from '@mui/material';

export interface SecondaryButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

interface StyledButtonProps {
  customSize?: 'small' | 'medium' | 'large';
  hasChildren?: boolean;
}

const StyledSecondaryButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'customSize',
})<StyledButtonProps>(({ theme, customSize = 'large', hasChildren = true }) => ({
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
    padding: hasChildren ? '3px 20px' : '3px 8px',
    height: '36px',
    fontSize: '13px',
    lineHeight: '20px',
    minWidth: hasChildren ? 'auto' : '36px',
  }),
  
  ...(customSize === 'medium' && {
    padding: hasChildren ? '6px 25px' : '6px 10px',
    height: '42px',
    fontSize: '15px',
    lineHeight: '22px',
    minWidth: hasChildren ? 'auto' : '42px',
  }),
  
  ...(customSize === 'large' && {
    padding: hasChildren ? '10px 30px' : '10px 10px',
    height: '44px',
    fontSize: '17px',
    lineHeight: '24px',
    minWidth: hasChildren ? 'auto' : '44px',
  }),
}));

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  icon,
  leftIcon,
  rightIcon,
  size = 'large',
  ...props
}) => {
  return (
    <StyledSecondaryButton 
      variant="outlined" 
      customSize={size}
      hasChildren={!!children}
      {...props}
    >
      {leftIcon && (
        <span style={{ display: 'flex', marginRight: leftIcon && !children ? 0 : 8 }}>
          {leftIcon}
        </span>
      )}
      {icon && (
        <span style={{ display: 'flex',  margin: 0, padding: 0 }}>
          {icon}
        </span>
      )}
      {children && (
        <span style={{ display: 'flex', margin: 0, padding: 0 }}>
          {children}
        </span>
      )}
      {rightIcon && (
        <span style={{ display: 'flex', marginLeft: rightIcon && !children ? 0 : 8 }}>
          {rightIcon}
        </span>
      )}
    </StyledSecondaryButton>
  );
};

export default SecondaryButton; 