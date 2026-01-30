// src/pages/Sensor.jsx - UPDATED WITH FIXED VALIDATION
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../services/api';
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
  Typography,
  Button,
  LinearProgress,
  Toolbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  Snackbar,
  Tooltip,
  useMediaQuery,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  SensorsOutlined as SensorsIcon, 
  CheckCircle as CheckCircleIcon, 
  Warning as WarningIcon,
  Science as ScienceIcon,
  LocationOn as LocationIcon,
  Thermostat as ThermostatIcon,
  WaterDrop as WaterDropIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Folder as FolderIcon,
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

// ============================================================================
// BACKEND API CONFIGURATION
// ============================================================================
const BACKEND_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  ENDPOINTS: {
    ML_RECOMMENDATIONS: '/api/ml/generate-recommendations',
    ML_STATUS: '/api/ml/status',
    ML_DATASET: '/api/ml/dataset',
    ML_DATASET_STATUS: '/api/ml/dataset-status',
    ML_RELOAD_DATASET: '/api/ml/reload-dataset',
    ML_UPLOAD_DATASET: '/api/ml/upload-dataset',
    RECOMMENDATIONS: '/api/recommendations',
    SENSORS: '/api/sensors',
    SENSOR_DATA: (sensorId) => `/api/sensors/${sensorId}/data`,
    LOCATIONS: '/api/locations',
    LOCATION_BY_ID: (locationId) => `/api/locations/${locationId}`,
    HEALTH: '/health'
  }
};

// ============================================================================
// VALIDATION SCHEMA - ENHANCED
// ============================================================================
const SensorDataSchema = {
  pH: { 
    min: 0, 
    max: 14, 
    required: true, 
    optimal: [6.0, 8.0],
    // Removed critical thresholds - just warn but don't block
    warningLow: 4.0,
    warningHigh: 10.0,
    warningMessage: {
      low: 'pH is very acidic. Some trees may still thrive in these conditions.',
      high: 'pH is very alkaline. Some trees may still thrive in these conditions.'
    }
  },
  soilMoisture: { 
    min: 0, 
    max: 100, 
    required: true, 
    optimal: [30, 70],
    criticalLow: 5.0,
    criticalHigh: 95.0,
    criticalMessage: {
      low: 'Soil moisture is critically low. Plants may be severely stressed.',
      high: 'Soil moisture is critically high. Risk of waterlogging.'
    }
  },
  temperature: { 
    min: -10, 
    max: 60, 
    required: true, 
    optimal: [20, 35],
    criticalLow: 0,
    criticalHigh: 50,
    criticalMessage: {
      low: 'Temperature is critically low. Risk of frost damage.',
      high: 'Temperature is critically high. Risk of heat stress.'
    }
  }
};

// Enhanced validation with warnings and critical alerts - FIXED VERSION
const validateSensorData = (sensorData) => {
  const { pH, soilMoisture, temperature } = sensorData;
  const errors = [];
  const warnings = [];
  const criticalAlerts = [];
  
  // Check for "N/A" values
  const hasNAValues = pH === "N/A" || soilMoisture === "N/A" || temperature === "N/A";
  
  Object.entries(SensorDataSchema).forEach(([field, rules]) => {
    const value = sensorData[field];
    
    // Check if required and not N/A
    if (rules.required && (value === null || value === undefined || value === "N/A")) {
      errors.push(`${field} is missing or unavailable (N/A)`);
      return;
    }
    
    // Skip further validation for N/A values
    if (value === "N/A") return;
    
    const numValue = parseFloat(value);
    
    // Check if it's a valid number
    if (isNaN(numValue)) {
      errors.push(`${field} must be a number`);
      return;
    }
    
    // Check absolute range validity - these should be errors
    if (numValue < rules.min || numValue > rules.max) {
      errors.push(`${field} (${numValue}) is outside valid range (${rules.min}-${rules.max})`);
      return;
    }
    
    // Check for critical values
    if (rules.criticalLow !== undefined && numValue < rules.criticalLow) {
      criticalAlerts.push({
        field,
        value: numValue,
        type: 'critical_low',
        message: rules.criticalMessage.low
      });
    } else if (rules.criticalHigh !== undefined && numValue > rules.criticalHigh) {
      criticalAlerts.push({
        field,
        value: numValue,
        type: 'critical_high',
        message: rules.criticalMessage.high
      });
    }
    
    // Check optimal range for warnings only - not errors
    if (rules.optimal && !criticalAlerts.some(alert => alert.field === field)) {
      const [optMin, optMax] = rules.optimal;
      if (numValue < optMin || numValue > optMax) {
        warnings.push(`${field} (${numValue}) is outside optimal range (${optMin}-${optMax})`);
      }
    }
  });
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    warnings,
    criticalAlerts,
    hasCriticalAlerts: criticalAlerts.length > 0,
    hasWarnings: warnings.length > 0
  };
};

