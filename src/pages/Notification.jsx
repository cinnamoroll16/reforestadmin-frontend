// src/pages/Notification.js - FIXED VERSION
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
// HELPER FUNCTIONS FOR DATA FETCHING
// =============================================================================

// Fetch user data for email only
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

// Fetch planting task data from taskRef (simplified since we don't need location anymore)
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

// =============================================================================
// DATA FETCHING FUNCTIONS
// =============================================================================

const fetchNotifications = async () => {
  try {
    let response;
    try {
      response = await apiService.getNotifications();
    } catch (apiError) {
      console.error('Notifications API failed:', apiError);
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
      return [];
    }
    
    // Transform notifications
    const transformedNotifications = notifications.map(notification => {
      const id = notification.notificationId || notification.id || notification._id;
      
      return {
        id: id || `temp-${Date.now()}-${Math.random()}`,
        type: notification.type || 'general',
        title: notification.title || 'Notification',
        message: notification.message || notification.notif_message || 'No message',
        notif_message: notification.notif_message || notification.message || 'No message',
        fullName: notification.fullName || notification.userName || 'Unknown User',
        userEmail: notification.userEmail || notification.email,
        location: notification.location || notification.location_address,
        location_address: notification.location_address || notification.location,
        preferred_date: notification.preferred_date,
        request_date: notification.request_date,
        requestId: notification.requestId,
        userId: notification.userId || notification.userRef,
        status: notification.status || notification.request_status || 'unknown',
        request_status: notification.request_status || notification.status || 'unknown',
        isRead: notification.isRead || notification.read || false,
        read: notification.read || notification.isRead || false,
        created_at: notification.created_at || notification.notif_timestamp || notification.timestamp,
        timestamp: notification.timestamp || notification.created_at || notification.notif_timestamp,
        isRealNotification: true
      };
    }).filter(notification => notification.id);
    
    return transformedNotifications;
  } catch (error) {
    console.error('Fetch notifications failed:', error.message);
    return [];
  }
};

// Fetch planting requests
const fetchPlantingRequests = async () => {
  try {
    let response;
    try {
      response = await apiService.getPlantingRequests();
    } catch (error) {
      console.error('Planting requests API failed:', error);
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
          formatted_request_date: formatDisplayDate(request.request_date)
        };
      })
    );
    
    return enrichedRequests;
  } catch (error) {
    console.error('Fetch planting requests failed:', error.message);
    return [];
  }
};

