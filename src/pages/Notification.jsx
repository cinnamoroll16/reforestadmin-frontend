// src/pages/Notification.js - FIXED RESPONSE HANDLING
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
// DATE FORMATTING FUNCTIONS
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
// DATA FETCHING FUNCTIONS - FIXED RESPONSE HANDLING
// =============================================================================

// Fixed fetchNotifications to properly handle backend response
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
    console.log('🔍 Response structure:', {
      type: typeof response,
      isArray: Array.isArray(response),
      keys: response ? Object.keys(response) : 'no response',
      hasNotifications: response && 'notifications' in response,
      hasData: response && 'data' in response,
      success: response && response.success
    });
    
    // Handle different response structures based on your actual API
    let notifications = [];
    
    if (response && response.success && Array.isArray(response.notifications)) {
      // Structure: { success: true, notifications: [...] }
      console.log('✅ Using response.notifications array');
      notifications = response.notifications;
    } else if (response && Array.isArray(response.notifications)) {
      // Structure: { notifications: [...] }
      console.log('✅ Using response.notifications array (without success flag)');
      notifications = response.notifications;
    } else if (response && Array.isArray(response)) {
      // Structure: [...]
      console.log('✅ Using direct array response');
      notifications = response;
    } else if (response && response.success && Array.isArray(response.data)) {
      // Structure: { success: true, data: [...] }
      console.log('✅ Using response.data array');
      notifications = response.data;
    } else {
      console.warn('⚠️ Unexpected notifications response format:', response);
      return [];
    }
    
    console.log('✅ Raw notifications loaded:', notifications.length);
    
    if (notifications.length > 0) {
      console.log('📋 Sample raw notification:', notifications[0]);
    }
    
    // Transform to match your actual notification structure
    const transformedNotifications = notifications.map(notification => ({
      // Map from your actual structure to expected structure
      id: notification.notificationId || notification.id,
      type: notification.type || 'general',
      title: notification.title || 'Notification',
      message: notification.message || notification.notif_message,
      notif_message: notification.message || notification.notif_message,
      // Use actual fields from your sample data
      fullName: notification.fullName,
      location: notification.location,
      preferred_date: notification.preferred_date,
      requestId: notification.requestId,
      status: notification.status,
      userId: notification.userId,
      isRead: notification.isRead || notification.read || false,
      created_at: notification.created_at || notification.notif_timestamp,
      // Add timestamp for sorting
      timestamp: notification.created_at || notification.notif_timestamp || notification.timestamp,
      // Mark as real API notification (not synthetic)
      isRealNotification: true
    }));
    
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

// Fixed fetchPlantingRequests
const fetchPlantingRequests = async () => {
  try {
    console.log('🌱 Fetching planting requests...');
    let response;
    
    try {
      response = await apiService.getPlantingRequests();
    } catch (error) {
      console.error('❌ API call failed:', error);
      return [];
    }
    
    const requests = Array.isArray(response) ? response : [];
    console.log('✅ Planting requests loaded:', requests.length);
    
    return requests.map(request => ({
      ...request,
      fullName: request.fullName || 'Unknown User',
      locationName: request.location_address || 'Unknown Location',
      formatted_preferred_date: formatDisplayDate(request.preferred_date),
      formatted_request_date: formatDisplayDate(request.request_date)
    }));
  } catch (error) {
    console.error('❌ Fetch planting requests failed:', error.message);
    return [];
  }
};

// Fixed fetchPlantingRecords
const fetchPlantingRecords = async () => {
  try {
    console.log('📊 Fetching planting records...');
    let response;
    
    try {
      response = await apiService.getPlantingRecords();
    } catch (error) {
      console.error('❌ API call failed:', error);
      return [];
    }
    
    let records = [];
    if (response && Array.isArray(response)) {
      records = response;
    } else if (response && response.success && Array.isArray(response.data)) {
      records = response.data;
    }
    
    console.log('✅ Planting records loaded:', records.length);
    
    return records.map(record => ({
      ...record,
      fullName: record.fullName || 'Unknown User',
      locationName: record.location_name || 'Unknown Location',
      treeSeedlingName: record.seedlingRef || 'Unknown Tree',
      formatted_planting_date: formatDisplayDateTime(record.record_date || record.createdAt)
    }));
  } catch (error) {
    console.error('❌ Fetch planting records failed:', error.message);
    return [];
  }
};

