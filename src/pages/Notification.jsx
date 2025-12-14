// src/pages/Notification.js - COMPLETE VERSION WITH ALL DATA SOURCES
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

const drawerWidth = 240;

// =============================================================================
// DATE FORMATTING FUNCTIONS - REMOVED TIME
// =============================================================================

const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  try {
    let dateObj;
    
    if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
      dateObj = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      // Handle your specific format: "December 6, 2025 at 4:26:39 PM UTC+8"
      const normalizedDateStr = dateInput.replace(' ', ' '); // Replace special space
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

// REMOVED THE formatDisplayDateTime FUNCTION COMPLETELY - NO TIME DISPLAY

// =============================================================================
// HELPER FUNCTIONS FOR DATA FETCHING
// =============================================================================

// Fetch user data
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

// Fetch planting task data
const fetchTaskData = async (taskRef) => {
  try {
    if (!taskRef) {
      return { recommendedSeedlings: [] };
    }
    
    let taskId;
    if (taskRef.includes('/')) {
      taskId = taskRef.split('/').pop();
    } else if (taskRef.startsWith('plantingtasks/')) {
      taskId = taskRef.replace('plantingtasks/', '');
    } else {
      taskId = taskRef;
    }
    
    let taskData = {};
    try {
      if (apiService.getPlantingTaskById && typeof apiService.getPlantingTaskById === 'function') {
        taskData = await apiService.getPlantingTaskById(taskId);
      }
    } catch (error) {
      console.log('Task API not available');
    }
    
    return {
      recommendedSeedlings: taskData.recommendedSeedlings || [],
      taskStatus: taskData.task_status || 'Unknown'
    };
  } catch (error) {
    console.error('Error fetching task data:', error);
    return { recommendedSeedlings: [] };
  }
};

// Fetch seedling data
const fetchSeedlingData = async (seedlingRef, taskData) => {
  try {
    if (!seedlingRef) {
      return { seedlingName: 'Unknown Seedling' };
    }
    
    // If seedlingRef is already a name (like "Cashew"), use it directly
    if (!seedlingRef.includes('/') && !seedlingRef.startsWith('seedlings/')) {
      // Try to find more details from task data if available
      if (taskData && taskData.recommendedSeedlings) {
        const seedlingDetail = taskData.recommendedSeedlings.find(
          seedling => seedling.seedling_commonName === seedlingRef
        );
        if (seedlingDetail) {
          return {
            seedlingName: seedlingDetail.seedling_commonName,
            scientificName: seedlingDetail.seedling_scientificName,
            category: seedlingDetail.seedling_category,
            successRate: seedlingDetail.seedling_successRate
          };
        }
      }
      
      return { seedlingName: seedlingRef };
    }
    
    // If it's a reference, try to resolve it
    let seedlingId;
    if (seedlingRef.includes('/')) {
      seedlingId = seedlingRef.split('/').pop();
    } else {
      seedlingId = seedlingRef;
    }
    
    let seedlingData = {};
    try {
      if (apiService.getTreeSeedlingById && typeof apiService.getTreeSeedlingById === 'function') {
        seedlingData = await apiService.getTreeSeedlingById(seedlingId);
      }
    } catch (error) {
      console.log('Seedling API not available');
    }
    
    return {
      seedlingName: seedlingData.seedling_commonName || seedlingData.commonName || seedlingRef,
      scientificName: seedlingData.seedling_scientificName || seedlingData.scientificName,
      category: seedlingData.seedling_category || seedlingData.category,
      successRate: seedlingData.seedling_successRate || seedlingData.successRate
    };
  } catch (error) {
    console.error('Error fetching seedling data:', error);
    return { seedlingName: seedlingRef || 'Unknown Seedling' };
  }
};

// Move this BEFORE fetchNotifications() function
const fetchAssignedSeedlingsNotifications = async () => {
  try {
    console.log('📡 Fetching assigned_seedlings notifications...');
    
    let response = await apiService.getAssignedSeedlingsNotifications();
    
    let notifications = Array.isArray(response) ? response : 
                       response?.notifications || response?.data || [];
    
    return notifications.map(notification => ({
      id: notification.notificationId || notification.id,
      type: 'assigned_seedlings',
      title: 'Seedling Assignment',
      message: notification.message || notification.notificationText,
      seedlingName: notification.seedlingName,
      location_address: notification.location_address,
      locationName: notification.locationName,
      requestId: notification.requestId,
      recommendationId: notification.recommendationId,
      timestamp: notification.timestamp || notification.created_at,
      isRead: notification.isRead || false,
      priority: notification.priority || 'high',
      recipient_role: notification.recipient_role || 'planter',
      userId: notification.userRef,
      isRealNotification: true
    }));
  } catch (error) {
    console.error('❌ Failed to load assigned_seedlings notifications:', error);
    return [];
  }
};

// =============================================================================
// DATA FETCHING FUNCTIONS
// =============================================================================

// Main function to fetch notifications from your updated API
const fetchNotifications = async () => {
  try {
    console.log('📡 Fetching request_submitted notifications...');
    
    let response;
    try {
      // Your updated API only returns request_submitted notifications
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
    
    // Transform notifications to match your data structure
    const transformedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const id = notification.notificationId || notification.id || notification._id;
        
        // Get user data if needed
        const userData = await fetchUserData(notification.userId);
        
        return {
          id: id || `temp-${Date.now()}-${Math.random()}`,
          notificationId: notification.notificationId || notification.id || id,
          type: notification.type || 'request_submitted',
          title: notification.title || 'Request Submitted',
          message: notification.message || '',
          fullName: notification.fullName || userData.fullName || 'Unknown User',
          userEmail: userData.email,
          location: notification.location || '',
          location_address: notification.location || '', // Alias for compatibility
          preferred_date: notification.preferred_date || '',
          request_date: notification.created_at, // Use created_at as request date
          requestId: notification.requestId || '',
          userId: notification.userId || '',
          status: notification.status || 'pending',
          request_status: notification.status || 'pending', // Alias
          isRead: notification.isRead !== undefined ? notification.isRead : false,
          read: notification.isRead !== undefined ? notification.isRead : false, // Alias
          created_at: notification.created_at,
          timestamp: notification.created_at,
          isRealNotification: true,
          // Formatted dates - DATE ONLY, NO TIME
          formatted_preferred_date: formatDisplayDate(notification.preferred_date),
          formatted_request_date: formatDisplayDate(notification.created_at),
          // Additional metadata for display
          rawNotification: notification
        };
      })
    );
    
    console.log(`✅ Transformed ${transformedNotifications.length} notifications`);
    
    return transformedNotifications.filter(notification => notification.id);
  } catch (error) {
    console.error('❌ Fetch notifications failed:', error.message);
    return [];
  }
};

