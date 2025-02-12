import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import CalendarIcon from '@mui/icons-material/CalendarToday';
import ListIcon from '@mui/icons-material/ListAlt';
import PersonIcon from '@mui/icons-material/Person';

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

export default function Sidebar({ drawerWidth, mobileOpen, handleDrawerToggle }: SidebarProps) {
  const navigate = useNavigate();

  const menuItems = [
    {
      text: 'Home',
      icon: <HomeIcon />,
      onClick: () => navigate('/home'),
    },
    {
      text: 'Create New Appointment',
      icon: <AddIcon />,
      onClick: () => navigate('/appointment-form'),
    },
    {
      text: 'View Appointment Status',
      icon: <CalendarIcon />,
      onClick: () => navigate('/appointment-status'),
    },
    {
      text: 'View List of Dignitaries',
      icon: <ListIcon />,
      onClick: () => navigate('/dignitary-list'),
    },
    {
      text: 'View Profile',
      icon: <PersonIcon />,
      onClick: () => navigate('/profile'),
    },
  ];

  const drawer = (
    <Box>
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem button key={item.text} onClick={item.onClick}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
} 