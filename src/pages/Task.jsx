// src/pages/Task.jsx - WITH UPDATED CREATION OF PLANTING TASK DATA STRUCTURE
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Alert, 
  useMediaQuery, useTheme, TextField,
  LinearProgress, Toolbar, Chip, Card, CardContent, Stack, 
  IconButton, Container, alpha,
  Divider, CircularProgress
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
  Warning as WarningIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
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
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [recommendationLocation, setRecommendationLocation] = useState('Loading location...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { id: recoId } = useParams();
  const navigate = useNavigate();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Enhanced convertTimestamp helper function
  const convertTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    try {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      if (timestamp._seconds !== undefined) {
        return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
      }
      if (timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      }
      if (timestamp instanceof Date) {
        return timestamp;
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp);
      }
      return null;
    } catch (error) {
      console.error('Error converting timestamp:', error);
      return null;
    }
  };

  // Helper function to convert Date to Firestore timestamp format
  const toFirestoreTimestamp = (date) => {
    const timestamp = date instanceof Date ? date : new Date(date);
    return {
      _seconds: Math.floor(timestamp.getTime() / 1000),
      _nanoseconds: (timestamp.getTime() % 1000) * 1000000
    };
  };

  // Format date for Firestore timestamp display (matching your example)
  const formatDateForFirestore = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' UTC+8';
  };

  // Check if request is assigned using plantingTasks
  const isRequestAssigned = (requestId) => {
    return plantingTasks.some(task => 
      task.plantingRequestRef === requestId && task.task_status === 'Assigned'
    );
  };

  // Get assigned seedling for a request from plantingTasks
  const getAssignedSeedling = (requestId) => {
    const task = plantingTasks.find(task => 
      task.plantingRequestRef === requestId && task.task_status === 'Assigned'
    );
    
    if (!task || !task.recommendation_data || !task.recommendation_data.recommendedSeedlings) return null;
    
    // Return the primary seedling (first in the array)
    return task.recommendation_data.recommendedSeedlings[0];
  };

  // Get assigned task for a request
  const getAssignedTask = (requestId) => {
    return plantingTasks.find(task => 
      task.plantingRequestRef === requestId && task.task_status === 'Assigned'
    );
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

  // Fetch user email only (fullName is already in the request)
  const fetchUserEmail = async (userRef) => {
    try {
      if (!userRef) return 'N/A';
      
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
      return userData.email || 'N/A';
    } catch (error) {
      console.error('Error fetching user email:', error);
      return 'N/A';
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
        
        // Filter for approved/pending requests and enrich with user email
        const approvedRequests = requestsData.filter(request => 
          request.request_status === 'approved' || request.request_status === 'pending'
        );
        
        console.log(`✅ ${approvedRequests.length} approved/pending requests`);

        const enrichedRequests = await Promise.all(
          approvedRequests.map(async (request) => {
            const userEmail = await fetchUserEmail(request.userRef);
            
            return {
              id: request.id,
              ...request,
              fullName: request.fullName || 'Unknown User',
              planterEmail: userEmail,
              location_address: request.location_address || request.location || 'Unknown Location',
              status: request.request_status,
              request_date: request.request_date,
              preferred_date: request.preferred_date,
              reviewedAt: convertTimestamp(request.reviewedAt),
              updatedAt: convertTimestamp(request.updatedAt)
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

  // Refresh data function
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Manually refreshing task data...');
      
      // Fetch planting tasks
      const tasksData = await apiService.getPlantingTasks();
      setPlantingTasks(tasksData);

      // Fetch planting requests
      const requestsData = await apiService.getPlantingRequests();
      const approvedRequests = requestsData.filter(request => 
        request.request_status === 'approved' || request.request_status === 'pending'
      );

      const enrichedRequests = await Promise.all(
        approvedRequests.map(async (request) => {
          const userEmail = await fetchUserEmail(request.userRef);
          return {
            id: request.id,
            ...request,
            fullName: request.fullName || 'Unknown User',
            planterEmail: userEmail,
            location_address: request.location_address || request.location || 'Unknown Location',
            status: request.request_status,
            request_date: request.request_date,
            preferred_date: request.preferred_date,
            reviewedAt: convertTimestamp(request.reviewedAt),
            updatedAt: convertTimestamp(request.updatedAt)
          };
        })
      );

      setPlantingRequests(enrichedRequests);
      
      setAlert({
        open: true,
        message: 'Data refreshed successfully!',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setAlert({
        open: true,
        message: 'Failed to refresh data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get recommended seedlings
  const getRecommendedSeedlings = () => {
    if (!currentRecommendation || !seedlings || seedlings.length === 0) {
      return [];
    }
    return seedlings;
  };

  // Filter requests based on search
  const filteredRequests = plantingRequests.filter(request => {
    const matchesSearch =
      (request.id?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.fullName?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.location_address?.toLowerCase() || "").includes(filter.toLowerCase()) ||
      (request.request_notes?.toLowerCase() || "").includes(filter.toLowerCase());
    
    return matchesSearch;
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
      console.log('📧 Creating seedling assignment notification...');
      
      // Create timestamp in exact Firestore format
      const currentDate = new Date();
      const firestoreTimestamp = {
        _seconds: Math.floor(currentDate.getTime() / 1000),
        _nanoseconds: (currentDate.getTime() % 1000) * 1000000
      };
      
      // Format the date string
      const formattedDate = formatDateForFirestore(currentDate);

      // Extract user ID from userRef
      const userId = request.userRef.includes('/') 
        ? request.userRef.split('/').pop() 
        : request.userRef;
      
      // Format targetUser correctly
      let targetUser;
      if (request.userRef.includes('/')) {
        targetUser = request.userRef.startsWith('/') 
          ? request.userRef 
          : `/${request.userRef}`;
      } else {
        targetUser = `/users/${request.userRef}`;
      }
      
      // Create the notification data
      const notificationData = {
        type: 'assigned_seedlings',
        createdAt: firestoreTimestamp,
        data: {
          locationName: request.location_address || 'Unknown Location',
          location_address: request.location_address || 'Unknown Location',
          recommendationId: currentRecommendation?.id || 'N/A',
          requestId: request.id,
          seedlingName: seedlingDetails.seedling_commonName || 'Unknown Seedling'
        },
        notif_message: `Your seedling has been assigned for planting at ${request.location_address || 'your location'}`,
        notif_timestamp: formattedDate,
        notification_type: 'assigned_seedlings',
        priority: 'high',
        read: true,
        targetRole: 'planter',
        targetUser: targetUser
      };

      console.log('📧 Sending notification:', notificationData);
      
      const notificationResult = await apiService.createNotification(notificationData);
      console.log('✅ Notification created successfully');
      return notificationResult;
      
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      
      // If backend requires validation fields, add them
      if (error.message.includes('Missing required fields') && error.message.includes('fullName')) {
        console.log('🔄 Adding validation fields...');
        
        const fallbackData = {
          type: 'assigned_seedlings',
          fullName: request.fullName || 'Planter',
          userId: request.userRef.includes('/') ? request.userRef.split('/').pop() : request.userRef,
          requestId: request.id,
          message: `Your seedling (${seedlingDetails.seedling_commonName}) has been assigned`,
          createdAt: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 },
          data: {
            locationName: request.location_address || 'Unknown Location',
            location_address: request.location_address || 'Unknown Location',
            recommendationId: currentRecommendation?.id || 'N/A',
            requestId: request.id,
            seedlingName: seedlingDetails.seedling_commonName || 'Unknown Seedling'
          },
          notif_message: `Your seedling has been assigned for planting at ${request.location_address || 'your location'}`,
          notif_timestamp: formatDateForFirestore(new Date()),
          notification_type: 'assigned_seedlings',
          priority: 'high',
          read: true,
          targetRole: 'planter',
          targetUser: request.userRef.includes('/') 
            ? request.userRef 
            : `/users/${request.userRef}`
        };
        
        const fallbackResult = await apiService.createNotification(fallbackData);
        console.log('✅ Fallback notification created');
        return fallbackResult;
      }
      
      throw error;
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

  // UPDATED: Confirm seedling assignment with exact data structure
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

      // Use all recommended seedlings (up to 3)
      const seedlingsToAssign = recommendedSeedlings.slice(0, 3);

      console.log('📋 Selected request data:', selectedRequest);

      // Extract location_id and user_id from the references
      let locationId, userId, locationData;
      
      // LOCATION EXTRACTION STRATEGY:
      if (selectedRequest.locationRef && 
          selectedRequest.locationRef !== 'Unknown Location' &&
          !selectedRequest.locationRef.includes(' ')) {
        if (selectedRequest.locationRef.includes('/')) {
          locationId = selectedRequest.locationRef.split('/').pop();
        } else if (selectedRequest.locationRef.startsWith('locations/')) {
          locationId = selectedRequest.locationRef.replace('locations/', '');
        } else {
          locationId = selectedRequest.locationRef;
        }
      } else if (selectedRequest.location_id) {
        // Fallback to location_id field
        locationId = selectedRequest.location_id;
      }

      // If locationId is still invalid or missing, create a synthetic location from request data
      if (!locationId || locationId === 'Unknown Location' || locationId.includes(' ')) {
        console.log('⚠️ No valid locationRef found, using request coordinates and address');
        
        // Validate we have the minimum required location data
        if (!selectedRequest.location_address) {
          setAlert({ 
            open: true, 
            message: 'Missing location information in the planting request', 
            severity: 'error' 
          });
          return;
        }

        // Create synthetic location data from the request
        locationId = `synthetic_${selectedRequest.id}`;
        locationData = {
          location_name: selectedRequest.location_address,
          location_latitude: String(selectedRequest.location_lat || ''),
          location_longitude: String(selectedRequest.location_lng || ''),
          created_at: new Date()
        };
        
        console.log('✅ Created synthetic location data:', locationData);
      }
      
      // Extract user_id from userRef
      if (selectedRequest.userRef.includes('/')) {
        userId = selectedRequest.userRef.split('/').pop();
      } else if (selectedRequest.userRef.startsWith('users/')) {
        userId = selectedRequest.userRef.replace('users/', '');
      } else {
        userId = selectedRequest.userRef;
      }

      console.log('✅ Extracted IDs:', { locationId, userId });

      // Fetch full location data ONLY if we don't have synthetic data
      if (!locationData) {
        locationData = await apiService.getLocationById(locationId);
        
        if (!locationData) {
          // If location fetch fails but we have coordinates, create synthetic data
          if (selectedRequest.location_lat && selectedRequest.location_lng) {
            console.log('⚠️ Location fetch failed, using request data as fallback');
            locationData = {
              location_name: selectedRequest.location_address,
              location_latitude: String(selectedRequest.location_lat),
              location_longitude: String(selectedRequest.location_lng),
              created_at: new Date()
            };
          } else {
            setAlert({ 
              open: true, 
              message: `Location data not available for ID: ${locationId}`, 
              severity: 'error' 
            });
            return;
          }
        }
      }
      console.log('✅ Location data fetched:', locationData);

      // Get current timestamp for created_at
      const currentTimestamp = toFirestoreTimestamp(new Date());
      const currentFormattedDate = formatDateForFirestore(new Date());

      // Prepare recommendation data with EXACT structure from your example
      const recommendationData = {
        confidenceScore: currentRecommendation.reco_confidenceScore || 0,
        locationData: {
          created_at: currentTimestamp,
          locationId: locationId,
          locationRef: `/locations/${locationId}`,
          location_latitude: String(locationData.location_latitude || locationData.latitude || ''),
          location_longitude: String(locationData.location_longitude || locationData.longitude || ''),
          location_name: locationData.location_name || locationData.name || ''
        },
        recommendedSeedlings: seedlingsToAssign.map(seedling => {
          // Generate timestamp ID similar to your example
          const seedlingId = `ts${Date.now()}${Math.floor(Math.random() * 1000)}`;
          
          return {
            createdAt: toFirestoreTimestamp(new Date()),
            diversityScore: 1,
            existingInArea: 0,
            id: seedlingId,
            seedling_adaptabilityScore: seedling.seedling_adaptabilityScore || 0,
            seedling_category: seedling.seedling_category || 'general',
            seedling_commonName: seedling.seedling_commonName,
            seedling_isNative: seedling.seedling_isNative || false,
            seedling_prefMoisture: seedling.seedling_prefMoisture || 0,
            seedling_prefTemp: seedling.seedling_prefTemp || 0,
            seedling_prefpH: seedling.seedling_prefpH || 0,
            seedling_scientificName: seedling.seedling_scientificName,
            seedling_successRate: seedling.seedling_successRate || 0,
            sourceRecommendationId: currentRecommendation.id
          };
        }),
        seedlingCount: seedlingsToAssign.length,
        sensorData: null,
        sensorDataRef: currentRecommendation.sensorDataRef || null
      };

      // Create timestamp for the task date
      const taskDate = new Date(selectedRequest.preferred_date);
      const taskTimestamp = toFirestoreTimestamp(taskDate);
      const taskFormattedDate = formatDateForFirestore(taskDate);

      // Create/update planting task with EXACT structure from your example
      const taskData = {
        // Top-level fields from your example
        created_at: currentTimestamp,
        location_id: locationId,
        reco_id: currentRecommendation.id,
        plantingRequestRef: selectedRequest.id, // This is the key field you wanted
        
        // Nested recommendation data
        recommendation_data: recommendationData,
        
        // Task-specific fields
        task_date: taskTimestamp,
        task_status: 'Assigned',
        user_id: userId,
        
        // Additional fields for reference
        sensorDataRef: currentRecommendation.sensorDataRef || null
      };

      console.log('📝 Creating planting task with EXACT structure:', taskData);

      // Check for existing task using plantingRequestRef
      const existingTask = plantingTasks.find(task => 
        task.plantingRequestRef === selectedRequest.id
      );
      
      let taskId;
      if (existingTask) {
        await apiService.updatePlantingTask(existingTask.id, taskData);
        taskId = existingTask.id;
        console.log(`✅ Updated planting task with ${seedlingsToAssign.length} seedlings`);
      } else {
        const newTask = await apiService.createPlantingTask(taskData);
        taskId = newTask.id;
        console.log(`✅ Created planting task with ${seedlingsToAssign.length} seedlings`);
      }

      console.log('✅ Task assignment complete');

      // Update planting request with status and task reference
      try {
        const updateData = {
          request_status: 'assigned_seedlings',
          taskRef: taskId,
          updatedAt: new Date().toISOString(),
          assigned_at: new Date().toISOString(),
          assigned_by: user?.id || 'admin'
        };
        
        console.log('🔄 Updating planting request status:', selectedRequest.id);
        
        await apiService.updatePlantingRequest(selectedRequest.id, updateData);
        
        console.log('✅ Planting request status updated to assigned_seedlings with task reference');
      } catch (updateError) {
        console.error('❌ Error updating planting request status:', updateError);
        
        // Try a different approach - update using the selectedRequest data
        try {
          console.log('🔄 Retrying with full request data...');
          
          const fullUpdateData = { ...selectedRequest };
          fullUpdateData.request_status = 'assigned_seedlings';
          fullUpdateData.taskRef = taskId;
          fullUpdateData.updatedAt = new Date().toISOString();
          fullUpdateData.assigned_at = new Date().toISOString();
          fullUpdateData.assigned_by = user?.id || 'admin';
          
          // Remove React-specific or UI-only fields
          delete fullUpdateData.planterEmail;
          delete fullUpdateData.status;
          delete fullUpdateData.reviewedAt;
          
          console.log('📝 Full update data:', fullUpdateData);
          
          await apiService.updatePlantingRequest(selectedRequest.id, fullUpdateData);
          console.log('✅ Planting request updated with full data including task reference');
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
          setAlert({ 
            open: true, 
            message: `Failed to update request: ${retryError.message}`, 
            severity: 'error' 
          });
          return;
        }
      }

      // Create notification with proper Firestore format (with error handling)
      try {
        await createSeedlingAssignmentNotification(selectedRequest, seedlingsToAssign[0]);
        console.log('✅ Notification created successfully');
      } catch (notificationError) {
        console.warn('⚠️ Notification creation failed, but continuing:', notificationError);
        setAlert({
          open: true,
          message: 'Seedlings assigned successfully, but notification failed. User may not receive notification.',
          severity: 'warning'
        });
      }

      // Force refresh all data to reflect the changes
      setIsRefreshing(true);
      
      try {
        // Refresh planting tasks data
        const updatedTasks = await apiService.getPlantingTasks();
        setPlantingTasks(updatedTasks);

        // Fetch fresh planting requests data
        const updatedRequests = await apiService.getPlantingRequests();
        console.log('🔄 Refreshed planting requests:', updatedRequests.length);
        
        // Filter for approved/pending requests and enrich with user email
        const filteredRequests = updatedRequests.filter(request => 
          request.request_status === 'approved' || 
          request.request_status === 'pending'
        );

        const enrichedRequests = await Promise.all(
          filteredRequests.map(async (request) => {
            const userEmail = await fetchUserEmail(request.userRef);
            return {
              id: request.id,
              ...request,
              fullName: request.fullName || 'Unknown User',
              planterEmail: userEmail,
              location_address: request.location_address || request.location || 'Unknown Location',
              status: request.request_status,
              request_date: request.request_date,
              preferred_date: request.preferred_date,
              reviewedAt: convertTimestamp(request.reviewedAt),
              updatedAt: convertTimestamp(request.updatedAt)
            };
          })
        );

        setPlantingRequests(enrichedRequests);
        console.log('✅ Updated planting requests state with', enrichedRequests.length, 'requests');

      } catch (refreshError) {
        console.error('❌ Error refreshing data:', refreshError);
      } finally {
        setIsRefreshing(false);
      }

      setAssignDialogOpen(false);
      setSelectedRequest(null);
      setAlert({ 
        open: true, 
        message: `${seedlingsToAssign.length} seedling(s) assigned to ${selectedRequest.fullName} successfully! Request removed from pending list.`, 
        severity: 'success' 
      });
    } catch (err) {
      console.error('❌ Error assigning seedling:', err);
      setAlert({ open: true, message: err.message, severity: 'error' });
      setIsRefreshing(false);
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

  // Format timestamp for detailed display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = convertTimestamp(timestamp);
      if (!date) return 'N/A';
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
    } catch (error) {
      return 'Invalid Timestamp';
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
    const assignedSeedling = getAssignedSeedling(request.id);
    const assignedTask = getAssignedTask(request.id);
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
                      {request.fullName}
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
                      {request.location_address}
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
                {assignedTask && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Task ID: {assignedTask.id}
                  </Typography>
                )}
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
                    ? " Ready for seedling assignment" 
                    : " Select a recommendation to assign seedlings"
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
          
          <Container maxWidth="xl" sx={{ py: 2 }}>
            {/* Loading state content remains the same */}
            {/* ... */}
          </Container>
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

          {/* Refresh loading indicator */}
          {(isRefreshing) && <LinearProgress sx={{ mb: 2 }} />}

          {/* COMPACT GREEN BACKGROUND DESIGN */}
          <Paper 
            elevation={0}
            sx={{
              background: '#2e7d32',
              borderRadius: 2,
              boxShadow: '0 2px 12px rgba(46, 125, 50, 0.3)',
              overflow: 'hidden',
              mb: 3,
              color: 'white'
            }}
          >
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3} alignItems="center">
                {/* Left Content */}
                <Grid item xs={12} lg={8}>
                  <Stack spacing={2.5}>
                    
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        p: 1,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <TreeIcon sx={{ fontSize: 20, color: 'white' }} />
                      </Box>
                      <Box>
                        <Typography variant="overline" sx={{
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '0.7rem',
                          letterSpacing: 1.2,
                          fontWeight: 600,
                          display: 'block',
                          mb: 0.25
                        }}>
                          {currentRecommendation ? 'ACTIVE RECOMMENDATION' : 'READY TO ASSIGN'}
                        </Typography>
                        <Typography variant="h6" fontWeight="700" color="white">
                          {currentRecommendation ? 'Optimal Planting Species' : 'Select Recommendation'}
                        </Typography>
                      </Box>
                    </Box>

                    {currentRecommendation && seedlings.length > 0 ? (
                      <>
                        {/* Species Section */}
                        <Box>
                          <Typography variant="caption" sx={{
                            color: 'rgba(255,255,255,0.9)',
                            textTransform: 'uppercase',
                            letterSpacing: 0.8,
                            display: 'block',
                            mb: 1.5,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            Recommended Species
                          </Typography>

                          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                            {seedlings.map((seedling) => (
                              <Box
                                key={seedling.id}
                                sx={{
                                  px: 2.5,
                                  py: 1.2,
                                  bgcolor: 'rgba(255,255,255,0.18)',
                                  borderRadius: 3,
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: '1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.2,
                                  backdropFilter: 'blur(8px)',
                                  border: '1px solid rgba(255,255,255,0.28)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}
                              >
                                <TreeIcon sx={{ fontSize: 22, opacity: 0.95 }} />
                                {seedling.seedling_commonName}
                              </Box>
                            ))}
                          </Stack>
                        </Box>

                        {/* Location & Details */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }} />
                            <Box>
                              <Typography variant="caption" sx={{ 
                                color: 'rgba(255,255,255,0.8)', 
                                display: 'block',
                                mb: 0.25,
                                fontSize: '0.7rem',
                                fontWeight: 600
                              }}>
                                Location
                              </Typography>
                              <Typography variant="body1" fontWeight="600" color="white" sx={{ fontSize: '1rem' }}>
                                {recommendationLocation}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.9)' }} />
                            <Box>
                              <Typography variant="caption" sx={{ 
                                color: 'rgba(255,255,255,0.8)', 
                                display: 'block',
                                mb: 0.25,
                                fontSize: '0.7rem',
                                fontWeight: 600
                              }}>
                                Best Season
                              </Typography>
                              <Typography variant="body1" fontWeight="600" color="white" sx={{ fontSize: '1rem' }}>
                                Year-round
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </>
                    ) : (
                      /* Empty State */
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Box sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 1.5,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <TreeIcon sx={{ fontSize: 30, color: 'white' }} />
                        </Box>
                        <Typography variant="body1" color="white" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          No Active Recommendation
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2, fontSize: '0.8rem' }}>
                          Select a recommendation to start assigning seedlings
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>

                {/* Right Content - Confidence Score */}
                <Grid item xs={12} lg={4}>
                  <Box sx={{ 
                    textAlign: 'center',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderRadius: 1.5,
                    p: 2.5,
                    backdropFilter: 'blur(15px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {currentRecommendation ? (
                      <>
                        <Typography variant="caption" sx={{
                          color: 'rgba(255,255,255,0.9)',
                          letterSpacing: 1.2,
                          display: 'block',
                          mb: 1.5,
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}>
                          CONFIDENCE SCORE
                        </Typography>
                        
                        <Box sx={{ my: 2 }}>
                          <Typography variant="h3" fontWeight="800" sx={{
                            fontSize: { xs: '2.5rem', md: '3rem' },
                            lineHeight: 1,
                            mb: 1.5,
                            color: 'white',
                            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                          }}>
                            {currentRecommendation.reco_confidenceScore}%
                          </Typography>
                          
                          <LinearProgress 
                            variant="determinate" 
                            value={currentRecommendation.reco_confidenceScore}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(255,255,255,0.2)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: 'white',
                                borderRadius: 3
                              }
                            }}
                          />
                        </Box>

                        <Typography variant="caption" sx={{ 
                          color: 'rgba(255,255,255,0.9)',
                          fontStyle: 'italic',
                          mb: 2,
                          fontSize: '0.75rem'
                        }}>
                          High confidence for optimal growth
                        </Typography>

                        <Button
                          variant="contained"
                          startIcon={<EditIcon />}
                          onClick={() => navigate('/recommendations')}
                          sx={{
                            bgcolor: 'white',
                            color: '#2e7d32',
                            fontWeight: 600,
                            py: 1,
                            borderRadius: 1.5,
                            width: '100%',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.95)',
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          Change Selection
                        </Button>
                      </>
                    ) : (
                      <>
                        <Box sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          width: 50,
                          height: 50,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 1.5,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <TreeIcon sx={{ fontSize: 24, color: 'white' }} />
                        </Box>
                        
                        <Typography variant="body1" fontWeight="600" gutterBottom sx={{ fontSize: '0.9rem' }}>
                          Get Started
                        </Typography>
                        
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2, fontSize: '0.75rem' }}>
                          Choose a recommendation to begin
                        </Typography>

                        <Button
                          variant="contained"
                          startIcon={<TreeIcon />}
                          onClick={() => navigate('/recommendations')}
                          sx={{
                            bgcolor: 'white',
                            color: '#2e7d32',
                            fontWeight: 600,
                            py: 1,
                            borderRadius: 1.5,
                            width: '100%',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.95)',
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          Select Recommendation
                        </Button>
                      </>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Main Content */}
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                  Assign Seedlings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {currentRecommendation 
                    ? 'Select planting requests to assign recommended seedlings'
                    : 'Please select a recommendation first to assign seedlings'
                  }
                </Typography>
              </Box>
              
              {/* Refresh Button */}
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshData}
                disabled={isRefreshing}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#2e7d32',
                  color: '#2e7d32',
                  '&:hover': {
                    borderColor: '#1b5e20',
                    bgcolor: alpha('#2e7d32', 0.05)
                  },
                  '&:disabled': {
                    borderColor: '#a5d6a7',
                    color: '#a5d6a7'
                  }
                }}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </Box>
              
            {/* Search and Filters with Notification Chips */}
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
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
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
                    <Typography variant="body2" color="text.secondary">
                      {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
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
                    {filter ? 'No requests match your search criteria' : 'No pending planting requests available'}
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
                <Paper elevation={0} sx={{ mb: 3, p: 3, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
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
                            {selectedRequest.fullName}
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
                            {selectedRequest.location_address}
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
                        Seedlings to Assign
                      </Typography>
                      
                      <Stack spacing={2}>
                        {recommendedSeedlings.slice(0, 3).map((seedling, index) => (
                          <Card 
                            key={seedling.id}
                            elevation={0}
                            sx={{ 
                              bgcolor: index === 0 ? alpha('#2e7d32', 0.1) : alpha('#2e7d32', 0.05), 
                              p: 2.5,
                              borderRadius: 2,
                              border: index === 0 ? '2px solid' : '1px solid',
                              borderColor: index === 0 ? '#2e7d32' : alpha('#2e7d32', 0.3),
                              position: 'relative'
                            }}
                          >
                            {index === 0 && (
                              <Chip 
                                label="Primary Choice" 
                                size="small" 
                                color="success"
                                sx={{ 
                                  position: 'absolute', 
                                  top: 12, 
                                  right: 12,
                                  fontWeight: 700
                                }}
                              />
                            )}
                            
                            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ 
                                  bgcolor: index === 0 ? '#2e7d32' : alpha('#2e7d32', 0.7), 
                                  p: 1.5, 
                                  borderRadius: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <TreeIcon sx={{ color: 'white', fontSize: 28 }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6" fontWeight={index === 0 ? 700 : 600} gutterBottom>
                                    {seedling.seedling_commonName}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {seedling.seedling_scientificName}
                                  </Typography>
                                  {seedling.seedling_isNative && (
                                    <Chip 
                                      icon={<EcoIcon />} 
                                      label="Native Species" 
                                      color="success" 
                                      size="small"
                                      variant={index === 0 ? "filled" : "outlined"}
                                      sx={{ mt: 1, fontWeight: 600 }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {recommendedSeedlings.length > 3 && (
                          <Alert severity="info" sx={{ borderRadius: 2 }}>
                            <Typography variant="body2">
                              + {recommendedSeedlings.length - 3} additional seedling option{recommendedSeedlings.length - 3 !== 1 ? 's' : ''} available
                            </Typography>
                          </Alert>
                        )}
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Alert severity="info" icon={<InfoIcon />} sx={{ borderRadius: 2 }}>
                          <Typography variant="body2" fontWeight="600">
                            The primary choice will be assigned to this request
                          </Typography>
                        </Alert>
                      </Stack>
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
              disabled={!selectedRequest || getRecommendedSeedlings().length === 0 || isRefreshing}
              sx={{ 
                minWidth: '160px',
                fontWeight: 600,
                bgcolor: '#2e7d32',
                '&:hover': {
                  bgcolor: '#1b5e20'
                },
                '&:disabled': {
                  bgcolor: '#a5d6a7'
                }
              }}
            >
              {isRefreshing ? 'Assigning...' : 'Confirm & Notify'}
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
                          {selectedRequest.fullName}
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
                          {selectedRequest.location_address}
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
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRequest.location_address)}`;
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
                      {/* Updated At Timestamp Display */}
                      {selectedRequest.updatedAt && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Last Updated
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {formatTimestamp(selectedRequest.updatedAt)}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </Box>

                {/* Assigned Seedling */}
                {(() => {
                  const assignedTask = getAssignedTask(selectedRequest.id);
                  const assignedSeedling = getAssignedSeedling(selectedRequest.id);
                  
                  if (assignedSeedling && assignedTask) {
                    return (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TreeIcon color="success" /> Assigned Task Details
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
                                Primary Seedling
                              </Typography>
                              <Typography variant="body1" fontWeight="600">
                                {assignedSeedling.seedling_commonName}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Scientific Name
                              </Typography>
                              <Typography variant="body1">
                                {assignedSeedling.seedling_scientificName}
                              </Typography>
                            </Box>
                            {assignedSeedling.seedling_isNative && (
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
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Task Status
                              </Typography>
                              <Chip 
                                label={assignedTask.task_status} 
                                color="success" 
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                            {assignedTask.updated_at && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                  Task Last Updated
                                </Typography>
                                <Typography variant="body2" fontWeight="600">
                                  {formatTimestamp(assignedTask.updated_at)}
                                </Typography>
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
