import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { useTheme, useMediaQuery } from '@mui/material';
import { 
  addIcon, 
  editCalendar, 
  editIcon, 
  homeIcon, 
  calendarViewDayIcon, 
  calendarAddIcon, 
  listIcon, 
  personListIcon, 
  personIcon, 
  outlineTableRowsIcon, 
  outlineTableChartIcon, 
  roundViewColumnIcon,
  roundPeopleIcon,
} from '../components/icons';

interface SidebarProps {
  drawerWidth: number;
  isOpen: boolean;
  handleDrawerToggle: () => void;
}

export default function Sidebar({ drawerWidth, isOpen, handleDrawerToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      handleDrawerToggle();
    }
  };

  const addSidebarMenuItem = (text: string, icon: React.ReactNode, path: string) => {
    return (
      <ListItem 
        button 
        key={text} 
        onClick={() => handleNavigation(path)}
        sx={{
          // backgroundColor: location.pathname === item.path ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
          // backgroundColor: location.pathname === item.path ? theme.palette.primary.light : 'transparent',
          backgroundColor: location.pathname === path ? theme.palette.secondary.main : 'transparent',
          '&:hover': {
            backgroundColor: location.pathname === path ? theme.palette.secondary.light : theme.palette.secondary.light,
          },
          borderLeft: location.pathname === path ? '4px solid' : '4px solid transparent',
          borderLeftColor: theme.palette.primary.main,
        }}
      >
        <ListItemIcon 
          sx={{ 
            color: location.pathname === path ? theme.palette.primary.main : theme.palette.text.secondary
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText 
          primary={text}
          sx={{
            '& .MuiTypography-root': {
              color: location.pathname === path ? theme.palette.primary.main : theme.palette.text.secondary,
              fontWeight: location.pathname === path ? 600 : 400,
            },
          }}
        />
      </ListItem>
    );
  };  

  const menuItems = [
    {
      text: 'Home',
      icon: homeIcon,
      path: '/home',
    },
    {
      text: 'Request Appointment',
      icon: calendarAddIcon,
      path: '/appointment-form',
    },
    {
      text: 'Appointment Status',
      icon: listIcon,
      path: '/appointment-status',
    },
    {
      text: 'Dignitaries',
      icon: personListIcon,
      path: '/dignitary-list',
    },
    {
      text: 'My Profile',
      icon: personIcon,
      path: '/profile',
    },
  ];

  const adminMenuItems = [
    {
      text: 'Users',
      icon: roundPeopleIcon,
      path: '/users-all',
    },
    {
      text: 'Dignitaries',
      icon: personListIcon,
      path: '/dignitary-list-all',
    },
    {
      text: 'Appointments List',
      icon: outlineTableRowsIcon,
      path: '/appointment-status-all',
    },
    {
      text: 'Appointments Tiles',
      icon: roundViewColumnIcon,
      path: '/appointment-tiles',
    },
    {
      text: 'Daily Schedule',
      icon: calendarViewDayIcon,
      path: '/appointment-day-view',
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
        {menuItems.map((item) => addSidebarMenuItem(item.text, item.icon, item.path))}
      </List>
      {localStorage.getItem('role') === 'SECRETARIAT' && (
        <>
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
            {adminMenuItems.map((item) => addSidebarMenuItem(item.text, item.icon, item.path))}
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: isOpen ? drawerWidth : 0 },
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
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
      >
        {drawer}
      </Drawer>
    </Box>
  );
} 