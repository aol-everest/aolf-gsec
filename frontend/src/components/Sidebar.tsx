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
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AdminIcon from '@mui/icons-material/AdminPanelSettings';
interface SidebarProps {
  drawerWidth: number;
  isOpen: boolean;
  handleDrawerToggle: () => void;
}

export default function Sidebar({ drawerWidth, isOpen, handleDrawerToggle }: SidebarProps) {
  const navigate = useNavigate();

  const menuItems = [
    {
      text: 'Home',
      icon: <HomeIcon />,
      onClick: () => navigate('/home'),
    },
    {
      text: 'Request Appointment',
      icon: <AddIcon />,
      onClick: () => navigate('/appointment-form'),
    },
    {
      text: 'Appointment Status',
      icon: <CalendarIcon />,
      onClick: () => navigate('/appointment-status'),
    },
    {
      text: 'Dignitaries',
      icon: <ListIcon />,
      onClick: () => navigate('/dignitary-list'),
    },
    {
      text: 'My Profile',
      icon: <PersonIcon />,
      onClick: () => navigate('/profile'),
    },
  ];

  const adminMenuItems = [
    {
      text: 'Users',
      icon: <PersonIcon />,
      onClick: () => navigate('/users-all'),
    },
    {
      text: 'Dignitaries',
      icon: <ListIcon />,
      onClick: () => navigate('/dignitary-list-all'),
    },
    {
      text: 'Appointments',
      icon: <CalendarIcon />,
      onClick: () => navigate('/appointment-status-all'),
    },    
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" align="center" style={{ margin: 'auto' }}>
          <Box display="flex" justifyContent="center" alignItems="center">
            <img
              src="/aolf-logo.png"
              alt="AOLF Logo"
              style={{ 
                height: 40, 
                width: 'auto', 
                display: 'inline-block'
              }}
            />
          </Box>
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem button key={item.text} onClick={item.onClick}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Typography variant="subtitle2" gutterBottom style={{ marginTop: '3px', marginBottom: '3px' }}>
        <ListItem>
          <ListItemIcon>
            <AdminIcon />
          </ListItemIcon>
          <ListItemText primary="ADMIN" />
        </ListItem>
      </Typography>
      <Divider />
      <List>
        {adminMenuItems.map((item) => (
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
      sx={{
        width: isOpen ? drawerWidth : 0,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            ...(!isOpen && {
              width: 0,
              overflowX: 'hidden',
            }),
          },
        }}
        open={isOpen}
      >
        {drawer}
      </Drawer>
    </Box>
  );
} 