// Fetch planting requests
const fetchPlantingRequests = async () => {
  try {
    console.log('📡 Fetching planting requests...');
    
    let response;
    try {
      response = await apiService.getPlantingRequests();
    } catch (error) {
      console.error('❌ Planting requests API failed:', error);
      return [];
    }
    
    let requests = [];
    
    if (Array.isArray(response)) {
      requests = response;
    } else if (response && Array.isArray(response.data)) {
      requests = response.data;
    } else if (response && response.success && Array.isArray(response.data)) {
      requests = response.data;
    } else {
      console.log('⚠️ No planting requests found in response');
      return [];
    }
    
    // Enrich requests with user data
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const userData = await fetchUserData(request.userRef);
        
        return {
          ...request,
          id: request.id || request.requestId,
          requestId: request.requestId || request.id,
          fullName: request.fullName || userData.fullName,
          userEmail: userData.email,
          location_address: request.location_address || request.location || 'Unknown Location',
          locationName: request.location_address || request.location || 'Unknown Location',
          request_status: request.request_status || request.status || 'pending',
          organization: request.organization || 'Volunteer Planter',
          request_notes: request.request_notes || request.notes,
          formatted_preferred_date: formatDisplayDate(request.preferred_date),
          formatted_request_date: formatDisplayDate(request.request_date),
          // For notification compatibility
          type: 'plant_request',
          message: `${request.fullName || userData.fullName} has submitted a planting request`,
          isRealNotification: false,
          isRead: false,
          timestamp: request.request_date || request.createdAt
        };
      })
    );
    
    console.log(`✅ Found ${enrichedRequests.length} planting requests`);
    
    return enrichedRequests;
  } catch (error) {
    console.error('❌ Fetch planting requests failed:', error.message);
    return [];
  }
};

