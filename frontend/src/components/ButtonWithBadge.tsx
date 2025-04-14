import React from 'react';
import { Box, Typography } from '@mui/material';
import { BadgeCount } from './BadgeCount';

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
        <BadgeCount count={count} />
    </Box>
  );
};

export default ButtonWithBadge; 