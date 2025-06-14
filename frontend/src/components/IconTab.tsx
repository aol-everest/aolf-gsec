import React from 'react';
import { Box, Button, alpha } from '@mui/material';

// Generic tab interface
export interface TabOption {
  key: string;
  label: string;
  icon: React.ReactNode;
}

// Icon Tab Button Component matching Figma design
const IconTabButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  autoWidth?: boolean;
}> = ({ label, isActive, onClick, icon, autoWidth = false }) => {
  return (
    <Button
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px',
        gap: '8px',
        width: autoWidth ? '100%' : '121px',
        minWidth: autoWidth ? '100px' : '121px',
        flex: autoWidth ? 1 : 'none',
        height: '40px',
        borderRadius: '12px',
        background: isActive 
          ? 'linear-gradient(102.78deg, #3D8BE8 -37.89%, #89BEEC 100.28%)'
          : 'transparent',
        fontFamily: 'Work Sans',
        fontStyle: 'normal',
        fontWeight: 600,
        fontSize: '14px',
        lineHeight: '20px',
        color: isActive ? '#FFFFFF' : '#6F7283',
        textTransform: 'none',
        whiteSpace: 'nowrap',
        '&:hover': {
          background: isActive 
            ? 'linear-gradient(102.78deg, #3D8BE8 -37.89%, #89BEEC 100.28%)'
            : alpha('#3D8BE8', 0.1),
        }
      }}
    >
      {icon}
      {label}
    </Button>
  );
};

// Reusable Icon Tab Container Component
export const IconTab: React.FC<{
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  containerWidth?: string;
  autoWidth?: boolean;
}> = ({ tabs, activeTab, onTabChange, containerWidth, autoWidth = false }) => {
  // Calculate container width based on number of tabs if not provided and autoWidth is true
  const calculatedWidth = containerWidth || (autoWidth 
    ? 'auto' 
    : `${Math.max(250, tabs.length * 125)}px`);

  return (
    <Box
      sx={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '4px',
        gap: '4px',
        width: calculatedWidth,
        minWidth: autoWidth ? 'auto' : '250px',
        height: '48px',
        background: '#FFFFFF',
        border: '1px solid #E9E9E9',
        borderRadius: '16px',
        flex: 'none',
        order: 1,
        flexGrow: 0,
      }}
    >
      {tabs.map((tab) => (
        <IconTabButton
          key={tab.key}
          label={tab.label}
          isActive={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
          icon={tab.icon}
          autoWidth={autoWidth}
        />
      ))}
    </Box>
  );
};

export default IconTab; 