// Updated fetchPlantingRecords with focused debugging
const fetchPlantingRecords = async (plantingRequests) => {
  try {
    let response;
    try {
      response = await apiService.getPlantingRecords();
    } catch (error) {
      console.error('Planting records API failed:', error);
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
      return [];
    }
    
    console.log('🔍 DEBUG: Planting requests for matching:', plantingRequests);
    console.log('🔍 DEBUG: Planting records to enrich:', records);
    
    // Create maps from planting requests for user names and locations
    const userRefToNameMap = {};
    const userRefToLocationMap = {};
    
    plantingRequests.forEach((request, index) => {
      console.log(`🔍 DEBUG: Planting Request ${index}:`, {
        userRef: request.userRef,
        fullName: request.fullName,
        location_address: request.location_address,
        location: request.location,
        locationName: request.locationName,
        id: request.id
      });
      
      if (request.userRef) {
        // Store with exact userRef match
        if (request.fullName) {
          userRefToNameMap[request.userRef] = request.fullName;
        }
        
        // Check ALL possible location fields
        const location = request.location_address || request.location || request.locationName;
        console.log(`🔍 DEBUG: Location for request ${index}:`, {
          location_address: request.location_address,
          location: request.location,
          locationName: request.locationName,
          finalLocation: location
        });
        
        if (location && location !== 'Unknown Location') {
          userRefToLocationMap[request.userRef] = location;
          console.log(`✅ DEBUG: Stored location for userRef ${request.userRef}: ${location}`);
        } else {
          console.log(`❌ DEBUG: No valid location found for userRef ${request.userRef}`);
        }
      }
    });
    
    console.log('🔍 DEBUG: Final userRefToNameMap:', userRefToNameMap);
    console.log('🔍 DEBUG: Final userRefToLocationMap:', userRefToLocationMap);
    
    // Enrich records with referenced data
    const enrichedRecords = await Promise.all(
      records.map(async (record, index) => {
        try {
          console.log(`\n🔍 DEBUG: Processing record ${index}:`, {
            recordId: record.id,
            recordUserRef: record.userRef,
            recordUserRefType: typeof record.userRef
          });
          
          // Check if we can find this userRef in our maps
          const foundName = userRefToNameMap[record.userRef];
          const foundLocation = userRefToLocationMap[record.userRef];
          
          console.log(`🔍 DEBUG: Lookup results for record ${index}:`, {
            userRef: record.userRef,
            foundName: foundName,
            foundLocation: foundLocation,
            nameInMap: !!foundName,
            locationInMap: !!foundLocation
          });
          
          // If no location found, try alternative userRef formats
          if (!foundLocation) {
            console.log(`🔍 DEBUG: Trying alternative userRef formats for record ${index}`);
            
            // Try without leading slash
            const userRefWithoutSlash = record.userRef.startsWith('/') ? record.userRef.substring(1) : record.userRef;
            const altLocation1 = userRefToLocationMap[userRefWithoutSlash];
            
            // Try just the user ID part
            const userIdOnly = record.userRef.split('/').pop();
            const altLocation2 = userRefToLocationMap[userIdOnly];
            
            console.log(`🔍 DEBUG: Alternative lookups:`, {
              userRefWithoutSlash,
              altLocation1,
              userIdOnly, 
              altLocation2
            });
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
            formatted_planting_date: formatDisplayDateTime(recordDate),
            raw_record_date: recordDate
          };
          
          console.log(`✅ DEBUG: Final enriched record ${index}:`, {
            fullName: enrichedRecord.fullName,
            locationName: enrichedRecord.locationName,
            success: enrichedRecord.locationName !== 'Unknown Location'
          });
          
          return enrichedRecord;
          
        } catch (error) {
          console.error(`❌ DEBUG: Error enriching planting record ${index}:`, error);
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
            formatted_planting_date: formatDisplayDateTime(recordDate)
          };
        }
      })
    );
    
    return enrichedRecords;
  } catch (error) {
    console.error('Fetch planting records failed:', error.message);
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Data loading wrapped in useCallback to prevent infinite loops
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // First fetch notifications and planting requests
      const [notificationsData, requestsData] = await Promise.all([
        fetchNotifications().catch(error => {
          console.error('Failed to load notifications:', error);
          return [];
        }),
        fetchPlantingRequests().catch(error => {
          console.error('Failed to load planting requests:', error);
          return [];
        })
      ]);

      // Then fetch planting records using the planting requests data
      const recordsData = await fetchPlantingRecords(requestsData).catch(error => {
        console.error('Failed to load planting records:', error);
        return [];
      });

      setNotifications(notificationsData);
      setPlantingRequests(requestsData);
      setPlantingRecords(recordsData);

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
          message: 'No data available',
          severity: 'info'
        });
      }

    } catch (error) {
      console.error('Error in loadData:', error);
      setAlert({
        open: true,
        message: 'Error loading data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since loadData doesn't depend on any props or state

  useEffect(() => {
    loadData();

    const pollInterval = setInterval(() => {
      loadData();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [loadData]); // Now properly depends on loadData

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setRecordDialogOpen(true);
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
      
      // If it's a real notification, update via API
      if (notification.isRealNotification) {
        try {
          await apiService.updateNotification(notification.id, {
            isRead: true,
            read: true,
            updatedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }
      
      setAlert({
        open: true,
        message: 'Notification marked as read',
        severity: 'success'
      });
    }

    // Handle different notification types
    if (notification.type === 'plant_request' || notification.type === 'request_submitted') {
      const requestId = notification.data?.plantRequestId || notification.requestId;
      const request = plantingRequests.find(req => 
        req.id === requestId || req.requestId === requestId
      );
      if (request) {
        setSelectedRequest(request);
        setDetailDialogOpen(true);
      }
    } else if (notification.type === 'planting_record') {
      const recordId = notification.data?.plantingRecordId;
      const record = plantingRecords.find(rec => rec.id === recordId);
      if (record) {
        setSelectedRecord(record);
        setRecordDialogOpen(true);
      }
    } else {
      setSelectedNotification(notification);
      setNotificationDialogOpen(true);
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

  const NotificationRow = ({ notification }) => (
    <Paper 
      sx={{ 
        p: 2.5, 
        mb: 1.5,
        borderRadius: 2,
        borderLeft: `4px solid ${
          notification.type === 'plant_request' || notification.type === 'request_submitted' ? theme.palette.warning.main :
          notification.type === 'planting_record' ? theme.palette.success.main :
          notification.type === 'request_approved' ? theme.palette.success.main :
          notification.type === 'request_rejected' ? theme.palette.error.main :
          theme.palette.info.main
        }`,
        backgroundColor: notification.read ? 'background.paper' : alpha(theme.palette.primary.main, 0.05),
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        '&:hover': { 
          transform: 'translateY(-2px)',
          boxShadow: 3,
          backgroundColor: notification.read ? 
            alpha(theme.palette.primary.main, 0.02) : 
            alpha(theme.palette.primary.main, 0.08)
        }
      }}
      onClick={() => handleNotificationClick(notification)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Unread indicator dot */}
        {!notification.read && (
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
          color: notification.read ? 'text.secondary' : 
            (notification.type === 'plant_request' || notification.type === 'request_submitted') ? 'warning.main' :
            notification.type === 'planting_record' ? 'success.main' : 
            notification.type === 'request_approved' ? 'success.main' :
            notification.type === 'request_rejected' ? 'error.main' :
            'primary.main',
          mt: 0.5
        }}>
          {getNotificationIcon(notification.type)}
        </Box>
        
        <Box sx={{ flex: 1, pr: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: notification.read ? 500 : 700,
                color: notification.read ? 'text.primary' : 
                  (notification.type === 'plant_request' || notification.type === 'request_submitted') ? 'warning.main' :
                  notification.type === 'planting_record' ? 'success.main' : 
                  notification.type === 'request_approved' ? 'success.main' :
                  notification.type === 'request_rejected' ? 'error.main' :
                  'primary.main'
              }}
            >
              {notification.title}
            </Typography>
            <Chip 
              label={formatType(notification.type)} 
              size="small" 
              color={getStatusColor(notification.type === 'request_submitted' ? 'submitted' : notification.type)}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
            {!notification.read && (
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
          </Box>
          
          <Typography 
            variant="body2" 
            color={notification.read ? 'text.secondary' : 'text.primary'}
            sx={{ 
              mb: 1.5,
              fontWeight: notification.read ? 400 : 500
            }}
          >
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

        {/* Planting Request Details Dialog */}
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
                          label={selectedRequest.request_status || 'pending'} 
                          color={getStatusColor(selectedRequest.request_status || 'pending')}
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
                
                {/* Assigned Seedling */}
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
              onClick={() => setDetailDialogOpen(false)}
              startIcon={<CheckCircleIcon />}
              sx={{
                bgcolor: '#2e7d32',
                '&:hover': { bgcolor: '#1b5e20' }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Planting Record Details Dialog */}
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
                    Planter Information
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Name
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {selectedRecord.fullName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {selectedRecord.userEmail}
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
                          {selectedRecord.locationName}
                        </Typography>
                      </Box>
                      {selectedRecord.locationData && (
                        <>
                          {selectedRecord.locationData.location_latitude && selectedRecord.locationData.location_longitude && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Coordinates
                              </Typography>
                              <Typography variant="body2">
                                {selectedRecord.locationData.location_latitude}, {selectedRecord.locationData.location_longitude}
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
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
                          {selectedRecord.treeSeedlingName}
                        </Typography>
                        {selectedRecord.scientificName && (
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            {selectedRecord.scientificName}
                          </Typography>
                        )}
                      </Box>
                      
                      {selectedRecord.seedlingCategory && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Category
                          </Typography>
                          <Chip 
                            label={selectedRecord.seedlingCategory} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      )}
                      
                      {selectedRecord.successRate && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Success Rate
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={selectedRecord.successRate} 
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                              color={selectedRecord.successRate > 80 ? 'success' : selectedRecord.successRate > 60 ? 'warning' : 'error'}
                            />
                            <Typography variant="body2" fontWeight="600">
                              {selectedRecord.successRate}%
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Planting Date
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {selectedRecord.formatted_planting_date}
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

                      {selectedRecord.notes && selectedRecord.notes !== 'No notes' && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Planting Notes
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
