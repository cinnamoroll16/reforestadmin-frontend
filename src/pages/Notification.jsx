// src/pages/Notification.js - UPDATED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Alert, IconButton,
  Badge, useMediaQuery, useTheme, LinearProgress, alpha,
  Tabs, Tab, Snackbar, CircularProgress, Stack, Card
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
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const drawerWidth = 240;

// =============================================================================
// DATE FORMATTING FUNCTIONS
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

const formatDisplayDateTimeCorrect = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  try {
    if (typeof dateInput === 'string' && dateInput.includes(' at ')) {
      const parts = dateInput.split(' UTC+8')[0].split(' at ');
      if (parts.length === 2) {
        const datePart = parts[0];
        const timePart = parts[1].replace(' ', ' ');
        return `${datePart} at ${timePart}`;
      }
    }
    
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
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }
    
    return String(dateInput);
  } catch (error) {
    console.error('Error formatting display date with time:', error, dateInput);
    return 'Invalid Date';
  }
};

const extractDateTimeFromUTC8 = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return 'N/A';
  
  try {
    const cleanString = dateString.replace(' ', ' ');
    const withoutTZ = cleanString.split(' UTC+8')[0];
    return withoutTZ;
  } catch (error) {
    console.error('Error extracting date time:', error);
    return dateString;
  }
};

// =============================================================================
// SORTING FUNCTIONS
// =============================================================================

const parseDateForSorting = (item) => {
  const timestamp = item.timestamp || item.created_at;
  if (!timestamp) return new Date(0);
  
  try {
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      return timestamp.toDate();
    }
    
    if (typeof timestamp === 'string') {
      const dateRegex = /(\w+ \d+, \d+) at (\d+):(\d+):(\d+) (AM|PM) UTC\+(\d+)/;
      const match = timestamp.match(dateRegex);
      
      if (match) {
        const [, datePart, hours, minutes, seconds, period, utcOffset] = match;
        
        let hour24 = parseInt(hours);
        if (period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
          hour24 = 0;
        }
        
        const parsedDate = new Date(datePart);
        parsedDate.setHours(hour24, parseInt(minutes), parseInt(seconds), 0);
        
        const offsetHours = parseInt(utcOffset);
        parsedDate.setHours(parsedDate.getHours() - offsetHours);
        
        return parsedDate;
      } else {
        const normalizedDateStr = timestamp.replace(' ', ' ');
        return new Date(normalizedDateStr);
      }
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000);
    }
    
    return new Date(timestamp);
  } catch (error) {
    console.error('Error parsing date for sorting:', error, timestamp);
    return new Date(0);
  }
};

const sortItemsByDate = (items) => {
  return [...items].sort((a, b) => {
    const dateA = parseDateForSorting(a);
    const dateB = parseDateForSorting(b);
    return dateB.getTime() - dateA.getTime();
  });
};

// =============================================================================
// HELPER FUNCTIONS FOR DATA FETCHING
// =============================================================================

