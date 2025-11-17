// src/pages/AdminDashboard.js - UPDATED LOCATION RESOLUTION
import React, { useState, useEffect } from 'react';
import {
  LinearProgress,
  Box,
  Toolbar,
  useMediaQuery,
  useTheme,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Alert,
  Snackbar,
  Chip,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  People,
  PendingActions,
  CheckCircle,
  LocationOn,
  TrendingUp,
  Refresh,
  Check,
  Clear,
  Sensors,
  Nature
} from '@mui/icons-material';
import ReForestAppBar from "../pages/AppBar.jsx";
import Navigation from "./Navigation.jsx";
import { useAuth } from '../context/AuthContext.js';
import { apiService } from '../services/api.js';

// Recharts components
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

// Leaflet map components
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Create custom icons for sensors and planting sites
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const sensorIcon = createCustomIcon('#2196f3'); // Blue for sensors
const plantingSiteIcon = createCustomIcon('#4caf50'); // Green for planting sites

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0'];

// Helper function to resolve user reference
const resolveUserRef = async (userRef) => {
  if (!userRef) return { name: 'Unknown User', email: 'N/A' };
  
  try {
    // Extract user ID from reference
    const userId = typeof userRef === 'string' 
      ? userRef.split('/').pop() 
      : userRef.path?.split('/').pop();
    
    if (userId) {
      const userData = await apiService.getUser(userId);
      if (userData) {
        return {
          name: `${userData.user_firstname || userData.user_Firstname || userData.firstName || ''} ${userData.user_lastname || userData.user_Lastname || userData.lastName || ''}`.trim() || 'Unknown User',
          email: userData.user_email || userData.email || 'N/A'
        };
      }
    }
  } catch (error) {
    console.error('Error resolving user via API:', error);
  }
  
  return { name: 'Unknown User', email: 'N/A' };
};

