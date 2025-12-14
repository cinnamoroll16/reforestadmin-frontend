// src/pages/Recommendations.js - OPTIMIZED VERSION (UI UNCHANGED)
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as ExecuteIcon,
  TrendingUp as ConfidenceIcon,
  Science as AlgorithmIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { apiService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

const drawerWidth = 240;

// Cache manager to prevent duplicate API calls
const cacheManager = {
  cache: new Map(),
  locationCache: new Map(),
  seedlingCache: new Map(),
  
  set(key, data, expiry = 30000) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + expiry,
      timestamp: Date.now()
    });
  },
  
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  },
  
  setLocation(id, data) {
    this.locationCache.set(id, {
      data,
      timestamp: Date.now()
    });
  },
  
  getLocation(id) {
    const cached = this.locationCache.get(id);
    if (!cached) return null;
    
    // Location cache lasts longer (5 minutes)
    if (Date.now() - cached.timestamp > 300000) {
      this.locationCache.delete(id);
      return null;
    }
    
    return cached.data;
  },
  
  clear() {
    this.cache.clear();
    this.locationCache.clear();
    this.seedlingCache.clear();
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
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Refs to track loading state and prevent duplicates
  const isLoadingRef = useRef(false);
  const pendingRequestsRef = useRef(new Map());

  const getDefaultSensorData = () => {
    return {
      sensorId: 'N/A',
      soilMoisture: 0,
      temperature: 0,
      pH: 0,
      timestamp: new Date().toISOString()
    };
  };

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
  // OPTIMIZED FETCH FUNCTIONS
  // ============================================================================

  const fetchSensorData = useCallback((sensorDataRef, sensorConditions) => {
    // No API call needed - use sensorConditions directly
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

  // OPTIMIZED: Fetch location data with caching and request deduplication
  const fetchLocationData = useCallback(async (locationRef) => {
    if (!locationRef || locationRef === 'N/A') {
      return {
        locationId: 'unknown',
        location_name: 'Unknown Location',
        location_latitude: 'N/A',
        location_longitude: 'N/A'
      };
    }
    
    const parts = locationRef.split('/').filter(Boolean);
    let locationId;
    
    if (parts.length >= 2) {
      locationId = parts[1];
    } else if (parts.length === 1) {
      locationId = parts[0];
    } else {
      return {
        locationId: 'unknown',
        location_name: 'Unknown Location',
        location_latitude: 'N/A',
        location_longitude: 'N/A'
      };
    }
    
    // Check cache first
    const cachedLocation = cacheManager.getLocation(locationId);
    if (cachedLocation) {
      return cachedLocation;
    }
    
    // Check if request is already in progress
    if (pendingRequestsRef.current.has(locationId)) {
      return pendingRequestsRef.current.get(locationId);
    }
    
    // Create fetch promise
    const fetchPromise = (async () => {
      try {
        const locationData = await apiService.getLocationById(locationId);
        
        const result = {
          locationId: locationId,
          location_name: locationData?.location_name || locationData?.name || `Location ${locationId}`,
          location_latitude: locationData?.location_latitude || locationData?.latitude || 'N/A',
          location_longitude: locationData?.location_longitude || locationData?.longitude || 'N/A',
          ...locationData
        };
        
        // Cache the result
        cacheManager.setLocation(locationId, result);
        pendingRequestsRef.current.delete(locationId);
        
        return result;
      } catch (apiError) {
        pendingRequestsRef.current.delete(locationId);
        return {
          locationId: locationId,
          location_name: `Location ${locationId}`,
          location_latitude: 'N/A',
          location_longitude: 'N/A'
        };
      }
    })();
    
    // Store promise to prevent duplicate requests
    pendingRequestsRef.current.set(locationId, fetchPromise);
    
    return fetchPromise;
  }, []);

  // OPTIMIZED: Fetch seedlings with caching
  const fetchSeedlingsForRecommendation = useCallback(async (seedlingRefs) => {
    if (!Array.isArray(seedlingRefs) || seedlingRefs.length === 0) {
      return [];
    }
    
    const cacheKey = `seedlings-${seedlingRefs.join(',')}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const seedlings = await Promise.all(
        seedlingRefs.map(async (refPath) => {
          const seedlingId = refPath.split('/').pop();
          const seedlingCacheKey = `seedling-${seedlingId}`;
          const cachedSeedling = cacheManager.get(seedlingCacheKey);
          
          if (cachedSeedling) {
            return cachedSeedling;
          }
          
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
              
              cacheManager.set(seedlingCacheKey, result);
              return result;
            }
            return null;
          } catch (error) {
            return null;
          }
        })
      );

      const filteredSeedlings = seedlings.filter(Boolean);
      cacheManager.set(cacheKey, filteredSeedlings);
      return filteredSeedlings;
    } catch (error) {
      return [];
    }
  }, []);

  // ============================================================================
  // OPTIMIZED LOADING FUNCTION
  // ============================================================================

  const loadRecommendations = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // Get recommendations - check cache first
      const cacheKey = 'recommendations-list';
      const cachedRecos = cacheManager.get(cacheKey);
      
      let recommendationsData;
      if (cachedRecos) {
        recommendationsData = cachedRecos;
      } else {
        recommendationsData = await apiService.getRecommendations();
        cacheManager.set(cacheKey, recommendationsData);
      }

      if (!recommendationsData || !Array.isArray(recommendationsData)) {
        setRecommendations([]);
        return;
      }

      if (recommendationsData.length === 0) {
        setRecommendations([]);
        return;
      }

      // Process recommendations in batches to prevent overload
      const batchSize = 2;
      const processedRecommendations = [];
      
      for (let i = 0; i < recommendationsData.length; i += batchSize) {
        const batch = recommendationsData.slice(i, i + batchSize);
        
        const processedBatch = await Promise.all(
          batch.map(async (reco) => {
            if (reco.deleted === true) {
              return null;
            }

            if (!reco.id && !reco.reco_id) {
              return null;
            }

            try {
              const sensorData = fetchSensorData(reco.sensorDataRef, reco.sensorConditions);
              
              const locationData = await fetchLocationData(reco.locationRef);
              
              let seedlings = [];
              if (Array.isArray(reco.seedlingOptions) && reco.seedlingOptions.length > 0) {
                seedlings = await fetchSeedlingsForRecommendation(reco.seedlingOptions);
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

              return {
                id: reco.id || reco.reco_id,
                reco_id: reco.id || reco.reco_id,
                sensorDataRef: reco.sensorDataRef || 'N/A',
                locationRef: reco.locationRef || 'N/A',
                sensorData: sensorData,
                locationData: locationData,
                reco_confidenceScore: confidencePercentage,
                reco_generatedAt: generatedDate,
                status,
                recommendedSeedlings: seedlings,
                seedlingCount: seedlings.length,
                deleted: reco.deleted || false,
                season: reco.season || 'unknown',
                sensorConditions: reco.sensorConditions || {}
              };
            } catch (recoError) {
              return null;
            }
          })
        );
        
        processedRecommendations.push(...processedBatch.filter(reco => reco !== null));
        
        // Update state with processed batch for progressive loading
        if (processedRecommendations.length > 0) {
          setRecommendations([...processedRecommendations]);
        }
      }
      
      // Cache the final processed list
      cacheManager.set('processed-recommendations', processedRecommendations);
      
    } catch (error) {
      setError("Failed to load recommendations: " + error.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
      pendingRequestsRef.current.clear();
    }
  }, [fetchSensorData, fetchLocationData, fetchSeedlingsForRecommendation]);

  // ============================================================================
  // OTHER HANDLERS (UNCHANGED)
  // ============================================================================

  const handleImplementRecommendation = async (reco) => {
    try {
      setSaving(true);
      setError(null);
      
      if (!reco.locationData) {
        throw new Error('Location data is missing. The recommendation may be corrupted.');
      }
      
      if (!reco.locationData.locationId || reco.locationData.locationId === 'unknown') {
        throw new Error('Location ID is missing or invalid. Cannot create planting task.');
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

      const result = await apiService.createPlantingTask(taskData);

      setSuccess("Recommendation implemented successfully!");
      
      setTimeout(() => {
        navigate(`/tasks/${reco.reco_id}`);
      }, 1500);

    } catch (error) {
      let errorMessage = 'Failed to create planting task. ';
      if (error.message.includes('Network Error')) {
        errorMessage += 'Please check your internet connection and try again.';
      } else if (error.message.includes('Location')) {
        errorMessage += error.message;
      } else if (error.message.includes('corrupted')) {
        errorMessage += 'The recommendation data is incomplete. Please try generating a new recommendation.';
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
      
      // Clear cache and reload
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

  // ============================================================================
  // USE EFFECTS
  // ============================================================================

  useEffect(() => {
    loadRecommendations();

    // Cleaner polling - only poll if tab is visible
    const pollInterval = setInterval(() => {
      if (!isLoadingRef.current && document.visibilityState === 'visible') {
        loadRecommendations();
      }
    }, 60000); // Increased to 60 seconds

    return () => {
      clearInterval(pollInterval);
      isLoadingRef.current = false;
      pendingRequestsRef.current.clear();
    };
  }, [loadRecommendations]);

  // ============================================================================
  // UI HELPERS (UNCHANGED - YOUR ORIGINAL CODE)
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
  // RENDER (YOUR EXACT ORIGINAL UI CODE - NO CHANGES)
  // ============================================================================

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />

      {/* Side Navigation */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        
        <Box sx={{ width: '100%' }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Planting Recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''} generated by ML algorithm
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ backgroundColor: '#2e7d32' }}
              onClick={() => navigate('/sensor')}
            >
              Generate New
            </Button>
          </Box>

          {/* Loading State */}
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Filters */}
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

          {/* Loading or Empty State */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <CircularProgress size={40} sx={{ color: '#2e7d32', mr: 2 }} />
              <Typography variant="body1" color="textSecondary">
                Loading recommendations...
              </Typography>
            </Box>
          ) : recommendations.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Typography variant="body1" color="textSecondary">
                No recommendations found in the database.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Recommendations Table */}
              <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Recommendation ID</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Sensor Data</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Seedlings Count</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Confidence</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Generated</Typography></TableCell>
                        <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                        <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRecommendations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((reco) => (
                        <TableRow 
                          key={reco.id} 
                          hover 
                          sx={{ 
                            '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)', cursor: 'pointer' },
                            transition: 'background-color 0.2s'
                          }}
                          onClick={() => handleRowClick(reco)}
                        >
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
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    pH: {reco.sensorData.pH}
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

          {/* Detail Dialog */}
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
                    {/* CARD 1: Summary */}
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
                                  <Typography variant="body2" color="text.secondary">
                                    Recorded:{' '}
                                    {selectedReco.sensorData.timestamp
                                      ? new Date(selectedReco.sensorData.timestamp).toLocaleString()
                                      : 'N/A'}
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

                    {/* CARD 2: Recommended Seedlings */}
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

                                  <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={seedling.confidenceScore * 100}
                                      color={getConfidenceColor(seedling.confidenceScore * 100)}
                                      sx={{ height: 6, borderRadius: 3 }}
                                    />
                                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                                      {Math.round(seedling.confidenceScore * 100)}% confidence
                                    </Typography>
                                  </Box>
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