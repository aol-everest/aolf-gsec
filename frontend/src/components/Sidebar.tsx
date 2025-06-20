import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { useTheme, useMediaQuery } from '@mui/material';
import { getSidebarItems } from '../config/routes';
import { SvgIconComponent } from '@mui/icons-material';

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
  const userRole = localStorage.getItem('role');
  const sidebarItems = getSidebarItems(userRole);

  // Log when mobile status changes
  React.useEffect(() => {
    console.log('Mobile status:', isMobile);
  }, [isMobile]);

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      console.log('Mobile device detected, closing drawer');
      handleDrawerToggle();
    }
  };

  const addSidebarMenuItem = (text: string, Icon: SvgIconComponent, path?: string) => {
    if (!path || path === '') {
      return (
        <>
          <Divider />
          <Typography variant="subtitle2" gutterBottom style={{ marginTop: '3px', marginBottom: '3px' }}>
            <ListItem 
                key={text} 
              >
                <ListItemIcon 
                  sx={{ 
                    color: theme.palette.text.secondary
                  }}
                >
                  <Icon sx={{ width: 24, height: 24 }} />
                </ListItemIcon>
                <ListItemText 
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                    },
                  }}
                  primary={text}
                />
            </ListItem>
          </Typography>
          <Divider />
        </>
      );
    }
    else {
        return (
          <ListItem 
            button 
            key={text} 
            onClick={() => handleNavigation(path)}
            sx={{
              backgroundColor: location.pathname === path ? theme.palette.secondary.main : 'transparent',
              '&:hover': {
                backgroundColor: location.pathname === path ? theme.palette.secondary.main : theme.palette.secondary.main,
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
              <Icon sx={{ width: 24, height: 24 }} />
            </ListItemIcon>
            <ListItemText 
              primary={text}
              sx={{
                '& .MuiTypography-root': {
                  color: location.pathname === path ? theme.palette.primary.main : theme.palette.text.primary,
                  fontWeight: location.pathname === path ? 600 : 500,
                },
              }}
            />
          </ListItem>
      );
    }
  };

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
        {sidebarItems.map((item, index) => {
          if (item.roles && !item.roles.includes(userRole || '')) {
            return null;
          }
          return (
            <React.Fragment key={item.path || item.label || index}>
              {addSidebarMenuItem(item.label, item.icon, item.path)}
            </React.Fragment>
          );
        })}
      </List>
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
        onClose={() => {
          console.log('Drawer onClose triggered');
          handleDrawerToggle();
        }}
        ModalProps={{
          keepMounted: true,
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