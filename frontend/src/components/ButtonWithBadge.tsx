import React from 'react';
import { Box, Typography } from '@mui/material';

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
  // Create a click handler that prevents event propagation if needed
  const handleClick = (e: React.MouseEvent) => {
    // If there's no onClick handler or it's an empty function, we're being used inside a Tab
    if (!onClick || onClick.toString() === '() => {}') {
      // Don't do anything, let the Tab handle it
      return;
    }
    
    // Otherwise, prevent default propagation and call the provided onClick
    e.stopPropagation();
    onClick();
  };

  return (
    <Box 
      onClick={handleClick}
      sx={{
        fontWeight: isSelected ? '600' : '500',
        color: isSelected ? '#3D8BE8' : '#9598A6',
        fontFamily: 'Work Sans',
        fontSize: '1rem',
        letterSpacing: '0',
        display: 'flex',
        alignItems: 'center',
        padding: '6px 16px',
        cursor: 'pointer',
        transition: 'color 0.2s',
        '&:hover': {
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
    </Box>
  );
};

export default ButtonWithBadge; 