import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import CustomAppBar from './AppBar';
import Sidebar from './Sidebar';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(true);

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
          p: 3,
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