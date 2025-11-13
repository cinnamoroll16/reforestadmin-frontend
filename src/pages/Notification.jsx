// src/pages/Notification.js - DEBUGGED VERSION
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Alert, IconButton,
  Badge, useMediaQuery, useTheme, LinearProgress, alpha,
  Tabs, Tab, Snackbar, CircularProgress, Stack, Card
} from '@mui/material';
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

const drawerWidth = 240;

// =============================================================================
// DATE FORMATTING FUNCTIONS (UNCHANGED)
// =============================================================================

const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  try {
    let dateObj;
    
    if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
      dateObj = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      dateObj = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
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

const formatDisplayDateTime = (timestampInput) => {
  if (!timestampInput) return 'N/A';
  
  try {
    let dateObj;
    
    if (timestampInput && typeof timestampInput === 'object' && timestampInput.toDate) {
      dateObj = timestampInput.toDate();
    } else if (typeof timestampInput === 'string') {
      dateObj = new Date(timestampInput);
    } else if (timestampInput instanceof Date) {
      dateObj = timestampInput;
    } else {
      return String(timestampInput);
    }
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return String(timestampInput);
  } catch (error) {
    console.error('Error formatting display datetime:', error);
    return 'Invalid Date';
  }
};

// =============================================================================
// DEBUGGED DATA FETCHING FUNCTIONS
// =============================================================================

// DEBUGGED: Fixed fetchNotifications with better response handling
const fetchNotifications = async () => {
  try {
    console.log('🔔 Fetching notifications via API...');
    
    let response;
    try {
      response = await apiService.getNotifications();
      console.log('🔍 Notifications API raw response:', response);
    } catch (apiError) {
      console.error('❌ API call failed:', apiError);
      return [];
    }
    
    // DEBUG: Log the exact response structure
    console.log('🔍 Response structure analysis:', {
      type: typeof response,
      isArray: Array.isArray(response),
      keys: response ? Object.keys(response) : 'no response',
      hasNotifications: response && 'notifications' in response,
      hasData: response && 'data' in response,
      success: response && response.success
    });
    
    let notifications = [];
    
    // Handle ALL possible response structures
    if (Array.isArray(response)) {
      // Structure: [...]
      console.log('✅ Using direct array response');
      notifications = response;
    } else if (response && response.success && Array.isArray(response.notifications)) {
      // Structure: { success: true, notifications: [...] }
      console.log('✅ Using response.notifications array');
      notifications = response.notifications;
    } else if (response && Array.isArray(response.notifications)) {
      // Structure: { notifications: [...] }
      console.log('✅ Using response.notifications array (without success flag)');
      notifications = response.notifications;
    } else if (response && response.success && Array.isArray(response.data)) {
      // Structure: { success: true, data: [...] }
      console.log('✅ Using response.data array');
      notifications = response.data;
    } else if (response && Array.isArray(response.data)) {
      // Structure: { data: [...] }
      console.log('✅ Using response.data array (without success flag)');
      notifications = response.data;
    } else {
      console.warn('⚠️ Unexpected notifications response format, returning empty array:', response);
      return [];
    }
    
    console.log('✅ Raw notifications loaded:', notifications.length);
    
    if (notifications.length > 0) {
      console.log('📋 Sample raw notification:', notifications[0]);
      console.log('📋 Raw notification keys:', Object.keys(notifications[0]));
    }
    
    // Transform to match expected structure with fallbacks
    const transformedNotifications = notifications.map(notification => {
      // Extract ID from various possible fields
      const id = notification.notificationId || notification.id || notification._id;
      
      if (!id) {
        console.warn('⚠️ Notification missing ID:', notification);
      }
      
      return {
        id: id || `temp-${Date.now()}-${Math.random()}`,
        type: notification.type || 'general',
        title: notification.title || 'Notification',
        message: notification.message || notification.notif_message || 'No message',
        notif_message: notification.notif_message || notification.message || 'No message',
        
        // User information with fallbacks
        fullName: notification.fullName || notification.userName || notification.planterName || 'Unknown User',
        userEmail: notification.userEmail || notification.email,
        
        // Location information
        location: notification.location || notification.location_address || notification.locationName,
        location_address: notification.location_address || notification.location || notification.locationName,
        
        // Date fields
        preferred_date: notification.preferred_date,
        request_date: notification.request_date,
        
        // Reference fields
        requestId: notification.requestId,
        userId: notification.userId || notification.userRef,
        
        // Status fields
        status: notification.status || notification.request_status || 'unknown',
        request_status: notification.request_status || notification.status || 'unknown',
        
        // Read status
        isRead: notification.isRead || notification.read || false,
        read: notification.read || notification.isRead || false,
        
        // Timestamps
        created_at: notification.created_at || notification.notif_timestamp || notification.timestamp,
        timestamp: notification.timestamp || notification.created_at || notification.notif_timestamp,
        
        // Mark as real API notification
        isRealNotification: true
      };
    }).filter(notification => notification.id); // Filter out notifications without IDs
    
    console.log('✅ Transformed notifications:', transformedNotifications.length);
    
    if (transformedNotifications.length > 0) {
      console.log('📋 Sample transformed notification:', transformedNotifications[0]);
    }
    
    return transformedNotifications;
  } catch (error) {
    console.error('❌ Fetch notifications failed:', error.message);
    return [];
  }
};

// DEBUGGED: Fixed fetchPlantingRequests with proper error handling
const fetchPlantingRequests = async () => {
  try {
    console.log('🌱 Fetching planting requests...');
    let response;
    
    try {
      response = await apiService.getPlantingRequests();
      console.log('🔍 Planting requests raw response:', response);
    } catch (error) {
      console.error('❌ API call failed:', error);
      return [];
    }
    
    let requests = [];
    
    // Handle different response structures
    if (Array.isArray(response)) {
      requests = response;
    } else if (response && Array.isArray(response.data)) {
      requests = response.data;
    } else if (response && response.success && Array.isArray(response.data)) {
      requests = response.data;
    } else {
      console.warn('⚠️ Unexpected planting requests response format:', response);
      return [];
    }
    
    console.log('✅ Planting requests loaded:', requests.length);
    
    if (requests.length > 0) {
      console.log('📋 Sample planting request:', requests[0]);
      console.log('📋 Planting request keys:', Object.keys(requests[0]));
    }
    
    return requests.map(request => ({
      ...request,
      // Ensure consistent field names with fallbacks
      id: request.id || request.requestId,
      requestId: request.requestId || request.id,
      fullName: request.fullName || request.planterName || 'Unknown User',
      location_address: request.location_address || request.location || request.locationName || 'Unknown Location',
      locationName: request.locationName || request.location_address || request.location || 'Unknown Location',
      request_status: request.request_status || request.status || 'pending',
      userEmail: request.userEmail || request.email,
      organization: request.organization || 'Volunteer Planter',
      request_notes: request.request_notes || request.notes,
      formatted_preferred_date: formatDisplayDate(request.preferred_date),
      formatted_request_date: formatDisplayDate(request.request_date)
    }));
  } catch (error) {
    console.error('❌ Fetch planting requests failed:', error.message);
    return [];
  }
};

// DEBUGGED: Fixed fetchPlantingRecords with proper response handling
const fetchPlantingRecords = async () => {
  try {
    console.log('📊 Fetching planting records...');
    let response;
    
    try {
      response = await apiService.getPlantingRecords();
      console.log('🔍 Planting records raw response:', response);
    } catch (error) {
      console.error('❌ API call failed:', error);
      return [];
    }
    
    let records = [];
    
    // Handle different response structures
    if (Array.isArray(response)) {
      records = response;
    } else if (response && Array.isArray(response.data)) {
      records = response.data;
    } else if (response && response.success && Array.isArray(response.data)) {
      records = response.data;
    } else {
      console.warn('⚠️ Unexpected planting records response format:', response);
      return [];
    }
    
    console.log('✅ Planting records loaded:', records.length);
    
    if (records.length > 0) {
      console.log('📋 Sample planting record:', records[0]);
      console.log('📋 Planting record keys:', Object.keys(records[0]));
    }
    
    return records.map(record => {
      const recordDate = record.record_date || record.createdAt;
      
      return {
        ...record,
        // Ensure consistent field names with fallbacks
        id: record.id || record.recordId,
        fullName: record.fullName || record.userName || record.planterName || 'Unknown User',
        locationName: record.locationName || record.location_address || record.location || 'Unknown Location',
        treeSeedlingName: record.treeSeedlingName || record.seedlingName || record.seedlingRef || 'Unknown Tree',
        seedlingRef: record.seedlingRef || record.treeSeedlingName,
        userEmail: record.userEmail || record.email,
        status: record.status || 'completed',
        notes: record.notes || record.record_notes,
        formatted_planting_date: formatDisplayDateTime(recordDate)
      };
    });
  } catch (error) {
    console.error('❌ Fetch planting records failed:', error.message);
    return [];
  }
};

// =============================================================================
// MAIN COMPONENT - DEBUGGED DATA LOADING
// =============================================================================

const NotificationPanel = () => {
  const { user, logout } = useAuth();
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // DEBUGGED: Improved data loading with individual error handling
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading all data...');

      // Load data with individual error handling
      let notificationsData = [];
      let requestsData = [];
      let recordsData = [];

      try {
        notificationsData = await fetchNotifications();
        console.log('✅ Notifications loaded:', notificationsData.length);
      } catch (notifError) {
        console.error('❌ Failed to load notifications:', notifError);
        setAlert({
          open: true,
          message: 'Failed to load notifications',
          severity: 'warning'
        });
      }

      try {
        requestsData = await fetchPlantingRequests();
        console.log('✅ Planting requests loaded:', requestsData.length);
      } catch (requestError) {
        console.error('❌ Failed to load planting requests:', requestError);
        setAlert({
          open: true,
          message: 'Failed to load planting requests',
          severity: 'warning'
        });
      }

      try {
        recordsData = await fetchPlantingRecords();
        console.log('✅ Planting records loaded:', recordsData.length);
      } catch (recordError) {
        console.error('❌ Failed to load planting records:', recordError);
        setAlert({
          open: true,
          message: 'Failed to load planting records',
          severity: 'warning'
        });
      }

      setNotifications(notificationsData);
      setPlantingRequests(requestsData);
      setPlantingRecords(recordsData);

      console.log('✅ All data loading completed');
      console.log('📊 Final Stats:', {
        notifications: notificationsData.length,
        requests: requestsData.length,
        records: recordsData.length
      });

      // Show success message if any data was loaded
      const totalLoaded = notificationsData.length + requestsData.length + recordsData.length;
      if (totalLoaded > 0) {
        setAlert({
          open: true,
          message: `Loaded ${totalLoaded} items successfully`,
          severity: 'success'
        });
      } else {
        setAlert({
          open: true,
          message: 'No data available. Please check your connection.',
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
  };

  useEffect(() => {
    loadData();

    const pollInterval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Rest of the component functions remain the same...
  // [Keep all the existing handle functions, helper functions, NotificationRow, etc.]

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setRecordDialogOpen(true);
  };

  const handleViewNotification = async (notification) => {
    setSelectedNotification(notification);
    setNotificationDialogOpen(true);
    
    if (notification.isRealNotification && !notification.isRead) {
      try {
        await apiService.updateNotification(notification.id, {
          isRead: true,
          read: true,
          updatedAt: new Date().toISOString()
        });
        
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, isRead: true, read: true } : n
        ));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setSaving(true);
      
      const unreadNotifications = notifications.filter(n => 
        n.isRealNotification && !n.isRead
      );
      
      const markReadPromises = unreadNotifications.map(notification => 
        apiService.updateNotification(notification.id, {
          isRead: true,
          read: true,
          updatedAt: new Date().toISOString()
        })
      );
      
      await Promise.all(markReadPromises);
      
      setNotifications(prev => prev.map(n => 
        n.isRealNotification ? { ...n, isRead: true, read: true } : n
      ));
      
      setAlert({ 
        open: true, 
        message: `Marked ${unreadNotifications.length} notifications as read`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      setAlert({ 
        open: true, 
        message: 'Error marking notifications as read', 
        severity: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveNotification = async (notificationId, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      setDeletingId(notificationId);
      
      if (notificationId.startsWith('request-') || notificationId.startsWith('record-')) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setAlert({ 
          open: true, 
          message: 'Notification removed', 
          severity: 'success' 
        });
      } else {
        try {
          await apiService.deleteNotification(notificationId);
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
          setAlert({ 
            open: true, 
            message: 'Notification deleted', 
            severity: 'success' 
          });
        } catch (apiError) {
          console.error('API delete failed:', apiError);
          setNotifications(prev => prev.filter(n => n.id !== notificationId));
          setAlert({ 
            open: true, 
            message: 'Notification removed from view', 
            severity: 'warning' 
          });
        }
      }
    } catch (error) {
      console.error('Error removing notification:', error);
      setAlert({ 
        open: true, 
        message: 'Error removing notification', 
        severity: 'error' 
      });
    } finally {
      setDeletingId(null);
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
      case 'plant_request':
      case 'request_submitted': 
        return <NewReleasesIcon />;
      case 'request_approved': 
        return <CheckCircleIcon />;
      case 'request_rejected': 
        return <CancelIcon />;
      case 'planting_record': 
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
    return formatDisplayDateTime(date);
  };

  // DEBUGGED: Improved notification combining with better IDs
  const allNotifications = [
    // Real notifications from API
    ...notifications.map(notification => ({
      ...notification,
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      notif_message: notification.notif_message || notification.message,
      read: notification.isRead || notification.read || false,
      timestamp: notification.timestamp || notification.created_at,
      isRealNotification: true
    })),
    // Synthetic notifications from planting requests
    ...plantingRequests.map(request => ({
      id: `request-${request.id || request.requestId}`,
      type: 'plant_request',
      title: 'New Planting Request',
      message: `Planter ${request.fullName} has submitted a planting request`,
      notif_message: `Planter ${request.fullName} has submitted a planting request for ${request.location_address}`,
      data: { plantRequestId: request.id || request.requestId },
      fullName: request.fullName,
      location: request.location_address,
      read: false,
      timestamp: request.request_date,
      isRealNotification: false
    })),
    // Synthetic notifications from planting records
    ...plantingRecords.map(record => ({
      id: `record-${record.id}`,
      type: 'planting_record',
      title: 'Planting Activity Completed',
      message: `Planter ${record.fullName} has planted a tree`,
      notif_message: `Planter ${record.fullName} has planted ${record.treeSeedlingName} in ${record.locationName}`,
      data: { plantingRecordId: record.id },
      fullName: record.fullName,
      location: record.locationName,
      read: false,
      timestamp: record.record_date,
      isRealNotification: false
    }))
  ].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

  // Filter notifications for tabs
  const plantingRequestNotifications = allNotifications.filter(
    notification => notification.type === 'plant_request' || notification.type === 'request_submitted'
  );

  const unreadCount = allNotifications.filter(n => !n.read).length;
  const plantingRequestUnreadCount = plantingRequestNotifications.filter(n => !n.read).length;

  // NotificationRow component (unchanged)
  const NotificationRow = ({ notification }) => (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 1,
        borderRadius: 2,
        borderLeft: `4px solid ${
          notification.type === 'plant_request' || notification.type === 'request_submitted' ? theme.palette.warning.main :
          notification.type === 'planting_record' ? theme.palette.success.main :
          theme.palette.info.main
        }`,
        backgroundColor: notification.read ? 'background.paper' : alpha(theme.palette.primary.main, 0.04),
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': { 
          transform: 'translateY(-1px)',
          boxShadow: 2,
          backgroundColor: notification.read ? 
            alpha(theme.palette.primary.main, 0.02) : 
            alpha(theme.palette.primary.main, 0.08)
        }
      }}
      onClick={() => {
        if (notification.type === 'plant_request' || notification.type === 'request_submitted') {
          const requestId = notification.data?.plantRequestId || notification.requestId;
          const request = plantingRequests.find(req => 
            req.id === requestId || req.requestId === requestId
          );
          if (request) handleViewDetails(request);
        } else if (notification.type === 'planting_record') {
          const recordId = notification.data?.plantingRecordId;
          const record = plantingRecords.find(rec => rec.id === recordId);
          if (record) handleViewRecord(record);
        } else {
          handleViewNotification(notification);
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ 
          color: notification.read ? 'text.secondary' : 
            (notification.type === 'plant_request' || notification.type === 'request_submitted') ? 'warning.main' :
            notification.type === 'planting_record' ? 'success.main' : 'primary.main',
          mt: 0.5
        }}>
          {getNotificationIcon(notification.type)}
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: notification.read ? 'normal' : 'bold',
                color: notification.read ? 'text.primary' : 
                  (notification.type === 'plant_request' || notification.type === 'request_submitted') ? 'warning.main' :
                  notification.type === 'planting_record' ? 'success.main' : 'primary.main'
              }}
            >
              {notification.title}
            </Typography>
            <Chip 
              label={formatType(notification.type)} 
              size="small" 
              color={getStatusColor(notification.type === 'request_submitted' ? 'submitted' : notification.type)}
              variant="outlined"
            />
            {!notification.read && (
              <Chip 
                label="New" 
                size="small" 
                color="primary"
                variant="filled"
              />
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {notification.notif_message || notification.message}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(notification.timestamp)}
            </Typography>
            {notification.fullName && (
              <Typography variant="caption" color="text.secondary">
                • By: {notification.fullName}
              </Typography>
            )}
            {notification.location && (
              <Typography variant="caption" color="text.secondary">
                • Location: {notification.location}
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box>
          <IconButton 
            size="small" 
            onClick={(e) => handleRemoveNotification(notification.id, e)}
            color="error"
            disabled={deletingId === notification.id}
            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
            title="Remove notification"
          >
            {deletingId === notification.id ? <CircularProgress size={20} /> : <DeleteIcon />}
          </IconButton>
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

  // Get current notifications based on active tab
  const getCurrentNotifications = () => {
    switch (activeTab) {
      case 0: return allNotifications;
      case 1: return plantingRequestNotifications;
      default: return allNotifications;
    }
  };

  const currentNotifications = getCurrentNotifications();

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

  // The rest of your JSX remains exactly the same...
  // [Keep all the dialog components, tabs, and layout]

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
                    {allNotifications.length} total
                  </Typography>
                </Box>
              }
              iconPosition="start"
            />

            <Tab
              icon={
                <Badge badgeContent={plantingRequestUnreadCount} color="error">
                  <AssignmentIcon sx={{ fontSize: 20 }} />
                </Badge>
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1 }}>
                    Planting Requests
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {plantingRequestNotifications.length} requests
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
            {allNotifications.length === 0 ? (
              <EmptyState 
                icon={NotificationsIcon}
                title="No notifications available"
                description="New notifications will appear here when available"
              />
            ) : (
              <Box>
                {currentNotifications.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))}
              </Box>
            )}
          </>
        )}

        {activeTab === 1 && (
          <>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>Planting Requests</Typography>
            {plantingRequestNotifications.length === 0 ? (
              <EmptyState 
                icon={AssignmentIcon}
                title="No planting requests"
                description="New planting requests will appear here when submitted"
              />
            ) : (
              <Box>
                {currentNotifications.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))}
              </Box>
            )}
          </>
        )}

        {/* ========== UPDATED PLANTING REQUEST DETAILS DIALOG ========== */}
        <Dialog 
          open={detailDialogOpen} 
          onClose={() => setDetailDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Request Details</Typography>
              <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedRequest && (
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
                          {selectedRequest.fullName || 'Unknown User'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {selectedRequest.userEmail || 'No email'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Organization
                        </Typography>
                        <Typography variant="body1">
                          {selectedRequest.organization || 'Volunteer Planter'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Box>

                {/* Request Details */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    <CalendarTodayIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                    Request Details
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Request Date
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {selectedRequest.formatted_request_date || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Preferred Planting Date
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {selectedRequest.formatted_preferred_date || 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Status
                        </Typography>
                        <Chip 
                          label={selectedRequest.requestStatus || selectedRequest.request_status || 'pending'} 
                          color={getStatusColor(selectedRequest.requestStatus || selectedRequest.request_status || 'pending')}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      {selectedRequest.request_notes && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Additional Notes
                          </Typography>
                          <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2">
                              {selectedRequest.request_notes}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </Box>
                
                {/* Location */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    <LocationOnIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                    Planting Location
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body1" fontWeight="600">
                      {selectedRequest.location_address || 'Unknown Location'}
                    </Typography>
                  </Card>
                </Box>
                
                {/* Assigned Seedling - Placeholder for future implementation */}
                {selectedRequest.seedlingRef && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                      <ForestIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5, color: 'success.main' }} />
                      Assigned Seedling
                    </Typography>
                    <Card variant="outlined" sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)' }}>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Seedling Reference
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {selectedRequest.seedlingRef}
                          </Typography>
                        </Box>
                        <Box>
                          <Chip 
                            icon={<ForestIcon />} 
                            label="Seedling Assigned" 
                            color="success" 
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Stack>
                    </Card>
                  </Box>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => {
                setDetailDialogOpen(false);
                // You can add assign seedling functionality here if needed
              }}
              startIcon={<CheckCircleIcon />}
              sx={{
                bgcolor: '#2e7d32',
                '&:hover': { bgcolor: '#1b5e20' }
              }}
            >
              View Full Details
            </Button>
            <Button onClick={() => setDetailDialogOpen(false)} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* ========== UPDATED PLANTING RECORD DETAILS DIALOG ========== */}
<Dialog
  open={recordDialogOpen}
  onClose={() => setRecordDialogOpen(false)}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6">Planting Record Details</Typography>
      <IconButton onClick={() => setRecordDialogOpen(false)} size="small">
        <CloseIcon />
      </IconButton>
    </Box>
  </DialogTitle>

  <DialogContent dividers>
    {selectedRecord && (
      <Stack spacing={3}>
        {/* User Information */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            <PersonIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
            User Information
          </Typography>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Name
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedRecord.fullName || 'Unknown User'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Email
                </Typography>
                <Typography variant="body1">
                  {selectedRecord.userEmail || 'No email'}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Box>

        {/* Location Information */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            <LocationOnIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
            Location Information
          </Typography>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body1" fontWeight="600">
              {selectedRecord.locationName || 'Unknown Location'}
            </Typography>
          </Card>
        </Box>

        {/* Planting Details */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            <ForestIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5, color: 'success.main' }} />
            Planting Details
          </Typography>
          <Card variant="outlined" sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Tree Seedling
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedRecord.treeSeedlingName || selectedRecord.seedlingRef || 'Unknown Tree'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Planting Date
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedRecord.formatted_planting_date || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Request ID
                </Typography>
                <Typography variant="body1" fontWeight="600">
                  {selectedRecord.requestId || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Status
                </Typography>
                <Chip
                  label={selectedRecord.status || 'completed'}
                  color="success"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              {selectedRecord.notes && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Notes
                  </Typography>
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2">
                      {selectedRecord.notes}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Stack>
          </Card>
        </Box>
      </Stack>
    )}
  </DialogContent>

  <DialogActions sx={{ p: 2 }}>
    <Button
      variant="contained"
      onClick={() => setRecordDialogOpen(false)}
      startIcon={<CheckCircleIcon />}
      sx={{
        bgcolor: '#2e7d32',
        '&:hover': { bgcolor: '#1b5e20' }
      }}
    >
      View Full Details
    </Button>
    <Button onClick={() => setRecordDialogOpen(false)} variant="outlined">
      Close
    </Button>
  </DialogActions>
</Dialog>


        {/* Notification Dialog */}
        <Dialog open={notificationDialogOpen} onClose={() => setNotificationDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Notification Details</DialogTitle>
          <DialogContent>
            {selectedNotification && (
              <Box sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      {selectedNotification.title}
                    </Typography>
                    <Chip 
                      label={selectedNotification.priority || 'medium'} 
                      size="small" 
                      color={
                        selectedNotification.priority === 'high' ? 'error' : 
                        selectedNotification.priority === 'medium' ? 'warning' : 'default'
                      }
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Message</Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {selectedNotification.message || selectedNotification.notif_message}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                    <Typography variant="body2">{formatType(selectedNotification.type)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                    <Typography variant="body2">{formatDateTime(selectedNotification.notif_timestamp || selectedNotification.timestamp)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Typography variant="body2">
                      {selectedNotification.read ? 'Read' : 'Unread'} • {selectedNotification.resolved ? 'Resolved' : 'Active'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNotificationDialogOpen(false)}>Close</Button>
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
