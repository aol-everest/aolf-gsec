import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import { useAuth } from '../contexts/AuthContext';

interface CustomAppBarProps {
  handleDrawerToggle: () => void;
  drawerWidth: number;
  isDrawerOpen: boolean;
}

export default function CustomAppBar({ handleDrawerToggle, drawerWidth, isDrawerOpen }: CustomAppBarProps) {
  const { userInfo, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{
        width: isDrawerOpen ? { sm: `calc(100% - ${drawerWidth}px)` } : '100%',
        ml: isDrawerOpen ? { sm: `${drawerWidth}px` } : 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="toggle drawer"
          onClick={handleDrawerToggle}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            flexGrow: 1 
          }}
        >
          {/* <img
            src="/aolf-logo.png"
            alt="AOLF Logo"
            style={{ 
              height: 35, 
              width: 'auto', 
              marginRight: 23,
              display: 'block'
            }}
          /> */}
          <Typography variant="h1" noWrap component="div">
            Gurudev Meeting Request Portal
          </Typography>
        </Box>
        <div>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
            sx={{ p: 0 }}
          >
            <Avatar alt={userInfo?.name} src={userInfo?.picture} />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleProfile}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </div>
      </Toolbar>
    </AppBar>
  );
}
