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
          title: notification.title || (type === 'request_submitted' ? 'Planting Request' : 'Planting Completed'),
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

  const NotificationRow = ({ item }) => {
  // Helper function to get the appropriate message with more context
  const getNotificationMessage = (type, fullName, location, additionalData) => {
    const planterName = fullName || 'Planter';
    const locationName = location || 'this site';
    
    switch(type) {
      case 'request_submitted':
        return `${planterName} wants to request a planting tree on ${locationName}`;
      case 'done_planting':
        return `${planterName} has completed planting at ${locationName}`;
      case 'assigned_seedlings':
        const seedlingName = additionalData?.seedlingName || 'seedlings';
        return `${planterName} has been assigned ${seedlingName} for planting at ${locationName}`;
      case 'request_approved':
        return `${planterName}'s planting request has been approved for ${locationName}`;
      case 'request_rejected':
        return `${planterName}'s planting request has been rejected for ${locationName}`;
      case 'planting_scheduled':
        return `Planting has been scheduled for ${planterName} at ${locationName}`;
      case 'planting_completed':
        return `Planting completed successfully at ${locationName}`;
      case 'task_assigned':
        return `${planterName} has been assigned a task at ${locationName}`;
      default:
        return `${planterName} completed an action at ${locationName}`;
    }
  };

  return (
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
            {getNotificationMessage(
              item.type, 
              item.fullName, 
              item.location,
              item.additionalData || item.data
            )}
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
};

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

  // Component for Done Planting Details with enhanced data fetching
const DonePlantingDetails = ({ item }) => {
  const [planterDetails, setPlanterDetails] = useState(null);
  const [seedlingRefs, setSeedlingRefs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Helper function to extract document ID from a reference path
  const extractDocumentId = (ref) => {
    if (!ref) return null;
    
    // If it's a path like "collectionName/documentId", extract the documentId
    if (ref.includes('/')) {
      return ref.split('/').pop();
    }
    
    // If it's already just an ID, return it
    return ref;
  };

  // Fetch planter details and seedling references when component mounts
  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingDetails(true);
      setFetchError(null);
      
      try {
        console.log('🔍 Fetching details for done_planting notification:', {
          itemId: item.id,
          requestId: item.requestId,
          plantingRecordRefs: item.plantingRecordRefs,
          userId: item.userId
        });

        // 1. Fetch planter details - try multiple approaches
        let planterName = 'Unknown User';
        let planterEmail = 'N/A';
        
        // Approach 1: Try to fetch from plantingrequests collection using requestId
        if (item.requestId) {
          try {
            console.log('📋 Attempting to fetch planting request with ID:', item.requestId);
            
            // Extract document ID from requestId if it's a path
            const requestDocId = extractDocumentId(item.requestId);
            console.log('📋 Extracted request document ID:', requestDocId);
            
            // Try different API methods
            let plantingRequest = null;
            
            if (apiService.getPlantingRequest) {
              plantingRequest = await apiService.getPlantingRequest(requestDocId);
            } else if (apiService.getDocumentById && apiService.collections?.plantingrequests) {
              // Alternative approach if API service has generic method
              plantingRequest = await apiService.getDocumentById('plantingrequests', requestDocId);
            } else if (apiService.getDocument) {
              // Try generic getDocument method
              plantingRequest = await apiService.getDocument('plantingrequests', requestDocId);
            }
            
            if (plantingRequest) {
              console.log('✅ Found planting request:', plantingRequest);
              planterName = plantingRequest.fullName || plantingRequest.planterName || plantingRequest.name || planterName;
              
              // Try to get user email
              if (plantingRequest.userRef) {
                const userData = await fetchUserData(plantingRequest.userRef);
                planterEmail = userData.email || planterEmail;
              } else if (plantingRequest.userId) {
                const userData = await fetchUserData(plantingRequest.userId);
                planterEmail = userData.email || planterEmail;
              } else if (plantingRequest.email) {
                planterEmail = plantingRequest.email;
              }
            } else {
              console.warn('⚠️ No planting request found for ID:', requestDocId);
            }
          } catch (error) {
            console.warn('⚠️ Could not fetch planting request:', error.message);
          }
        }
        
        // Approach 2: If no requestId or couldn't fetch, try to get name from notification data
        if (planterName === 'Unknown User' && item.fullName) {
          planterName = item.fullName;
          console.log('📋 Using name from notification:', planterName);
        }
        
        // Approach 3: Try to get email from user data if we have userId
        if (planterEmail === 'N/A' && item.userId) {
          try {
            const userData = await fetchUserData(item.userId);
            planterEmail = userData.email || planterEmail;
            console.log('📋 Using email from user data:', planterEmail);
          } catch (error) {
            console.warn('⚠️ Could not fetch user data for email:', error.message);
          }
        }

        setPlanterDetails({
          fullName: planterName,
          email: planterEmail,
          source: item.requestId ? 'plantingrequests collection' : 'notification data'
        });

        // 2. Fetch seedling references from plantingrecord collection
        const seedlingRefsData = [];
        if (item.plantingRecordRefs && item.plantingRecordRefs.length > 0) {
          console.log(`🌱 Fetching seedling refs from ${item.plantingRecordRefs.length} planting records`);
          
          // Fetch each planting record and extract seedlingRef
          const promises = item.plantingRecordRefs.map(async (recordRef, index) => {
            try {
              console.log(`🔍 Fetching planting record ${index + 1}:`, recordRef);
              
              // Extract document ID from reference
              const recordId = extractDocumentId(recordRef);
              console.log(`🔍 Extracted record ID:`, recordId);
              
              let plantingRecord = null;
              
              // Try different API methods in order
              if (apiService.getPlantingRecord) {
                plantingRecord = await apiService.getPlantingRecord(recordId);
              } else if (apiService.getDocumentById && apiService.collections?.plantingrecords) {
                plantingRecord = await apiService.getDocumentById('plantingrecords', recordId);
              } else if (apiService.getDocument) {
                plantingRecord = await apiService.getDocument('plantingrecords', recordId);
              } else if (apiService.fetchDocument) {
                plantingRecord = await apiService.fetchDocument('plantingrecords', recordId);
              }
              
              if (plantingRecord) {
                console.log(`✅ Found planting record ${index + 1}:`, plantingRecord);
                
                // Try different property names for seedlingRef - check the actual document structure
                const seedlingRef = plantingRecord.seedlingRef || 
                                   plantingRecord.seedling_id || 
                                   plantingRecord.seedlingId ||
                                   plantingRecord.seedlingReference ||
                                   plantingRecord.seedling ||
                                   plantingRecord.seedlingName;
                
                if (seedlingRef) {
                  console.log(`✅ Found seedling ref:`, seedlingRef);
                  return {
                    recordId: recordRef,
                    seedlingRef: seedlingRef,
                    recordData: plantingRecord
                  };
                } else {
                  console.warn(`⚠️ No seedlingRef found in planting record ${recordRef}`);
                  console.warn(`⚠️ Available properties in planting record:`, Object.keys(plantingRecord));
                  
                  // Return partial info even if no seedlingRef found
                  return {
                    recordId: recordRef,
                    seedlingRef: 'Not specified in record',
                    recordData: plantingRecord,
                    availableProperties: Object.keys(plantingRecord)
                  };
                }
              } else {
                console.warn(`⚠️ Could not fetch planting record ${recordId} - record may not exist`);
              }
            } catch (error) {
              console.warn(`⚠️ Error fetching planting record ${recordRef}:`, error.message);
              console.warn(`⚠️ Error details:`, error);
              
              // Return error info
              return {
                recordId: recordRef,
                seedlingRef: `Error: ${error.message}`,
                error: true,
                errorDetails: error.message
              };
            }
            return null;
          });

          const results = await Promise.all(promises);
          const validResults = results.filter(item => item !== null);
          
          console.log(`✅ Found ${validResults.length} valid seedling refs out of ${results.length}`);
          console.log(`📊 Seedling refs details:`, validResults);
          setSeedlingRefs(validResults);
        }

      } catch (error) {
        console.error('❌ Error fetching details:', error);
        setFetchError(error.message);
      } finally {
        setLoadingDetails(false);
      }
    };

    if (detailDialogOpen && item.type === 'done_planting') {
      fetchDetails();
    }
  }, [detailDialogOpen, item]);

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
              {loadingDetails ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Fetching from database...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="body1" fontWeight="600">
                    {planterDetails?.fullName || item.fullName || 'Unknown User'}
                  </Typography>
                  {planterDetails?.source && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                      (Source: {planterDetails.source})
                    </Typography>
                  )}
                </>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Email
              </Typography>
              {loadingDetails ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Fetching...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="body2">
                    {planterDetails?.email || item.userEmail || 'No email'}
                  </Typography>
                  {fetchError && (
                    <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                      Error: {fetchError}
                    </Typography>
                  )}
                </>
              )}
            </Box>
            
            {/* Debug Information */}
            <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1, border: '1px dashed grey.300' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                <strong>Debug Info:</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Request ID: {item.requestId || 'Not available'}<br />
                User ID: {item.userId || 'Not available'}<br />
                Has name in notification: {!!item.fullName ? 'Yes' : 'No'}<br />
                Planting Record Refs: {item.plantingRecordRefs?.length || 0}
              </Typography>
            </Box>
          </Stack>
        </Card>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
          <ForestIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5, color: 'success.main' }} />
          Planting Completion Details
        </Typography>
        <Card variant="outlined" sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)' }}>
          <Stack spacing={2}>
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

      {/* References Section */}
      {(item.taskRef || item.plantingRecordRefs?.length > 0) && (
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            <AssignmentIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5, color: 'info.main' }} />
            References
          </Typography>
          <Card variant="outlined" sx={{ p: 2, bgcolor: 'rgba(2, 136, 209, 0.05)' }}>
            <Stack spacing={2}>
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
                    {seedlingRefs.length > 0 && (
                      <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                        • {seedlingRefs.length} seedling references found
                      </Typography>
                    )}
                  </Typography>
                  
                  <Box sx={{ maxHeight: 200, overflowY: 'auto', mt: 1.5 }}>
                    {loadingDetails ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">
                          Loading seedling references...
                        </Typography>
                      </Box>
                    ) : (
                      <Stack spacing={1}>
                        {item.plantingRecordRefs.map((ref, index) => {
                          const seedlingInfo = seedlingRefs.find(s => s.recordId === ref);
                          return (
                            <Paper 
                              key={index} 
                              variant="outlined" 
                              sx={{ 
                                p: 1.5, 
                                bgcolor: seedlingInfo?.error ? 'rgba(244, 67, 54, 0.05)' : 
                                       seedlingInfo?.seedlingRef !== 'Not specified in record' ? 'rgba(46, 125, 50, 0.05)' : 'background.paper',
                                borderColor: seedlingInfo?.error ? 'error.light' :
                                           seedlingInfo?.seedlingRef !== 'Not specified in record' ? 'success.light' : 'divider'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <FiberManualRecordIcon sx={{ 
                                  fontSize: 10, 
                                  color: seedlingInfo?.error ? 'error.main' :
                                         seedlingInfo?.seedlingRef !== 'Not specified in record' ? 'success.main' : 'text.secondary',
                                  mt: 0.75 
                                }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Record {index + 1}
                                  </Typography>
                                  <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                                    ID: {extractDocumentId(ref)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    Full path: {ref}
                                  </Typography>
                                  
                                  {seedlingInfo ? (
                                    <>
                                      {seedlingInfo.error ? (
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 0.5,
                                          p: 0.5,
                                          bgcolor: 'rgba(244, 67, 54, 0.1)',
                                          borderRadius: 0.5,
                                          mt: 0.5
                                        }}>
                                          <CancelIcon sx={{ fontSize: 12, color: 'error.main' }} />
                                          <Typography variant="caption" color="error.main" fontWeight="600">
                                            Error: {seedlingInfo.seedlingRef}
                                          </Typography>
                                        </Box>
                                      ) : seedlingInfo.seedlingRef !== 'Not specified in record' ? (
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 0.5,
                                          p: 0.5,
                                          bgcolor: 'rgba(46, 125, 50, 0.1)',
                                          borderRadius: 0.5,
                                          mt: 0.5
                                        }}>
                                          <ForestIcon sx={{ fontSize: 12, color: 'success.main' }} />
                                          <Typography variant="caption" color="success.main" fontWeight="600">
                                            Seedling Ref: {seedlingInfo.seedlingRef}
                                          </Typography>
                                        </Box>
                                      ) : (
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 0.5,
                                          p: 0.5,
                                          bgcolor: 'rgba(255, 152, 0, 0.1)',
                                          borderRadius: 0.5,
                                          mt: 0.5
                                        }}>
                                          <Typography variant="caption" color="warning.main" fontWeight="600">
                                            ⚠️ {seedlingInfo.seedlingRef}
                                          </Typography>
                                          {seedlingInfo.availableProperties && (
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                              Available fields: {seedlingInfo.availableProperties.join(', ')}
                                            </Typography>
                                          )}
                                        </Box>
                                      )}
                                    </>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                      Loading or record not accessible
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                  
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid info.100' }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>How it works:</strong><br />
                      1. Extracts ID from path (e.g., "tyOUeO6uIFNOqClCCPko" from "plantingrecords/tyOUeO6uIFNOqClCCPko")<br />
                      2. Fetches planting record document using the extracted ID<br />
                      3. Looks for seedling reference in the record (searches for: seedlingRef, seedling_id, seedlingId, etc.)
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>
          </Card>
        </Box>
      )}
    </Stack>
  );
};

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
      return <DonePlantingDetails item={item} />;
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
                View and manage planting requests and planting completions
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
