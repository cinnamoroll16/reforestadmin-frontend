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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/Warning';

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
// UPDATED: IMPROVED HELPER FUNCTIONS FOR DATA FETCHING
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
    
    console.log(`🔍 Fetching user data for ID: ${userId}`);
    
    let userData = {};
    try {
      if (apiService.getUser && typeof apiService.getUser === 'function') {
        userData = await apiService.getUser(userId);
        console.log(`✅ User data fetched:`, userData);
      }
    } catch (error) {
      console.log('⚠️ User API not available or user not found');
    }
    
    // Extract name from various possible fields
    const extractedName = 
      userData.fullName || 
      userData.name || 
      userData.displayName || 
      userData.firstName || 
      userData.user_firstname ||
      (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : null) ||
      'Unknown User';
    
    // Extract email from various possible fields
    const extractedEmail = 
      userData.email || 
      userData.user_email || 
      'N/A';
    
    return {
      fullName: extractedName,
      email: extractedEmail
    };
  } catch (error) {
    console.error('Error in fetchUserData:', error);
    return { fullName: 'Unknown User', email: 'N/A' };
  }
};

// =============================================================================
// UPDATED: MAIN DATA FETCHING FUNCTION WITH PLANTING REQUEST DATA
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
    
    // NEW: Function to fetch planting request data (same as in DonePlantingDetails)
    const fetchPlantingRequestForNotification = async (notification) => {
      try {
        const requestId = notification.requestId || notification.data?.requestId;
        if (!requestId) return null;
        
        // Extract ID from reference path
        const extractId = (ref) => {
          if (!ref) return null;
          const refStr = typeof ref === 'string' ? ref : 
                        ref?.id ? ref.id : 
                        ref?.path ? ref.path : 
                        JSON.stringify(ref);
          const parts = refStr.split('/');
          return parts.length > 1 ? parts.pop() : refStr;
        };
        
        const requestIdClean = extractId(requestId);
        if (!requestIdClean) return null;
        
        // Try to get all planting requests and find by ID
        const allRequests = await apiService.getPlantingRequests();
        if (Array.isArray(allRequests)) {
          const foundRequest = allRequests.find(req => 
            req.id === requestIdClean || 
            req._id === requestIdClean || 
            req.requestId === requestIdClean
          );
          return foundRequest;
        }
        
        return null;
      } catch (error) {
        console.log('Error fetching planting request:', error);
        return null;
      }
    };
    
    // UPDATED: Transform notifications with consistent name logic
    const transformedNotifications = await Promise.all(
      uniqueNotifications.map(async (notification) => {
        const id = notification.notificationId || notification.id || notification._id;
        const type = notification.type || notification.notification_type;
        
        let finalName = 'Unknown User';
        let finalEmail = 'N/A';
        
        // FOR DONE_PLANTING NOTIFICATIONS: Use the same logic as DonePlantingDetails
        if (type === 'done_planting') {
          // Step 1: Try to get planting request data
          const requestData = await fetchPlantingRequestForNotification(notification);
          
          if (requestData) {
            // Extract name from request data (same as DonePlantingDetails)
            const requestName = requestData.fullName || requestData.name || 
                               requestData.planterName || requestData.userName;
            if (requestName && requestName !== 'Unknown User') {
              finalName = requestName;
            }
            
            // Extract email from request data
            if (requestData.email) {
              finalEmail = requestData.email;
            }
            
            // If still no name, try to fetch user document
            if ((!finalName || finalName === 'Unknown User') && requestData.userRef) {
              const extractId = (ref) => {
                if (!ref) return null;
                const refStr = typeof ref === 'string' ? ref : 
                              ref?.id ? ref.id : 
                              ref?.path ? ref.path : 
                              JSON.stringify(ref);
                const parts = refStr.split('/');
                return parts.length > 1 ? parts.pop() : refStr;
              };
              
              const userId = extractId(requestData.userRef);
              if (userId) {
                try {
                  const userData = await apiService.getUser(userId);
                  if (userData && userData.fullName) {
                    finalName = userData.fullName;
                  }
                  if (userData && userData.email) {
                    finalEmail = userData.email;
                  }
                } catch (userError) {
                  console.log('Error fetching user:', userError);
                }
              }
            }
          }
        }
        
        // FOR REQUEST_SUBMITTED NOTIFICATIONS: Get name from notification or user data
        if (type === 'request_submitted') {
          const userId = notification.userId || notification.data?.userId;
          const userData = await fetchUserData(userId);
          
          // Try notification data first
          const notificationName = 
            notification.fullName || 
            notification.data?.fullName || 
            notification.planterName ||
            notification.data?.planterName;
            
          if (notificationName && notificationName !== 'Unknown User') {
            finalName = notificationName;
          } else if (userData.fullName && userData.fullName !== 'Unknown User') {
            finalName = userData.fullName;
          }
          
          finalEmail = userData.email;
        }
        
        // Fallback for both types: extract from email
        if (finalName === 'Unknown User' && finalEmail && finalEmail !== 'N/A') {
          const emailName = finalEmail.split('@')[0];
          finalName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
        
        console.log(`✅ Notification ${id} - Name: ${finalName}, Email: ${finalEmail}`);
        
        // Common properties for both types
        const baseNotification = {
          id: id || `temp-${Date.now()}-${Math.random()}`,
          notificationId: notification.notificationId || notification.id || id,
          type: type,
          title: notification.title || (type === 'request_submitted' ? 'Planting Request' : 'Planting Completed'),
          message: notification.message || notification.notif_message || '',
          fullName: finalName, // NOW USING SAME LOGIC AS DETAILS VIEW
          userEmail: finalEmail,
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

 // =============================================================================
// REVISED COMPONENT: DonePlantingDetails
// =============================================================================

const DonePlantingDetails = ({ item }) => {
  const [planterDetails, setPlanterDetails] = useState(null);
  const [seedlingRefs, setSeedlingRefs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [debugLog, setDebugLog] = useState([]);

  // Helper to log to both console and UI for debugging
  const addLog = (msg) => {
    console.log(`🔍 ${msg}`);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Helper to clean IDs from paths
  const extractDocumentId = (ref) => {
    if (!ref) return null;
    
    // Handle both string refs and object refs
    const refStr = typeof ref === 'string' ? ref : 
                  ref?.id ? ref.id : 
                  ref?.path ? ref.path : 
                  JSON.stringify(ref);
    
    // Extract ID from path
    const parts = refStr.split('/');
    return parts.length > 1 ? parts.pop() : refStr;
  };

  // ---------------------------------------------------------------------------
  // UPDATED: DOCUMENT FETCHER THAT USES AVAILABLE API METHODS
  // ---------------------------------------------------------------------------
  const fetchDocument = async (collectionName, docId, context = '') => {
    if (!docId) {
      addLog(`${context}: No document ID provided`);
      return null;
    }
    
    addLog(`${context}: Fetching ${collectionName}/${docId}`);
    
    try {
      // Map collection names to available API methods
      const methodMap = {
        'plantingrequests': 'getPlantingRequest',
        'planting_requests': 'getPlantingRequest',
        'requests': 'getPlantingRequest',
        'plantingrecords': 'getPlantingRecord',
        'planting_records': 'getPlantingRecord',
        'records': 'getPlantingRecord',
        'plantingtasks': 'getPlantingTask',
        'users': 'getUser',
        'notifications': 'getNotification'
      };
      
      const methodName = methodMap[collectionName];
      
      if (methodName && typeof apiService[methodName] === 'function') {
        try {
          // Special handling for planting records since we don't have a direct method
          if (collectionName.includes('plantingrecord')) {
            // Try to get all planting records and filter
            const allRecords = await apiService.getPlantingRecords();
            if (Array.isArray(allRecords)) {
              const foundRecord = allRecords.find(record => record.id === docId || record._id === docId);
              if (foundRecord) {
                addLog(`${context}: Found in planting records array`);
                return foundRecord;
              }
            }
          }
          
          // Try the direct method
          const result = await apiService[methodName](docId);
          if (result) {
            addLog(`${context}: Success via ${methodName}()`);
            return result;
          }
        } catch (error) {
          addLog(`${context}: ${methodName}() failed: ${error.message}`);
        }
      }
      
      // Fallback: Try to get all documents and find by ID
      addLog(`${context}: Trying fallback - fetching all ${collectionName}`);
      
      const allItems = await apiService.getNotifications(); // Default fallback
      if (Array.isArray(allItems)) {
        const foundItem = allItems.find(item => 
          item.id === docId || 
          item._id === docId || 
          item.notificationId === docId
        );
        if (foundItem) {
          addLog(`${context}: Found in notifications array`);
          return foundItem;
        }
      }
      
      // Last resort: Check if item data is already in the notification
      if (item.rawNotification && item.rawNotification.data) {
        addLog(`${context}: Checking notification data`);
        return item.rawNotification.data;
      }
      
      addLog(`${context}: Document not found via any method`);
      return null;
      
    } catch (error) {
      addLog(`${context}: Fetch error: ${error.message}`);
      return null;
    }
  };

  // Helper to find seedling reference in a planting record
  const findSeedlingRef = (recordData) => {
    if (!recordData) return 'Not specified in record';
    
    // Check for seedling reference in various possible field names
    const possibleFields = [
      'seedlingRef', 'seedling_id', 'seedlingId', 'seedlingName',
      'seedling_ref', 'seedling', 'seedling_name', 'seedlingRefId',
      'seedlingReference', 'assignedSeedling', 'selectedSeedling'
    ];
    
    for (const field of possibleFields) {
      if (recordData[field]) {
        return recordData[field];
      }
    }
    
    // Check if there's a seedling object
    if (recordData.seedling && typeof recordData.seedling === 'object') {
      return recordData.seedling.name || recordData.seedling.id || JSON.stringify(recordData.seedling);
    }
    
    // Check nested data
    if (recordData.data && typeof recordData.data === 'object') {
      for (const field of possibleFields) {
        if (recordData.data[field]) {
          return recordData.data[field];
        }
      }
    }
    
    // Log available fields for debugging
    const availableFields = Object.keys(recordData).join(', ');
    addLog(`No seedling ref found. Available fields: ${availableFields}`);
    
    return 'Not specified in record';
  };

  // NEW: Function to get planting request data
  const fetchPlantingRequest = async (requestId) => {
    if (!requestId) return null;
    
    try {
      // First try to get all planting requests
      const allRequests = await apiService.getPlantingRequests();
      if (Array.isArray(allRequests)) {
        const foundRequest = allRequests.find(req => 
          req.id === requestId || 
          req._id === requestId || 
          req.requestId === requestId
        );
        if (foundRequest) return foundRequest;
      }
      
      // Try using the update method (sometimes GET endpoints are nested)
      try {
        const request = await apiService.updatePlantingRequest(requestId, {});
        if (request && request.id) return request;
      } catch (updateError) {
        // This is expected to fail, just continue
      }
      
      return null;
    } catch (error) {
      addLog(`Error fetching planting request: ${error.message}`);
      return null;
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingDetails(true);
      setDebugLog([`Starting fetch for ${item.id || 'unknown'}`]);
      
      try {
        // =====================================================================
        // 1. FETCH PLANTER DETAILS FROM REQUEST
        // =====================================================================
        let requestData = null;
        const requestId = extractDocumentId(item.requestId || item.rawNotification?.data?.requestId);
        
        if (requestId) {
          addLog(`Fetching request data with ID: ${requestId}`);
          
          // Use the new fetchPlantingRequest function
          requestData = await fetchPlantingRequest(requestId);
          
          if (!requestData) {
            addLog('Could not find request data in any collection');
          }
        } else {
          addLog('No request ID available');
        }
        
        // Determine name and email
        let finalName = item.fullName;
        let finalEmail = item.userEmail;
        let source = 'Notification Data';
        
        if (requestData) {
          source = 'Request Document';
          
          // Extract name from request data
          const requestName = requestData.fullName || requestData.name || 
                            requestData.planterName || requestData.userName;
          if (requestName && requestName !== 'Unknown User') {
            finalName = requestName;
          }
          
          // Extract email from request data
          if (requestData.email) {
            finalEmail = requestData.email;
          }
          
          // If still no name, try to fetch user document
          if ((!finalName || finalName === 'Unknown User') && requestData.userRef) {
            const userId = extractDocumentId(requestData.userRef);
            if (userId) {
              addLog(`Fetching user data from userRef: ${userId}`);
              try {
                const userData = await apiService.getUser(userId);
                if (userData && userData.fullName) {
                  finalName = userData.fullName;
                  source = 'Linked User Document';
                }
              } catch (userError) {
                addLog(`Error fetching user: ${userError.message}`);
              }
            }
          }
        }
        
        setPlanterDetails({
          fullName: finalName || 'Unknown User',
          email: finalEmail || 'N/A',
          source: source,
          requestId: requestId
        });
        
        // =====================================================================
        // 2. FETCH PLANTING RECORDS
        // =====================================================================
        const recordRefs = item.plantingRecordRefs || 
                          item.rawNotification?.data?.plantingRecordRefs || 
                          [];
        
        addLog(`Found ${recordRefs.length} planting record references`);
        
        if (recordRefs.length > 0) {
          const records = [];
          
          for (let i = 0; i < recordRefs.length; i++) {
            const ref = recordRefs[i];
            const recordId = extractDocumentId(ref);
            
            addLog(`Processing record ${i + 1}: ${recordId}`);
            
            if (!recordId) {
              records.push({
                id: 'Invalid ID',
                seedlingRef: 'Invalid reference format',
                error: true,
                rawRef: ref
              });
              continue;
            }
            
            // Try to get planting records
            let recordData = null;
            
            try {
              // Get all planting records and find by ID
              const allRecords = await apiService.getPlantingRecords();
              if (Array.isArray(allRecords)) {
                recordData = allRecords.find(record => 
                  record.id === recordId || 
                  record._id === recordId
                );
              }
              
              if (recordData) {
                // Found the record, extract seedling reference
                const seedlingRef = findSeedlingRef(recordData);
                records.push({
                  id: recordId,
                  seedlingRef: seedlingRef,
                  found: true,
                  data: recordData
                });
                
                addLog(`Record ${i + 1} found, seedling: ${seedlingRef}`);
              } else {
                // Record not found
                records.push({
                  id: recordId,
                  seedlingRef: 'Record not found in database',
                  error: true,
                  found: false
                });
                
                addLog(`Record ${i + 1} NOT FOUND in database`);
              }
            } catch (error) {
              addLog(`Error fetching record ${i + 1}: ${error.message}`);
              records.push({
                id: recordId,
                seedlingRef: 'Error fetching record',
                error: true,
                found: false
              });
            }
          }
          
          setSeedlingRefs(records);
        } else {
          addLog('No planting record references found in notification');
        }
        
      } catch (error) {
        console.error('Error in fetchDetails:', error);
        addLog(`Error: ${error.message}`);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    if (item && detailDialogOpen) {
      fetchDetails();
    }
  }, [item, detailDialogOpen]);

  return (
    <Stack spacing={3}>
      {/* ---------------- PLANTER INFO ---------------- */}
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
                <CircularProgress size={16} />
              ) : (
                <Box>
                  <Typography variant="body1" fontWeight="600" sx={{ 
                    color: planterDetails?.fullName === 'Unknown User' ? 'error.main' : 'text.primary' 
                  }}>
                    {planterDetails?.fullName || 'Unknown User'}
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Email
              </Typography>
              <Typography variant="body2">
                {planterDetails?.email || item.userEmail || 'N/A'}
              </Typography>
            </Box>
          </Stack>
        </Card>
      </Box>

      {/* ---------------- COMPLETION DETAILS ---------------- */}
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
                  Completion Date 
                </Box>
              </Typography>
              <Typography variant="body1" fontWeight="600">
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
            
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Location
              </Typography>
              <Typography variant="body1" fontWeight="600">
                {item.location || 'Unknown Location'}
              </Typography>
            </Box>

            {/* NEW: Seedling Planted Section */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Seedling Planted
                {seedlingRefs.length > 0 && (
                  <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                    • {seedlingRefs.filter(r => r.found && !r.error).length} seedling references found
                  </Typography>
                )}
              </Typography>
              
              {loadingDetails ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">
                    Loading seedling details...
                  </Typography>
                </Box>
              ) : seedlingRefs.length > 0 ? (
                <Stack spacing={1}>
                  {seedlingRefs.map((rec, idx) => (
                    <Paper 
                      key={idx} 
                      variant="outlined" 
                      sx={{ 
                        p: 1.5, 
                        bgcolor: rec.error ? 'rgba(244, 67, 54, 0.05)' : 
                              rec.found ? 'rgba(46, 125, 50, 0.05)' : 'rgba(255, 152, 0, 0.05)',
                        borderColor: rec.error ? 'error.light' :
                                  rec.found ? 'success.light' : 'warning.light'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <FiberManualRecordIcon sx={{ 
                          fontSize: 10, 
                          color: rec.error ? 'error.main' :
                                rec.found ? 'success.main' : 'warning.main',
                          mt: 0.75 
                        }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Record {idx + 1}
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                            ID: {rec.id}
                          </Typography>
                          
                          {rec.rawRef && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Path: {rec.rawRef}
                            </Typography>
                          )}
                          
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            p: 0.5,
                            bgcolor: rec.error ? 'rgba(244, 67, 54, 0.1)' :
                                    rec.found ? 'rgba(46, 125, 50, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                            borderRadius: 0.5,
                            mt: 0.5
                          }}>
                            {rec.error ? (
                              <CancelIcon sx={{ fontSize: 12, color: 'error.main' }} />
                            ) : rec.found ? (
                              <CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                            ) : (
                              <WarningIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                            )}
                            <Typography variant="body2" fontWeight="600" color={
                              rec.error ? 'error.main' :
                              rec.found ? 'success.main' : 'warning.main'
                            }>
                              {rec.seedlingRef}
                            </Typography>
                          </Box>
                          
                          {rec.data && !rec.error && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              Found in planting records
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1.5, textAlign: 'center' }}>
                  No seedling information available
                </Typography>
              )}
            </Box>
          </Stack>
        </Card>
      </Box>
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
