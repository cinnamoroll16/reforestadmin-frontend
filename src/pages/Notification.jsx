// src/pages/Notification.js - UPDATED WITH ORIGINAL DESIGN & BACKEND COMPATIBILITY
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, IconButton,
  Badge, useMediaQuery, useTheme, LinearProgress, alpha,
  Tabs, Tab, Snackbar, CircularProgress, Stack, Card,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { useAuth } from '../context/AuthContext.js';
import { apiService } from '../services/api.js';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkAsReadIcon from '@mui/icons-material/DoneAll';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ForestIcon from '@mui/icons-material/Forest';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';

const drawerWidth = 240;

// =============================================================================
// DATE FORMATTING FUNCTIONS - DATE ONLY
// =============================================================================

const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  try {
    let dateObj;
    
    if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
      dateObj = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      const normalizedDateStr = dateInput.replace(' ', ' ');
      dateObj = new Date(normalizedDateStr);
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (dateInput._seconds !== undefined) {
      dateObj = new Date(dateInput._seconds * 1000);
    } else {
      return String(dateInput);
    }
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    return String(dateInput);
  } catch (error) {
    console.error('Error formatting display date:', error);
    return 'Invalid Date';
  }
};

// =============================================================================
// DATA FETCHING FUNCTIONS
// =============================================================================

// Fetch user data
const fetchUserData = async (userId) => {
  try {
    if (!userId) {
      return { fullName: 'Unknown User', email: 'N/A' };
    }
    
    let userData = {};
    try {
      if (apiService.getUser && typeof apiService.getUser === 'function') {
        userData = await apiService.getUser(userId);
      }
    } catch (error) {
      console.log('User API not available');
    }
    
    return {
      fullName: userData.fullName || 'Unknown User',
      email: userData.email || 'N/A'
    };
  } catch (error) {
    console.error('Error in fetchUserData:', error);
    return { fullName: 'Unknown User', email: 'N/A' };
  }
};

// Main function to fetch notifications from backend
const fetchNotifications = async () => {
  try {
    console.log('📡 Fetching notifications from backend...');
    
    let response;
    try {
      response = await apiService.getNotifications();
    } catch (apiError) {
      console.error('❌ Notifications API failed:', apiError);
      return [];
    }
    
    let notifications = [];
    
    // Handle different response structures
    if (Array.isArray(response)) {
      notifications = response;
    } else if (response && response.success && Array.isArray(response.notifications)) {
      notifications = response.notifications;
    } else if (response && Array.isArray(response.notifications)) {
      notifications = response.notifications;
    } else if (response && response.success && Array.isArray(response.data)) {
      notifications = response.data;
    } else if (response && Array.isArray(response.data)) {
      notifications = response.data;
    } else {
      console.log('⚠️ No notifications found in response');
      return [];
    }
    
    console.log(`✅ Found ${notifications.length} raw notifications`);
    
    // Enrich notifications with user data
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const id = notification.id || notification.notificationId || notification._id;
        
        // Get user data
        const userData = await fetchUserData(notification.userId);
        
        // Determine title and message based on type
        let displayTitle, displayMessage;
        
        switch (notification.type) {
          case 'request_submitted':
            displayTitle = 'Planting Request Submitted';
            displayMessage = `${notification.fullName || userData.fullName} has submitted a planting request`;
            break;
          case 'done_planting':
            displayTitle = 'Planting Completed';
            displayMessage = `${notification.fullName || userData.fullName} has completed planting`;
            break;
          default:
            displayTitle = notification.title || 'Notification';
            displayMessage = notification.message || '';
        }
        
        return {
          id: id || `temp-${Date.now()}-${Math.random()}`,
          notificationId: notification.notificationId || notification.id || id,
          type: notification.type || 'request_submitted',
          title: displayTitle,
          message: displayMessage,
          fullName: notification.fullName || userData.fullName,
          userEmail: userData.email,
          location: notification.location || '',
          preferred_date: notification.preferred_date || '',
          requestId: notification.requestId || '',
          userId: notification.userId || '',
          status: notification.status || 'pending',
          isRead: notification.isRead !== undefined ? notification.isRead : false,
          read: notification.isRead !== undefined ? notification.isRead : false,
          created_at: notification.created_at,
          timestamp: notification.created_at,
          isRealNotification: true,
          // Formatted dates - DATE ONLY
          formatted_preferred_date: formatDisplayDate(notification.preferred_date),
          formatted_created_at: formatDisplayDate(notification.created_at),
          // For sorting
          sortableDate: new Date(notification.created_at).getTime(),
          // Additional metadata
          rawNotification: notification
        };
      })
    );
    
    console.log(`✅ Enriched ${enrichedNotifications.length} notifications`);
    
    return enrichedNotifications.filter(notification => notification.id);
  } catch (error) {
    console.error('❌ Fetch notifications failed:', error.message);
    return [];
  }
};

