import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  ListAlt as ListIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            {/* Header with Logo */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                pt: 3,
                pb: 4,
              }}
            >
              <img
                src="/aolf-logo.png"
                alt="AOLF Logo"
                style={{ width: 120, height: 'auto', marginRight: 24 }}
              />
            </Box>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap component="div">
              AOLF GSEC
            </Typography>
          </Box>
          <IconButton
            onClick={() => navigate('/profile')}
            sx={{ p: 0 }}
          >
            <Avatar alt={userInfo?.name} src={userInfo?.picture} />
          </IconButton>
        </Toolbar>
      </AppBar>

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

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 