// Fetch planting records with focused debugging
const fetchPlantingRecords = async (plantingRequests) => {
  try {
    console.log('📡 Fetching planting records...');
    
    let response;
    try {
      response = await apiService.getPlantingRecords();
    } catch (error) {
      console.error('❌ Planting records API failed:', error);
      return [];
    }
    
    let records = [];
    
    if (Array.isArray(response)) {
      records = response;
    } else if (response && Array.isArray(response.data)) {
      records = response.data;
    } else if (response && response.success && Array.isArray(response.data)) {
      records = response.data;
    } else {
      console.log('⚠️ No planting records found in response');
      return [];
    }
    
    console.log(`🔍 Found ${records.length} planting records`);
    
    // Create maps from planting requests for user names and locations
    const userRefToNameMap = {};
    const userRefToLocationMap = {};
    
    plantingRequests.forEach((request, index) => {
      if (request.userRef) {
        // Store with exact userRef match
        if (request.fullName) {
          userRefToNameMap[request.userRef] = request.fullName;
        }
        
        // Check ALL possible location fields
        const location = request.location_address || request.location || request.locationName;
        if (location && location !== 'Unknown Location') {
          userRefToLocationMap[request.userRef] = location;
        }
      }
    });
    
    // Enrich records with referenced data
    const enrichedRecords = await Promise.all(
      records.map(async (record, index) => {
        try {
          // Check if we can find this userRef in our maps
          const foundName = userRefToNameMap[record.userRef];
          const foundLocation = userRefToLocationMap[record.userRef];
          
          // If no location found, try alternative userRef formats
          if (!foundLocation) {
            // Try without leading slash
            const userRefWithoutSlash = record.userRef.startsWith('/') ? record.userRef.substring(1) : record.userRef;
            const altLocation1 = userRefToLocationMap[userRefWithoutSlash];
            
            // Try just the user ID part
            const userIdOnly = record.userRef.split('/').pop();
            const altLocation2 = userRefToLocationMap[userIdOnly];
          }
          
          const userFullName = foundName || 'Unknown User';
          const userLocation = foundLocation || 'Unknown Location';
          
          const [userData, taskData] = await Promise.all([
            fetchUserData(record.userRef),
            fetchTaskData(record.taskRef)
          ]);
          
          const seedlingData = await fetchSeedlingData(record.seedlingRef, taskData);
          
          const recordDate = record.record_date || record.record_datePlanted || record.createdAt;
          
          const enrichedRecord = {
            ...record,
            id: record.id || record.recordId,
            fullName: userFullName,
            userEmail: userData.email,
            locationName: userLocation,
            locationData: { location_name: userLocation },
            treeSeedlingName: seedlingData.seedlingName,
            scientificName: seedlingData.scientificName,
            seedlingCategory: seedlingData.category,
            successRate: seedlingData.successRate,
            seedlingRef: record.seedlingRef,
            taskStatus: taskData.taskStatus,
            recommendedSeedlings: taskData.recommendedSeedlings,
            status: record.status || 'completed',
            notes: record.notes || record.record_notes || 'No notes',
            // DATE ONLY - NO TIME
            formatted_planting_date: formatDisplayDate(recordDate),
            raw_record_date: recordDate,
            // For notification compatibility
            type: 'planting_record',
            message: `${userFullName} has planted ${seedlingData.seedlingName}`,
            isRealNotification: false,
            isRead: false,
            timestamp: recordDate
          };
          
          return enrichedRecord;
          
        } catch (error) {
          console.error(`❌ Error enriching planting record ${index}:`, error);
          const recordDate = record.record_date || record.record_datePlanted || record.createdAt;
          return {
            ...record,
            id: record.id || record.recordId,
            fullName: 'Unknown User',
            userEmail: 'N/A',
            locationName: 'Unknown Location',
            treeSeedlingName: record.seedlingRef || 'Unknown Tree',
            status: record.status || 'completed',
            notes: record.notes || 'No notes',
            // DATE ONLY - NO TIME
            formatted_planting_date: formatDisplayDate(recordDate),
            // For notification compatibility
            type: 'planting_record',
            message: `Unknown user has planted ${record.seedlingRef || 'a tree'}`,
            isRealNotification: false,
            isRead: false,
            timestamp: recordDate
          };
        }
      })
    );
    
    console.log(`✅ Enriched ${enrichedRecords.length} planting records`);
    
    return enrichedRecords;
  } catch (error) {
    console.error('❌ Fetch planting records failed:', error.message);
    return [];  
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const NotificationPanel = () => {
  const { user, logout } = useAuth();
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [saving, setSaving] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading all data...');

      // First fetch notifications and planting requests
      const [
        notificationsData,
        requestsData,
        assignedSeedlingsData
      ] = await Promise.all([
        fetchNotifications().catch(error => {
          console.error('❌ Failed to load notifications:', error);
          return [];
        }),
        fetchPlantingRequests().catch(error => {
          console.error('❌ Failed to load planting requests:', error);
          return [];
        }),
        fetchAssignedSeedlingsNotifications().catch(error => {
          console.error('❌ Failed to load assigned seedlings notifications:', error);
          return [];
        })
      ]);
      // Then fetch planting records using the planting requests data
      const recordsData = await fetchPlantingRecords(requestsData).catch(error => {
        console.error('❌ Failed to load planting records:', error);
        return [];
      });

      setNotifications([...notificationsData, ...assignedSeedlingsData]);
      setPlantingRequests(requestsData);
      setPlantingRecords(recordsData);

      const totalLoaded = notificationsData.length + requestsData.length + recordsData.length;
      console.log(`✅ Loaded ${totalLoaded} items total`);
      
      if (totalLoaded > 0) {
        setAlert({
          open: true,
          message: `Loaded ${totalLoaded} items successfully`,
          severity: 'success'
        });
      } else {
        setAlert({
          open: true,
          message: 'No data available',
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
      case 'plant_request':
        return <NewReleasesIcon />;
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

  // UPDATED: Only show date, not time
  const formatDateTime = (date) => {
    return formatDisplayDate(date); // Only date, no time
  };

  // Combine all notifications
  const allNotifications = [
    ...notifications.map(notification => ({
      ...notification,
      source: 'notification',
      displayType: notification.type,
      displayTitle: notification.title,
      displayMessage: notification.message,
      displayTimestamp: notification.timestamp || notification.created_at,
      displayLocation: notification.location,
      displayStatus: notification.status,
      displayFullName: notification.fullName
    })),
    ...plantingRequests.map(request => ({
      ...request,
      source: 'planting_request',
      displayType: 'plant_request',
      displayTitle: 'New Planting Request',
      displayMessage: request.message || `${request.fullName} has submitted a planting request`,
      displayTimestamp: request.timestamp || request.request_date,
      displayLocation: request.location_address,
      displayStatus: request.request_status,
      displayFullName: request.fullName,
      isRealNotification: false,
      isRead: false
    })),
    ...plantingRecords.map(record => ({
      ...record,
      source: 'planting_record',
      displayType: 'planting_record',
      displayTitle: 'Planting Activity Completed',
      displayMessage: record.message || `${record.fullName} has planted ${record.treeSeedlingName}`,
      displayTimestamp: record.timestamp || record.raw_record_date,
      displayLocation: record.locationName,
      displayStatus: record.status,
      displayFullName: record.fullName,
      isRealNotification: false,
      isRead: false
    }))
  ].sort((a, b) => {
    const dateA = new Date(a.displayTimestamp || a.timestamp || a.created_at);
    const dateB = new Date(b.displayTimestamp || b.timestamp || b.created_at);
    return dateB - dateA; // Newest first
  });

  const plantingRequestsForTab = plantingRequests.map(request => ({
    ...request,
    source: 'planting_request',
    displayType: 'plant_request',
    displayTitle: 'New Planting Request',
    displayMessage: request.message || `${request.fullName} has submitted a planting request`,
    displayTimestamp: request.timestamp || request.request_date,
    displayLocation: request.location_address,
    displayStatus: request.request_status,
    displayFullName: request.fullName,
    isRealNotification: false,
    isRead: false
  }));

  // Filter for request_submitted notifications only
  const requestSubmittedNotifications = allNotifications.filter(
    item => item.displayType === 'request_submitted' || 
           (item.source === 'notification' && item.type === 'request_submitted')
  );

  // Filter for planting records only
  const plantingRecordNotifications = allNotifications.filter(
    item => item.displayType === 'planting_record'
  );

  // Calculate unread counts
  const unreadCount = allNotifications.filter(n => n.isRealNotification && !n.isRead).length;
  const requestSubmittedUnreadCount = requestSubmittedNotifications.filter(
    n => n.isRealNotification && !n.isRead
  ).length;

  const NotificationRow = ({ item }) => (
    <Paper 
      sx={{ 
        p: 2.5, 
        mb: 1.5,
        borderRadius: 2,
        borderLeft: `4px solid ${
          item.displayType === 'request_submitted' ? theme.palette.warning.main :
          item.displayType === 'plant_request' ? theme.palette.warning.main :
          item.displayType === 'planting_record' ? theme.palette.success.main :
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
            item.displayStatus === 'pending' ? 'warning.main' :
            item.displayType === 'request_submitted' ? 'warning.main' :
            item.displayType === 'plant_request' ? 'warning.main' :
            item.displayType === 'planting_record' ? 'success.main' :
            'primary.main',
          mt: 0.5
        }}>
          {getNotificationIcon(item.displayType)}
        </Box>

        
        <Box sx={{ flex: 1, pr: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography 
              variant="subtitle1"
              sx={{
                fontWeight: item.isRead ? 500 : 700,
                color:
                  item.displayStatus === 'pending' ? 'warning.main' :
                  item.displayType === 'request_submitted' ? 'warning.main' :
                  item.displayType === 'plant_request' ? 'warning.main' :
                  item.displayType === 'planting_record' ? 'success.main' :
                  'primary.main'
              }}
            >
              {item.displayTitle}
            </Typography>
            <Chip 
              label={formatType(item.displayType)} 
              size="small" 
              color={getStatusColor(item.displayType === 'request_submitted' ? 'submitted' : item.displayType)}
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
            {item.displayStatus && (
              <Chip 
                label={item.displayStatus} 
                size="small" 
                color={getStatusColor(item.displayStatus)}
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
            {item.displayMessage}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* UPDATED: Only show date, not time */}
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(item.displayTimestamp)}
            </Typography>
            {item.displayFullName && (
              <Typography variant="caption" color="text.secondary">
                • By: {item.displayFullName}
              </Typography>
            )}
            {item.displayLocation && (
              <Typography variant="caption" color="text.secondary">
                • Location: {item.displayLocation}
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
      case 0: return allNotifications;
      case 1: return plantingRequestsForTab;
      default: return allNotifications;
    }
  };

  const currentItems = getCurrentItems();

  // Render different details based on item type
  const renderDetailsContent = (item) => {
    if (!item) return null;

    switch (item.displayType) {
      case 'request_submitted':
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
                      {item.displayFullName || item.fullName || 'Unknown User'}
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
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      User ID
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {item.userId || 'N/A'}
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
                      Submission Date
                    </Typography>
                    {/* UPDATED: Only show date, not time */}
                    <Typography variant="body1" fontWeight="600">
                      {formatDisplayDate(item.displayTimestamp || item.timestamp || item.created_at)}
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
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Status
                    </Typography>
                    <Chip 
                      label={item.displayStatus || item.status || 'pending'} 
                      color={getStatusColor(item.displayStatus || item.status || 'pending')}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  {item.request_notes && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Additional Notes
                      </Typography>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2">
                          {item.request_notes}
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
                  {item.displayLocation || item.location || item.location_address || 'Unknown Location'}
                </Typography>
              </Card>
            </Box>
          </Stack>
        );

      case 'planting_record':
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

            {/* Location Information */}
            <Box>
              <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                <LocationOnIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                Location Information
              </Typography>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Location Name
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {item.locationName}
                    </Typography>
                  </Box>
                </Stack>
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
                      {item.treeSeedlingName}
                    </Typography>
                    {item.scientificName && (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        {item.scientificName}
                      </Typography>
                    )}
                  </Box>
                  
                  {item.seedlingCategory && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Category
                      </Typography>
                      <Chip 
                        label={item.seedlingCategory} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  )}
                  
                  {item.successRate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Success Rate
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={item.successRate} 
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          color={item.successRate > 80 ? 'success' : item.successRate > 60 ? 'warning' : 'error'}
                        />
                        <Typography variant="body2" fontWeight="600">
                          {item.successRate}%
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Planting Date
                    </Typography>
                    {/* UPDATED: Only show date, not time */}
                    <Typography variant="body1" fontWeight="600">
                      {item.formatted_planting_date}
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

                  {item.notes && item.notes !== 'No notes' && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Planting Notes
                      </Typography>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2">
                          {item.notes}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </Stack>
              </Card>
            </Box>
          </Stack>
        );

      default:
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
              {item.displayFullName || item.fullName || 'Unknown User'}
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
        <NotificationsIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
        Notification Details
      </Typography>
      <Card variant="outlined" sx={{ p: 2, bgcolor: 'rgba(25, 210, 87, 0.05)' }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Title
            </Typography>
            <Typography variant="body1" fontWeight="600">
              {item.displayTitle}
            </Typography>
          </Box>
          

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Created
            </Typography>
            {/* UPDATED: Only show date, not time */}
            <Typography variant="body1" fontWeight="600">
              {formatDisplayDate(item.displayTimestamp)}
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
          
          {item.notificationId && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Notification ID
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {item.notificationId}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Message
            </Typography>
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                {item.displayMessage}
              </Typography>
            </Paper>
          </Box>
        </Stack>
      </Card>
    </Box>

    {/* Location Information (if available) */}
    {(item.displayLocation || item.location || item.location_address) && (
      <Box>
        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
          <LocationOnIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
          Location Information
        </Typography>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body1" fontWeight="600">
            {item.displayLocation || item.location || item.location_address || 'Unknown Location'}
          </Typography>
        </Card>
      </Box>
    )}
  </Stack>
);
    }
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
            {/* Tab 0: All Notifications */}
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
            
            {/* Tab 1: Planting Requests */}
            <Tab
              icon={
                <Badge badgeContent={0} color="error">
                  <NewReleasesIcon sx={{ fontSize: 20 }} />
                </Badge>
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1 }}>
                    Planting Requests
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {plantingRequests.length} requests
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
                {currentItems.map((item, index) => (
                  <NotificationRow key={`${item.source}-${item.id}-${index}`} item={item} />
                ))}
              </Box>
            )}
          </>
        )}

        {activeTab === 1 && (
        <>
          <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600, mb: 2 }}>Planting Requests</Typography>
          {plantingRequestsForTab.length === 0 ? (
            <EmptyState 
              icon={NewReleasesIcon}
              title="No planting requests"
              description="New planting requests will appear here when submitted"
            />
          ) : (
            <Box>
              {currentItems.map((item, index) => (
                <NotificationRow key={`${item.source}-${item.id}-${index}`} item={item} />
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
                {selectedItem?.displayType === 'request_submitted' ? 'Request Details' : 
                 selectedItem?.displayType === 'planting_record' ? 'Planting Record Details' : 
                 'Planting Requests Details'}
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
