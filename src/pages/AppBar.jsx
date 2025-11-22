// src/pages/AppBar.js
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";

function ReForestAppBar({ handleDrawerToggle, user, onLogout }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate("/profile");
  };

  const handleNotificationClick = () => {
    navigate("/notifications");
  };

  // Helper function to get current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/sensors':
        return 'Sensors';
      case '/locations':
        return 'Locations';
      case '/tree-seedlings':
        return 'Tree Seedlings';
      case '/recommendations':
        return 'Recommendations';
      case '/tasks':
        return 'Planting Tasks';
      case '/notifications':
        return 'Notifications';
      case '/profile':
        return 'Profile';
      case '/planting-requests':
        return 'Planting Requests';
      default:
        // Handle nested routes
        if (path.startsWith('/task/')) {
          return 'Assign Seedlings';
        }
        if (path.startsWith('/recommendation/')) {
          return 'Recommendation Details';
        }
        return ' ';
    }
  };

  // Helper function to get user initials from backend user data
  const getUserInitials = (user) => {
    if (user?.user_firstname && user?.user_lastname) {
      return `${user.user_firstname.charAt(0)}${user.user_lastname.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.displayName) {
      const names = user.displayName.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Helper function to get display name from backend user data
  const getDisplayName = (user) => {
    if (user?.user_firstname && user?.user_lastname) {
      return `${user.user_firstname} ${user.user_lastname}`;
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.displayName || user?.email || 'User';
  };

  // Helper function to get user role display name
  const getUserRole = (user) => {
    const role = user?.roleRef?.split('/').pop() || user?.role;
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'officer':
        return 'DENR Officer';
      case 'user':
        return 'User';
      case 'planter':
        return 'Planter';
      default:
        return 'User';
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - 240px)` },
        ml: { md: `240px` },
        backgroundColor: '#2e7d32',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 600,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          {getCurrentPageTitle()}
        </Typography>
        
        {/* Notifications Icon - Simplified without badge */}
        <IconButton 
          color="inherit" 
          onClick={handleNotificationClick}
          aria-label="notifications"
          sx={{ 
            mr: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <NotificationsIcon />
        </IconButton>
        
        {/* User Menu */}
        <IconButton 
          color="inherit" 
          onClick={handleMenuOpen}
          aria-label="user menu"
          aria-controls="user-menu"
          aria-haspopup="true"
          sx={{ 
            ml: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              fontSize: '0.9rem',
              fontWeight: '600',
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {getUserInitials(user)}
          </Avatar>
        </IconButton>
        
        <Menu
          id="user-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 220,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              overflow: 'visible',
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              }
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* User Info Header */}
          <MenuItem disabled sx={{ 
            opacity: 1, 
            py: 2,
            cursor: 'default',
            '&:hover': {
              backgroundColor: 'transparent'
            }
          }}>
            <Avatar 
              sx={{ 
                mr: 2, 
                width: 40, 
                height: 40,
                bgcolor: '#2e7d32',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              {getUserInitials(user)}
            </Avatar>
            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                {getDisplayName(user)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {getUserRole(user)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                {user?.email || user?.user_email}
              </Typography>
            </div>
          </MenuItem>
          
          <Divider />
          
          {/* Menu Actions */}
          <MenuItem 
            onClick={handleProfile} 
            sx={{ 
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 0.08)',
              }
            }}
          >
            <PersonIcon sx={{ mr: 2, fontSize: '1.2rem', color: 'text.secondary' }} />
            <Typography variant="body2">My Profile</Typography>
          </MenuItem>
          
          <Divider />
          
          <MenuItem 
            onClick={handleLogout} 
            sx={{ 
              py: 1.5, 
              color: '#d32f2f',
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
              }
            }}
          >
            <LogoutIcon sx={{ mr: 2, fontSize: '1.2rem' }} />
            <Typography variant="body2" fontWeight="600">Logout</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default ReForestAppBar;