// =============================================================================
// SORTING FUNCTION
// =============================================================================

const sortNotifications = (notifications, sortOrder) => {
  const sorted = [...notifications].sort((a, b) => {
    const dateA = a.sortableDate || new Date(a.created_at || 0).getTime();
    const dateB = b.sortableDate || new Date(b.created_at || 0).getTime();
    
    if (sortOrder === 'newest') {
      return dateB - dateA; // Newest first
    } else {
      return dateA - dateB; // Oldest first
    }
  });
  
  return sorted;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const NotificationPanel = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [saving, setSaving] = useState(false);
  
  // Sorting and filtering states
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [filterType, setFilterType] = useState('all'); // 'all', 'request_submitted', or 'done_planting'

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSortChange = (event) => {
    setSortOrder(event.target.value);
  };

  const handleFilterChange = (event) => {
    setFilterType(event.target.value);
  };

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading notifications...');

      const notificationsData = await fetchNotifications().catch(error => {
        console.error('❌ Failed to load notifications:', error);
        return [];
      });

      setNotifications(notificationsData);

      console.log(`✅ Loaded ${notificationsData.length} notifications`);
      
      if (notificationsData.length > 0) {
        setAlert({
          open: true,
          message: `Loaded ${notificationsData.length} notifications successfully`,
          severity: 'success'
        });
      } else {
        setAlert({
          open: true,
          message: 'No notifications available',
          severity: 'info'
        });
      }

    } catch (error) {
      console.error('❌ Error in loadData:', error);
      setAlert({
        open: true,
        message: 'Error loading data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Poll for new notifications every 30 seconds
    const pollInterval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [loadData]);

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
    
    // Mark as read if it's a notification
    if (item.isRealNotification && !item.isRead) {
      handleMarkAsRead(item);
    }
  };

  const handleMarkAsRead = async (notification) => {
    if (!notification || !notification.isRealNotification) return;
    
    try {
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true, read: true } : n
      ));
      
      // Update via API
      await apiService.updateNotification(notification.id, {
        isRead: true,
        read: true,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`✅ Marked notification ${notification.id} as read`);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setSaving(true);
      
      const unreadNotifications = notifications.filter(n => 
        n.isRealNotification && !n.isRead
      );
      
      if (unreadNotifications.length === 0) {
        setAlert({ 
          open: true, 
          message: 'No unread notifications to mark', 
          severity: 'info' 
        });
        return;
      }
      
      // Update all via API
      const markReadPromises = unreadNotifications.map(notification => 
        apiService.updateNotification(notification.id, {
          isRead: true,
          read: true,
          updatedAt: new Date().toISOString()
        })
      );
      
      await Promise.all(markReadPromises);
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.isRealNotification ? { ...n, isRead: true, read: true } : n
      ));
      
      setAlert({ 
        open: true, 
        message: `Marked ${unreadNotifications.length} notifications as read`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      setAlert({ 
        open: true, 
        message: 'Error marking notifications as read', 
        severity: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'completed': return 'info';
      case 'submitted': return 'info';
      default: return 'default';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'request_submitted': 
        return <NewReleasesIcon />;
      case 'done_planting':
        return <ForestIcon />;
      default: 
        return <NotificationsIcon />;
    }
  };

  const formatType = (type) => {
    if (!type) return "Notification";
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Only show date, not time
  const formatDateTime = (date) => {
    return formatDisplayDate(date);
  };

  // Filter notifications by type and tab
  const getFilteredNotifications = () => {
    let filtered = [...notifications];
    
    // Filter by dropdown selection
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }
    
    // Filter by tab (Tab 1 = Requests only)
    if (activeTab === 1) {
      filtered = filtered.filter(n => n.type === 'request_submitted');
    }
    
    return filtered;
  };

  // Get sorted notifications
  const filteredNotifications = getFilteredNotifications();
  const sortedNotifications = sortNotifications(filteredNotifications, sortOrder);

  // Calculate counts
  const totalUnreadCount = notifications.filter(n => !n.isRead).length;
  const requestCount = notifications.filter(n => n.type === 'request_submitted').length;
  const plantingCount = notifications.filter(n => n.type === 'done_planting').length;

  const NotificationRow = ({ item }) => (
    <Paper 
      sx={{ 
        p: 2.5, 
        mb: 1.5,
        borderRadius: 2,
        borderLeft: `4px solid ${
          item.type === 'request_submitted' ? theme.palette.warning.main :
          item.type === 'done_planting' ? theme.palette.success.main :
          theme.palette.primary.main
        }`,
        backgroundColor: item.isRead ? 'background.paper' : alpha(theme.palette.primary.main, 0.05),
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        '&:hover': { 
          transform: 'translateY(-2px)',
          boxShadow: 3,
          backgroundColor: item.isRead ? 
            alpha(theme.palette.warning.main, 0.02) : 
            alpha(theme.palette.primary.main, 0.08)
        }
      }}
      onClick={() => handleViewDetails(item)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Unread indicator dot */}
        {item.isRealNotification && !item.isRead && (
          <Box sx={{ 
            position: 'absolute',
            top: 12,
            right: 12,
          }}>
            <FiberManualRecordIcon 
              sx={{ 
                fontSize: 12, 
                color: 'primary.main',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 }
                }
              }} 
            />
          </Box>
        )}

        <Box sx={{ 
          color: 
            item.type === 'request_submitted' ? 'warning.main' :
            item.type === 'done_planting' ? 'success.main' :
            'primary.main',
          mt: 0.5
        }}>
          {getNotificationIcon(item.type)}
        </Box>

        
        <Box sx={{ flex: 1, pr: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography 
              variant="subtitle1"
              sx={{
                fontWeight: item.isRead ? 500 : 700,
                color:
                  item.type === 'request_submitted' ? 'warning.main' :
                  item.type === 'done_planting' ? 'success.main' :
                  'primary.main'
              }}
            >
              {item.title}
            </Typography>
            <Chip 
              label={formatType(item.type)} 
              size="small" 
              color={item.type === 'request_submitted' ? 'warning' : 'success'}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
            {item.isRealNotification && !item.isRead && (
              <Chip 
                label="New" 
                size="small" 
                color="primary"
                variant="filled"
                sx={{ 
                  fontWeight: 600,
                  height: 20,
                  fontSize: '0.7rem'
                }}
              />
            )}
            {item.status && (
              <Chip 
                label={item.status} 
                size="small" 
                color={getStatusColor(item.status)}
                sx={{ 
                  fontWeight: 600,
                  height: 20,
                  fontSize: '0.7rem'
                }}
              />
            )}
          </Box>
          
          <Typography 
            variant="body2" 
            color={item.isRead ? 'text.secondary' : 'text.primary'}
            sx={{ 
              mb: 1.5,
              fontWeight: item.isRead ? 400 : 500
            }}
          >
            {item.message}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(item.created_at)}
            </Typography>
            {item.fullName && (
              <Typography variant="caption" color="text.secondary">
                • By: {item.fullName}
              </Typography>
            )}
            {item.location && (
              <Typography variant="caption" color="text.secondary">
                • Location: {item.location}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );

  const EmptyState = ({ icon: Icon, title, description }) => (
    <Paper sx={{ textAlign: 'center', p: 6, borderRadius: 2 }}>
      <Icon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );

  // Render different details based on item type
  const renderDetailsContent = (item) => {
    if (!item) return null;

    return (
      <Stack spacing={3}>
        {/* Planter Information */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            <PersonIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
            Planter Information
          </Typography>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Name
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {item.fullName || 'Unknown User'}
                </Typography>
              </Box>
              {item.userEmail && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {item.userEmail}
                  </Typography>
                </Box>
              )}
              {item.userId && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    User ID
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {item.userId}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Card>
        </Box>

        {/* Notification Details */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            {item.type === 'done_planting' ? (
              <ForestIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5, color: 'success.main' }} />
            ) : (
              <NewReleasesIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
            )}
            {item.type === 'request_submitted' ? 'Request Details' : 'Planting Details'}
          </Typography>
          <Card variant="outlined" sx={{ 
            p: 2, 
            bgcolor: item.type === 'done_planting' ? 'rgba(46, 125, 50, 0.05)' : 'rgba(255, 193, 7, 0.05)' 
          }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Title
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {item.title}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Created Date
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {formatDisplayDate(item.created_at)}
                </Typography>
              </Box>
              
              {item.preferred_date && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Preferred Date
                  </Typography>
                  <Typography variant="body1" fontWeight="600">
                    {formatDisplayDate(item.preferred_date)}
                  </Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Status
                </Typography>
                <Chip 
                  label={item.status} 
                  color={getStatusColor(item.status)}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              
              {item.requestId && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Request ID
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {item.requestId}
                  </Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Message
                </Typography>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    {item.message}
                  </Typography>
                </Paper>
              </Box>
            </Stack>
          </Card>
        </Box>

        {/* Location Information */}
        {item.location && (
          <Box>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              <LocationOnIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
              Location
            </Typography>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body1" fontWeight="600">
                {item.location}
              </Typography>
            </Card>
          </Box>
        )}
      </Stack>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} user={user} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` }, mt: '64px' }}>
          <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            Loading notifications...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} user={user} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` }, mt: '64px' }}>      
        {alert.open && (
          <Alert severity={alert.severity} onClose={() => setAlert({ ...alert, open: false })} sx={{ mb: 2 }}>
            {alert.message}
          </Alert>
        )}

        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Notifications Center
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and manage all notifications and activities
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {totalUnreadCount > 0 && (
                <Button
                  startIcon={saving ? <CircularProgress size={20} /> : <MarkAsReadIcon />}
                  onClick={handleMarkAllAsRead}
                  variant="outlined"
                  color="primary"
                  disabled={saving}
                >
                  {saving ? 'Marking...' : `Mark All Read (${totalUnreadCount})`}
                </Button>
              )}
              <Button
                startIcon={<CheckCircleIcon />}
                onClick={loadData}
                variant="outlined"
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Sorting and Filtering Controls */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 600, mr: 2 }}>
              Filters & Sorting
            </Typography>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FilterListIcon fontSize="small" />
                  Filter Type
                </Box>
              </InputLabel>
              <Select
                value={filterType}
                label="Filter Type"
                onChange={handleFilterChange}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="request_submitted">Planting Requests</MenuItem>
                <MenuItem value="done_planting">Planting Activities</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SortIcon fontSize="small" />
                  Sort By
                </Box>
              </InputLabel>
              <Select
                value={sortOrder}
                label="Sort By"
                onChange={handleSortChange}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {sortedNotifications.length} of {notifications.length} notifications
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Tabs with Notification Chips */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              minHeight: 50,
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1,
                minHeight: 50,
                padding: '4px 8px',
              },
              '& .Mui-selected': {
                color: '#2e7d32',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2e7d32',
                height: 3,
                borderRadius: 1.5,
              },
            }}
          >
            {/* Tab 0: All Notifications */}
            <Tab
              icon={
                <Badge badgeContent={totalUnreadCount} color="error">
                  <NotificationsIcon sx={{ fontSize: 20 }} />
                </Badge>
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1 }}>
                    All Notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {notifications.length} total
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
            
            {/* Tab 1: Planting Requests */}
            <Tab
              icon={
                <Badge badgeContent={notifications.filter(n => n.type === 'request_submitted' && !n.isRead).length} color="error">
                  <NewReleasesIcon sx={{ fontSize: 20 }} />
                </Badge>
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1 }}>
                    Planting Requests
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {requestCount} requests
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>All Notifications</Typography>
            {sortedNotifications.length === 0 ? (
              <EmptyState 
                icon={NotificationsIcon}
                title="No notifications available"
                description={
                  filterType === 'all' 
                    ? "New notifications will appear here when available"
                    : `No ${filterType === 'request_submitted' ? 'planting requests' : 'planting activities'} found`
                }
              />
            ) : (
              <Box>
                {sortedNotifications.map((item, index) => (
                  <NotificationRow key={`${item.type}-${item.id}-${index}`} item={item} />
                ))}
              </Box>
            )}
          </>
        )}

        {activeTab === 1 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>Planting Requests</Typography>
            {sortedNotifications.filter(n => n.type === 'request_submitted').length === 0 ? (
              <EmptyState 
                icon={NewReleasesIcon}
                title="No planting requests"
                description="New planting requests will appear here when submitted"
              />
            ) : (
              <Box>
                {sortedNotifications
                  .filter(n => n.type === 'request_submitted')
                  .map((item, index) => (
                    <NotificationRow key={`${item.type}-${item.id}-${index}`} item={item} />
                  ))}
              </Box>
            )}
          </>
        )}

        {/* Details Dialog */}
        <Dialog 
          open={detailDialogOpen} 
          onClose={() => setDetailDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                {selectedItem?.type === 'request_submitted' ? 'Request Details' : 
                 selectedItem?.type === 'done_planting' ? 'Planting Activity Details' : 
                 'Notification Details'}
              </Typography>
              <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {renderDetailsContent(selectedItem)}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            {selectedItem?.isRealNotification && !selectedItem?.isRead && (
              <Button 
                variant="outlined" 
                onClick={() => {
                  handleMarkAsRead(selectedItem);
                  setDetailDialogOpen(false);
                }}
                startIcon={<CheckCircleIcon />}
              >
                Mark as Read
              </Button>
            )}
            <Button 
              variant="contained" 
              onClick={() => setDetailDialogOpen(false)}
              startIcon={<CloseIcon />}
              sx={{
                bgcolor: '#2e7d32',
                '&:hover': { bgcolor: '#1b5e20' }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Snackbar */}
        <Snackbar
          open={!!alert.open && alert.severity === 'success'}
          autoHideDuration={4000}
          onClose={() => setAlert({ ...alert, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity="success" 
            onClose={() => setAlert({ ...alert, open: false })} 
            sx={{ width: '100%', borderRadius: 2 }}
            icon={<CheckCircleIcon />}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default NotificationPanel;