const backendMLService = {
  // Generate ML recommendations via backend
  async generateRecommendations(sensorId, sensorData, location, coordinates) {
    try {
      console.log('🤖 Sending ML request to backend:', { 
        sensorId, 
        sensorData, 
        location, 
        coordinates 
      });
      
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sensorId, 
          sensorData, 
          location, 
          coordinates 
        })
      });

      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);
      console.log('📊 Response status:', response.status);
      console.log('🔤 Response headers:', Object.fromEntries(response.headers.entries()));

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ Parsed JSON response:', result);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        console.error('Response text that failed to parse:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        console.error('❌ Backend error response:', result);
        throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`);
      }
      
// TEMPORARY FIX: Handle "Needs Review" response
if (result.message && result.message.includes('Needs Review')) {
  console.warn('⚠️ Backend returned "Needs Review" - creating mock recommendations');
  // Create mock recommendations for testing
  result = {
    success: true,
    recommendations: [
      {
        commonName: 'Needs Review - Sensor Data Issue',
        scientific_name: 'Sensor Calibration Required',
        confidenceScore: 0.1,
        reason: result.message,
        requires_action: true
      }
    ]
  };
}

console.log('✅ Backend ML response:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Backend ML API Error:', error);
      throw new Error(`ML service unavailable: ${error.message}`);
    }
  },

  // Get ML service status
  async getMLStatus() {
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_STATUS}`);
      if (!response.ok) throw new Error('ML status check failed');
      return await response.json();
    } catch (error) {
      console.warn('ML status check failed:', error.message);
      return { mlService: 'Inactive', datasetLoaded: false };
    }
  },

  // Get detailed dataset status
  async getDatasetStatus() {
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_DATASET_STATUS}`);
      if (!response.ok) throw new Error('Failed to get dataset status');
      return await response.json();
    } catch (error) {
      console.warn('Dataset status fetch failed:', error.message);
      return null;
    }
  },

  // Reload dataset
  async reloadDataset() {
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_RELOAD_DATASET}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to reload dataset');
      return await response.json();
    } catch (error) {
      console.warn('Dataset reload failed:', error.message);
      throw error;
    }
  },

  // Upload dataset
  async uploadDataset(file) {
    try {
      const formData = new FormData();
      formData.append('dataset', file);

      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_UPLOAD_DATASET}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Dataset upload response:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Dataset upload failed:', error);
      throw new Error(`Dataset upload failed: ${error.message}`);
    }
  },

  // Get dataset info
  async getDatasetInfo() {
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_DATASET}`);
      if (!response.ok) throw new Error('Failed to get dataset info');
      return await response.json();
    } catch (error) {
      console.warn('Dataset info fetch failed:', error.message);
      return null;
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`);
      return response.ok;
    } catch (error) {
      console.warn('Backend health check failed:', error.message);
      return false;
    }
  }
};

// Format timestamp - Display in UTC to match database timezone
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  
  try {
    const date = new Date(timestamp);
    // Validate that the date is reasonable
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    // Display in UTC timezone to match the database "Z" timezone
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  } catch (error) {
    return "Invalid date";
  }
};


// Format value with units
const formatValue = (value, unit = '') => {
  if (value === "N/A" || value === null || value === undefined) {
    return "N/A";
  }
  const numValue = parseFloat(value);
  return isNaN(numValue) ? "N/A" : `${numValue.toFixed(1)}${unit}`;
};

// Get status color
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'success';
    case 'inactive': return 'error';
    case 'under maintenance': return 'warning';
    default: return 'default';
  }
};

// Get status icon
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return <CheckCircleIcon />;
    case 'inactive': return <WarningIcon />;
    default: return <InfoIcon />;
  }
};

// ============================================================================
// DATASET UPLOAD COMPONENT
// ============================================================================
const DatasetUploadSection = ({ 
  mlServiceStatus, 
  onUpload, 
  onReload,
  reloadingDataset,
  uploadingDataset 
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid Excel or CSV file (.xlsx, .xls, .csv)');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Paper sx={{ mb: 3, p: 2.5, borderRadius: 2, boxShadow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight="600">
          Tree Dataset Management
        </Typography>
      </Box>

      {mlServiceStatus.datasetLoaded ? (
        <Box>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            sx={{ 
              bgcolor: '#2e7d32',
              '&:hover': { bgcolor: '#1b5e20' },
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Upload Tree Dataset
            <input
              type="file"
              hidden
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
          </Button>
        </Box>
      ) : (
        <Box>
          {!selectedFile ? (
            <>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                sx={{ 
                  bgcolor: '#2e7d32',
                  '&:hover': { bgcolor: '#1b5e20' },
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                Upload Tree Dataset
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
              </Button>
            </>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Selected file: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={uploadingDataset}
                  startIcon={uploadingDataset ? <CircularProgress size={16} /> : <UploadIcon />}
                  sx={{ 
                    bgcolor: '#2e7d32',
                    '&:hover': { bgcolor: '#1b5e20' },
                    textTransform: 'none'
                  }}
                >
                  {uploadingDataset ? 'Uploading...' : 'Upload Dataset'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={uploadingDataset}
                  sx={{ textTransform: 'none' }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
          
    
        </Box>
      )}
    </Paper>
  );
};

// ============================================================================
// SENSOR HISTORY GRID COMPONENT
// ============================================================================
const SensorHistoryGrid = ({ readings }) => {
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(5);

  const handleHistoryPageChange = (event, newPage) => {
    setHistoryPage(newPage);
  };

  const handleHistoryRowsPerPageChange = (event) => {
    setHistoryRowsPerPage(parseInt(event.target.value, 10));
    setHistoryPage(0);
  };

  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, [readings]);

  const paginatedReadings = useMemo(() => {
    return sortedReadings.slice(
      historyPage * historyRowsPerPage,
      historyPage * historyRowsPerPage + historyRowsPerPage
    );
  }, [sortedReadings, historyPage, historyRowsPerPage]);

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          Historical Readings ({readings.length} total)
        </Typography>
      </Box>

      {readings.length === 0 ? (
        <Card variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No historical data available for this sensor
          </Typography>
        </Card>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Timestamp</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">pH</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Moisture (%)</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Temp (°C)</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Reading ID</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedReadings.map((reading, index) => (
                  <TableRow key={reading.id || index} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTimestamp(reading.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="medium">
                        {formatValue(reading.pH)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="medium">
                        {formatValue(reading.soilMoisture, '%')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="medium">
                        {formatValue(reading.temperature, '°C')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {reading.id || `reading_${index}`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={readings.length}
            rowsPerPage={historyRowsPerPage}
            page={historyPage}
            onPageChange={handleHistoryPageChange}
            onRowsPerPageChange={handleHistoryRowsPerPageChange}
          />
        </>
      )}
    </Box>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function Sensors() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // UI State
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Data State
  const [sensors, setSensors] = useState([]);
  const [locations, setLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ML Processing State
  const [processingMLSensor, setProcessingMLSensor] = useState(null);
  const [mlProgress, setMlProgress] = useState({ step: '', percent: 0 });
  const [reloadingDataset, setReloadingDataset] = useState(false);
  const [uploadingDataset, setUploadingDataset] = useState(false);
  
  // Modal State
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorDetailOpen, setSensorDetailOpen] = useState(false);
  
  // Backend State
  const [backendStatus, setBackendStatus] = useState('checking');
  const [mlServiceStatus, setMlServiceStatus] = useState({ 
    mlService: 'Unknown', 
    datasetLoaded: false,
    datasetPath: '',
    datasetExists: false,
    datasetName: '',
    datasetSize: 0,
    speciesCount: 0
  });
  
  // Error/Notification State
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ============================================================================
  // NOTIFICATION HELPER
  // ============================================================================
  const showNotification = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // ============================================================================
  // BACKEND & ML SERVICE HEALTH CHECK
  // ============================================================================
  useEffect(() => {
    const checkServices = async () => {
      try {
        const [isBackendHealthy, mlStatus, datasetStatus] = await Promise.all([
          backendMLService.healthCheck(),
          backendMLService.getMLStatus(),
          backendMLService.getDatasetStatus().catch(() => null)
        ]);
        
        setBackendStatus(isBackendHealthy ? 'healthy' : 'unavailable');
        
        // Merge basic ML status with detailed dataset status if available
        const mergedStatus = {
          ...mlStatus,
          ...(datasetStatus || {})
        };
        
        setMlServiceStatus(mergedStatus);
        
        if (!isBackendHealthy) {
          console.warn('⚠️ Backend server is unavailable.');
          showNotification('Backend server unavailable. ML recommendations will not work.', 'warning');
        } else if (!mergedStatus.datasetLoaded) {
          console.warn('⚠️ Backend ML service ready but dataset not loaded.');
          console.log('📁 Dataset status:', mergedStatus);
        } else {
          console.log('✅ Backend and ML service are ready');
          console.log(`📊 Dataset: ${mergedStatus.speciesCount} species loaded`);
          console.log(`📁 File: ${mergedStatus.datasetName}`);
        }
      } catch (error) {
        setBackendStatus('unavailable');
        setMlServiceStatus({ 
          mlService: 'Unknown', 
          datasetLoaded: false,
          datasetPath: '',
          datasetExists: false,
          datasetName: '',
          datasetSize: 0,
          speciesCount: 0
        });
        console.error('Service health check failed:', error);
      }
    };

    checkServices();
  }, [showNotification]);

  // ============================================================================
  // DATASET UPLOAD HANDLER
  // ============================================================================
  const handleDatasetUpload = async (file) => {
    setUploadingDataset(true);
    try {
      const result = await backendMLService.uploadDataset(file);
      
      if (result.success) {
        showNotification('Dataset uploaded and loaded successfully!', 'success');
        
        // Refresh the ML status
        const mlStatus = await backendMLService.getMLStatus();
        const datasetStatus = await backendMLService.getDatasetStatus().catch(() => null);
        setMlServiceStatus({
          ...mlStatus,
          ...(datasetStatus || {})
        });
      } else {
        showNotification('Dataset upload failed: ' + (result.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('❌ Dataset upload failed:', error);
      showNotification('Dataset upload failed: ' + error.message, 'error');
    } finally {
      setUploadingDataset(false);
    }
  };

  // ============================================================================
  // RELOAD DATASET HANDLER
  // ============================================================================
  const handleReloadDataset = async () => {
    setReloadingDataset(true);
    try {
      const result = await backendMLService.reloadDataset();
      
      if (result.success) {
        showNotification('Dataset reloaded successfully', 'success');
        // Refresh the ML status
        const mlStatus = await backendMLService.getMLStatus();
        const datasetStatus = await backendMLService.getDatasetStatus().catch(() => null);
        setMlServiceStatus({
          ...mlStatus,
          ...(datasetStatus || {})
        });
      } else {
        showNotification('Failed to reload dataset', 'error');
      }
    } catch (error) {
      console.error('❌ Dataset reload failed:', error);
      showNotification('Failed to reload dataset: ' + error.message, 'error');
    } finally {
      setReloadingDataset(false);
    }
  };

  // ============================================================================
  // FETCH LOCATIONS FROM BACKEND
  // ============================================================================
  const fetchLocations = useCallback(async () => {
    try {
      console.log('📍 Fetching locations from backend...');
      const locationsData = await apiService.getLocations();
      
      const locationsMap = {};
      if (Array.isArray(locationsData)) {
        locationsData.forEach((location) => {
          if (location && location.id) {
            const locationData = {
              id: location.id,
              location_name: location.location_name || 'Unknown Location',
              location_latitude: location.location_latitude,
              location_longitude: location.location_longitude,
              sensor_id: location.sensor_id,
              created_by: location.created_by,
              is_active: location.is_active,
              last_updated: location.last_updated
            };
            
            locationsMap[location.id] = locationData;
            
            if (location.sensor_id && location.sensor_id !== location.id) {
              locationsMap[location.sensor_id] = locationData;
            }
          }
        });
      }
      
      console.log(`✅ Loaded ${Object.keys(locationsMap).length} location mappings`);
      return locationsMap;
    } catch (error) {
      console.error('❌ Error fetching locations:', error);
      showNotification('Failed to load location data', 'warning');
      return {};
    }
  }, [showNotification]);

  // ============================================================================
  // FETCH SENSORS FROM BACKEND
  // ============================================================================
  const fetchSensorsFromBackend = useCallback(async () => {
    try {
      console.log('📡 Fetching sensors from backend API...');
      
      const sensorsData = await apiService.getSensors();
      
      if (!Array.isArray(sensorsData) || sensorsData.length === 0) {
        console.warn('No sensors found');
        return [];
      }
      
      const processedSensors = sensorsData.map(sensor => {
        const latestReading = sensor.latest_reading || {};
        
        return {
          id: sensor.id,
          location_id: sensor.location_id,
          latitude: sensor.latitude,
          longitude: sensor.longitude,
          sensor_status: sensor.sensor_status || 'active',
          sensor_lastCalibrationDate: sensor.sensor_lastCalibrationDate,
          sensor_location: sensor.sensor_location,
          sensor_type: sensor.sensor_type,
          coordinates: {
            latitude: sensor.latitude,
            longitude: sensor.longitude
          },
          pH: latestReading.pH !== undefined ? parseFloat(latestReading.pH) : "N/A",
          soilMoisture: latestReading.soilMoisture !== undefined ? parseFloat(latestReading.soilMoisture) : "N/A",
          temperature: latestReading.temperature !== undefined ? parseFloat(latestReading.temperature) : "N/A",
          timestamp: latestReading.timestamp || null,
          readings: [],
          readingsLoaded: false
        };
      });
      
      console.log(`✅ Loaded ${processedSensors.length} sensors from backend`);
      return processedSensors;
      
    } catch (error) {
      console.error('❌ Error fetching sensors from backend:', error);
      throw error;
    }
  }, []);

  // ============================================================================
  // FETCH SENSOR HISTORY
  // ============================================================================
  const fetchSensorHistory = async (sensorId) => {
    try {
      console.log(`📊 Fetching history for sensor ${sensorId}...`);
      const historyData = await apiService.getSensorData(sensorId, { limit: 100 });
      
      console.log(`✅ Loaded ${historyData.length} readings for sensor ${sensorId}`);
      return historyData;
    } catch (error) {
      console.error('❌ Error fetching sensor history:', error);
      showNotification('Failed to load sensor history', 'warning');
      return [];
    }
  };

  // ============================================================================
  // INITIALIZE DATA
  // ============================================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sensorsData, locationsData] = await Promise.all([
          fetchSensorsFromBackend(),
          fetchLocations()
        ]);

        const processedSensors = sensorsData.map(sensor => {
          let locationInfo = null;
          let locationId = null;

          if (sensor.location_id && locationsData[sensor.location_id]) {
            locationInfo = locationsData[sensor.location_id];
            locationId = sensor.location_id;
          } else if (sensor.location_id && sensor.location_id.includes('/')) {
            const extractedId = sensor.location_id.split('/').pop();
            if (locationsData[extractedId]) {
              locationInfo = locationsData[extractedId];
              locationId = extractedId;
            }
          } else if (locationsData[sensor.id]) {
            locationInfo = locationsData[sensor.id];
            locationId = sensor.id;
          } else {
            const matchingLocation = Object.values(locationsData).find(
              loc => loc.sensor_id === sensor.id
            );
            if (matchingLocation) {
              locationInfo = matchingLocation;
              locationId = matchingLocation.id;
            }
          }

          let locationName = 'Unknown Location';
          let locationCoordinates = null;
          let sensorId = null;
          let isActive = true;

          if (locationInfo) {
            locationName = locationInfo.location_name || 'Unknown Location';
            locationCoordinates = {
              latitude: locationInfo.location_latitude || sensor.latitude,
              longitude: locationInfo.location_longitude || sensor.longitude
            };
            sensorId = locationInfo.sensor_id;
            isActive = locationInfo.is_active !== false;
          } else {
            locationName = sensor.sensor_location || `Location ${sensor.id}`;
            locationCoordinates = sensor.coordinates || {
              latitude: sensor.latitude,
              longitude: sensor.longitude
            };
          }

          return {
            ...sensor,
            location: locationName,
            locationCoordinates: locationCoordinates,
            sensor_id: sensorId || sensor.id,
            is_active: isActive,
            locationRef: sensor.location_id,
            location_id: locationId,
            status: sensor.sensor_status || "Unknown",
            statusDescription: `Sensor is currently ${sensor.sensor_status || 'Unknown'}`,
            lastCalibration: sensor.sensor_lastCalibrationDate || null,
          };
        });

        setSensors(processedSensors);
        setLocations(locationsData);

      } catch (error) {
        console.error("Error fetching data:", error);
        setError('Failed to fetch sensor data: ' + error.message);
        showNotification('Error loading sensors: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchSensorsFromBackend, fetchLocations, showNotification]);

  // ============================================================================
  // REFRESH HANDLER
  // ============================================================================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const [mlStatus, datasetStatus] = await Promise.all([
        backendMLService.getMLStatus(),
        backendMLService.getDatasetStatus().catch(() => null)
      ]);
      
      setMlServiceStatus({
        ...mlStatus,
        ...(datasetStatus || {})
      });
      
      const [sensorsData, locationsData] = await Promise.all([
        fetchSensorsFromBackend(),
        fetchLocations()
      ]);

      const processedSensors = sensorsData.map(sensor => {
        let locationId = sensor.location_id;
        let locationInfo = null;
        
        const possibleKeys = [
          sensor.location_id,
          sensor.location_id?.split('/').pop(),
          sensor.id,
        ].filter(Boolean);

        for (const key of possibleKeys) {
          if (locationsData[key]) {
            locationInfo = locationsData[key];
            locationId = key;
            break;
          }
        }

        let locationName = 'Unknown Location';
        let locationCoordinates = null;
        let sensorId = null;
        let isActive = true;

        if (locationInfo) {
          locationName = locationInfo.location_name || 'Unknown Location';
          locationCoordinates = {
            latitude: locationInfo.location_latitude || sensor.latitude,
            longitude: locationInfo.location_longitude || sensor.longitude
          };
          sensorId = locationInfo.sensor_id;
          isActive = locationInfo.is_active !== false;
        } else {
          locationName = sensor.sensor_location || `Location ${sensor.id}`;
          locationCoordinates = sensor.coordinates || {
            latitude: sensor.latitude,
            longitude: sensor.longitude
          };
        }

        return {
          ...sensor,
          location: locationName,
          locationCoordinates: locationCoordinates,
          sensor_id: sensorId || sensor.id,
          is_active: isActive,
          locationRef: sensor.location_id,
          location_id: locationId,
          status: sensor.sensor_status || "Unknown",
          statusDescription: `Sensor is currently ${sensor.sensor_status || 'Unknown'}`,
          lastCalibration: sensor.sensor_lastCalibrationDate || null,
        };
      });

      setSensors(processedSensors);
      setLocations(locationsData);
      showNotification('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      showNotification('Failed to refresh data', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // ============================================================================
// BACKEND ML GENERATION - FIXED FOR CRITICAL VALUES
// ============================================================================
const handleGenerateML = async (sensor) => {
  const sensorId = sensor.id;
  
  try {
    setProcessingMLSensor(sensorId);
    setMlProgress({ step: 'Initializing...', percent: 10 });
    
    const { pH, soilMoisture, temperature } = sensor;
    
    setMlProgress({ step: 'Validating sensor data...', percent: 20 });
    
    const validation = validateSensorData({ pH, soilMoisture, temperature });
    
    // Check for critical alerts FIRST
    if (validation.hasCriticalAlerts) {
      const criticalMessages = validation.criticalAlerts.map(alert => 
        `${alert.field}=${alert.value}: ${alert.message}`
      ).join(', ');
      
      showNotification(
        `⚠️ Critical values detected: ${criticalMessages}. ML recommendations may not be reliable.`,
        'warning'
      );
      
      // Ask user for confirmation to proceed
      if (!window.confirm(
        `Critical sensor values detected:\n\n${criticalMessages}\n\n` +
        `ML recommendations may not be reliable.\n\n` +
        `Do you want to proceed anyway?`
      )) {
        throw new Error('ML generation cancelled due to critical sensor values');
      }
    }
    
    if (!validation.isValid) {
      throw new Error(`Invalid sensor data: ${validation.errors.join(', ')}`);
    }
    
    // Show warnings but don't prevent ML generation
    if (validation.hasWarnings) {
      showNotification(
        `Data warnings (ML will still run): ${validation.warnings.join('; ')}`,
        'warning'
      );
    }
    
    setMlProgress({ step: 'Preparing data for ML processing...', percent: 30 });
    
    const sensorData = {
      ph: parseFloat(pH),
      soilMoisture: parseFloat(soilMoisture),
      temperature: parseFloat(temperature)
    };
    
    setMlProgress({ step: 'Sending to ML backend...', percent: 50 });
    
    const result = await backendMLService.generateRecommendations(
      sensorId,
      sensorData,
      sensor.location,
      sensor.coordinates
    );
    
    // DEBUG: Log the full response
    console.log('🔍 ML Response:', result);
    
    // FIXED: Always create recommendations, even if empty
    let recommendations = [];
    let success = false;
    let hasErrorRecommendation = false;
    let errorMessage = '';
    let hasManualReview = false;
    
    if (result.success) {
      // Case 1: Standard response with success and recommendations
      success = true;
      recommendations = result.recommendations || [];
      
      // Check for "Needs Review" case
      if (recommendations.length === 0 && result.dataQuality?.needsManualReview) {
        hasManualReview = true;
        // Create a manual review recommendation
        recommendations = [{
          type: 'manual_review',
          commonName: 'Manual Review Required',
          scientific_name: 'Sensor Calibration Needed',
          confidenceScore: 0.1,
          reason: result.dataQuality?.alerts?.[0]?.message || 'Sensor data requires verification',
          dataQuality: result.dataQuality,
          requires_action: true
        }];
      }
    } else if (result.recommendations) {
      // Case 3: Has recommendations field but no success flag
      success = true;
      recommendations = result.recommendations;
    } else if (result.predictions) {
      // Case 4: Has predictions field instead
      success = true;
      recommendations = result.predictions;
    } else if (result.tree_suggestions) {
      // Case 5: Has tree_suggestions field
      success = true;
      recommendations = result.tree_suggestions;
    } else if (result.error) {
      // Case 6: Error response
      errorMessage = result.error;
      hasErrorRecommendation = true;
    } else if (result.message && result.message.includes('Needs Review')) {
      // Case 7: "Needs Review" recommendation
      success = true;
      hasManualReview = true;
      recommendations = [{
        type: 'manual_review',
        commonName: 'Manual Review Required',
        scientific_name: 'Sensor Calibration Required',
        confidenceScore: 0.1,
        reason: result.message,
        sensorData: sensorData,
        dataQuality: result.dataQuality,
        requires_action: true
      }];
    }
    
    // If we still have no recommendations, create fallback ones
    if (recommendations.length === 0 && success) {
      console.warn('⚠️ Backend returned empty recommendations - creating fallback');
      recommendations = [{
        commonName: 'General Adaptive Tree',
        scientific_name: 'Consult Local Expert',
        confidenceScore: 0.3,
        reason: 'Specific recommendations unavailable for current conditions',
        requires_action: false
      }];
    }
    
    if (!success && !hasErrorRecommendation && !hasManualReview) {
      throw new Error(result.error || result.message || 'Backend ML processing failed');
    }
    
    // ALWAYS save to localStorage, even with errors
    localStorage.setItem('lastMLResult', JSON.stringify({
      sensorId,
      sensorData,
      recommendations: recommendations,
      success: success,
      hasError: hasErrorRecommendation,
      hasManualReview: hasManualReview,
      errorMessage: errorMessage,
      dataQuality: result.dataQuality || {},
      mlModel: result.mlModel || 'Unknown',
      timestamp: new Date().toISOString()
    }));
    
    console.log('✅ Saved to localStorage:', {
      sensorId,
      recommendationCount: recommendations.length
    });
    
    if (hasErrorRecommendation) {
      showNotification(
        `ML processing completed with note: ${errorMessage}`,
        'warning'
      );
    } else if (hasManualReview) {
      showNotification(
        `⚠️ Manual review required: ${recommendations[0]?.reason}`,
        'warning'
      );
    } else if (recommendations.length > 0) {
      const topTree = recommendations[0];
      const treeName = topTree.commonName || 
                      topTree.name || 
                      topTree.species || 
                      'Unknown tree';
      const confidenceScore = topTree.confidenceScore || 0.5;
      
      setMlProgress({ step: 'Complete!', percent: 100 });
      showNotification(
        `✅ ML Complete! Top recommendation: ${treeName} (${(confidenceScore * 100).toFixed(1)}% confidence)`,
        'success'
      );
    }

    // Navigate to recommendations page
    setTimeout(() => {
      navigate('/recommendations');
    }, 1500);

  } catch (error) {
    console.error('❌ ML Generation failed:', error);
    
    // EVEN ON ERROR, save something to localStorage
    localStorage.setItem('lastMLResult', JSON.stringify({
      sensorId: sensor.id,
      sensorData: {
        ph: parseFloat(sensor.pH),
        soilMoisture: parseFloat(sensor.soilMoisture),
        temperature: parseFloat(sensor.temperature)
      },
      recommendations: [{
        commonName: 'Error - No Recommendation',
        scientific_name: 'System Error',
        confidenceScore: 0.1,
        reason: `Error: ${error.message.substring(0, 100)}`,
        requires_action: true
      }],
      success: false,
      hasError: true,
      errorMessage: error.message,
      timestamp: new Date().toISOString()
    }));
    
    showNotification(`ML generation failed: ${error.message}`, 'error');
    
    // Still navigate to recommendations page so user can see the error
    setTimeout(() => {
      navigate('/recommendations');
    }, 1500);
    
  } finally {
    setProcessingMLSensor(null);
    setMlProgress({ step: '', percent: 0 });
  }
};
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => logout();
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSensorClick = async (sensor) => {
    if (!sensor.readingsLoaded) {
      const history = await fetchSensorHistory(sensor.id);
      sensor.readings = history;
      sensor.readingsLoaded = true;
    }
    
    setSelectedSensor(sensor);
    setSensorDetailOpen(true);
  };

  const handleCloseSensorDetail = () => {
    setSensorDetailOpen(false);
    setSelectedSensor(null);
  };

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  const displayedSensors = useMemo(() => {
    return sensors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sensors, page, rowsPerPage]);

  const getBackendStatusInfo = () => {
    switch (backendStatus) {
      case 'healthy':
        return { color: 'success', text: 'Backend Connected', icon: <CheckCircleIcon /> };
      case 'unavailable':
        return { color: 'warning', text: 'Backend Unavailable', icon: <WarningIcon /> };
      default:
        return { color: 'info', text: 'Checking Backend...', icon: <InfoIcon /> };
    }
  };

  const getMLStatusInfo = () => {
    if (!mlServiceStatus.datasetLoaded) {
      return { color: 'warning', text: 'Dataset Required', icon: <WarningIcon /> };
    }
    return { color: 'success', text: 'ML Ready', icon: <CheckCircleIcon /> };
  };

  const backendStatusInfo = getBackendStatusInfo();
  const mlStatusInfo = getMLStatusInfo();
  const canGenerateML = backendStatus === 'healthy' && mlServiceStatus.datasetLoaded;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar 
        handleDrawerToggle={handleDrawerToggle} 
        user={user} 
        onLogout={handleLogout} 
      />
      <Navigation 
        mobileOpen={mobileOpen} 
        handleDrawerToggle={handleDrawerToggle} 
        isMobile={isMobile}
        user={user}
      />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />

        {/* HEADER */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600, mb: 1 }}>
              ReForest Sensors
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={backendStatusInfo.text}
              color={backendStatusInfo.color}
              icon={backendStatusInfo.icon}
              size="small"
              variant={backendStatus === 'healthy' ? 'filled' : 'outlined'}
            />
            <Chip
              label={mlStatusInfo.text}
              color={mlStatusInfo.color}
              icon={mlStatusInfo.icon}
              size="small"
              variant={mlServiceStatus.datasetLoaded ? 'filled' : 'outlined'}
            />
            <Tooltip title="Refresh all data">
              <Button 
                variant="outlined" 
                onClick={handleRefresh} 
                disabled={isRefreshing || loading}
                startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* DATASET UPLOAD SECTION */}
        <DatasetUploadSection
          mlServiceStatus={mlServiceStatus}
          onUpload={handleDatasetUpload}
          onReload={handleReloadDataset}
          reloadingDataset={reloadingDataset}
          uploadingDataset={uploadingDataset}
        />

        {/* LOADING BAR */}
        {(isRefreshing || loading) && <LinearProgress sx={{ mb: 2 }} />}
        
        {/* ERROR ALERT */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Service Status Warnings */}
        {backendStatus === 'unavailable' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Backend server is unavailable. ML recommendations will not work. Please ensure the backend is running on {BACKEND_CONFIG.BASE_URL}.
          </Alert>
        )}

        {/* MAIN CONTENT */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              Loading sensors from backend...
            </Typography>
          </Box>
        ) : sensors.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <SensorsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No sensors found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ensure sensors are configured in the Realtime Database and the backend is running.
            </Typography>
            <Button variant="outlined" onClick={handleRefresh} startIcon={<RefreshIcon />}>
              Retry
            </Button>
          </Card>
        ) : (
          <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Sensor ID</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">pH</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Moisture (%)</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Temp (°C)</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Last Reading</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                    <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedSensors.map((sensor) => {
                    const validation = validateSensorData({
                      pH: sensor.pH,
                      soilMoisture: sensor.soilMoisture,
                      temperature: sensor.temperature
                    });

                    // FIX: Allow ML generation even with warnings (sub-optimal values)
                    const canGenerateThisSensor = validation.isValid && canGenerateML;

                    return (
                      <TableRow 
                        key={sensor.id} 
                        hover 
                        onClick={() => handleSensorClick(sensor)}
                        sx={{ 
                          '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)' },
                          cursor: 'pointer'
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SensorsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="body2" fontWeight="medium">{sensor.id}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200, fontWeight: 'medium' }}>
                              {sensor.location}
                            </Typography>
                            {sensor.locationCoordinates && (
                              <Typography variant="caption" color="text.secondary">
                                {sensor.locationCoordinates.latitude?.toFixed(6)}°, {sensor.locationCoordinates.longitude?.toFixed(6)}°
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: sensor.pH !== "N/A" && sensor.pH >= SensorDataSchema.pH.optimal[0] && sensor.pH <= SensorDataSchema.pH.optimal[1] 
                                ? 'success.main' 
                                : sensor.pH !== "N/A" ? 'warning.main' : 'text.secondary',
                              fontWeight: sensor.pH !== "N/A" ? 'medium' : 'normal'
                            }}
                          >
                            {formatValue(sensor.pH)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              color: sensor.soilMoisture !== "N/A" && sensor.soilMoisture >= SensorDataSchema.soilMoisture.optimal[0] 
                                ? 'success.main' 
                                : sensor.soilMoisture !== "N/A" ? 'error.main' : 'text.secondary',
                              fontWeight: sensor.soilMoisture !== "N/A" ? 'medium' : 'normal'
                            }}
                          >
                            {formatValue(sensor.soilMoisture, '%')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              color: sensor.temperature !== "N/A" && sensor.temperature >= SensorDataSchema.temperature.optimal[0] && sensor.temperature <= SensorDataSchema.temperature.optimal[1]
                                ? 'success.main' 
                                : sensor.temperature !== "N/A" ? 'warning.main' : 'text.secondary',
                              fontWeight: sensor.temperature !== "N/A" ? 'medium' : 'normal'
                            }}
                          >
                            {formatValue(sensor.temperature, '°C')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTimestamp(sensor.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sensor.status}
                            color={getStatusColor(sensor.status)}
                            icon={getStatusIcon(sensor.status)}
                            size="small"
                            sx={{ minWidth: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title={
                            !canGenerateThisSensor 
                              ? !canGenerateML
                                ? 'ML service not ready. Upload dataset first.'
                                : `Cannot generate: ${validation.errors.join(', ')}`
                              : "Generate ML recommendations with backend processing"
                          }>
                            <span>
                              <Button 
                                variant="contained" 
                                size="small" 
                                onClick={() => handleGenerateML(sensor)}
                                disabled={
                                  processingMLSensor === sensor.id ||
                                  loading || 
                                  !canGenerateThisSensor
                                }
                                sx={{ 
                                  minWidth: 100,
                                  bgcolor: '#2e7d32',
                                  '&:hover': { bgcolor: '#1b5e20' },
                                }}
                                startIcon={
                                  processingMLSensor === sensor.id 
                                    ? <CircularProgress size={16} color="inherit" /> 
                                    : <ScienceIcon />
                                }
                              >
                                {processingMLSensor === sensor.id ? `${mlProgress.percent}%` : 'Generate ML'}
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={sensors.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        )}

        {/* SENSOR DETAIL DIALOG */}
        <Dialog
          open={sensorDetailOpen}
          onClose={handleCloseSensorDetail}
          maxWidth="sm"
          fullWidth={false}
          PaperProps={{
            sx: { borderRadius: 1, width: '100%', maxWidth: 600 },
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SensorsIcon sx={{ fontSize: 20 }} />
                Sensor Details Information
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent dividers>
            {selectedSensor && (
              <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          <LocationIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                          Location Information
                        </Typography>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {selectedSensor.location}
                        </Typography>

                        {selectedSensor.locationCoordinates && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <strong>Coordinates:</strong>{' '}
                            {selectedSensor.locationCoordinates.latitude?.toFixed(6)}°,{' '}
                            {selectedSensor.locationCoordinates.longitude?.toFixed(6)}°
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Status:</strong>
                          </Typography>
                          <Chip
                            label={selectedSensor.is_active ? 'Active' : 'Inactive'}
                            color={selectedSensor.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                      <Card variant="outlined" sx={{ flex: 1, minWidth: 150, bgcolor: '#e3f2fd', textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            <ScienceIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            pH Level
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {formatValue(selectedSensor.pH)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Optimal: {SensorDataSchema.pH.optimal.join(' - ')}
                          </Typography>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" sx={{ flex: 1, minWidth: 150, bgcolor: '#e8f5e9', textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            <WaterDropIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            Soil Moisture
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {formatValue(selectedSensor.soilMoisture, '%')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Optimal: {SensorDataSchema.soilMoisture.optimal.join(' - ')}%
                          </Typography>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" sx={{ flex: 1, minWidth: 150, bgcolor: '#fff3e0', textAlign: 'center' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            <ThermostatIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            Temperature
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {formatValue(selectedSensor.temperature, '°C')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Optimal: {SensorDataSchema.temperature.optimal.join(' - ')}°C
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Status & Calibration
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(selectedSensor.status)}
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color:
                                  getStatusColor(selectedSensor.status) === 'success'
                                    ? 'success.main'
                                    : getStatusColor(selectedSensor.status) === 'warning'
                                    ? 'warning.main'
                                    : getStatusColor(selectedSensor.status) === 'error'
                                    ? 'error.main'
                                    : 'text.primary',
                              }}
                            >
                              {selectedSensor.status}
                            </Typography>
                          </Box>

                          <Typography variant="body2" color="text.secondary">
                            Last calibration: {selectedSensor.lastCalibration || 'N/A'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />
                <SensorHistoryGrid readings={selectedSensor.readings || []} />
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseSensorDetail} variant="outlined" color="inherit">
              Close
            </Button>

            {selectedSensor &&
              validateSensorData({
                pH: selectedSensor.pH,
                soilMoisture: selectedSensor.soilMoisture,
                temperature: selectedSensor.temperature,
              }).isValid &&
              canGenerateML && (
                <Button
                  variant="contained"
                  startIcon={<ScienceIcon />}
                  sx={{
                    bgcolor: '#2e7d32',
                    '&:hover': { bgcolor: '#1b5e20' },
                  }}
                  onClick={() => {
                    handleCloseSensorDetail();
                    handleGenerateML(selectedSensor);
                  }}
                >
                  Generate ML Recommendations
                </Button>
              )}
          </DialogActions>
        </Dialog>

        {/* ML PROGRESS DIALOG */}
        <Dialog 
          open={processingMLSensor !== null}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Processing ML Algorithm
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {mlProgress.step}
            </Typography>
            <LinearProgress variant="determinate" value={mlProgress.percent} sx={{ height: 8, borderRadius: 4 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {mlProgress.percent}% Complete
            </Typography>
            {backendStatus === 'healthy' && (
              <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                Using Random Forest ML model
              </Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* NOTIFICATIONS */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity} 
            sx={{ width: '100%', minWidth: 300 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

export default Sensors;
