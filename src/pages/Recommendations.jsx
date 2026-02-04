// src/pages/Recommendations.js - REAL-TIME UPDATED VERSION WITH API SERVICE INTEGRATION
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  TableContainer,
  TablePagination,
  TextField,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  Divider,
  CardContent,
  LinearProgress,
  Avatar,
  Toolbar,
  Alert,
  Snackbar,
  CircularProgress,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as ExecuteIcon,
  TrendingUp as ConfidenceIcon,
  Science as AlgorithmIcon,
  CheckCircle as CheckCircleIcon,
  NewReleases as NewReleasesIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  FiberManualRecord as UnreadIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { apiService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

const drawerWidth = 240;

// Enhanced cache manager
const cacheManager = {
  cache: new Map(),
  listeners: new Set(),
  
  set(key, data, expiry = 300000) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + expiry,
      timestamp: Date.now()
    });
    this.notifyListeners(key, 'update');
  },
  
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      this.notifyListeners(key, 'expire');
      return null;
    }
    
    return cached.data;
  },
  
  clear() {
    this.cache.clear();
    this.notifyListeners('all', 'clear');
  },
  
  invalidate(key) {
    this.cache.delete(key);
    this.notifyListeners(key, 'invalidate');
  },
  
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  
  notifyListeners(key, action) {
    this.listeners.forEach(listener => listener(key, action));
  }
};

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filter, setFilter] = useState('');
  const [selectedReco, setSelectedReco] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recoToDelete, setRecoToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentMLResult, setRecentMLResult] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    new: 0
  });
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const isLoadingRef = useRef(false);
  const wsRef = useRef(null);
  const lastPollRef = useRef(Date.now());
  const newRecommendationsRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);

  // ============================================================================
  // REAL-TIME WEBSOCKET SETUP USING YOUR API BASE URL
  // ============================================================================

  const setupWebSocket = useCallback(() => {
    if (!realTimeEnabled || !apiService.baseURL) {
      console.log('WebSocket disabled or no API URL');
      return;
    }
    
    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Extract host from API base URL
      let wsUrl;
      try {
        const url = new URL(apiService.baseURL);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${url.host}/ws`;
      } catch (e) {
        // Fallback to default WebSocket URL
        wsUrl = 'ws://localhost:5000/ws';
      }

      console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        
        // Subscribe to recommendations updates
        const subscribeMessage = {
          type: 'subscribe',
          channel: 'recommendations',
          userId: user?.id
        };
        ws.send(JSON.stringify(subscribeMessage));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 WebSocket message:', data.type);

          switch (data.type) {
            case 'recommendation_created':
              handleNewRecommendation(data.payload);
              break;
            case 'recommendation_updated':
              handleUpdatedRecommendation(data.payload);
              break;
            case 'recommendation_deleted':
              handleDeletedRecommendation(data.payload);
              break;
            case 'ml_result_ready':
              handleMLResult(data.payload);
              break;
            case 'heartbeat':
              // Keep connection alive
              ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
              break;
            case 'connection_established':
              console.log('✅ WebSocket connection established');
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setWsConnected(false);
        
        // Attempt reconnection after delay
        if (realTimeEnabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect WebSocket...');
            setupWebSocket();
          }, 5000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      setWsConnected(false);
    }
  }, [realTimeEnabled, user?.id]);

  // ============================================================================
  // REAL-TIME HANDLERS
  // ============================================================================

  const handleNewRecommendation = useCallback((newReco) => {
    console.log('🆕 New recommendation received:', newReco);
    
    const recoId = newReco.id || newReco.reco_id;
    if (!recoId) return;
    
    // Add to new recommendations set
    newRecommendationsRef.current.add(recoId);
    
    // Update unread count
    setUnreadCount(prev => prev + 1);
    
    // Invalidate cache
    apiService.invalidateCache('/api/recommendations');
    cacheManager.invalidate('recommendations-list');
    
    // Refresh data with a short delay
    setTimeout(() => {
      loadRecommendations();
    }, 1000);
    
    // Show notification
    setSuccess(`New recommendation ${recoId} received!`);
  }, []);

  const handleUpdatedRecommendation = useCallback((updatedReco) => {
    console.log('🔄 Recommendation updated:', updatedReco);
    
    const recoId = updatedReco.id || updatedReco.reco_id;
    
    // Update local state
    setRecommendations(prev => prev.map(reco => 
      reco.id === recoId || reco.reco_id === recoId
        ? { 
            ...reco, 
            ...updatedReco, 
            updatedAt: new Date().toISOString(),
            // Update confidence score if provided
            reco_confidenceScore: updatedReco.reco_confidenceScore || 
                                 updatedReco.confidenceScore || 
                                 reco.reco_confidenceScore,
            // Update status if provided
            status: updatedReco.status || generateStatus(updatedReco.reco_confidenceScore) || reco.status
          }
        : reco
    ));
    
    // Invalidate cache
    apiService.invalidateCache('/api/recommendations');
    cacheManager.invalidate('recommendations-list');
    cacheManager.invalidate(`recommendation-${recoId}`);
  }, []);

  const handleDeletedRecommendation = useCallback((deletedReco) => {
    console.log('🗑️ Recommendation deleted:', deletedReco);
    
    const recoId = deletedReco.id || deletedReco.reco_id;
    
    // Update local state
    setRecommendations(prev => prev.filter(reco => 
      reco.id !== recoId && reco.reco_id !== recoId
    ));
    
    // Remove from new recommendations if it was there
    if (newRecommendationsRef.current.has(recoId)) {
      newRecommendationsRef.current.delete(recoId);
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    // Invalidate cache
    apiService.invalidateCache('/api/recommendations');
    cacheManager.invalidate('recommendations-list');
    
    setSuccess(`Recommendation ${recoId} was deleted`);
  }, []);

  const handleMLResult = useCallback((mlResult) => {
    console.log('🤖 ML Result ready:', mlResult);
    
    // Store in local storage for cross-tab communication
    const resultWithTimestamp = {
      ...mlResult,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('lastMLResult', JSON.stringify(resultWithTimestamp));
    
    // Update state
    setRecentMLResult(resultWithTimestamp);
    
    // Show notification
    setSuccess('New ML analysis complete! Generating recommendations...');
    
    // Refresh recommendations after a delay
    setTimeout(() => {
      apiService.clearAllCache();
      cacheManager.clear();
      loadRecommendations();
    }, 2000);
  }, []);

  // ============================================================================
  // LOCALSTORAGE LISTENER FOR CROSS-TAB UPDATES
  // ============================================================================

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'lastMLResult' && event.newValue) {
        try {
          const result = JSON.parse(event.newValue);
          if (result.timestamp && Date.now() - new Date(result.timestamp).getTime() < 300000) {
            console.log('📦 ML result updated from another tab');
            setRecentMLResult(result);
            setSuccess('New ML analysis detected from another tab!');
          }
        } catch (e) {
          console.error('Failed to parse localStorage ML result:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ============================================================================
  // INITIALIZE REAL-TIME SYSTEM
  // ============================================================================

  useEffect(() => {
    if (realTimeEnabled) {
      setupWebSocket();
      
      // Setup cache listener for automatic refreshes
      const unsubscribe = cacheManager.subscribe((key, action) => {
        if (key === 'recommendations-list' && (action === 'invalidate' || action === 'clear')) {
          console.log('🔄 Cache invalidated, refreshing data...');
          loadRecommendations();
        }
      });
      
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        unsubscribe();
      };
    }
  }, [realTimeEnabled, setupWebSocket]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const extractSensorId = (sensorDataRef) => {
    if (!sensorDataRef || sensorDataRef === 'N/A') {
      return 'N/A';
    }
    
    try {
      const parts = sensorDataRef.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return parts[1];
      } else if (parts.length === 1) {
        return parts[0];
      }
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  const generateStatus = (confidenceScore) => {
    const score = typeof confidenceScore === 'string' ? parseFloat(confidenceScore) : confidenceScore;
    const scorePercent = score > 1 ? score : score * 100;
    
    if (scorePercent >= 85) return 'Approved';
    if (scorePercent >= 70) return 'Pending';
    if (scorePercent >= 50) return 'Under Review';
    return 'Needs Review';
  };

  // ============================================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================================

  const fetchSensorData = useCallback((sensorDataRef, sensorConditions) => {
    const sensorId = extractSensorId(sensorDataRef);
    
    return {
      sensorId: sensorId,
      soilMoisture: sensorConditions?.soilMoisture || sensorConditions?.moisture || 0,
      temperature: sensorConditions?.temperature || sensorConditions?.temp || 0,
      pH: sensorConditions?.pH || sensorConditions?.ph || 0,
      timestamp: new Date().toISOString(),
      ...sensorConditions
    };
  }, []);

  const fetchAllLocations = useCallback(async (locationRefs) => {
    const uniqueLocationIds = new Set();
    const locationMap = new Map();
    
    locationRefs.forEach(ref => {
      if (!ref || ref === 'N/A') return;
      
      const parts = ref.split('/').filter(Boolean);
      let locationId;
      
      if (parts.length >= 2) {
        locationId = parts[1];
      } else if (parts.length === 1) {
        locationId = parts[0];
      }
      
      if (locationId) {
        uniqueLocationIds.add(locationId);
      }
    });

    const uncachedIds = [];
    uniqueLocationIds.forEach(id => {
      const cached = cacheManager.get(`location-${id}`);
      if (cached) {
        locationMap.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    });

    if (uncachedIds.length > 0) {
      const locationPromises = uncachedIds.map(async (locationId) => {
        try {
          const locationData = await apiService.getLocationById(locationId);
          
          const result = {
            locationId: locationId,
            location_name: locationData?.location_name || locationData?.name || `Location ${locationId}`,
            location_latitude: locationData?.location_latitude || locationData?.latitude || 'N/A',
            location_longitude: locationData?.location_longitude || locationData?.longitude || 'N/A',
            ...locationData
          };
          
          cacheManager.set(`location-${locationId}`, result);
          return { id: locationId, data: result };
        } catch (error) {
          console.warn(`Failed to fetch location ${locationId}:`, error.message);
          const fallback = {
            locationId: locationId,
            location_name: `Location ${locationId}`,
            location_latitude: 'N/A',
            location_longitude: 'N/A'
          };
          return { id: locationId, data: fallback };
        }
      });

      const results = await Promise.all(locationPromises);
      results.forEach(({ id, data }) => {
        locationMap.set(id, data);
      });
    }

    return locationMap;
  }, []);

  const fetchAllSeedlings = useCallback(async (allSeedlingRefs) => {
    const uniqueSeedlingIds = new Set();
    const seedlingMap = new Map();
    
    allSeedlingRefs.forEach(refs => {
      if (!Array.isArray(refs)) return;
      
      refs.forEach(refPath => {
        const seedlingId = refPath.split('/').pop();
        if (seedlingId) {
          uniqueSeedlingIds.add(seedlingId);
        }
      });
    });

    const uncachedIds = [];
    uniqueSeedlingIds.forEach(id => {
      const cached = cacheManager.get(`seedling-${id}`);
      if (cached) {
        seedlingMap.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    });

    if (uncachedIds.length > 0) {
      const seedlingPromises = uncachedIds.map(async (seedlingId) => {
        try {
          const seedlingData = await apiService.getTreeSeedlingById(seedlingId);
          
          if (seedlingData) {
            const result = {
              seedling_id: seedlingId,
              commonName: seedlingData.seedling_commonName || seedlingData.commonName || 'Unknown',
              scientificName: seedlingData.seedling_scientificName || seedlingData.scientificName || 'Unknown',
              prefMoisture: parseFloat(seedlingData.seedling_prefMoisture || seedlingData.prefMoisture) || 0,
              prefTemp: parseFloat(seedlingData.seedling_prefTemp || seedlingData.prefTemp) || 0,
              prefpH: parseFloat(seedlingData.seedling_prefpH || seedlingData.prefpH) || 0,
              isNative: seedlingData.seedling_isNative === true || seedlingData.isNative === true,
              confidenceScore: 0.8 + Math.random() * 0.2
            };
            
            cacheManager.set(`seedling-${seedlingId}`, result);
            return { id: seedlingId, data: result };
          }
          return null;
        } catch (error) {
          console.warn(`Failed to fetch seedling ${seedlingId}:`, error.message);
          return null;
        }
      });

      const results = await Promise.all(seedlingPromises);
      results.forEach(result => {
        if (result) {
          seedlingMap.set(result.id, result.data);
        }
      });
    }

    return seedlingMap;
  }, []);

  // ============================================================================
  // MAIN LOAD FUNCTION
  // ============================================================================

  const loadRecommendations = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      console.log('📡 Loading recommendations...');
      const recommendationsData = await apiService.getRecommendations();

      if (!recommendationsData || !Array.isArray(recommendationsData)) {
        console.log('No recommendations data received');
        setRecommendations([]);
        return;
      }

      const validRecommendations = recommendationsData.filter(reco => !reco.deleted);

      if (validRecommendations.length === 0) {
        console.log('No valid recommendations');
        setRecommendations([]);
        return;
      }

      console.log(`Processing ${validRecommendations.length} recommendations`);

      const locationRefs = validRecommendations.map(reco => reco.locationRef);
      const allSeedlingRefs = validRecommendations.map(reco => reco.seedlingOptions || []);

      const [locationMap, seedlingMap] = await Promise.all([
        fetchAllLocations(locationRefs),
        fetchAllSeedlings(allSeedlingRefs)
      ]);

      const processedRecommendations = validRecommendations.map(reco => {
        try {
          const sensorData = fetchSensorData(reco.sensorDataRef, reco.sensorConditions);
          
          const locationParts = (reco.locationRef || '').split('/').filter(Boolean);
          let locationId = locationParts.length >= 2 ? locationParts[1] : (locationParts.length === 1 ? locationParts[0] : 'unknown');
          const locationData = locationMap.get(locationId) || {
            locationId: 'unknown',
            location_name: 'Unknown Location',
            location_latitude: 'N/A',
            location_longitude: 'N/A'
          };
          
          let seedlings = [];
          if (Array.isArray(reco.seedlingOptions) && reco.seedlingOptions.length > 0) {
            seedlings = reco.seedlingOptions
              .map(refPath => {
                const seedlingId = refPath.split('/').pop();
                return seedlingMap.get(seedlingId);
              })
              .filter(Boolean);
          }

          let confidenceScore;
          if (typeof reco.reco_confidenceScore === 'string') {
            confidenceScore = parseFloat(reco.reco_confidenceScore);
          } else if (typeof reco.reco_confidenceScore === 'number') {
            confidenceScore = reco.reco_confidenceScore;
          } else {
            confidenceScore = 0.85;
          }

          const confidencePercentage = confidenceScore > 1
            ? Math.min(Math.round(confidenceScore), 100)
            : Math.round(confidenceScore * 100);

          const status = generateStatus(confidenceScore);

          let generatedDate;
          try {
            if (reco.reco_generatedAt) {
              generatedDate = new Date(reco.reco_generatedAt).toISOString();
            } else if (reco.createdAt) {
              generatedDate = reco.createdAt;
            } else {
              generatedDate = new Date().toISOString();
            }
          } catch (dateError) {
            generatedDate = new Date().toISOString();
          }

          // Check if this is a new recommendation
          const recoId = reco.id || reco.reco_id;
          const isNew = newRecommendationsRef.current.has(recoId);
          
          return {
            id: recoId,
            reco_id: recoId,
            sensorDataRef: reco.sensorDataRef || 'N/A',
            locationRef: reco.locationRef || 'N/A',
            sensorData: sensorData,
            locationData: locationData,
            reco_confidenceScore: confidencePercentage,
            reco_generatedAt: generatedDate,
            status,
            recommendedSeedlings: seedlings,
            seedlingCount: seedlings.length,
            deleted: false,
            season: reco.season || 'unknown',
            sensorConditions: reco.sensorConditions || {},
            isNew: isNew,
            updatedAt: new Date().toISOString()
          };
        } catch (recoError) {
          console.error('Error processing recommendation:', recoError);
          return null;
        }
      }).filter(reco => reco !== null);

      setRecommendations(processedRecommendations);
      
      // Update stats
      const newStats = {
        total: processedRecommendations.length,
        approved: processedRecommendations.filter(r => r.status === 'Approved').length,
        pending: processedRecommendations.filter(r => r.status === 'Pending').length,
        new: processedRecommendations.filter(r => r.isNew).length
      };
      setStats(newStats);
      
      setLastUpdate(new Date());
      console.log(`✅ Loaded ${processedRecommendations.length} recommendations`);
      
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setError("Failed to load recommendations: " + error.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [fetchSensorData, fetchAllLocations, fetchAllSeedlings]);

  // ============================================================================
  // POLLING FALLBACK
  // ============================================================================

  useEffect(() => {
    loadRecommendations();

    // Polling fallback for when WebSocket is not available
    const pollInterval = setInterval(() => {
      if (!isLoadingRef.current && document.visibilityState === 'visible') {
        // Poll only if WebSocket is not connected or real-time is disabled
        if (!realTimeEnabled || !wsConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('🔄 Polling for updates...');
          loadRecommendations();
        }
      }
    }, 60000); // 1 minute

    return () => {
      clearInterval(pollInterval);
      isLoadingRef.current = false;
    };
  }, [loadRecommendations, realTimeEnabled, wsConnected]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    lastPollRef.current = Date.now();
    apiService.clearAllCache();
    cacheManager.clear();
    setLastUpdate(new Date());
    loadRecommendations();
  }, [loadRecommendations]);

  const handleToggleRealTime = (event) => {
    setRealTimeEnabled(event.target.checked);
  };

  const handleImplementRecommendation = async (reco) => {
    try {
      setSaving(true);
      setError(null);
      
      if (!reco.locationData) {
        throw new Error('Location data is missing.');
      }
      
      if (!reco.locationData.locationId || reco.locationData.locationId === 'unknown') {
        throw new Error('Location ID is missing or invalid.');
      }
      
      const taskData = {
        user_id: user?.id || user?.uid || 'USER001',
        reco_id: reco.reco_id,
        location_id: reco.locationData.locationId,
        task_status: 'assigned',
        task_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        recommendation_data: {
          sensorDataRef: reco.sensorDataRef,
          locationRef: reco.locationRef,
          confidenceScore: reco.reco_confidenceScore,
          seedlingCount: reco.seedlingCount,
          sensorData: reco.sensorData,
          locationData: reco.locationData,
          recommendedSeedlings: reco.recommendedSeedlings
        }
      };

      await apiService.createPlantingTask(taskData);

      setSuccess("Recommendation implemented successfully!");
      
      // Clear cache for planting tasks
      apiService.invalidateCache('/api/plantingtasks');
      
      setTimeout(() => {
        navigate(`/tasks/${reco.reco_id}`);
      }, 1500);

    } catch (error) {
      let errorMessage = 'Failed to create planting task. ';
      if (error.message.includes('Network Error')) {
        errorMessage += 'Please check your internet connection.';
      } else if (error.message.includes('Location')) {
        errorMessage += error.message;
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRowClick = (reco) => {
    setSelectedReco(reco);
    setOpenDialog(true);
    
    // Mark as read if it's new
    if (reco.isNew) {
      newRecommendationsRef.current.delete(reco.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setRecommendations(prev => prev.map(r => 
        r.id === reco.id ? { ...r, isNew: false } : r
      ));
    }
  };

  const handleDeleteClick = (reco, event) => {
    event.stopPropagation();
    setRecoToDelete(reco);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    try {
      if (!recoToDelete) return;
      setSaving(true);

      await apiService.deleteRecommendation(recoToDelete.id);

      setSuccess("Recommendation deleted successfully!");
      setDeleteDialogOpen(false);
      setRecoToDelete(null);
      
      // Clear caches
      apiService.clearAllCache();
      cacheManager.clear();
      loadRecommendations();
    } catch (error) {
      setError('Failed to delete recommendation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setRecoToDelete(null);
  };

  const markAllAsRead = () => {
    newRecommendationsRef.current.clear();
    setUnreadCount(0);
    setRecommendations(prev => prev.map(reco => ({ ...reco, isNew: false })));
    setSuccess('All recommendations marked as read');
  };

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  const filteredRecommendations = recommendations.filter(reco => {
    if (reco.deleted) return false;
    
    const matchesSearch = reco.reco_id.toLowerCase().includes(filter.toLowerCase()) ||
                         (reco.locationData?.location_name || '').toLowerCase().includes(filter.toLowerCase()) ||
                         (reco.sensorData?.sensorId || '').toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = filterStatus === 'all' || reco.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Under Review': return 'info';
      case 'Needs Review': return 'error';
      case 'Implemented': return 'primary';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReco(null);
  };

  const statusTypes = [...new Set(recommendations.map(reco => reco.status))];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        
        <Box sx={{ width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Recent ML Result Banner */}
          {recentMLResult && (
            <Alert 
              severity="info" 
              sx={{ mb: 3, borderRadius: 2 }}
              icon={<NewReleasesIcon />}
              onClose={() => setRecentMLResult(null)}
            >
              <Typography variant="body1" fontWeight="medium">
                New ML Analysis Complete!
              </Typography>
              <Typography variant="body2">
                Generated {recentMLResult.recommendationCount || 1} new recommendation(s) based on latest sensor data.
              </Typography>
            </Alert>
          )}

          {/* Connection Status */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Planting Recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {lastUpdate && ` Updated: ${lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              
              {unreadCount > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<CheckCircleIcon />}
                  onClick={markAllAsRead}
                  sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                >
                  Mark All Read
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleManualRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ backgroundColor: '#2e7d32' }}
                onClick={() => navigate('/sensor')}
              >
                Generate New
              </Button>
            </Box>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search recommendations"
                  variant="outlined"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by ID, Location, or Sensor"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status Filter</InputLabel>
                  <Select value={filterStatus} label="Status Filter" onChange={(e) => setFilterStatus(e.target.value)}>
                    <MenuItem value="all">All Status</MenuItem>
                    {statusTypes.map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress size={40} sx={{ color: '#2e7d32', mr: 2 }} />
              <Typography variant="body1" color="textSecondary">
                Loading recommendations...
              </Typography>
            </Box>
          ) : filteredRecommendations.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Typography variant="body1" color="textSecondary">
                No recommendations found.
              </Typography>
            </Box>
          ) : (
            <>
              <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                        <TableCell width="5%"><Typography variant="subtitle2" fontWeight="bold"></Typography></TableCell>
                        <TableCell width="15%"><Typography variant="subtitle2" fontWeight="bold">Recommendation ID</Typography></TableCell>
                        <TableCell width="20%"><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                        <TableCell width="15%"><Typography variant="subtitle2" fontWeight="bold">Sensor Data</Typography></TableCell>
                        <TableCell width="10%"><Typography variant="subtitle2" fontWeight="bold">Seedlings</Typography></TableCell>
                        <TableCell width="15%"><Typography variant="subtitle2" fontWeight="bold">Confidence</Typography></TableCell>
                        <TableCell width="10%"><Typography variant="subtitle2" fontWeight="bold">Generated</Typography></TableCell>
                        <TableCell width="10%"><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                        <TableCell align="center" width="10%"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRecommendations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((reco) => (
                        <TableRow 
                          key={reco.id} 
                          hover 
                          sx={{ 
                            '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)', cursor: 'pointer' },
                            transition: 'background-color 0.2s',
                            borderLeft: reco.isNew ? `4px solid ${theme.palette.warning.main}` : 'none'
                          }}
                          onClick={() => handleRowClick(reco)}
                        >
                          <TableCell>
                            {reco.isNew && (
                              <Tooltip title="New recommendation">
                                <UnreadIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">{reco.reco_id}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {reco.locationData?.location_name || 'Unknown Location'}
                              </Typography>
                              {reco.locationData && (
                                <Typography variant="caption" color="text.secondary">
                                  {reco.locationData.location_latitude}, {reco.locationData.location_longitude}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              {reco.sensorData ? (
                                <>
                                  <Typography variant="body2" fontWeight="medium">
                                    Sensor {reco.sensorData.sensorId}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Moisture: {reco.sensorData.soilMoisture}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Temp: {reco.sensorData.temperature}°C
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2" color="text.secondary">No data</Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${reco.seedlingCount} seedlings`} 
                              color="primary" 
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress
                                variant="determinate"
                                value={reco.reco_confidenceScore}
                                color={getConfidenceColor(reco.reco_confidenceScore)}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="body2" sx={{ mt: 0.5, textAlign: 'center' }}>
                                {reco.reco_confidenceScore}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {reco.reco_generatedAt
                                ? new Date(reco.reco_generatedAt).toLocaleDateString()
                                : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={reco.status} color={getStatusColor(reco.status)} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Implement Recommendation">
                              <IconButton 
                                color="primary" 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImplementRecommendation(reco);
                                }}
                                disabled={saving}
                                sx={{ 
                                  '&:hover': { 
                                    backgroundColor: 'rgba(46, 125, 50, 0.1)' 
                                  } 
                                }}
                              >
                                {saving ? <CircularProgress size={20} /> : <ExecuteIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Recommendation">
                              <IconButton 
                                color="error" 
                                size="small"
                                onClick={(e) => handleDeleteClick(reco, e)}
                                sx={{ 
                                  '&:hover': { 
                                    backgroundColor: 'rgba(211, 47, 47, 0.1)' 
                                  } 
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredRecommendations.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </Paper>
            </>
          )}

          {/* Detail Dialog - Same as before */}
          <Dialog
            open={openDialog}
            onClose={handleCloseDialog}
            maxWidth="sm"
            fullWidth={false}
            PaperProps={{
              sx: { borderRadius: 1, width: '100%', maxWidth: 650 },
            }}
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  <AlgorithmIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Recommendation Details
                </Typography>
              </Box>
            </DialogTitle>

            <DialogContent dividers>
              {selectedReco && (
                <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
                  <Grid container spacing={3}>
                    {/* Details content - same as before */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Recommendation Summary
                          </Typography>
                          <Typography variant="h6" sx={{ mb: 1 }}>
                            {selectedReco.reco_id}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Status:</strong>
                            </Typography>
                            <Chip
                              label={selectedReco.status}
                              color={getStatusColor(selectedReco.status)}
                              size="small"
                            />
                          </Box>

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <strong>Generated:</strong>{' '}
                            {selectedReco.reco_generatedAt
                              ? new Date(selectedReco.reco_generatedAt).toLocaleString()
                              : 'N/A'}
                          </Typography>

                          <Divider sx={{ my: 2 }} />

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Source Data
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Sensor:</strong>{' '}
                                {selectedReco.sensorData ? selectedReco.sensorData.sensorId : 'N/A'}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Location:</strong>{' '}
                                {selectedReco.locationData?.location_name || 'N/A'}
                              </Typography>
                              {selectedReco.locationData && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Coordinates:</strong>{' '}
                                  {selectedReco.locationData.location_latitude},{' '}
                                  {selectedReco.locationData.location_longitude}
                                </Typography>
                              )}
                            </Grid>

                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Environmental Conditions
                              </Typography>

                              {selectedReco.sensorData ? (
                                <>
                                  <Typography variant="body2">
                                    Soil Moisture: {selectedReco.sensorData.soilMoisture}%
                                  </Typography>
                                  <Typography variant="body2">
                                    Temperature: {selectedReco.sensorData.temperature}°C
                                  </Typography>
                                  <Typography variant="body2">
                                    pH Level: {selectedReco.sensorData.pH}
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No sensor data available
                                </Typography>
                              )}
                            </Grid>
                          </Grid>

                          <Divider sx={{ my: 2 }} />

                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Overall Algorithm Confidence
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: '100%' }}>
                              <LinearProgress
                                variant="determinate"
                                value={selectedReco.reco_confidenceScore}
                                color={getConfidenceColor(selectedReco.reco_confidenceScore)}
                                sx={{ height: 10, borderRadius: 4 }}
                              />
                            </Box>
                            <Typography variant="h6">
                              {selectedReco.reco_confidenceScore}%
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Recommended Seedlings */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Recommended Seedlings ({selectedReco.recommendedSeedlings.length})
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', pb: 1 }}>
                            {selectedReco.recommendedSeedlings.map((seedling, idx) => (
                              <Card
                                key={seedling.seedling_id}
                                variant="outlined"
                                sx={{
                                  minWidth: 180,
                                  bgcolor: '#f9fbe7',
                                  textAlign: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <CardContent>
                                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1, gap: 1 }}>
                                    <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, fontSize: 14 }}>
                                      {idx + 1}
                                    </Avatar>
                                    <Chip
                                      size="small"
                                      label={seedling.isNative ? 'Native' : 'Non-native'}
                                      color={seedling.isNative ? 'success' : 'default'}
                                      variant="outlined"
                                    />
                                  </Box>

                                  <Typography variant="body2" fontWeight="medium">
                                    {seedling.commonName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    {seedling.scientificName}
                                  </Typography>

                                  <Typography variant="caption" display="block">
                                    Moisture: {seedling.prefMoisture}%
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Temp: {seedling.prefTemp}°C
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    pH: {seedling.prefpH}
                                  </Typography>
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleImplementRecommendation(selectedReco);
                  handleCloseDialog();
                }}
                disabled={saving}
                sx={{ bgcolor: '#2e7d32' }}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <ExecuteIcon />}
              >
                {saving ? 'Implementing...' : 'Implement'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="sm" fullWidth>
            <DialogTitle>Delete Recommendation</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete recommendation <strong>"{recoToDelete?.reco_id}"</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This action will permanently remove the recommendation from the system.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={cancelDelete} disabled={saving}>Cancel</Button>
              <Button 
                onClick={confirmDelete} 
                color="error" 
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
              >
                {saving ? "Deleting..." : "Delete"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity="success" 
            onClose={() => setSuccess(false)} 
            sx={{ width: '100%', borderRadius: 2 }}
            icon={<CheckCircleIcon />}
          >
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

export default Recommendations;