// =============================================================================
// MAIN COMPONENT - FIXED RESPONSE HANDLING
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

  // Load data with better error handling
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading all data...');

      const [notificationsData, requestsData, recordsData] = await Promise.all([
        fetchNotifications(),
        fetchPlantingRequests(),
        fetchPlantingRecords()
      ]);

      setNotifications(notificationsData);
      setPlantingRequests(requestsData);
      setPlantingRecords(recordsData);

      console.log('✅ All data loaded successfully');
      console.log('📊 Final Stats:', {
        notifications: notificationsData.length,
        requests: requestsData.length,
        records: recordsData.length
      });

      // DEBUG: Check what's in notificationsData
      if (notificationsData.length === 0) {
        console.warn('⚠️ No notifications loaded, but backend returned data');
        console.log('🔍 Checking API service response directly...');
        
        // Try direct fetch to debug
        try {
          const directResponse = await fetch('/api/notifications');
          const directData = await directResponse.json();
          console.log('🔍 Direct fetch response:', directData);
        } catch (directError) {
          console.error('❌ Direct fetch failed:', directError);
        }
      }

    } catch (error) {
      console.error('❌ Error loading data:', error);
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

  // Rest of the component remains the same as previous version...
  // [Keep all the handle functions, helper functions, NotificationRow, etc.]

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
    
    // Mark as read if it's a real notification and not already read
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
      
      // Get unread real notifications
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
        // Synthetic notification - just filter out
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setAlert({ 
          open: true, 
          message: 'Notification removed', 
          severity: 'success' 
        });
      } else {
        // Real notification - call API
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
          // Still remove from UI for better UX
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

  // Combine all notifications
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
      id: `request-${request.id}`,
      type: 'plant_request',
      title: 'New Planting Request',
      message: `Planter ${request.fullName} has submitted a planting request`,
      notif_message: `Planter ${request.fullName} has submitted a planting request for ${request.location_address}`,
      data: { plantRequestId: request.id },
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

  // NotificationRow component
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
          const request = plantingRequests.find(req => req.id === requestId);
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

        {/* Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{
            '& .MuiTab-root': { fontWeight: 600, minHeight: 70, textTransform: 'none', fontSize: '0.95rem' },
            '& .Mui-selected': { color: '#2e7d32' },
            '& .MuiTabs-indicator': { backgroundColor: '#2e7d32', height: 3 }
          }}>
            <Tab 
              icon={<Badge badgeContent={unreadCount} color="error"><NotificationsIcon /></Badge>}
              label={<Box><Typography variant="body2" fontWeight="600">All Notifications</Typography>
                     <Typography variant="caption" color="text.secondary">{allNotifications.length} total</Typography></Box>}
              iconPosition="start"
            />
            <Tab 
              icon={<Badge badgeContent={plantingRequestUnreadCount} color="error"><AssignmentIcon /></Badge>}
              label={<Box><Typography variant="body2" fontWeight="600">Planting Requests</Typography>
                     <Typography variant="caption" color="text.secondary">{plantingRequestNotifications.length} requests</Typography></Box>}
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

        {/* Detail Dialog for Planting Records */}
        <Dialog open={recordDialogOpen} onClose={() => setRecordDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Planting Record Details</DialogTitle>
          <DialogContent>
            {selectedRecord && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">User Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {selectedRecord.fullName || 'Unknown User'}</Typography>
                    <Typography><strong>Email:</strong> {selectedRecord.userEmail || 'No email'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location Information</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography><strong>Location:</strong> {selectedRecord.locationName || 'Unknown Location'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Planting Details</Typography>
                  <Box sx={{ mt: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography>
                      <strong>Tree Seedling:</strong> {selectedRecord.treeSeedlingName || selectedRecord.seedlingRef || 'Unknown Tree'}
                    </Typography>
                    <Typography>
                      <strong>Planting Date:</strong> {selectedRecord.formatted_planting_date || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>Request ID:</strong> {selectedRecord.requestId || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>Status:</strong> 
                      <Chip 
                        label={selectedRecord.status || 'completed'} 
                        color="success"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    {selectedRecord.notes && (
                      <Typography sx={{ mt: 1 }}><strong>Notes:</strong> {selectedRecord.notes}</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRecordDialogOpen(false)}>Close</Button>
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