// Helper function to resolve location reference - UPDATED VERSION
const resolveLocationRef = async (locationRef) => {
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

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [mapView, setMapView] = useState('both'); // 'sensors', 'sites', or 'both'
  const [dashboardData, setDashboardData] = useState({
    users: {
      total: 0,
      admins: 0,
      fieldUsers: 0,
      denrStaff: 0
    },
    pendingRequests: [],
    plantingTasks: {
      active: 0,
      completed: 0,
      pending: 0,
      cancelled: 0
    },
    plantingSites: [],
    sensors: [],
    monthlyRequestsData: [],
    taskDistribution: []
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch sensor locations using API service
  const fetchSensorLocations = async () => {
    try {
      const sensors = await apiService.getSensors();
      
      const sensorsWithLocations = await Promise.all(
        sensors.map(async (sensor) => {
          // Fetch location data if available
          let locationData = null;
          
          if (sensor.locationId) {
            try {
              const locations = await apiService.getLocations();
              locationData = locations.find(loc => loc.id === sensor.locationId);
            } catch (err) {
              console.error(`Error fetching location for sensor ${sensor.id}:`, err.message);
            }
          }

          // Fetch latest sensor reading from API
          let latestReading = null;
          
          try {
            const sensorData = await apiService.getSensorData(sensor.id, { limit: 1 });
            if (sensorData && sensorData.length > 0) {
              latestReading = sensorData[0];
            }
          } catch (err) {
            console.error(`Sensor data error for sensor ${sensor.id}:`, err.message);
          }

          // Build sensor object
          const sensorObj = {
            id: sensor.id,
            name: locationData?.location_name || sensor.name || `Sensor ${sensor.id.slice(0, 8)}`,
            lat: locationData ? parseFloat(locationData.location_latitude) : (sensor.latitude ? parseFloat(sensor.latitude) : null),
            lng: locationData ? parseFloat(locationData.location_longitude) : (sensor.longitude ? parseFloat(sensor.longitude) : null),
            sensorType: sensor.sensorType || 'Multi-parameter',
            status: sensor.status || sensor.sensor_status || 'offline',
            lastCalibration: sensor.lastCalibration || sensor.sensor_lastCalibrationDate,
            latestReading: latestReading ? {
              temperature: latestReading.temperature || 'N/A',
              soilMoisture: latestReading.soilMoisture || 'N/A',
              pH: latestReading.pH || 'N/A',
              timestamp: latestReading.timestamp || null
            } : null,
            locationId: sensor.locationId,
            locationPath: sensor.locationPath
          };
          
          return sensorObj;
        })
      );

      // Filter valid sensors
      const validSensors = sensorsWithLocations.filter(sensor => {
        const hasValidCoords = sensor.lat && sensor.lng && 
                              !isNaN(sensor.lat) && !isNaN(sensor.lng);
        return hasValidCoords;
      });
      
      return validSensors;

    } catch (error) {
      console.error('Error fetching sensors:', error);
      return [];
    }
  };

  // Fetch all dashboard data using API service
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Users from all collections
      let allUsers = [];
      
      // Fetch users from users collection (this may contain admins, stakeholders, etc.)
      try {
        const usersData = await apiService.getUsers();
        allUsers = [...usersData];
      } catch (error) {
        console.warn('Error fetching users collection:', error);
      }

      // Calculate user breakdown by role/collection
      const userBreakdown = allUsers.reduce((acc, userData) => {
        acc.total++;
        
        // Determine role from roleRef or organization
        let userRole = 'unknown';
        
        if (userData.roleRef) {
          // Extract role from roleRef path (e.g., "/roles/admin" -> "admin")
          const roleMatch = userData.roleRef.match(/\/roles\/(.+)$/);
          if (roleMatch) {
            userRole = roleMatch[1].toLowerCase();
          }
        } else if (userData.role_id || userData.roles || userData.role) {
          userRole = (userData.role_id || userData.roles || userData.role).toLowerCase();
        } else if (userData.organization) {
          // Use organization to infer role if roleRef is missing
          userRole = userData.organization.toLowerCase();
        } else if (userData.userId && !userData.roleRef) {
          // Users with userId but no roleRef are likely planters (from mobile app)
          userRole = 'planter';
        }
        
        // Categorize users
        if (userRole.includes('admin')) {
          acc.admins++;
        } else if (userRole.includes('denr') || userRole.includes('stakeholder')) {
          acc.denrStaff++;
        } else if (userRole.includes('field') || userRole.includes('planter') || userData.userId) {
          // Count users with userId as field users (planters from mobile app)
          acc.fieldUsers++;
        }
        
        return acc;
      }, { total: 0, admins: 0, fieldUsers: 0, denrStaff: 0 });

      // 2. Fetch ALL Planting Requests
      const allRequests = await apiService.getPlantingRequests();

      // Map all requests with user data - UPDATED LOCATION RESOLUTION
      const requestsWithUserData = await Promise.all(
        allRequests.map(async (request) => {
          let requesterName = 'Unknown User';
          let locationName = 'Not specified';
          
          // Prioritize fullName field over userRef lookup
          if (request.fullName) {
            requesterName = request.fullName;
          } else if (request.userRef) {
            // Only fetch from userRef if fullName is not available
            try {
              const userInfo = await resolveUserRef(request.userRef);
              requesterName = userInfo.name;
            } catch (err) {
              console.error('Error fetching user:', err);
            }
          } else if (request.userId) {
            try {
              const userData = await apiService.getUser(request.userId);
              requesterName = `${userData.firstName || userData.user_firstname || ''} ${userData.user_lastname || userData.lastName || ''}`.trim() || 'Unknown User';
            } catch (err) {
              console.error('Error fetching user:', err);
            }
          }

          // Get location - prioritize location_address, then location field
          if (request.location_address) {
            locationName = request.location_address;
          } else if (request.location) {
            locationName = request.location;
          } else if (request.locationRef) {
            try {
              const locationInfo = await resolveLocationRef(request.locationRef);
              locationName = locationInfo.name;
            } catch (err) {
              console.error('Error fetching location:', err);
            }
          } else if (request.locationId) {
            locationName = request.locationId;
          }

          // Format preferred date properly
          let formattedDate = 'Not specified';
          if (request.preferred_date) {
            try {
              // Handle both timestamp and string date formats
              if (typeof request.preferred_date === 'string') {
                const date = new Date(request.preferred_date);
                formattedDate = date.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                });
              } else if (request.preferred_date.toDate) {
                // Firestore timestamp
                formattedDate = request.preferred_date.toDate().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                });
              }
            } catch (err) {
              formattedDate = request.preferred_date;
            }
          }

          return {
            id: request.id,
            requesterName,
            type: 'Planting Request',
            site: locationName,
            date: request.request_date ? new Date(request.request_date) : new Date(),
            preferredDate: formattedDate,
            remarks: request.request_notes || request.request_remarks || '-',
            status: request.request_status || 'pending',
            coordinates: {
              lat: request.location_lat,
              lng: request.location_lng
            },
            ...request
          };
        })
      );

      // Filter only pending requests
      const pendingRequests = requestsWithUserData.filter(req => 
        (req.request_status || '').toLowerCase() === 'pending'
      );
      
      // 3. Fetch Planting Records (completed plantings) - FIXED VERSION
      const recordsResponse = await apiService.getPlantingRecords();

      // FIX: Handle nested response structure for planting records
      let recordsData = [];
      if (recordsResponse && recordsResponse.success && Array.isArray(recordsResponse.data)) {
        recordsData = recordsResponse.data;
        console.log(`✅ Extracted ${recordsData.length} planting records from nested response`);
      } else if (Array.isArray(recordsResponse)) {
        recordsData = recordsResponse;
        console.log(`✅ Using ${recordsData.length} planting records directly`);
      } else {
        console.warn('⚠️ Unexpected response format for planting records:', recordsResponse);
        recordsData = [];
      }

      // Count completed tasks from plantingrecords
      const plantingTasks = {
        active: 0,
        completed: recordsData.length, // Use the extracted array
        pending: 0,
        cancelled: 0
      };

      // Fetch plantingtasks for pending/active/cancelled counts
      try {
        const tasksData = await apiService.getPlantingTasks();
        
        tasksData.forEach(taskData => {
          const status = (taskData.task_status || '').toLowerCase();
          
          if (status === 'pending') plantingTasks.pending++;
          else if (status === 'cancelled') plantingTasks.cancelled++;
          else if (status === 'active') plantingTasks.active++;
        });
        
      } catch (error) {
        console.warn('plantingtasks collection not available:', error.message);
      }

      // 4. Fetch Planting Sites from locations collection
      const locationsData = await apiService.getLocations();
      const plantingSites = locationsData.map(location => {
        return {
          id: location.id,
          name: location.location_name || 'Unnamed Location',
          lat: parseFloat(location.location_latitude) || null,
          lng: parseFloat(location.location_longitude) || null,
          status: 'active',
          ...location
        };
      }).filter(site => site.lat && site.lng && !isNaN(site.lat) && !isNaN(site.lng));

      // 5. Fetch Sensor Locations
      const sensors = await fetchSensorLocations();

      // 6. Generate Monthly Requests Data (last 6 months)
      const monthlyRequestsData = generateMonthlyData(requestsWithUserData);

      // 7. Task distribution for pie chart
      const taskDistribution = [
        { name: 'Active', value: plantingTasks.active, color: COLORS[0] },
        { name: 'Completed', value: plantingTasks.completed, color: COLORS[1] },
        { name: 'Pending', value: plantingTasks.pending, color: COLORS[2] },
        { name: 'Cancelled', value: plantingTasks.cancelled, color: COLORS[3] }
      ].filter(item => item.value > 0);

      setDashboardData({
        users: userBreakdown,
        pendingRequests,
        plantingTasks,
        plantingSites,
        sensors,
        monthlyRequestsData,
        taskDistribution
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading dashboard data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate monthly data for charts
  const generateMonthlyData = (requests) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthNames[date.getMonth()];
      
      const count = requests.filter(request => {
        const requestDate = request.request_date?.toDate?.() || request.date;
        const docDate = requestDate instanceof Date ? requestDate : new Date(requestDate);
        return docDate && 
               docDate.getMonth() === date.getMonth() && 
               docDate.getFullYear() === date.getFullYear();
      }).length;

      monthlyData.push({
        month: monthName,
        requests: count
      });
    }

    return monthlyData;
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => logout();
  const handleRefresh = () => fetchDashboardData();

  // Overview Cards Data
  const overviewCards = [
    {
      title: 'Total Users',
      value: dashboardData.users.total,
      subtitle: `Admins: ${dashboardData.users.admins} | Field: ${dashboardData.users.fieldUsers} | DENR: ${dashboardData.users.denrStaff}`,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#4caf50'
    },
    {
      title: 'Active Sensors',
      value: dashboardData.sensors.length,
      subtitle: `Monitoring ${dashboardData.plantingSites.length} locations`,
      icon: <Sensors sx={{ fontSize: 40 }} />,
      color: '#2196f3'
    },
    {
      title: 'Pending Requests',
      value: dashboardData.pendingRequests.length,
      subtitle: 'Awaiting approval',
      icon: <PendingActions sx={{ fontSize: 40 }} />,
      color: '#ff9800'
    },
    {
      title: 'Completed Tasks',
      value: dashboardData.plantingTasks.completed,
      subtitle: 'Successfully finished',
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: '#ffc107'
    }
  ];

  // Calculate map center
  const defaultCenter = [10.3157, 123.8854]; // Cebu City
  let mapCenter = defaultCenter;
  
  if (mapView === 'sensors' && dashboardData.sensors.length > 0) {
    mapCenter = [dashboardData.sensors[0].lat, dashboardData.sensors[0].lng];
  } else if (mapView === 'sites' && dashboardData.plantingSites.length > 0) {
    mapCenter = [dashboardData.plantingSites[0].lat, dashboardData.plantingSites[0].lng];
  } else if (dashboardData.sensors.length > 0) {
    mapCenter = [dashboardData.sensors[0].lat, dashboardData.sensors[0].lng];
  } else if (dashboardData.plantingSites.length > 0) {
    mapCenter = [dashboardData.plantingSites[0].lat, dashboardData.plantingSites[0].lng];
  }

  // Determine what to show on map
  const showSensors = mapView === 'sensors' || mapView === 'both';
  const showSites = mapView === 'sites' || mapView === 'both';

  return (
    <Box sx={{ display: "flex", minHeight: '100vh' }}>
      <ReForestAppBar
        handleDrawerToggle={handleDrawerToggle}
        user={user}
        onLogout={handleLogout}
      />

      <Navigation
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        isMobile={isMobile}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: "calc(100% - 240px)" },
          backgroundColor: '#f8f9fa'
        }}
      >
        <Toolbar />
        
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: '#2e7d32' }}>
                ReForest Admin Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Welcome back, {user?.name || 'Admin'}! Manage and monitor reforestation activities.
              </Typography>
            </Box>
            <Button 
              startIcon={<Refresh />} 
              onClick={handleRefresh} 
              variant="outlined"
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              Loading dashboard data...
            </Typography>
          </Box>
        )}

        {/* Overview Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {overviewCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  background: `linear-gradient(135deg, ${card.color}20 0%, ${card.color}10 100%)`,
                  border: `1px solid ${card.color}30`,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color={card.color}>
                        {card.value}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.subtitle}
                      </Typography>
                    </Box>
                    <Box sx={{ color: card.color }}>
                      {card.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Map and Pending Requests */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Interactive Map */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 2, height: 500 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOn sx={{ mr: 1 }} />
                  Location Map
                </Typography>
                
                <ToggleButtonGroup
                  value={mapView}
                  exclusive
                  onChange={(e, newView) => newView && setMapView(newView)}
                  size="small"
                >
                  <ToggleButton value="both">Both</ToggleButton>
                  <ToggleButton value="sensors">Sensors ({dashboardData.sensors.length})</ToggleButton>
                  <ToggleButton value="sites">Sites ({dashboardData.plantingSites.length})</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<Sensors />} 
                  label={`${dashboardData.sensors.length} Active Sensors`} 
                  color="primary" 
                  size="small"
                  sx={{ display: showSensors ? 'flex' : 'none' }}
                />
                <Chip 
                  icon={<Nature />} 
                  label={`${dashboardData.plantingSites.length} Planting Sites`} 
                  color="success" 
                  size="small"
                  sx={{ display: showSites ? 'flex' : 'none' }}
                />
              </Box>
              
              <Box sx={{ height: 380, borderRadius: 1, overflow: 'hidden' }}>
                {(dashboardData.sensors.length > 0 || dashboardData.plantingSites.length > 0) ? (
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Render IoT Sensors */}
                    {showSensors && dashboardData.sensors.map((sensor) => (
                      <React.Fragment key={`sensor-${sensor.id}`}>
                        <Marker 
                          position={[sensor.lat, sensor.lng]}
                          icon={sensorIcon}
                        >
                          <Popup>
                            <Box sx={{ minWidth: 200 }}>
                              <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                🔵 IoT Sensor
                              </Typography>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="body2"><strong>Sensor ID:</strong> {sensor.name}</Typography>
                              <Typography variant="body2"><strong>Type:</strong> {sensor.sensorType}</Typography>
                              <Typography variant="body2">
                                <strong>Status:</strong> {' '}
                                <Chip 
                                  label={sensor.status === 'active' ? 'Online' : 'Offline'} 
                                  size="small" 
                                  color={sensor.status === 'active' ? 'success' : 'error'}
                                />
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Coordinates:</strong><br />
                                Lat: {sensor.lat.toFixed(6)}<br />
                                Lng: {sensor.lng.toFixed(6)}
                              </Typography>
                              
                              {sensor.latestReading && (
                                <>
                                  <Divider sx={{ my: 1 }} />
                                  <Typography variant="caption" fontWeight="bold">Latest Reading:</Typography>
                                  <Typography variant="caption" display="block">
                                    Temp: {sensor.latestReading.temperature}°C
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Moisture: {sensor.latestReading.soilMoisture}%
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    pH: {sensor.latestReading.pH}
                                  </Typography>
                                  {sensor.latestReading.timestamp && (
                                    <Typography variant="caption" display="block" color="text.secondary">
                                      {new Date(sensor.latestReading.timestamp).toLocaleString()}
                                    </Typography>
                                  )}
                                </>
                              )}
                              
                              <Button 
                                size="small" 
                                variant="outlined" 
                                fullWidth 
                                sx={{ mt: 1 }}
                                onClick={() => window.open(
                                  `https://www.google.com/maps/search/?api=1&query=${sensor.lat},${sensor.lng}`,
                                  '_blank'
                                )}
                              >
                                Open in Google Maps
                              </Button>
                            </Box>
                          </Popup>
                        </Marker>
                        
                        <Circle
                          center={[sensor.lat, sensor.lng]}
                          radius={50}
                          pathOptions={{
                            color: '#2196f3',
                            fillColor: '#2196f3',
                            fillOpacity: 0.1
                          }}
                        />
                      </React.Fragment>
                    ))}
                    
                    {/* Render Planting Sites */}
                    {showSites && dashboardData.plantingSites.map((site) => (
                      <Marker 
                        key={`site-${site.id}`} 
                        position={[site.lat, site.lng]}
                        icon={plantingSiteIcon}
                      >
                        <Popup>
                          <Box sx={{ minWidth: 180 }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                              🌱 Planting Site
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2"><strong>{site.name}</strong></Typography>
                            <Typography variant="body2">Status: {site.status}</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Coordinates:</strong><br />
                              {site.lat.toFixed(6)}, {site.lng.toFixed(6)}
                            </Typography>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="success"
                              fullWidth 
                              sx={{ mt: 1 }}
                              onClick={() => window.open(
                                `https://waze.com/ul?ll=${site.lat},${site.lng}&navigate=yes`,
                                '_blank'
                              )}
                            >
                              Navigate with Waze
                            </Button>
                          </Box>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#f5f5f5',
                      borderRadius: 1
                    }}
                  >
                    <LocationOn sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
                    <Typography color="text.secondary">
                      No sensors or planting sites with valid coordinates
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Deploy sensors and add locations with latitude and longitude
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Pending Requests - Side Panel - FIXED LOCATION DISPLAY */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2, height: 500 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PendingActions sx={{ mr: 1 }} />
                  Pending Requests
                </Typography>
                <Chip 
                  label={dashboardData.pendingRequests.length} 
                  color="warning" 
                  size="small"
                />
              </Box>
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Requester</strong></TableCell>
                      <TableCell><strong>Location</strong></TableCell>
                      <TableCell><strong>Preferred Date</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData.pendingRequests.map((request) => (
                      <TableRow key={request.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium" noWrap>
                            {request.requesterName}
                          </Typography>
                          {request.organization && request.organization !== 'None' && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {request.organization}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={request.site}
                          >
                            {request.site}
                          </Typography>
                          {request.coordinates?.lat && request.coordinates?.lng && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              📍 {request.coordinates.lat.toFixed(4)}, {request.coordinates.lng.toFixed(4)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {request.preferredDate}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {dashboardData.pendingRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="text.secondary" sx={{ py: 3 }}>
                            No pending requests
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1 }} />
              Analytics Overview
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Monthly Requests Bar Chart */}
            <Grid item xs={12} md={8}>
              <Box sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Planting Requests (Last 6 Months)
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsBar data={dashboardData.monthlyRequestsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="requests" fill="#4caf50" name="Requests" />
                  </RechartsBar>
                </ResponsiveContainer>
              </Box>
            </Grid>

            {/* Task Distribution Pie Chart */}
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                  Task Status Distribution
                </Typography>
                {dashboardData.taskDistribution && dashboardData.taskDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboardData.taskDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dashboardData.taskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">No task data available</Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminDashboard;
