// src/pages/Sensor.jsx - COMPLETE FIXED VERSION
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
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.jsx';
import Navigation from './Navigation.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

// ============================================================================
// BACKEND API CONFIGURATION - UPDATED WITH BETTER DEBUGGING
// ============================================================================
const BACKEND_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'https://reforestadmin-backend.vercel.app',
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
    HEALTH: '/health',
    ROOT: '/'
  },
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000
};

// ============================================================================
// VALIDATION SCHEMA - ADDED MISSING DEFINITION
// ============================================================================
const SensorDataSchema = {
  pH: { min: 0, max: 14, required: true, optimal: [6.0, 8.0] },
  soilMoisture: { min: 0, max: 100, required: true, optimal: [30, 70] },
  temperature: { min: -10, max: 60, required: true, optimal: [20, 35] }
};

// ============================================================================
// HELPER FUNCTIONS - ADDED MISSING FUNCTIONS
// ============================================================================

// Enhanced validation with warnings
const validateSensorData = (sensorData) => {
  const { pH, soilMoisture, temperature } = sensorData;
  const errors = [];
  const warnings = [];
  
  // Handle "N/A" values
  if (pH === "N/A" || soilMoisture === "N/A" || temperature === "N/A") {
    errors.push('Sensor data contains N/A values');
    return { isValid: false, errors, warnings, hasWarnings: false };
  }
  
  Object.entries(SensorDataSchema).forEach(([field, rules]) => {
    const value = sensorData[field];
    
    // Check if required and valid
    if (rules.required && (value === null || value === undefined)) {
      errors.push(`${field} is missing or unavailable`);
      return;
    }
    
    const numValue = parseFloat(value);
    
    // Check range validity
    if (isNaN(numValue)) {
      errors.push(`${field} must be a number`);
    } else if (numValue < rules.min || numValue > rules.max) {
      errors.push(`${field} (${numValue}) is outside valid range (${rules.min}-${rules.max})`);
    } else if (rules.optimal) {
      // Check optimal range for warnings
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
    hasWarnings: warnings.length > 0
  };
};

// Format timestamp
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

// Backend ML API service with comprehensive debugging
const backendMLService = {
  // Enhanced health check with multiple endpoint testing
  async healthCheck() {
    console.log('🔍 Starting comprehensive backend health check...');
    
    // Try multiple endpoints to see what works
    const endpointsToTry = [
      BACKEND_CONFIG.ENDPOINTS.HEALTH,
      BACKEND_CONFIG.ENDPOINTS.ROOT,
      BACKEND_CONFIG.ENDPOINTS.ML_STATUS
    ];
    
    for (const endpoint of endpointsToTry) {
      try {
        const url = `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
        console.log(`🔄 Testing endpoint: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✅ Endpoint ${endpoint} is responding (HTTP ${response.status})`);
          
          // Try to get response data
          try {
            const data = await response.json();
            console.log(`📊 Response from ${endpoint}:`, data);
          } catch (jsonError) {
            console.log(`📄 ${endpoint} responded but not with JSON`);
          }
          
          return true;
        } else {
          console.warn(`⚠️ Endpoint ${endpoint} returned HTTP ${response.status}`);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn(`⏰ Timeout on endpoint ${endpoint}`);
        } else {
          console.warn(`❌ Error testing ${endpoint}:`, error.message);
        }
      }
    }
    
    console.log('❌ All backend endpoints failed');
    return false;
  },

  // Get ML service status with fallback
  async getMLStatus() {
    try {
      console.log('📡 Checking ML service status...');
      
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_STATUS}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000
      });
      
      if (!response.ok) {
        console.warn(`ML status endpoint returned HTTP ${response.status}`);
        // Return minimal status for now
        return { 
          mlService: 'Checking...', 
          datasetLoaded: false,
          endpoint: BACKEND_CONFIG.ENDPOINTS.ML_STATUS,
          statusCode: response.status
        };
      }
      
      const data = await response.json();
      console.log('ML status response:', data);
      return data;
      
    } catch (error) {
      console.warn('ML status check failed:', error.message);
      return { 
        mlService: 'Unavailable', 
        datasetLoaded: false,
        error: error.message,
        endpoint: BACKEND_CONFIG.ENDPOINTS.ML_STATUS
      };
    }
  },

  // Generate ML recommendations with better error handling
  async generateRecommendations(sensorId, sensorData, location, coordinates) {
    try {
      console.log('🤖 Sending ML request to backend...');
      console.log('Request details:', { 
        sensorId, 
        sensorData, 
        location, 
        coordinates,
        url: `${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_RECOMMENDATIONS}`
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for ML processing
      
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          sensorId, 
          sensorData, 
          location, 
          coordinates 
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`❌ ML API returned HTTP ${response.status}`);
        
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Special handling for common errors
        if (response.status === 503) {
          errorMessage = 'Backend ML service is starting up. This can take a minute on free hosting. Please wait and try again.';
        } else if (response.status === 504) {
          errorMessage = 'ML processing timeout. The request took too long. This is common with free hosting. Please try again.';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Backend ML response:', result);
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'ML processing failed');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Backend ML API Error:', error);
      
      // Enhanced error messages
      let enhancedError = error.message;
      if (error.name === 'AbortError') {
        enhancedError = 'ML request timeout (45s). The backend might be cold-starting on free hosting. Please try again.';
      }
      
      throw new Error(`ML service: ${enhancedError}`);
    }
  },

  // Get dataset status
  async getDatasetStatus() {
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.ML_DATASET_STATUS}`, {
        timeout: 10000
      });
      
      if (!response.ok) {
        console.warn('Dataset status check failed with status:', response.status);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Dataset status fetch failed:', error.message);
      return null;
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
        timeout: 30000
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        throw new Error(errorData.message || `Upload failed! HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Dataset upload response:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Dataset upload failed:', error);
      throw new Error(`Dataset upload failed: ${error.message}`);
    }
  },

  // Test backend connectivity
  async testBackendConnectivity() {
    console.log('🔧 Testing backend connectivity...');
    
    const tests = {
      baseUrl: BACKEND_CONFIG.BASE_URL,
      endpoints: {},
      overall: 'unknown'
    };
    
    // Test root endpoint
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/`, { timeout: 5000 });
      tests.endpoints.root = {
        status: response.status,
        ok: response.ok,
        url: `${BACKEND_CONFIG.BASE_URL}/`
      };
    } catch (error) {
      tests.endpoints.root = { error: error.message };
    }
    
    // Test health endpoint
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`, { timeout: 5000 });
      tests.endpoints.health = {
        status: response.status,
        ok: response.ok,
        url: `${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`
      };
    } catch (error) {
      tests.endpoints.health = { error: error.message };
    }
    
    // Determine overall status
    if (tests.endpoints.root.ok || tests.endpoints.health.ok) {
      tests.overall = 'reachable';
    } else {
      tests.overall = 'unreachable';
    }
    
    console.log('Backend connectivity test:', tests);
    return tests;
  }
};

// ============================================================================
// DATASET UPLOAD COMPONENT - FIXED DEFINITION
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
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
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
        <Chip 
          label={mlServiceStatus.datasetLoaded ? 'Dataset Loaded' : 'Dataset Required'} 
          color={mlServiceStatus.datasetLoaded ? 'success' : 'warning'}
          size="small"
          variant={mlServiceStatus.datasetLoaded ? 'filled' : 'outlined'}
        />
      </Box>

      {mlServiceStatus.datasetLoaded && mlServiceStatus.speciesCount && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Dataset loaded successfully! {mlServiceStatus.speciesCount} tree species available for recommendations.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!selectedFile ? (
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            sx={{ 
              bgcolor: '#2e7d32',
              '&:hover': { bgcolor: '#1b5e20' },
              textTransform: 'none',
              fontWeight: 500,
              alignSelf: 'flex-start'
            }}
          >
            {mlServiceStatus.datasetLoaded ? 'Update Dataset' : 'Upload Tree Dataset'}
            <input
              type="file"
              hidden
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
          </Button>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Selected file: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)
            </Alert>
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
        
        {mlServiceStatus.datasetLoaded && (
          <Button
            variant="outlined"
            onClick={onReload}
            disabled={reloadingDataset}
            startIcon={reloadingDataset ? <CircularProgress size={16} /> : <RefreshIcon />}
            sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
          >
            {reloadingDataset ? 'Reloading...' : 'Reload Dataset'}
          </Button>
        )}
      </Box>
      
      {mlServiceStatus.error && !mlServiceStatus.datasetLoaded && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Unable to check dataset status: {mlServiceStatus.error}
        </Alert>
      )}
    </Paper>
  );
};

// ============================================================================
// BACKEND STATUS CARD COMPONENT
// ============================================================================
const BackendStatusCard = ({ 
  backendStatus, 
  mlServiceStatus, 
  onTestConnectivity,
  testingConnectivity 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const getStatusColor = () => {
    if (backendStatus === 'healthy') return 'success';
    if (backendStatus === 'unavailable') return 'warning';
    return 'info';
  };
  
  const getStatusText = () => {
    if (backendStatus === 'healthy') return 'Backend Connected';
    if (backendStatus === 'unavailable') return 'Backend Issues';
    return 'Checking Backend...';
  };
  
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            Backend Connection Status
          </Typography>
          <Chip 
            label={getStatusText()} 
            color={getStatusColor()} 
            size="small"
            variant={backendStatus === 'healthy' ? 'filled' : 'outlined'}
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Backend URL: <code>{BACKEND_CONFIG.BASE_URL}</code>
          </Typography>
          
          {mlServiceStatus.endpoint && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Last endpoint checked: <code>{mlServiceStatus.endpoint}</code>
            </Typography>
          )}
          
          {mlServiceStatus.statusCode && (
            <Typography variant="body2" color="text.secondary">
              HTTP Status: <strong>{mlServiceStatus.statusCode}</strong>
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onTestConnectivity}
            disabled={testingConnectivity}
            startIcon={testingConnectivity ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            {testingConnectivity ? 'Testing...' : 'Test Connection'}
          </Button>
          
          <Button
            variant="text"
            size="small"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          
          <Button
            variant="text"
            size="small"
            onClick={() => window.open(BACKEND_CONFIG.BASE_URL, '_blank')}
            startIcon={<InfoIcon />}
          >
            Open Backend
          </Button>
        </Box>
        
        {showDetails && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Debug Information:
            </Typography>
            <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
              <div>Base URL: {BACKEND_CONFIG.BASE_URL}</div>
              <div>Environment: {process.env.NODE_ENV}</div>
              <div>API URL env: {process.env.REACT_APP_API_URL || 'Not set'}</div>
              <div>Backend Status: {backendStatus}</div>
              <div>ML Service: {mlServiceStatus.mlService}</div>
              <div>Dataset Loaded: {mlServiceStatus.datasetLoaded ? 'Yes' : 'No'}</div>
              {mlServiceStatus.error && (
                <div>Error: {mlServiceStatus.error}</div>
              )}
            </Typography>
          </Box>
        )}
        
        {backendStatus === 'unavailable' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Backend Connection Issue</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              The backend at <code>{BACKEND_CONFIG.BASE_URL}</code> is not responding.
              This could be because:
            </Typography>
            <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
              <li>Backend server is still starting up (common on free hosting)</li>
              <li>Backend server is down or experiencing issues</li>
              <li>Network connectivity problems</li>
              <li>CORS configuration issues</li>
            </ul>
            <Typography variant="body2">
              Please wait a minute and try the "Test Connection" button. 
              The backend may be cold-starting on Vercel's free tier.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
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
  const [testingConnectivity, setTestingConnectivity] = useState(false);
  
  // Modal State
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorDetailOpen, setSensorDetailOpen] = useState(false);
  
  // Backend State
  const [backendStatus, setBackendStatus] = useState('checking');
  const [mlServiceStatus, setMlServiceStatus] = useState({ 
    mlService: 'Checking...', 
    datasetLoaded: false,
    endpoint: null,
    statusCode: null,
    error: null,
    lastCheck: null
  });
  
  // Error/Notification State
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ============================================================================
  // NOTIFICATION HELPER
  // ============================================================================
  const showNotification = useCallback((message, severity = 'info') => {
    console.log(`📢 Notification: ${severity} - ${message}`);
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // ============================================================================
  // EVENT HANDLERS - ADDED MISSING HANDLERS
  // ============================================================================
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => logout();

  // ============================================================================
  // BACKEND CONNECTIVITY TEST
  // ============================================================================
  const handleTestConnectivity = async () => {
    setTestingConnectivity(true);
    try {
      console.log('🔧 Starting manual backend connectivity test...');
      
      const connectivityTest = await backendMLService.testBackendConnectivity();
      
      if (connectivityTest.overall === 'reachable') {
        setBackendStatus('healthy');
        showNotification('Backend is reachable!', 'success');
        
        // Also check ML status
        const mlStatus = await backendMLService.getMLStatus();
        setMlServiceStatus({
          ...mlStatus,
          lastCheck: new Date().toISOString()
        });
      } else {
        setBackendStatus('unavailable');
        showNotification('Backend is not responding. Check console for details.', 'warning');
      }
      
      console.log('Connectivity test complete:', connectivityTest);
      
    } catch (error) {
      console.error('Connectivity test failed:', error);
      showNotification('Connectivity test failed: ' + error.message, 'error');
    } finally {
      setTestingConnectivity(false);
    }
  };

  // ============================================================================
  // DATASET UPLOAD HANDLER - ADDED MISSING FUNCTION
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
          ...(datasetStatus || {}),
          lastCheck: new Date().toISOString()
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
  // RELOAD DATASET HANDLER - ADDED MISSING FUNCTION
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
          ...(datasetStatus || {}),
          lastCheck: new Date().toISOString()
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
  // BACKEND & ML SERVICE HEALTH CHECK
  // ============================================================================
  useEffect(() => {
    let mounted = true;
    
    const checkServices = async () => {
      if (!mounted) return;
      
      try {
        console.log('🔄 Checking backend services...');
        
        const isBackendHealthy = await backendMLService.healthCheck();
        
        if (!mounted) return;
        
        if (isBackendHealthy) {
          setBackendStatus('healthy');
          console.log('✅ Backend health check passed');
          
          // Get ML status
          const mlStatus = await backendMLService.getMLStatus();
          
          if (!mounted) return;
          
          setMlServiceStatus({
            ...mlStatus,
            lastCheck: new Date().toISOString()
          });
          
          if (mlStatus.mlService === 'Active') {
            console.log('✅ ML service is active');
          }
        } else {
          setBackendStatus('unavailable');
          console.warn('⚠️ Backend health check failed');
          
          // Still try to get ML status for debugging
          try {
            const mlStatus = await backendMLService.getMLStatus();
            setMlServiceStatus({
              ...mlStatus,
              lastCheck: new Date().toISOString()
            });
          } catch (mlError) {
            console.warn('Could not get ML status:', mlError.message);
          }
        }
        
      } catch (error) {
        if (!mounted) return;
        console.error('Service health check failed:', error);
        setBackendStatus('unavailable');
        setMlServiceStatus({ 
          mlService: 'Error', 
          datasetLoaded: false,
          error: error.message,
          lastCheck: new Date().toISOString()
        });
      }
    };

    checkServices();
    
    // Set up periodic health check every 60 seconds (longer interval for free hosting)
    const healthCheckInterval = setInterval(() => {
      if (mounted && document.visibilityState === 'visible') {
        checkServices();
      }
    }, 60000);
    
    return () => {
      mounted = false;
      clearInterval(healthCheckInterval);
    };
  }, [showNotification]);

  // ============================================================================
  // INITIALIZE DATA
  // ============================================================================
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch sensor data even if backend is unavailable
        console.log('📡 Fetching sensor data...');
        const sensorsData = await apiService.getSensors();
        
        console.log(`✅ Loaded ${sensorsData.length} sensors from API`);
        
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
            readingsLoaded: false,
            // Provide default location name
            location: sensor.sensor_location || `Sensor ${sensor.id.substring(0, 8)}`,
            status: sensor.sensor_status || "Unknown",
            statusDescription: `Sensor is currently ${sensor.sensor_status || 'Unknown'}`,
            lastCalibration: sensor.sensor_lastCalibrationDate || null,
          };
        });
        
        setSensors(processedSensors);
        
        // Try to fetch locations but don't fail if it doesn't work
        try {
          const locationsData = await apiService.getLocations();
          const locationsMap = {};
          
          if (Array.isArray(locationsData)) {
            locationsData.forEach((location) => {
              if (location && location.id) {
                locationsMap[location.id] = {
                  id: location.id,
                  location_name: location.location_name || 'Unknown Location',
                  location_latitude: location.location_latitude,
                  location_longitude: location.location_longitude,
                };
              }
            });
          }
          
          setLocations(locationsMap);
          console.log(`📍 Loaded ${Object.keys(locationsMap).length} locations`);
        } catch (locationError) {
          console.warn('Could not load locations:', locationError.message);
          setLocations({});
        }
        
      } catch (error) {
        console.error("❌ Error fetching sensor data:", error);
        setError('Failed to fetch sensor data: ' + error.message);
        showNotification('Error loading sensors: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showNotification]);

  // ============================================================================
  // HANDLE ML GENERATION WITH FALLBACK
  // ============================================================================
  const handleGenerateML = async (sensor) => {
    const sensorId = sensor.id;
    
    // Validate data first
    const { pH, soilMoisture, temperature } = sensor;
    const validation = validateSensorData({ pH, soilMoisture, temperature });
    
    if (!validation.isValid) {
      showNotification(`Invalid sensor data: ${validation.errors.join(', ')}`, 'error');
      return;
    }
    
    if (backendStatus !== 'healthy') {
      showNotification(
        'Backend is not available. Please test connection first and ensure backend is running.',
        'error'
      );
      return;
    }
    
    try {
      setProcessingMLSensor(sensorId);
      setMlProgress({ step: 'Initializing ML request...', percent: 10 });
      
      const sensorData = {
        ph: parseFloat(pH),
        soilMoisture: parseFloat(soilMoisture),
        temperature: parseFloat(temperature)
      };
      
      setMlProgress({ step: 'Sending to backend ML service...', percent: 30 });
      
      const result = await backendMLService.generateRecommendations(
        sensorId,
        sensorData,
        sensor.location,
        sensor.coordinates
      );
      
      setMlProgress({ step: 'Processing results...', percent: 90 });
      
      if (result.success && result.recommendations && result.recommendations.length > 0) {
        const topTree = result.recommendations[0];
        showNotification(
          `✅ ML Complete! Top recommendation: ${topTree.commonName} (${(topTree.confidenceScore * 100).toFixed(1)}% confidence)`,
          'success'
        );

        setMlProgress({ step: 'Complete!', percent: 100 });

        // Navigate to recommendations page
        setTimeout(() => {
          navigate('/recommendations');
        }, 2000);
      } else {
        throw new Error('No recommendations received from ML service');
      }
      
    } catch (error) {
      console.error('❌ ML Generation failed:', error);
      
      let errorMessage = error.message;
      let severity = 'error';
      
      // Provide helpful suggestions based on error
      if (error.message.includes('starting up')) {
        errorMessage = 'Backend is starting up (common on free hosting). Please wait 30-60 seconds and try again.';
        severity = 'warning';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'ML request timed out. The backend might be overloaded. Please try again.';
        severity = 'warning';
      } else if (error.message.includes('cold-starting')) {
        errorMessage = 'Backend is cold-starting. First requests after inactivity can be slow on free hosting.';
        severity = 'info';
      }
      
      showNotification(`ML failed: ${errorMessage}`, severity);
      
    } finally {
      setProcessingMLSensor(null);
      setMlProgress({ step: '', percent: 0 });
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
            <Typography variant="body2" color="text.secondary">
              {sensors.length} sensor{sensors.length !== 1 ? 's' : ''} loaded
              {backendStatus === 'healthy' && mlServiceStatus.datasetLoaded && ' • ML Ready'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              onClick={handleTestConnectivity}
              disabled={testingConnectivity}
              startIcon={testingConnectivity ? <CircularProgress size={16} /> : <RefreshIcon />}
              size="small"
            >
              {testingConnectivity ? 'Testing...' : 'Test Backend'}
            </Button>
          </Box>
        </Box>

        {/* BACKEND STATUS CARD */}
        <BackendStatusCard
          backendStatus={backendStatus}
          mlServiceStatus={mlServiceStatus}
          onTestConnectivity={handleTestConnectivity}
          testingConnectivity={testingConnectivity}
        />

        {/* DATASET SECTION - ONLY SHOW IF BACKEND IS HEALTHY */}
        {backendStatus === 'healthy' && (
          <DatasetUploadSection
            mlServiceStatus={mlServiceStatus}
            onUpload={handleDatasetUpload}
            onReload={handleReloadDataset}
            reloadingDataset={reloadingDataset}
            uploadingDataset={uploadingDataset}
          />
        )}

        {/* SENSORS TABLE */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              Loading sensors...
            </Typography>
          </Box>
        ) : sensors.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <SensorsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No sensors found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Check your database connection and ensure sensors are configured.
            </Typography>
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
                  {sensors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((sensor) => {
                    const validation = validateSensorData({
                      pH: sensor.pH,
                      soilMoisture: sensor.soilMoisture,
                      temperature: sensor.temperature
                    });

                    const canGenerate = validation.isValid && backendStatus === 'healthy' && mlServiceStatus.datasetLoaded;

                    return (
                      <TableRow 
                        key={sensor.id} 
                        hover
                        sx={{ 
                          '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)' },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SensorsIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="body2" fontWeight="medium">
                              {sensor.id.substring(0, 12)}...
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200, fontWeight: 'medium' }}>
                            {sensor.location}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: sensor.pH !== "N/A" ? 'success.main' : 'text.secondary',
                              fontWeight: 'medium'
                            }}
                          >
                            {formatValue(sensor.pH)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              color: sensor.soilMoisture !== "N/A" ? 'success.main' : 'text.secondary',
                              fontWeight: 'medium'
                            }}
                          >
                            {formatValue(sensor.soilMoisture, '%')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              color: sensor.temperature !== "N/A" ? 'success.main' : 'text.secondary',
                              fontWeight: 'medium'
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
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={
                            !canGenerate 
                              ? !validation.isValid
                                ? `Invalid data: ${validation.errors.join(', ')}`
                                : backendStatus !== 'healthy'
                                ? 'Backend not available'
                                : !mlServiceStatus.datasetLoaded
                                ? 'Dataset not loaded'
                                : 'Cannot generate ML'
                              : "Generate ML recommendations"
                          }>
                            <span>
                              <Button 
                                variant="contained" 
                                size="small" 
                                onClick={() => handleGenerateML(sensor)}
                                disabled={!canGenerate || processingMLSensor === sensor.id}
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
                                {processingMLSensor === sensor.id ? 'Processing...' : 'Generate ML'}
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

        {/* NOTIFICATIONS */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
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