const fetchUserData = async (userRef) => {
  try {
    if (!userRef) {
      return { fullName: 'Unknown User', email: 'N/A' };
    }
    
    let userId;
    if (userRef.includes('/')) {
      userId = userRef.split('/').pop();
    } else {
      userId = userRef;
    }
    
    let userData = {};
    try {
      if (apiService.getUser && typeof apiService.getUser === 'function') {
        userData = await apiService.getUser(userId);
      }
    } catch (error) {
      console.log('User API not available for email');
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

// =============================================================================
// UPDATED: MAIN DATA FETCHING FUNCTION USING NEW API SERVICE
// =============================================================================

const fetchNotifications = async () => {
  try {
    console.log('📡 Fetching notifications using enhanced API service...');
    
    // Try multiple approaches to get notifications
    let allNotifications = [];
    let requestSubmittedNotifications = [];
    let donePlantingNotifications = [];
    
    try {
      // Approach 1: Use the new type-specific methods
      console.log('🔍 Trying type-specific API methods...');
      
      // Fetch both types in parallel
      [requestSubmittedNotifications, donePlantingNotifications] = await Promise.all([
        apiService.getRequestSubmittedNotifications().catch(err => {
          console.warn('⚠️ Could not fetch request_submitted notifications:', err.message);
          return [];
        }),
        apiService.getDonePlantingNotifications().catch(err => {
          console.warn('⚠️ Could not fetch done_planting notifications:', err.message);
          return [];
        })
      ]);
      
      console.log(`✅ Type-specific results: request_submitted=${requestSubmittedNotifications.length}, done_planting=${donePlantingNotifications.length}`);
      
    } catch (typeError) {
      console.warn('⚠️ Type-specific methods failed, trying general API:', typeError.message);
      
      // Approach 2: Use general getNotifications and filter
      try {
        allNotifications = await apiService.getNotifications();
        console.log(`✅ General API returned ${allNotifications.length} notifications`);
        
        // Filter for our two types
        requestSubmittedNotifications = allNotifications.filter(n => n.type === 'request_submitted');
        donePlantingNotifications = allNotifications.filter(n => n.type === 'done_planting');
        
        console.log(`🔍 Filtered: request_submitted=${requestSubmittedNotifications.length}, done_planting=${donePlantingNotifications.length}`);
        
      } catch (generalError) {
        console.error('❌ General API also failed:', generalError);
        return [];
      }
    }
    
    // Combine notifications, removing duplicates
    const combinedMap = new Map();
    
    // Add request_submitted notifications
    requestSubmittedNotifications.forEach(notif => {
      const id = notif.id || notif.notificationId || `req-${Date.now()}-${Math.random()}`;
      combinedMap.set(id, notif);
    });
    
    // Add done_planting notifications
    donePlantingNotifications.forEach(notif => {
      const id = notif.id || notif.notificationId || `done-${Date.now()}-${Math.random()}`;
      combinedMap.set(id, notif);
    });
    
    const uniqueNotifications = Array.from(combinedMap.values());
    
    console.log(`✅ Total unique notifications: ${uniqueNotifications.length}`);
    console.log('🔍 Notification types:', uniqueNotifications.map(n => n.type));
    
    // Transform notifications to our UI format
    const transformedNotifications = await Promise.all(
      uniqueNotifications.map(async (notification) => {
        const id = notification.notificationId || notification.id || notification._id;
        const type = notification.type || notification.notification_type;
        
        const userData = await fetchUserData(notification.userId || notification.data?.userId);
        
        // Common properties for both types
        const baseNotification = {
          id: id || `temp-${Date.now()}-${Math.random()}`,
          notificationId: notification.notificationId || notification.id || id,
          type: type,
          title: notification.title || (type === 'request_submitted' ? 'Request Submitted' : 'Planting Completed'),
          message: notification.message || notification.notif_message || '',
          fullName: notification.fullName || userData.fullName || 'Unknown User',
          userEmail: userData.email,
          location: notification.location || notification.data?.location || notification.data?.location_address || '',
          location_address: notification.location || notification.data?.location_address || '',
          requestId: notification.requestId || notification.data?.requestId || '',
          userId: notification.userId || notification.data?.userId || '',
          status: notification.status || notification.data?.status || (type === 'done_planting' ? 'completed' : 'pending'),
          isRead: notification.isRead !== undefined ? notification.isRead : (notification.read !== undefined ? notification.read : false),
          read: notification.isRead !== undefined ? notification.isRead : (notification.read !== undefined ? notification.read : false),
          created_at: notification.created_at || notification.createdAt || notification.notif_timestamp,
          timestamp: notification.created_at || notification.createdAt || notification.notif_timestamp,
          isRealNotification: true,
          formatted_timestamp: formatDisplayDate(notification.created_at || notification.createdAt),
          formatted_timestamp_datetime: extractDateTimeFromUTC8(notification.created_at || notification.createdAt),
          rawNotification: notification
        };
        
        // Add type-specific properties
        if (type === 'request_submitted') {
          return {
            ...baseNotification,
            preferred_date: notification.preferred_date || notification.data?.preferred_date || '',
            formatted_preferred_date: formatDisplayDate(notification.preferred_date || notification.data?.preferred_date),
            formatted_preferred_datetime: extractDateTimeFromUTC8(notification.preferred_date || notification.data?.preferred_date),
            formatted_request_date: formatDisplayDate(notification.created_at || notification.createdAt),
            formatted_request_datetime: extractDateTimeFromUTC8(notification.created_at || notification.createdAt),
          };
        } else if (type === 'done_planting') {
          return {
            ...baseNotification,
            plantingRecordRefs: notification.plantingRecordRefs || notification.data?.plantingRecordRefs || [],
            taskRef: notification.taskRef || notification.data?.taskRef || '',
            formatted_planting_date: formatDisplayDate(notification.created_at || notification.createdAt),
            formatted_planting_datetime: extractDateTimeFromUTC8(notification.created_at || notification.createdAt),
          };
        }
        
        return baseNotification;
      })
    );
    
    console.log(`✅ Transformed ${transformedNotifications.length} notifications`);
    
    return transformedNotifications.filter(notification => notification.id);
  } catch (error) {
    console.error('❌ Fetch notifications failed:', error.message);
    console.error('Error stack:', error.stack);
    return [];
  }
};

// =============================================================================
// UPDATED: ENHANCED LOAD DATA FUNCTION WITH DEBUGGING
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
  const [debugInfo, setDebugInfo] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Data loading with enhanced debugging
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading notifications with enhanced API...');

      const startTime = Date.now();
      const notificationsData = await fetchNotifications();
      const loadTime = Date.now() - startTime;

      setNotifications(notificationsData);

      // Collect debug info
      const debugData = {
        loadTime: `${loadTime}ms`,
        totalNotifications: notificationsData.length,
        notificationTypes: notificationsData.reduce((acc, notif) => {
          acc[notif.type] = (acc[notif.type] || 0) + 1;
          return acc;
        }, {}),
        unreadCount: notificationsData.filter(n => !n.isRead).length,
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(debugData);
      
      console.log('📊 Debug Info:', debugData);
      console.log(`✅ Loaded ${notificationsData.length} notifications in ${loadTime}ms`);

      if (notificationsData.length > 0) {
        setAlert({
          open: true,
          message: `Loaded ${notificationsData.length} notifications successfully`,
          severity: 'success'
        });
      } else {
        setAlert({
          open: true,
          message: 'No notifications available. Make sure you have request_submitted or done_planting notifications in your system.',
          severity: 'info'
        });
      }

    } catch (error) {
      console.error('❌ Error in loadData:', error);
      setAlert({
        open: true,
        message: `Error loading notifications: ${error.message}`,
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
    
    // Mark as read if it's unread
    if (item.isRealNotification && !item.isRead) {
      handleMarkAsRead(item);
    }
  };

  const handleMarkAsRead = async (notification) => {
    if (!notification || !notification.isRealNotification) return;
    
    try {
      console.log(`📖 Marking notification ${notification.id} as read`);
      
      // Update local state immediately for better UX
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true, read: true } : n
      ));
      
      // Update via API - use the new markNotificationAsRead method
      const result = await apiService.markNotificationAsRead(notification.id, true);
      
      console.log(`✅ Marked notification ${notification.id} as read:`, result);
      
      // Show success message
      setAlert({
        open: true,
        message: 'Notification marked as read',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      
      // Revert local state on error
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, isRead: false, read: false } : n
      ));
      
      setAlert({
        open: true,
        message: 'Failed to mark notification as read',
        severity: 'error'
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setSaving(true);
      
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      if (unreadNotifications.length === 0) {
        setAlert({ 
          open: true, 
          message: 'No unread notifications to mark', 
          severity: 'info' 
        });
        return;
      }
      
      console.log(`📖 Marking ${unreadNotifications.length} notifications as read`);
      
      // Update all via API - use the new bulk method
      const notificationIds = unreadNotifications.map(n => n.id);
      const result = await apiService.bulkMarkNotificationsAsRead(notificationIds, true);
      
      console.log(`✅ Bulk mark result:`, result);
      
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

  const formatDateTime = (date) => {
    return formatDisplayDate(date);
  };

  const formatDateTimeDetail = (date) => {
    return formatDisplayDateTimeCorrect(date);
  };

  // Sort notifications by date
  const sortedNotifications = sortItemsByDate(notifications);

  // Calculate unread counts
  const unreadCount = sortedNotifications.filter(n => !n.isRead).length;
  const requestSubmittedCount = sortedNotifications.filter(n => n.type === 'request_submitted').length;
  const donePlantingCount = sortedNotifications.filter(n => n.type === 'done_planting').length;

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
        {!item.isRead && (
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
              color={getStatusColor(item.type === 'request_submitted' ? 'submitted' : item.type)}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
            {!item.isRead && (
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
              {formatDateTime(item.timestamp)}
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

  // Get current items based on active tab
  const getCurrentItems = () => {
    switch (activeTab) {
      case 0: return sortedNotifications;
      case 1: return sortedNotifications.filter(n => n.type === 'request_submitted');
      case 2: return sortedNotifications.filter(n => n.type === 'done_planting');
      default: return sortedNotifications;
    }
  };

  const currentItems = getCurrentItems();

  // Render details based on notification type
  const renderDetailsContent = (item) => {
    if (!item) return null;

    if (item.type === 'request_submitted') {
      return (
        <Stack spacing={3}>
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
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {item.userEmail || 'No email'}
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Box>

          <Box>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              <CalendarTodayIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
              Request Details
            </Typography>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>   
                
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Submission Date
                  </Typography>
                  <Typography variant="body1">
                    {item.formatted_request_date || formatDisplayDate(item.timestamp)}
                  </Typography>
                </Box>
                
                {item.preferred_date && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Preferred Planting Date
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {item.formatted_preferred_date || formatDisplayDate(item.preferred_date)}
                    </Typography>
                  </Box>
                )}
                
              </Stack>
            </Card>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              <LocationOnIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
              Planting Location
            </Typography>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body1" fontWeight="600">
                {item.location || 'Unknown Location'}
              </Typography>
            </Card>
          </Box>
        </Stack>
      );
    } else if (item.type === 'done_planting') {
      return (
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              <ForestIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5, color: 'success.main' }} />
              Planting Completed
            </Typography>
            <Card variant="outlined" sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)' }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Message
                  </Typography>
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body1">
                      {item.message}
                    </Typography>
                  </Paper>
                </Box>
                
                {/* Planter Information from Request */}
                <Box>
                  <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                    Planter Information
                  </Typography>
                  <Card variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Planter Name
                        </Typography>
                        {item.requestFullName ? (
                          <Typography variant="body1" fontWeight="600">
                            {item.requestFullName}
                          </Typography>
                        ) : item.requestId ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontStyle="italic" color="text.secondary">
                              Loading planter information...
                            </Typography>
                            <CircularProgress size={16} />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not available
                          </Typography>
                        )}
                      </Box>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Request ID
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {item.requestId || 'N/A'}
                        </Typography>
                      </Box>
                      
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

                {/* Planting Details */}
                <Box>
                  <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: 16 }} />
                    Planting Details
                  </Typography>
                  <Card variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTimeIcon sx={{ fontSize: 14 }} />
                            Completion Date & Time
                          </Box>
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {item.formatted_planting_datetime || extractDateTimeFromUTC8(item.timestamp)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Completion Date
                        </Typography>
                        <Typography variant="body1">
                          {item.formatted_planting_date || formatDisplayDate(item.timestamp)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Status
                        </Typography>
                        <Chip
                          label={item.status || 'completed'}
                          color="success"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Stack>
                  </Card>
                </Box>

                {/* Location */}
                <Box>
                  <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationOnIcon sx={{ fontSize: 16 }} />
                    Planting Location
                  </Typography>
                  <Card variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body1" fontWeight="600">
                      {item.location || 'Unknown Location'}
                    </Typography>
                  </Card>
                </Box>

                {/* References */}
                {(item.taskRef || item.plantingRecordRefs?.length > 0) && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AssignmentIcon sx={{ fontSize: 16 }} />
                      References
                    </Typography>
                    <Card variant="outlined" sx={{ p: 1.5 }}>
                      <Stack spacing={1}>
                        {item.taskRef && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Task Reference
                            </Typography>
                            <Typography variant="body2" fontFamily="monospace">
                              {item.taskRef}
                            </Typography>
                          </Box>
                        )}

                        {item.plantingRecordRefs && item.plantingRecordRefs.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Planting Record References ({item.plantingRecordRefs.length})
                            </Typography>
                            <Box sx={{ maxHeight: 100, overflowY: 'auto', mt: 0.5 }}>
                              {item.plantingRecordRefs.map((ref, index) => (
                                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <FiberManualRecordIcon sx={{ fontSize: 8, color: 'text.secondary' }} />
                                  <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem' }}>
                                    {ref}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    </Card>
                  </Box>
                )}
              </Stack>
            </Card>
          </Box>
        </Stack>
      );
    }

    return null;
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
                View and manage request submissions and planting completions
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <Button
                  startIcon={saving ? <CircularProgress size={20} /> : <MarkAsReadIcon />}
                  onClick={handleMarkAllAsRead}
                  variant="outlined"
                  color="primary"
                  disabled={saving}
                >
                  {saving ? 'Marking...' : `Mark All Read (${unreadCount})`}
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

        {/* Tabs */}
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
            <Tab
              icon={
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon sx={{ fontSize: 20 }} />
                </Badge>
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1 }}>
                    All Notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {sortedNotifications.length} total
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
            
            <Tab
              icon={
                <Badge badgeContent={sortedNotifications.filter(n => n.type === 'request_submitted' && !n.isRead).length} color="error">
                  <NewReleasesIcon sx={{ fontSize: 20 }} />
                </Badge>
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1 }}>
                    Planting Request 
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {requestSubmittedCount} items
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
            
            <Tab
              icon={
                <Badge badgeContent={sortedNotifications.filter(n => n.type === 'done_planting' && !n.isRead).length} color="error">
                  <ForestIcon sx={{ fontSize: 20 }} />
                </Badge>
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1 }}>
                    Planting Completed
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {donePlantingCount} items
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {currentItems.length === 0 ? (
          <EmptyState 
            icon={NotificationsIcon}
            title="No notifications available"
            description={activeTab === 0 ? "You don't have any request_submitted or done_planting notifications yet." :
                       activeTab === 1 ? "No request submissions found." :
                       "No planting completion notifications found."}
          />
        ) : (
          <Box>
            {currentItems.map((item, index) => (
              <NotificationRow key={`${item.id}-${index}`} item={item} />
            ))}
          </Box>
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
                {selectedItem?.type === 'request_submitted' ? 'Planting Request Details' : 
                 selectedItem?.type === 'done_planting' ? 'Planting Completed Details' : 
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
            {selectedItem && !selectedItem.isRead && (
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
