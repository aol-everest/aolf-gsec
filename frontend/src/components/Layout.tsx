import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import CustomAppBar from './AppBar';
import Sidebar from './Sidebar';
import { useTheme, useMediaQuery } from '@mui/material';
import { useLocation } from 'react-router-dom';

const drawerWidth = 260;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(!isMobile);
  const location = useLocation();

  // Update drawer state if screen size changes
  useEffect(() => {
    setIsDrawerOpen(!isMobile);
  }, [isMobile]);

  // Close drawer on route change for mobile
  useEffect(() => {
    if (isMobile && isDrawerOpen) {
      setIsDrawerOpen(false);
    }
  }, [location, isMobile]);

  const handleDrawerToggle = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <CustomAppBar 
        handleDrawerToggle={handleDrawerToggle} 
        drawerWidth={drawerWidth} 
        isDrawerOpen={isDrawerOpen}
      />
      <Sidebar
        drawerWidth={drawerWidth}
        isOpen={isDrawerOpen}
        handleDrawerToggle={handleDrawerToggle}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: { xs: 3.5, sm: 5 }, // Apply padding only in desktop mode
          pl: { xs: 2, sm: 0 }, // Apply padding only in desktop mode
          pr: { xs: 2, sm: 0 }, // Apply padding only in desktop mode
          pb: { xs: 2, sm: 0 }, // Apply padding only in desktop mode
          width: isDrawerOpen ? 
            { sm: `calc(100% - ${drawerWidth}px)` } : 
            '100%',
          mt: '40px', // Height of AppBar
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          // textAlign: 'left', // Added to align items to the left
        }}
      >
        {children}
      </Box>
    </Box>
  );
} 