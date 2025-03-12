import React from 'react';
import { Button, Box, Typography } from '@mui/material';

interface ButtonWithBadgeProps {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}

const ButtonWithBadge: React.FC<ButtonWithBadgeProps> = ({ 
  label, 
  count, 
  isSelected, 
  onClick 
}) => {
  return (
    <Button 
      onClick={onClick}
      sx={{
        fontWeight: isSelected ? '600' : '500',
        color: isSelected ? '#3D8BE8' : '#9598A6',
        fontFamily: 'Work Sans',
        fontSize: '1rem',
        letterSpacing: '0',
        '&:hover': {
          border: 'none',
          boxShadow: 'none',
          color: '#3D8BE8'
        }
      }}
    >
      {label} 
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        backgroundColor: 'white',
        borderRadius: '50%',
        border: '1px solid #E9E9E9',
        marginLeft: '4px',
        minWidth: '24px',
        minHeight: '24px',
      }}> 
        <Typography sx={{ 
          width: '15px',
          height: '18px',
          fontFamily: 'Work Sans',
          fontStyle: 'normal',
          fontWeight: '500',
          fontSize: '12px',
          lineHeight: '18px',
          textAlign: 'center',
          color: '#9598A6',
          flex: 'none',
          order: 0,
          flexGrow: 0
        }}>
          {count}
        </Typography>
      </Box>
    </Button>
  );
};

export default ButtonWithBadge; 