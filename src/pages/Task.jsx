// src/pages/Task.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Alert, 
  useMediaQuery, useTheme, TextField,
  LinearProgress, Toolbar, Chip, Card, CardContent, Stack, 
  Switch, FormControlLabel, IconButton, Container, alpha,
  Avatar
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle as CheckCircleIcon,
  Park as TreeIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  LocalFlorist as EcoIcon,
  Assignment as TaskIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowBack as BackIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api.js';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';

const drawerWidth = 240;

const SeedlingAssignmentPage = () => {
  const { user, logout } = useAuth();
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [currentRecommendation, setCurrentRecommendation] = useState(null);
  const [seedlings, setSeedlings] = useState([]);
  const [plantingTasks, setPlantingTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [recommendationLocation, setRecommendationLocation] = useState('Loading location...');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { id: recoId } = useParams();
  const navigate = useNavigate();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Convert timestamp helper function
  const convertTimestamp = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000);
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return null;
  };

  // Check if request is assigned using plantingTasks
  const isRequestAssigned = (requestId) => {
    return plantingTasks.some(task => 
      task.reqRef === requestId && task.seedlingRef
    );
  };

  // Get assigned seedling for a request from plantingTasks
  const getAssignedSeedling = (requestId) => {
    const task = plantingTasks.find(task => 
      task.reqRef === requestId && task.seedlingRef
    );
    
    if (!task) return null;
    
    if (typeof task.seedlingRef === 'string') {
      return task.seedlingRef.includes('/') 
        ? task.seedlingRef.split('/').pop() 
        : task.seedlingRef;
    } else if (task.seedlingRef?.path) {
      return task.seedlingRef.path.split('/').pop();
    } else if (task.seedlingRef?.id) {
      return task.seedlingRef.id;
    }
    
    return null;
  };

  // Fetch specific seedlings using API service
  const fetchSpecificSeedlings = async (seedlingIds) => {
    try {
      const seedlingPromises = seedlingIds.map(async (seedlingId) => {
        try {
          const seedling = await apiService.getTreeSeedlingById(seedlingId);
          return { id: seedlingId, ...seedling };
        } catch (error) {
          console.error(`Error fetching seedling ${seedlingId}:`, error);
          return null;
        }
      });

      const seedlingsData = await Promise.all(seedlingPromises);
      return seedlingsData.filter(seedling => seedling !== null);
    } catch (error) {
      console.error('Error fetching specific seedlings:', error);
      return [];
    }
  };

  // Fetch user data using API service - robust version
  const fetchUserData = async (userRef) => {
    try {
      if (!userRef) return { email: 'N/A', fullName: 'Unknown User' };
      
      let userId;
      
      // Handle different reference formats
      if (userRef.includes('/')) {
        userId = userRef.split('/').pop();
      } else if (userRef.startsWith('users/')) {
        userId = userRef.replace('users/', '');
      } else {
        userId = userRef;
      }
      
      const userData = await apiService.getUser(userId);
      
      // Construct full name from firstName, middleName, and lastName
      const fullName = `${userData.firstName || ''} ${userData.middleName || ''} ${userData.lastName || ''}`.trim().replace(/\s+/g, ' ') || 'Unknown User';
      
      return {
        email: userData.email || 'N/A',
        fullName: fullName
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { email: 'N/A', fullName: 'Unknown User' };
    }
  };

  // Fetch location data using API service - robust version
  const fetchLocationData = async (locationRef) => {
    try {
      if (!locationRef) return { name: 'Unknown Location' };
      
      let locationName;
      
      // Handle different reference formats
      if (locationRef.includes('/')) {
        locationName = locationRef.split('/').pop();
      } else if (locationRef.startsWith('locations/')) {
        locationName = locationRef.replace('locations/', '');
      } else {
        locationName = locationRef;
      }
      
      return {
        name: locationName || 'Unknown Location'
      };
    } catch (error) {
      console.error('Error fetching location data:', error);
      return { name: 'Unknown Location' };
    }
  };

  // Enhanced location data fetcher for recommendation header
  const fetchRecommendationLocation = async (locationRef) => {
    try {
      if (!locationRef) return 'Multiple Locations';
      
      let locationId;
      
      // Handle different reference formats
      if (locationRef.includes('/')) {
        locationId = locationRef.split('/').pop();
      } else if (locationRef.startsWith('locations/')) {
        locationId = locationRef.replace('locations/', '');
      } else {
        locationId = locationRef;
      }
      
      try {
        const locationData = await apiService.getLocationById(locationId);
        return locationData?.location_name || locationData?.name || `Location ${locationId}`;
      } catch (error) {
        console.error('Error fetching recommendation location:', error);
        return `Location ${locationId}`;
      }
    } catch (error) {
      console.error('Error processing location reference:', error);
      return 'Multiple Locations';
    }
  };

  // Fetch recommendation data if recoId exists
  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!recoId) {
        setLoading(false);
        return;
      }

      try {
        console.log('📋 Fetching recommendation:', recoId);
        
        const recoData = await apiService.getRecommendationById(recoId);
        
        if (!recoData) {
          setAlert({ 
            open: true, 
            message: 'Recommendation not found', 
            severity: 'error' 
          });
          setLoading(false);
          return;
        }

        console.log('✅ Recommendation data loaded:', recoData);

        // Fetch seedlings from recommendation
        const seedlingIds = recoData.seedlingOptions?.map(path => path.split('/').pop()) || [];
        const fetchedSeedlings = await fetchSpecificSeedlings(seedlingIds);
        
        setCurrentRecommendation({
          id: recoId,
          ...recoData
        });
        setSeedlings(fetchedSeedlings);

        // Fetch location name for the recommendation header
        if (recoData.locationRef) {
          const locationName = await fetchRecommendationLocation(recoData.locationRef);
          setRecommendationLocation(locationName);
        } else {
          setRecommendationLocation('Multiple Locations');
        }
        
      } catch (error) {
        console.error('❌ Error fetching recommendation:', error);
        setAlert({ 
          open: true, 
          message: 'Error loading recommendation: ' + error.message, 
          severity: 'error' 
        });
      }
    };

    fetchRecommendation();
  }, [recoId]);

  // Fetch ALL data needed for the page
  useEffect(() => {
    setLoading(true);
    
    const fetchData = async () => {
      try {
        console.log('🔄 Fetching all task assignment data...');

        // Fetch ALL approved planting requests using API service
        const requestsData = await apiService.getPlantingRequests();
        console.log(`📋 Found ${requestsData.length} planting requests`);
        
        // Filter for approved/pending requests and enrich with user and location data
        const approvedRequests = requestsData.filter(request => 
          request.request_status === 'approved' || request.request_status === 'pending'
        );
        
        console.log(`✅ ${approvedRequests.length} approved/pending requests`);

        const enrichedRequests = await Promise.all(
          approvedRequests.map(async (request) => {
            const userData = await fetchUserData(request.userRef);
            const locationData = await fetchLocationData(request.locationRef);
            
            return {
              id: request.id,
              ...request,
              planterName: userData.fullName,
              planterEmail: userData.email,
              locationName: locationData.name,
              status: request.request_status,
              request_date: request.request_date,
              preferred_date: request.preferred_date,
              reviewedAt: convertTimestamp(request.reviewedAt)
            };
          })
        );
        
        setPlantingRequests(enrichedRequests);

        // Fetch planting tasks to check assignments
        const tasksData = await apiService.getPlantingTasks();
        console.log(`📋 Found ${tasksData.length} planting tasks`);
        setPlantingTasks(tasksData);

        setLoading(false);
        console.log('✅ All data loaded successfully');

      } catch (error) {
        console.error("❌ Error fetching data:", error);
        setAlert({ 
          open: true, 
          message: 'Error loading data: ' + error.message, 
          severity: 'error' 
        });
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get recommended seedlings
  const getRecommendedSeedlings = () => {
    if (!currentRecommendation || !seedlings || seedlings.length === 0) {
      return [];
    }
    return seedlings;
  };

  // Filter requests based on search and assignment status
  const filteredRequests = plantingRequests.filter(request => {
    const matchesSearch =
      (request.id?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.planterName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.locationName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.request_notes?.toLowerCase() || "").includes(filter.toLowerCase());

    const hasAssignment = isRequestAssigned(request.id);
    const matchesAssignmentFilter = !showOnlyUnassigned || !hasAssignment;
    
    return matchesSearch && matchesAssignmentFilter;
  });

  // Calculate statistics
  const stats = {
    total: plantingRequests.length,
    unassigned: plantingRequests.filter(request => !isRequestAssigned(request.id)).length,
    assigned: plantingRequests.filter(request => isRequestAssigned(request.id)).length,
    urgent: plantingRequests.filter(request => {
      const plantDate = new Date(request.preferred_date);
      const today = new Date();
      const daysUntil = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    }).length
  };

  // Create notification for seedling assignment
  const createSeedlingAssignmentNotification = async (request, seedlingDetails) => {
    try {
      const currentTimestamp = new Date().toISOString();
      
      // Ensure targetUser is in the correct format
      let targetUser = request.userRef;
      if (!targetUser.includes('/') && !targetUser.startsWith('users/')) {
        targetUser = `users/${targetUser}`;
      }
      
      const notificationData = {
        notification_type: 'pending',
        notif_message: `Your seedling has been assigned for planting at ${request.locationName}`,
        data: {
          requestId: request.id,
          locationName: request.locationName,
          recommendationId: currentRecommendation?.id,
          seedlingName: seedlingDetails.seedling_commonName
        },
        targetUser: targetUser,
        targetRole: 'planter',
        read: false,
        priority: 'high',
        notif_timestamp: currentTimestamp,
        createdAt: currentTimestamp
      };

      console.log('📧 Creating notification:', {
        targetUser: notificationData.targetUser,
        message: notificationData.notif_message,
        read: notificationData.read
      });
      
      const result = await apiService.createNotification(notificationData);
      console.log('✅ Notification created with ID:', result.id);
      
      return result;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return null;
    }
  };

  const handleAssignSeedling = (request) => {
    if (!currentRecommendation) {
      setAlert({ 
        open: true, 
        message: 'Please select a recommendation first to assign seedlings', 
        severity: 'warning' 
      });
      return;
    }
    setSelectedRequest(request);
    setAssignDialogOpen(true);
  };
  
  // Confirm seedling assignment
  const handleConfirmAssignment = async () => {
    try {
      if (!selectedRequest || !currentRecommendation) return;

      const recommendedSeedlings = getRecommendedSeedlings();
      
      if (recommendedSeedlings.length === 0) {
        setAlert({ 
          open: true, 
          message: 'No recommended seedlings available', 
          severity: 'warning' 
        });
        return;
      }

      // Use the first recommended seedling
      const assignedSeedling = recommendedSeedlings[0];

      // Extract location_id and user_id from the references
      let locationId, userId;
      
      // Extract location_id from locationRef
      if (selectedRequest.locationRef.includes('/')) {
        locationId = selectedRequest.locationRef.split('/').pop();
      } else if (selectedRequest.locationRef.startsWith('locations/')) {
        locationId = selectedRequest.locationRef.replace('locations/', '');
      } else {
        locationId = selectedRequest.locationRef;
      }
      
      // Extract user_id from userRef
      if (selectedRequest.userRef.includes('/')) {
        userId = selectedRequest.userRef.split('/').pop();
      } else if (selectedRequest.userRef.startsWith('users/')) {
        userId = selectedRequest.userRef.replace('users/', '');
      } else {
        userId = selectedRequest.userRef;
      }

      // Create/update planting task with seedling assignment
      const taskData = {
        user_id: userId,
        location_id: locationId,
        reqRef: selectedRequest.id,
        recoRef: currentRecommendation.id,
        seedlingRef: assignedSeedling.id,
        task_status: 'assigned',
        task_date: selectedRequest.preferred_date,
        assigned_date: new Date().toISOString(),
        assigned_by: user.id,
        createdAt: new Date().toISOString()
      };

      console.log('📝 Creating planting task with data:', taskData);

      const existingTask = plantingTasks.find(task => 
        task.reqRef === selectedRequest.id
      );
      
      let taskId;
      if (existingTask) {
        await apiService.updatePlantingTask(existingTask.id, taskData);
        taskId = existingTask.id;
        console.log(`✅ Updated planting task with seedling: ${assignedSeedling.seedling_commonName}`);
      } else {
        const newTask = await apiService.createPlantingTask(taskData);
        taskId = newTask.id;
        console.log(`✅ Created planting task with seedling: ${assignedSeedling.seedling_commonName}`);
      }

      // Update the planting request status
      await apiService.updatePlantingRequest(selectedRequest.id, {
        status: 'assigned_seedling',
        reviewedBy: user.id
      });

      // Create notification
      await createSeedlingAssignmentNotification(selectedRequest, assignedSeedling);

      // Refresh planting tasks data
      const updatedTasks = await apiService.getPlantingTasks();
      setPlantingTasks(updatedTasks);

      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setAlert({ 
        open: true, 
        message: `${assignedSeedling.seedling_commonName} assigned to ${selectedRequest.planterName} successfully!`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('❌ Error assigning seedling:', err);
      setAlert({ open: true, message: err.message, severity: 'error' });
    }
  };

  // Handle view request details
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
        return date;
      }
      
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      return String(date);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get priority level for request
  const getPriorityLevel = (request) => {
    try {
      const plantDate = new Date(request.preferred_date);
      const today = new Date();
      const daysUntil = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) return { level: 'overdue', color: 'error', label: 'Overdue', days: Math.abs(daysUntil) };
      if (daysUntil <= 7) return { level: 'urgent', color: 'error', label: 'Urgent', days: daysUntil };
      if (daysUntil <= 14) return { level: 'medium', color: 'warning', label: 'Soon', days: daysUntil };
      return { level: 'normal', color: 'info', label: 'Normal', days: daysUntil };
    } catch {
      return { level: 'normal', color: 'info', label: 'Normal', days: 0 };
    }
  };

  // Request Row Component - Clean Design
  const RequestRow = ({ request, onAssignSeedling, onViewRequest }) => {
    const priority = getPriorityLevel(request);
    const recommendedSeedlings = getRecommendedSeedlings();
    const isAssigned = isRequestAssigned(request.id);
    const assignedSeedlingId = getAssignedSeedling(request.id);
    const assignedSeedling = assignedSeedlingId ? seedlings.find(s => s.id === assignedSeedlingId) : null;
    const hasRecommendation = !!currentRecommendation;

    return (
      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          mb: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': { 
            borderColor: '#2e7d32',
            bgcolor: alpha('#2e7d32', 0.02)
          }
        }}
        onClick={() => onViewRequest(request)}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip 
                label={priority.label} 
                color={priority.color} 
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="body2" color="text.secondary">
                {priority.level === 'overdue' 
                  ? `Overdue by ${priority.days} days`
                  : `${priority.days} days remaining`
                }
              </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    bgcolor: alpha('#2e7d32', 0.1), 
                    p: 1, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PersonIcon sx={{ color: '#2e7d32', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                      Planter
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {request.planterName}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    bgcolor: alpha('#2e7d32', 0.1), 
                    p: 1, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <LocationIcon sx={{ color: '#2e7d32', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                      Location
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {request.locationName}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    bgcolor: alpha('#ed6c02', 0.1), 
                    p: 1, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CalendarIcon sx={{ color: '#ed6c02', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                      Plant Date
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {formatDate(request.preferred_date)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {isAssigned && assignedSeedling ? (
              <Alert 
                severity="success" 
                icon={<CheckCircleIcon />}
                sx={{ 
                  borderRadius: 1,
                  bgcolor: alpha('#2e7d32', 0.05)
                }}
              >
                <Typography variant="body2" fontWeight="600">
                  ✓ Assigned: {assignedSeedling.seedling_commonName}
                </Typography>
              </Alert>
            ) : (
              <Alert 
                severity={hasRecommendation ? "info" : "warning"}
                icon={hasRecommendation ? <InfoIcon /> : <WarningIcon />}
                sx={{ 
                  borderRadius: 1,
                  bgcolor: hasRecommendation ? alpha('#1976d2', 0.05) : alpha('#ed6c02', 0.05)
                }}
              >
                <Typography variant="body2" fontWeight="600">
                  {hasRecommendation 
                    ? "Ready for seedling assignment" 
                    : "Select a recommendation to assign seedlings"
                  }
                </Typography>
              </Alert>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="contained"
              size="medium"
              onClick={() => onAssignSeedling(request)}
              color={isAssigned ? "success" : "primary"}
              sx={{ 
                minWidth: '120px',
                fontWeight: 600,
                bgcolor: isAssigned ? '#2e7d32' : '#2e7d32',
                '&:hover': {
                  bgcolor: isAssigned ? '#1b5e20' : '#2e7d32'
                }
              }}
              disabled={!hasRecommendation || recommendedSeedlings.length === 0}
            >
              {isAssigned ? "Reassign" : "Assign"}
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f5f7fa', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <LinearProgress sx={{ color: '#2e7d32' }} />
          <Typography sx={{ mt: 2 }}>Loading assignment data...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {alert.open && (
            <Alert 
              severity={alert.severity} 
              onClose={() => setAlert({ ...alert, open: false })}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              {alert.message}
            </Alert>
          )}

          {/* Recommendation Header with Location */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              mb: 3, 
              borderRadius: 3,
              background: currentRecommendation 
                ? 'linear-gradient(135deg, #37983cff 0%, #1b5e20 100%)'
                : 'linear-gradient(135deg, #666666 0%, #424242 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80,
                      bgcolor: 'white',
                      color: currentRecommendation ? '#2e7d32' : '#666666',
                      fontSize: '2rem',
                      fontWeight: 700,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      border: '4px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    <TreeIcon />
                  </Avatar>
                  
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.9, fontSize: '0.75rem', letterSpacing: 1 }}>
                      {currentRecommendation ? 'Active Recommendation' : 'No Recommendation Selected'}
                    </Typography>
                    <Typography variant="h4" fontWeight="700" sx={{ lineHeight: 1.2, mb: 1 }}>
                      {currentRecommendation 
                        ? `${seedlings.length} Seedling${seedlings.length !== 1 ? 's' : ''} Available`
                        : 'Select a Recommendation'
                      }
                    </Typography>
                    
                    {/* Location Information */}
                    {currentRecommendation && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <LocationIcon sx={{ fontSize: 20, opacity: 0.9 }} />
                        <Typography variant="body1" sx={{ opacity: 0.95, fontWeight: 500 }}>
                          {recommendationLocation}
                        </Typography>
                        <Chip 
                          label={`${currentRecommendation.reco_confidenceScore}% Confidence`}
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            color: 'white',
                            fontWeight: 600,
                            ml: 1
                          }}
                        />
                      </Box>
                    )}
                    
                    {currentRecommendation && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {seedlings.slice(0, 3).map((s, idx) => (
                          <Chip 
                            key={idx}
                            icon={<EcoIcon />}
                            label={s.seedling_commonName}
                            sx={{ 
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                        ))}
                        {seedlings.length > 3 && (
                          <Chip 
                            label={`+${seedlings.length - 3} more`}
                            sx={{ 
                              bgcolor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={2} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  {currentRecommendation ? (
                    <>
                      <Box>
                        <Typography variant="h2" fontWeight="800" sx={{ lineHeight: 1, mb: 0.5 }}>
                          {currentRecommendation.reco_confidenceScore}%
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.95, fontWeight: 500 }}>
                          Confidence Score
                        </Typography>
                      </Box>
                      
                      <Button 
                        startIcon={<EditIcon />}
                        variant="contained"
                        onClick={() => navigate('/recommendations')}
                        sx={{ 
                          bgcolor: 'white',
                          color: '#2e7d32',
                          fontWeight: 600,
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.9)'
                          }
                        }}
                      >
                        Change Recommendation
                      </Button>
                    </>
                  ) : (
                    <>
                      <Box>
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 0.5 }}>
                          Ready to Assign
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Choose a recommendation to begin
                        </Typography>
                      </Box>
                      
                      <Button 
                        startIcon={<TreeIcon />}
                        variant="contained"
                        onClick={() => navigate('/recommendations')}
                        sx={{ 
                          bgcolor: 'white',
                          color: '#666666',
                          fontWeight: 600,
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.9)'
                          }
                        }}
                      >
                        Select Recommendation
                      </Button>
                    </>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Main Content */}
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                  Assign Seedlings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {currentRecommendation 
                    ? 'Select planting requests to assign recommended seedlings'
                    : 'Please select a recommendation first to assign seedlings'
                  }
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip 
                  icon={<TaskIcon />} 
                  label={`${stats.unassigned} Unassigned`} 
                  color="warning" 
                  variant="outlined"
                />
                {stats.urgent > 0 && (
                  <Chip 
                    icon={<WarningIcon />} 
                    label={`${stats.urgent} Urgent`} 
                    color="error"
                  />
                )}
              </Box>
            </Box>
              
            {/* Search and Filters */}
            <Paper elevation={0} sx={{ mb: 3, p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search requests"
                    variant="outlined"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search by planter, location..."
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showOnlyUnassigned}
                        onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Show only unassigned"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Typography variant="body2" color="text.secondary">
                    {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Requests List */}
            <Box>
              {filteredRequests.length === 0 ? (
                <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <TreeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No planting requests found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {showOnlyUnassigned 
                      ? 'All pending requests have been assigned' 
                      : 'No pending planting requests available'
                    }
                  </Typography>
                </Paper>
              ) : (
                filteredRequests.map((request) => (
                  <RequestRow 
                    key={request.id} 
                    request={request} 
                    onAssignSeedling={handleAssignSeedling}
                    onViewRequest={handleViewRequest}
                  />
                ))
              )}
            </Box>
          </Box>
        </Container>

        {/* Assignment Dialog */}
        <Dialog 
          open={assignDialogOpen} 
          onClose={() => setAssignDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: '#2e7d32', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TreeIcon sx={{ fontSize: 28 }} /> 
              <Typography variant="h6" fontWeight="700">
                Confirm Seedling Assignment
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setAssignDialogOpen(false)} 
              sx={{ color: 'white' }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedRequest && (
              <Box>
                {/* Request Details */}
                <Paper elevation={0} sx={{ mb: 3, p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 2 }}>
                    Request Details
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <PersonIcon color="primary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Planter
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {selectedRequest.planterName}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CalendarIcon color="primary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Planting Date
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {formatDate(selectedRequest.preferred_date)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LocationIcon color="primary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Location
                          </Typography>
                          <Typography variant="body1" fontWeight="600">
                            {selectedRequest.locationName}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>

                  {selectedRequest.request_notes && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="600">
                        Notes:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedRequest.request_notes}
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {/* Seedling Assignment */}
                {(() => {
                  const recommendedSeedlings = getRecommendedSeedlings();
                  
                  if (recommendedSeedlings.length === 0) {
                    return (
                      <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                          No seedlings available for this recommendation.
                        </Typography>
                      </Alert>
                    );
                  }

                  return (
                    <>
                      <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 2 }}>
                        Seedling to Assign
                      </Typography>
                      
                      <Card 
                        elevation={0}
                        sx={{ 
                          bgcolor: alpha('#2e7d32', 0.05), 
                          p: 3,
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: '#2e7d32'
                        }}
                      >
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ 
                              bgcolor: '#2e7d32', 
                              p: 1.5, 
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <TreeIcon sx={{ color: 'white', fontSize: 32 }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" fontWeight="700" gutterBottom>
                                {recommendedSeedlings[0].seedling_commonName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {recommendedSeedlings[0].seedling_scientificName}
                              </Typography>
                              {recommendedSeedlings[0].seedling_isNative && (
                                <Chip 
                                  icon={<EcoIcon />} 
                                  label="Native Species" 
                                  color="success" 
                                  size="small"
                                  sx={{ mt: 1, fontWeight: 600 }}
                                />
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setAssignDialogOpen(false)}
              variant="outlined"
              sx={{ minWidth: '100px' }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="success"
              onClick={handleConfirmAssignment}
              disabled={!selectedRequest || getRecommendedSeedlings().length === 0}
              sx={{ 
                minWidth: '160px',
                fontWeight: 600,
                bgcolor: '#2e7d32',
                '&:hover': {
                  bgcolor: '#1b5e20'
                }
              }}
            >
              Confirm & Notify
            </Button>
          </DialogActions>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog 
          open={detailDialogOpen} 
          onClose={() => setDetailDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: 'grey.50',
            borderBottom: 1,
            borderColor: 'divider',
            p: 3
          }}>
            <Typography variant="h6" fontWeight="600">
              Request Details
            </Typography>
            <IconButton 
              onClick={() => setDetailDialogOpen(false)} 
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedRequest && (
              <Stack spacing={3}>
                {/* Planter Information */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="primary" /> Planter Information
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Name
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {selectedRequest.planterName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {selectedRequest.planterEmail}
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Box>

                {/* Location as Button */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon color="primary" /> Location
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body1" fontWeight="600">
                          {selectedRequest.locationName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Planting location
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<LocationIcon />}
                        onClick={() => {
                          // Open Google Maps with the location
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRequest.locationName)}`;
                          window.open(mapsUrl, '_blank');
                        }}
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: '#2e7d32',
                          color: '#2e7d32',
                          '&:hover': {
                            borderColor: '#1b5e20',
                            bgcolor: alpha('#2e7d32', 0.05)
                          }
                        }}
                      >
                        View on Map
                      </Button>
                    </Box>
                  </Card>
                </Box>

                {/* Request Details */}
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon color="primary" /> Request Details
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Request Date
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {formatDate(selectedRequest.request_date)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Preferred Planting Date
                        </Typography>
                        <Typography variant="body1" fontWeight="600">
                          {formatDate(selectedRequest.preferred_date)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Status
                        </Typography>
                        <Chip 
                          label={selectedRequest.status} 
                          color={selectedRequest.status === 'approved' ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      {selectedRequest.request_notes && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Additional Notes
                          </Typography>
                          <Paper 
                            elevation={0} 
                            sx={{ 
                              p: 1.5, 
                              bgcolor: 'grey.50', 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="body2">
                              {selectedRequest.request_notes}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </Box>

                {/* Assigned Seedling */}
                {(() => {
                  const assignedSeedlingId = getAssignedSeedling(selectedRequest.id);
                  if (assignedSeedlingId) {
                    const seedling = seedlings.find(s => s.id === assignedSeedlingId);
                    return (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TreeIcon color="success" /> Assigned Seedling
                        </Typography>
                        <Card 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            bgcolor: alpha('#2e7d32', 0.05),
                            border: '2px solid',
                            borderColor: alpha('#2e7d32', 0.3)
                          }}
                        >
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Common Name
                              </Typography>
                              <Typography variant="body1" fontWeight="600">
                                {seedling?.seedling_commonName}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Scientific Name
                              </Typography>
                              <Typography variant="body1">
                                {seedling?.seedling_scientificName}
                              </Typography>
                            </Box>
                            {seedling?.seedling_isNative && (
                              <Box>
                                <Chip 
                                  icon={<EcoIcon />} 
                                  label="Native Species" 
                                  color="success" 
                                  size="small"
                                  sx={{ fontWeight: 600 }}
                                />
                              </Box>
                            )}
                          </Stack>
                        </Card>
                      </Box>
                    );
                  }
                  return null;
                })()}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              variant="contained" 
              onClick={() => {
                setDetailDialogOpen(false);
                handleAssignSeedling(selectedRequest);
              }}
              startIcon={<CheckCircleIcon />}
              disabled={!currentRecommendation || getRecommendedSeedlings().length === 0}
              sx={{
                bgcolor: '#2e7d32',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#1b5e20'
                }
              }}
            >
              Assign Seedling
            </Button>
            <Button 
              onClick={() => setDetailDialogOpen(false)}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default SeedlingAssignmentPage;
