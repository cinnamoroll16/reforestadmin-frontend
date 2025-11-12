// src/pages/Recommendations.js
import { useState, useEffect } from 'react';
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
  CardContent,
  LinearProgress,
  Avatar,
  alpha,
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
import { auth } from "../firebase.js";
import { apiService } from '../services/api.js';

const drawerWidth = 240;

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
  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
   const getDefaultSensorData = () => {
    console.log("⚠️ Using default sensor data");
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
      console.error('Error extracting sensor ID:', error);
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

  // Fetch sensor data using API service
    const fetchSensorData = async (sensorDataRef, sensorConditions) => {
    try {
      console.log("🔍 Fetching sensor data for:", sensorDataRef);
      console.log("📊 Available sensor conditions:", sensorConditions);
      
      // If we have sensorConditions in the recommendation, use that data directly
      if (sensorConditions && typeof sensorConditions === 'object') {
        console.log("✅ Using sensor conditions from recommendation");
        return {
          sensorId: sensorDataRef ? extractSensorId(sensorDataRef) : 'sensor-001',
          soilMoisture: sensorConditions.soilMoisture || sensorConditions.moisture || 0,
          temperature: sensorConditions.temperature || sensorConditions.temp || 0,
          pH: sensorConditions.pH || sensorConditions.ph || 0,
          timestamp: new Date().toISOString(), // Use current time since we don't have timestamp in sensorConditions
          ...sensorConditions
        };
      }
      
      // Fallback: Try to fetch from API if sensorConditions is not available
      if (!sensorDataRef || sensorDataRef === 'N/A') {
        console.log("❌ No sensor data reference provided");
        return getDefaultSensorData();
      }
      
      // Parse path: "/sensors/s101/sensordata/data_001" or just "s101"
      const parts = sensorDataRef.split('/').filter(Boolean);
      console.log("📋 Parsed parts:", parts);
      
      let sensorId;
      
      // Handle different reference formats
      if (parts.length >= 4) {
        // Full path: "/sensors/s101/sensordata/data_001"
        sensorId = parts[1]; // Get sensorId from the path
      } else if (parts.length === 1) {
        // Just sensor ID: "s101"
        sensorId = parts[0];
      } else {
        console.log("❌ Unsupported sensor data reference format");
        return getDefaultSensorData();
      }
      
      console.log(`📍 Extracted sensor ID: ${sensorId}`);
      
      // Use API service to fetch sensor data as fallback
      try {
        const sensorData = await apiService.getSensorData(sensorId);
        console.log("✅ Sensor data found via API:", sensorData);
        
        if (!sensorData) {
          console.log("❌ No sensor data returned from API");
          return getDefaultSensorData();
        }
        
        return {
          sensorId: sensorId,
          soilMoisture: sensorData.soilMoisture || sensorData.moisture || 0,
          temperature: sensorData.temperature || sensorData.temp || 0,
          pH: sensorData.pH || sensorData.ph || 0,
          timestamp: sensorData.timestamp || sensorData.recordedAt || new Date().toISOString(),
          ...sensorData
        };
      } catch (apiError) {
        console.error("API sensor data fetch failed:", apiError);
        return getDefaultSensorData();
      }
    } catch (error) {
      console.error("❌ Error fetching sensor data:", error);
      return getDefaultSensorData();
    }
  };

  // Improved fetchLocationData with better error handling and logging
  const fetchLocationData = async (locationRef) => {
    try {
      console.log("📍 fetchLocationData called with:", locationRef);
      
      if (!locationRef || locationRef === 'N/A') {
        console.log("❌ No location reference provided");
        // Return a default location instead of null
        return {
          locationId: 'unknown',
          location_name: 'Unknown Location',
          location_latitude: 'N/A',
          location_longitude: 'N/A'
        };
      }
      
      // Parse path: "/locations/locA" or just "locA"
      const parts = locationRef.split('/').filter(Boolean);
      console.log("📋 Location ref parts:", parts);
      
      let locationId;
      
      if (parts.length >= 2) {
        // Full path: "/locations/locA"
        locationId = parts[1];
      } else if (parts.length === 1) {
        // Just location ID: "locA"
        locationId = parts[0];
      } else {
        console.log("❌ Unsupported location reference format");
        return {
          locationId: 'unknown',
          location_name: 'Unknown Location',
          location_latitude: 'N/A',
          location_longitude: 'N/A'
        };
      }
      
      console.log(`📍 Fetching location data for ID: ${locationId}`);
      
      try {
        const locationData = await apiService.getLocationById(locationId);
        console.log("✅ Location data received:", locationData);
        
        if (!locationData) {
          console.log(`❌ Location ${locationId} not found in database`);
          return {
            locationId: locationId,
            location_name: `Location ${locationId}`,
            location_latitude: 'N/A',
            location_longitude: 'N/A'
          };
        }
        
        // Ensure we have all required fields
        const processedLocationData = {
          locationId: locationId,
          location_name: locationData.location_name || locationData.name || `Location ${locationId}`,
          location_latitude: locationData.location_latitude || locationData.latitude || 'N/A',
          location_longitude: locationData.location_longitude || locationData.longitude || 'N/A',
          ...locationData
        };
        
        console.log("✅ Processed location data:", processedLocationData);
        return processedLocationData;
        
      } catch (apiError) {
        console.error(`❌ API location fetch failed for ${locationId}:`, apiError);
        // Return fallback data instead of null
        return {
          locationId: locationId,
          location_name: `Location ${locationId}`,
          location_latitude: 'N/A',
          location_longitude: 'N/A'
        };
      }
    } catch (error) {
      console.error("❌ Error in fetchLocationData:", error);
      // Return fallback data instead of null
      return {
        locationId: 'unknown',
        location_name: 'Unknown Location',
        location_latitude: 'N/A',
        location_longitude: 'N/A'
      };
    }
  };
  
  // Fetch seedlings for one recommendation using API service
  const fetchSeedlingsForRecommendation = async (seedlingRefs) => {
    try {
      const seedlings = await Promise.all(
        seedlingRefs.map(async (refPath) => {
          try {
            // Extract seedling ID from "/treeseedlings/ts001"
            const seedlingId = refPath.split('/').pop();
            
            // Use API service to fetch seedling data
            const seedlingData = await apiService.getTreeSeedlingById(seedlingId);
            
            if (seedlingData) {
              return {
                seedling_id: seedlingId,
                commonName: seedlingData.seedling_commonName || 'Unknown',
                scientificName: seedlingData.seedling_scientificName || 'Unknown',
                prefMoisture: parseFloat(seedlingData.seedling_prefMoisture) || 0,
                prefTemp: parseFloat(seedlingData.seedling_prefTemp) || 0,
                prefpH: parseFloat(seedlingData.seedling_prefpH) || 0,
                isNative: seedlingData.seedling_isNative === true,
                confidenceScore: 0.8 + Math.random() * 0.2
              };
            }
            return null;
          } catch (error) {
            console.error("Error fetching seedling:", refPath, error);
            return null;
          }
        })
      );

      // Remove any nulls if some docs weren't found
      return seedlings.filter(Boolean);
    } catch (error) {
      console.error("Error fetching seedlings:", error);
      return [];
    }
  };
  
  // Improved handleImplementRecommendation with better validation
  const handleImplementRecommendation = async (reco) => {
    try {
      setSaving(true);
      setError(null);
      
      console.log("🔄 Implementing recommendation:", reco);
      console.log("📍 Location data:", reco.locationData);
      console.log("📍 Location ID:", reco.locationData?.locationId);
      
      // Better validation with more informative error messages
      if (!reco.locationData) {
        console.error("❌ locationData is undefined or null");
        throw new Error('Location data is missing. The recommendation may be corrupted.');
      }
      
      if (!reco.locationData.locationId || reco.locationData.locationId === 'unknown') {
        console.error("❌ locationId is invalid:", reco.locationData.locationId);
        throw new Error('Location ID is missing or invalid. Cannot create planting task.');
      }
      
      // Log all recommendation data for debugging
      console.log("📊 Full recommendation data:", {
        reco_id: reco.reco_id,
        sensorDataRef: reco.sensorDataRef,
        locationRef: reco.locationRef,
        locationData: reco.locationData,
        sensorData: reco.sensorData,
        seedlings: reco.recommendedSeedlings?.length || 0
      });
      
      // Create a new planting task document using API service
      const taskData = {
        user_id: user?.uid || 'USER001',
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

      console.log("📝 Creating planting task with data:", taskData);

      // Use API service to create planting task
      const result = await apiService.createPlantingTask(taskData);
      console.log('✅ Planting task created:', result);

      // Create audit log
      try {
        await apiService.createAuditLog({
          userId: user?.uid,
          action: "Recommendation implemented",
          details: `Implemented recommendation ${reco.reco_id} for location ${reco.locationData.location_name || 'Unknown'}`,
          timestamp: new Date().toISOString()
        });
      } catch (auditError) {
        console.warn('⚠ Could not log audit event:', auditError.message);
      }

      setSuccess("Recommendation implemented successfully!");
      
      // Navigate to task page using the Recommendation ID
      setTimeout(() => {
        navigate(`/tasks/${reco.reco_id}`);
      }, 1500);

    } catch (error) {
      console.error('❌ Error creating planting task:', error);
      console.error('❌ Error stack:', error.stack);
      
      // More specific error messages
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

  // Handle row click to view details
  const handleRowClick = (reco) => {
    setSelectedReco(reco);
    setOpenDialog(true);
  };

  // Handle delete recommendation using API service
  const handleDeleteClick = (reco, event) => {
    event.stopPropagation(); // Prevent row click from triggering
    setRecoToDelete(reco);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    try {
      if (!recoToDelete) return;

      setSaving(true);

      // Use API service to delete recommendation
      await apiService.deleteRecommendation(recoToDelete.id);

      console.log('Recommendation deleted:', recoToDelete.id);
      
      // Create audit log
      try {
        await apiService.createAuditLog({
          userId: user?.uid,
          action: "Recommendation deleted",
          details: `Deleted recommendation ${recoToDelete.reco_id}`
        });
      } catch (auditError) {
        console.warn('⚠ Could not log audit event');
      }

      setSuccess("Recommendation deleted successfully!");
      setDeleteDialogOpen(false);
      setRecoToDelete(null);
      
      // Refresh recommendations list
      loadRecommendations();
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      setError('Failed to delete recommendation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setRecoToDelete(null);
  };
  
  // Updated loadRecommendations function with better error handling
  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('========== LOADING RECOMMENDATIONS ==========');
      
      // Fetch recommendations from API
      const recommendationsData = await apiService.getRecommendations();
      console.log('✓ Raw recommendations data:', recommendationsData);
      console.log('✓ Number of recommendations:', recommendationsData?.length);

      // Check if data exists
      if (!recommendationsData) {
        console.error('❌ recommendationsData is null or undefined');
        setRecommendations([]);
        setLoading(false);
        return;
      }

      if (!Array.isArray(recommendationsData)) {
        console.error('❌ recommendationsData is not an array:', typeof recommendationsData);
        setRecommendations([]);
        setLoading(false);
        return;
      }

      if (recommendationsData.length === 0) {
        console.log('⚠️ No recommendations found in database');
        setRecommendations([]);
        setLoading(false);
        return;
      }

      console.log(`📊 Processing ${recommendationsData.length} recommendations...`);

      // Process recommendations data with better error handling
      const processedRecommendations = await Promise.all(
        recommendationsData.map(async (reco, index) => {
          try {
            console.log(`\n--- Processing recommendation ${index + 1}/${recommendationsData.length} ---`);
            console.log('Recommendation data:', reco);

            // Skip deleted recommendations
            if (reco.deleted === true) {
              console.log(`⏭️ Skipping deleted recommendation: ${reco.id}`);
              return null;
            }

            // Validate required fields
            if (!reco.id && !reco.reco_id) {
              console.warn('⚠️ Recommendation missing ID:', reco);
              return null;
            }

            // 🔹 Fetch sensor data - pass sensorConditions from the recommendation
            console.log('🔍 Fetching sensor data...');
            const sensorData = await fetchSensorData(
              reco.sensorDataRef, 
              reco.sensorConditions
            );
            console.log('✅ Sensor data:', sensorData);
            
            // 🔹 Fetch location data from reference
            console.log('📍 Fetching location data...');
            const locationData = await fetchLocationData(reco.locationRef);
            console.log('✅ Location data:', locationData);

            // 🔹 Resolve each treeseedling ref in seedlingOptions
            let seedlings = [];
            if (Array.isArray(reco.seedlingOptions) && reco.seedlingOptions.length > 0) {
              console.log('🌱 Fetching seedlings...');
              seedlings = await fetchSeedlingsForRecommendation(reco.seedlingOptions);
              console.log(`✅ Found ${seedlings.length} seedlings`);
            } else {
              console.warn(`⚠️ No seedling options for recommendation ${reco.id}`);
            }

            // Confidence parsing with fallbacks
            let confidenceScore;
            if (typeof reco.reco_confidenceScore === 'string') {
              confidenceScore = parseFloat(reco.reco_confidenceScore);
            } else if (typeof reco.reco_confidenceScore === 'number') {
              confidenceScore = reco.reco_confidenceScore;
            } else {
              console.warn('⚠️ No confidence score found, using default 0.85');
              confidenceScore = 0.85;
            }

            // Convert to percentage if needed
            const confidencePercentage = confidenceScore > 1
              ? Math.min(Math.round(confidenceScore), 100)
              : Math.round(confidenceScore * 100);

            const status = generateStatus(confidenceScore);

            // Date parsing with fallbacks
            let generatedDate;
            try {
              if (reco.reco_generatedAt) {
                // Handle Firestore Timestamp
                if (reco.reco_generatedAt.toDate) {
                  generatedDate = reco.reco_generatedAt.toDate().toISOString();
                } else if (reco.reco_generatedAt._seconds) {
                  generatedDate = new Date(reco.reco_generatedAt._seconds * 1000).toISOString();
                } else {
                  generatedDate = reco.reco_generatedAt;
                }
              } else if (reco.createdAt) {
                generatedDate = reco.createdAt;
              } else {
                generatedDate = new Date().toISOString();
              }
            } catch (dateError) {
              console.warn('⚠️ Invalid date, using current date:', dateError);
              generatedDate = new Date().toISOString();
            }

            const processedReco = {
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
              sensorConditions: reco.sensorConditions || {} // Keep original sensor conditions
            };

            console.log('✅ Processed recommendation:', processedReco.reco_id);
            return processedReco;

          } catch (recoError) {
            console.error(`❌ Error processing recommendation ${reco?.id}:`, recoError);
            console.error('Error stack:', recoError.stack);
            return null; // Skip this recommendation if there's an error
          }
        })
      );
      // Filter out null values (deleted recommendations or processing errors)
      const validRecommendations = processedRecommendations.filter(reco => reco !== null);
      
      console.log('\n========== PROCESSING COMPLETE ==========');
      console.log(`✅ Successfully processed ${validRecommendations.length}/${recommendationsData.length} recommendations`);
      console.log('Valid recommendations:', validRecommendations);
      
      setRecommendations(validRecommendations);
      
      if (validRecommendations.length === 0) {
        console.warn('⚠️ No valid recommendations after processing');
      }
      
    } catch (error) {
      console.error("❌ CRITICAL ERROR loading recommendations:", error);
      console.error('Error stack:', error.stack);
      setError("Failed to load recommendations: " + error.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
      console.log('========== LOADING FINISHED ==========\n');
    }
  };

  // Fetch recommendations using API service
  useEffect(() => {
    loadRecommendations();

    // Set up polling for real-time updates (optional)
    const pollInterval = setInterval(() => {
      loadRecommendations();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Handle filtering (exclude deleted recommendations)
  const filteredRecommendations = recommendations.filter(reco => {
    // Skip if deleted
    if (reco.deleted) return false;
    
    const matchesSearch = reco.reco_id.toLowerCase().includes(filter.toLowerCase()) ||
                         (reco.locationData?.location_name || '').toLowerCase().includes(filter.toLowerCase()) ||
                         (reco.sensorData?.sensorId || '').toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = filterStatus === 'all' || reco.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Status chip color
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

  // Confidence score color
  const getConfidenceColor = (score) => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  // Open/close detail dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReco(null);
  };

  // Unique statuses for filter dropdown
  const statusTypes = [...new Set(recommendations.map(reco => reco.status))];

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />

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
              onClick={() => window.location.href = '/sensor'}
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
          <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlgorithmIcon /> Recommendation Details
              </Box>
            </DialogTitle>
            <DialogContent>
              {selectedReco && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>{selectedReco.reco_id}</Typography>
                    <Chip label={selectedReco.status} color={getStatusColor(selectedReco.status)} sx={{ mb: 2 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Source Data</Typography>
                    <Typography variant="body2">
                      Sensor: {selectedReco.sensorData ? selectedReco.sensorData.sensorId : 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      Location: {selectedReco.locationData?.location_name || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      Generated: {selectedReco.reco_generatedAt 
                        ? new Date(selectedReco.reco_generatedAt).toLocaleString() 
                        : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Environmental Conditions</Typography>
                    {selectedReco.sensorData ? (
                      <>
                        <Typography variant="body2">Soil Moisture: {selectedReco.sensorData.soilMoisture}%</Typography>
                        <Typography variant="body2">Temperature: {selectedReco.sensorData.temperature}°C</Typography>
                        <Typography variant="body2">pH Level: {selectedReco.sensorData.pH}</Typography>
                        <Typography variant="body2">
                          Recorded: {selectedReco.sensorData.timestamp 
                            ? new Date(selectedReco.sensorData.timestamp).toLocaleString() 
                            : 'N/A'}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No sensor data available</Typography>
                    )}
                    {selectedReco.locationData && (
                      <>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Coordinates: {selectedReco.locationData.location_latitude}, {selectedReco.locationData.location_longitude}
                        </Typography>
                      </>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Recommended Seedlings ({selectedReco.recommendedSeedlings.length})</Typography>
                    <Grid container spacing={2}>
                      {selectedReco.recommendedSeedlings.map((seedling, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={seedling.seedling_id}>
                          <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}>
                                {idx + 1}
                              </Avatar>
                              <Chip 
                                size="small" 
                                label={seedling.isNative ? 'Native' : 'Non-native'} 
                                color={seedling.isNative ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                            <Typography variant="body2" fontWeight="medium" gutterBottom>
                              {seedling.commonName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" gutterBottom sx={{ display: 'block' }}>
                              {seedling.scientificName}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" display="block">
                                Moisture: {seedling.prefMoisture}%
                              </Typography>
                              <Typography variant="caption" display="block">
                                Temp: {seedling.prefTemp}°C
                              </Typography>
                              <Typography variant="caption" display="block">
                                pH: {seedling.prefpH}
                              </Typography>
                            </Box>
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
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Overall Algorithm Confidence</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: '100%' }}>
                        <LinearProgress
                          variant="determinate"
                          value={selectedReco.reco_confidenceScore}
                          color={getConfidenceColor(selectedReco.reco_confidenceScore)}
                          sx={{ height: 10, borderRadius: 4 }}
                        />
                      </Box>
                      <Typography variant="h6">{selectedReco.reco_confidenceScore}%</Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  handleImplementRecommendation(selectedReco);
                  handleCloseDialog(); // optional: keep or remove if you want dialog to stay briefly
                }} 
                disabled={saving}
                sx={{ bgcolor: '#2e7d32' }}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <ExecuteIcon />}
              >
                {saving ? "Implementing..." : "Implement"}
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
