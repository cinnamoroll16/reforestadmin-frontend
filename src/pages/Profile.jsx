// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Snackbar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Switch,
  FormControlLabel,
  Stack,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Badge,
  ListItemIcon,
  Divider,
  alpha,
} from "@mui/material";
import {
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Notifications as NotificationsIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  Logout as LogoutIcon,
  Help as HelpIcon,
  BugReport as BugReportIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Login as LoginIcon,
  Computer as ComputerIcon,
  Public as PublicIcon,
  Edit as EditIcon,
  Verified as VerifiedIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import ReForestAppBar from "./AppBar.jsx";
import Navigation from "./Navigation.jsx";
import { useAuth } from '../context/AuthContext.js';
import { apiService } from '../services/api.js';

const drawerWidth = 240;

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Profile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    user_firstname: "",
    user_middlename: "",
    user_lastname: "",
    user_email: "",
    phone: "",
    organization: "",
    designation: "",
    department: "",
    notifications: true,
    twoFactor: false,
    theme: "light",
    dashboardLayout: "default",
    deactivated: false,
    lastLogin: null,
  });
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [adminDeactivateDialogOpen, setAdminDeactivateDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Load admin profile and user data using API service
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
    try {
      console.log('========== LOADING ADMIN PROFILE ==========');
      
      // Load admin profile - pass the user UID from auth context
      const userData = await apiService.getUser(user.uid);
      if (userData) {
        console.log('✓ Admin profile data loaded:', userData);
        
        setProfile({
          user_firstname: userData.user_firstname || userData.user_Firstname || "",
          user_middlename: userData.user_middlename || userData.user_Middlename || "",
          user_lastname: userData.user_lastname || userData.user_Lastname || "",
          user_email: userData.user_email || userData.email || user.email || "",
          phone: userData.phone || userData.user_phone || "",
          organization: userData.organization || "DENR",
          designation: userData.designation || "System Administrator",
          department: userData.department || "Administration",
          notifications: userData.notifications ?? true,
          twoFactor: userData.twoFactor ?? false,
          theme: userData.theme || "light",
          dashboardLayout: userData.dashboardLayout || "default",
          deactivated: userData.deactivated || false,
          lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : null,
        });
      } else {
        setError('Profile not found');
      }

        // Load all users
        const usersData = await apiService.getUsers();
        setUsers(usersData);

        // Load roles
        try {
          const rolesData = await apiService.getRoles();
          setRoles(rolesData);
        } catch (error) {
          console.warn('⚠ Roles not available:', error.message);
          setRoles([]);
        }

        // Load login history
        try {
          const loginHistoryData = await apiService.getLoginHistory(user.uid);
          setLoginHistory(loginHistoryData);
        } catch (error) {
          console.warn('⚠ Login history not available:', error.message);
          setLoginHistory([]);
        }

        // Load audit logs
        try {
          const auditLogsData = await apiService.getAuditLogs(user.uid);
          setAuditLogs(auditLogsData);
        } catch (error) {
          console.warn('⚠ Audit logs not available:', error.message);
          setAuditLogs([]);
        }

        setLoading(false);

      } catch (error) {
        console.error("❌ Fatal error loading data:", error);
        setError("Failed to load data: " + error.message);
        setLoading(false);
      }
    };

    loadData();

    // Set up polling for real-time updates
    const pollInterval = setInterval(() => {
      loadData();
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [user]);

  const getRoleName = (roleRef) => {
    if (!roleRef) return "Unknown";
    
    try {
      const rolePath = typeof roleRef === 'string' ? roleRef : roleRef.path;
      const roleId = rolePath.split('/').filter(p => p).pop();
      
      const role = roles.find(r => r.id === roleId);
      return role ? (role.role_name || role.name || "Unknown") : "Unknown";
    } catch (error) {
      return "Unknown";
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updates = {
        user_Firstname: profile.user_firstname,
        user_Middlename: profile.user_middlename,
        user_Lastname: profile.user_lastname,
        user_email: profile.user_email,
        phone: profile.phone,
        department: profile.department,
        organization: profile.organization,
        designation: profile.designation,
        notifications: profile.notifications,
        twoFactor: profile.twoFactor,
        theme: profile.theme,
        dashboardLayout: profile.dashboardLayout,
        lastUpdated: new Date().toISOString(),
      };
      
      await apiService.updateUser(user.uid, updates);
      
      setSuccess("Profile updated successfully");
      
      try {
        await apiService.createAuditLog({
          userId: user.uid,
          action: "Profile updated",
          details: "Admin profile information updated"
        });
      } catch (auditError) {
        console.warn('⚠ Could not log audit event');
      }
      
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      setError("Failed to save profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Clear previous errors
    setError(null);
  
    // Validate new password is provided
    if (!passwordData.newPassword) {
      setError("New password is required");
      return;
    }
  
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
  
    // Validate password length
    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
  
    // Validate current password is provided (optional, but good UX)
    if (!passwordData.currentPassword) {
      setError("Current password is required");
      return;
    }
  
    try {
      setSaving(true);
      
      console.log('🔐 Changing password for user:', user.uid);
      
      // Call API with userId from auth context
      const result = await apiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        userId: user.uid  // ✅ This is the critical part
      });
      
      if (result.success) {
        setSuccess(result.message || "Password changed successfully!");
        setChangePasswordDialogOpen(false);
        
        // Reset password fields
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        
        // Optional: Automatically log out user after password change
        // This is a security best practice
        setTimeout(() => {
          setSuccess("Password changed. Logging out for security...");
          setTimeout(() => {
            logout();
          }, 1500);
        }, 2000);
      } else {
        throw new Error(result.message || "Failed to change password");
      }
    } catch (error) {
      console.error('❌ Change password error:', error);
      
      // User-friendly error messages
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.message.includes('weak')) {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.message.includes('not found')) {
        errorMessage = "User not found. Please log in again.";
      } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        errorMessage = "Cannot connect to server. Please check your connection.";
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateUser = async (userId, deactivate = true) => {
    if (!userId) {
      setError('Invalid user ID');
      return;
    }

    try {
      await apiService.updateUser(userId, {
        deactivated: deactivate,
        deactivatedAt: deactivate ? new Date().toISOString() : null,
        deactivatedBy: deactivate ? user.uid : null,
      });

      setSuccess(`User ${deactivate ? 'deactivated' : 'reactivated'} successfully`);
      setDeactivateDialogOpen(false);
      setSelectedUser(null);
      
      // Refresh users list
      const usersData = await apiService.getUsers();
      setUsers(usersData);
    } catch (error) {
      setError(`Failed to ${deactivate ? 'deactivate' : 'reactivate'} user: ` + error.message);
    }
  };

  const handleDeactivateAdmin = async () => {
    try {
      await apiService.updateUser(user.uid, {
        deactivated: true,
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: user.uid,
      });

      setSuccess("Your admin account has been deactivated");
      setAdminDeactivateDialogOpen(false);
      
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      setError("Failed to deactivate admin account: " + error.message);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await apiService.revokeSession(sessionId);
      setSuccess("Session revoked successfully");
      
      // Refresh active sessions
      const sessions = await apiService.getActiveSessions(user.uid);
      setActiveSessions(sessions);
    } catch (error) {
      setError("Failed to revoke session: " + error.message);
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const logsData = await apiService.exportAuditLogs(user.uid);
      const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess("Activity logs downloaded");
    } catch (error) {
      setError("Failed to download logs");
    }
  };

  const openDeactivateDialog = (userToDeactivate) => {
    setSelectedUser(userToDeactivate);
    setDeactivateDialogOpen(true);
  };

  const fullName = `${profile.user_firstname} ${profile.user_middlename} ${profile.user_lastname}`.trim() || 'Admin User';
  const initials = `${profile.user_firstname[0] || ''}${profile.user_lastname[0] || ''}`.toUpperCase() || 'AD';
  const activeUsersCount = users.filter(u => !u.deactivated).length;
  const totalUsersCount = users.length;

  if (loading) {
    return (
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: '#f5f7fa' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={40} sx={{ color: '#2e7d32' }} />
            <Typography variant="h6" sx={{ ml: 2 }}>Loading Administrator Profile...</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: "flex" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          <Alert severity="warning">Please log in to access administrator features.</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", bgcolor: '#f5f7fa', minHeight: "100vh" }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {/* Modern Header with Avatar */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              mb: 3, 
              borderRadius: 3,
              background: 'linear-gradient(135deg, #37983cff 0%, #1b5e20 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(30%, -30%)',
              }
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 100, 
                      height: 100,
                      bgcolor: 'white',
                      color: '#2e7d32',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      border: '4px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    {initials}
                  </Avatar>
                  
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h3" fontWeight="700">
                        {fullName}
                      </Typography>
                      {!profile.deactivated && (
                        <Tooltip title="Verified Administrator">
                          <VerifiedIcon sx={{ color: '#4caf50' }} />
                        </Tooltip>
                      )}
                    </Box>
                    
                    <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                      <Chip
                        icon={<AdminIcon />}
                        label={profile.designation}
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: 'white',
                          fontWeight: 600,
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                      <Chip 
                        label={profile.department} 
                        icon={<BusinessIcon />}
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: 'white',
                          fontWeight: 600,
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                      {profile.deactivated && (
                        <Chip 
                          icon={<BlockIcon />}
                          label="Deactivated"
                          color="error"
                        />
                      )}
                    </Stack>
                    
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body1">{profile.user_email}</Typography>
                      </Box>
                      
                      {profile.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon sx={{ fontSize: 18 }} />
                          <Typography variant="body1">{profile.phone}</Typography>
                        </Box>
                      )}
                      
                      {profile.lastLogin && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: 18 }} />
                          <Typography variant="body2">
                            Last login: {new Date(profile.lastLogin).toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Stack spacing={2}>
                  <Button 
                    variant="contained"
                    size="large"
                    startIcon={<EditIcon />}
                    onClick={() => setTabValue(0)}
                    sx={{ 
                      bgcolor: 'white',
                      color: '#2e7d32',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.9)'
                      }
                    }}
                  >
                    Edit Profile
                  </Button>
                  
                  <Button 
                    variant="outlined"
                    startIcon={<LogoutIcon />}
                    onClick={logout}
                    sx={{ 
                      borderColor: 'rgba(255,255,255,0.5)',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Log Out
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Main Content with Modern Tabs */}
          <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
              <Tabs 
                value={tabValue} 
                onChange={(e, newValue) => setTabValue(newValue)}
                variant={isMobile ? "scrollable" : "standard"}
                scrollButtons={isMobile ? "auto" : false}
                sx={{
                  px: 2,
                  '& .MuiTab-root': { 
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    minHeight: 64,
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      color: '#2e7d32'
                    }
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#2e7d32',
                    height: 3,
                    borderRadius: '3px 3px 0 0'
                  }
                }}
              >
                <Tab icon={<PersonIcon />} label="Profile Settings" iconPosition="start" />
                <Tab icon={<PeopleIcon />} label={`User Management (${totalUsersCount})`} iconPosition="start" />
                <Tab icon={<SecurityIcon />} label="Security & Audit" iconPosition="start" />
                <Tab icon={<SettingsIcon />} label="Preferences" iconPosition="start" />
                <Tab icon={<HelpIcon />} label="Support" iconPosition="start" />
              </Tabs>
            </Box>

            {/* Profile Settings Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: alpha('#2e7d32', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          <PersonIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h5" fontWeight="700">Personal Information</Typography>
                      </Box>
                      
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="First Name"
                            value={profile.user_firstname}
                            onChange={(e) => handleChange("user_firstname", e.target.value)}
                            disabled={profile.deactivated}
                            variant="outlined"
                          />
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Middle Name (Optional)"
                            value={profile.user_middlename}
                            onChange={(e) => handleChange("user_middlename", e.target.value)}
                            disabled={profile.deactivated}
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Last Name"
                            value={profile.user_lastname}
                            onChange={(e) => handleChange("user_lastname", e.target.value)}
                            disabled={profile.deactivated}
                          />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Phone Number"
                            value={profile.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            disabled={profile.deactivated}
                            InputProps={{
                              startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                            }}
                          />
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={profile.user_email}
                            onChange={(e) => handleChange("user_email", e.target.value)}
                            disabled={profile.deactivated}
                            InputProps={{
                              startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                            }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: alpha('#2e7d32', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          <BusinessIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h6" fontWeight="700">Organization</Typography>
                      </Box>
                  
                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="Organization"
                          value={profile.organization}
                          onChange={(e) => handleChange('organization', e.target.value)}
                          disabled={profile.deactivated}
                        />
                        
                        <TextField
                          fullWidth
                          label="Designation"
                          value={profile.designation}
                          onChange={(e) => handleChange('designation', e.target.value)}
                          disabled={profile.deactivated}
                        />
                        
                        <FormControl fullWidth disabled={profile.deactivated}>
                          <InputLabel>Department</InputLabel>
                          <Select
                            value={profile.department}
                            label="Department"
                            onChange={(e) => handleChange('department', e.target.value)}
                          >
                            <MenuItem value="Administration">Administration</MenuItem>
                            <MenuItem value="IT Management">IT Management</MenuItem>
                            <MenuItem value="System Administration">System Administration</MenuItem>
                            <MenuItem value="User Management">User Management</MenuItem>
                            <MenuItem value="Security">Security</MenuItem>
                            <MenuItem value="DENR Operations">DENR Operations</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4, gap: 2 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => window.location.reload()}
                  disabled={saving}
                  sx={{ px: 4 }}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || profile.deactivated}
                  sx={{ 
                    px: 4,
                    bgcolor: '#2e7d32',
                    '&:hover': {
                      bgcolor: '#1b5e20'
                    }
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            </TabPanel>

            {/* User Management Tab */}
            <TabPanel value={tabValue} index={1}>
              <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: 2, 
                        bgcolor: alpha('#2e7d32', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2
                      }}>
                        <PeopleIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
                      </Box>
                      <Typography variant="h5" fontWeight="700">System Users</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Chip 
                        label={`${activeUsersCount} Active`}
                        color="success"
                        icon={<CheckCircleIcon />}
                      />
                      <Chip 
                        label={`${totalUsersCount - activeUsersCount} Inactive`}
                        variant="outlined"
                        icon={<BlockIcon />}
                      />
                      <Button 
                        startIcon={<RefreshIcon />}
                        onClick={() => window.location.reload()}
                        size="small"
                      >
                        Refresh
                      </Button>
                    </Box>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha('#2e7d32', 0.05) }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>User</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Contact</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Role</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Organization</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Status</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((userItem) => {
                          const firstName = userItem.user_Firstname || userItem.user_firstname || userItem.firstName || "";
                          const middleName = userItem.user_Middlename || userItem.user_middlename || userItem.middleName || "";
                          const lastName = userItem.user_Lastname || userItem.user_lastname || userItem.lastName || "";
                          const fullName = `${firstName} ${middleName} ${lastName}`.trim() || "Unknown User";
                          const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';
                          
                          return (
                            <TableRow 
                              key={userItem.id} 
                              hover
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: alpha('#2e7d32', 0.02) 
                                }
                              }}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Avatar 
                                    sx={{ 
                                      mr: 2, 
                                      width: 44, 
                                      height: 44, 
                                      bgcolor: '#2e7d32',
                                      fontWeight: 600,
                                      fontSize: '1rem'
                                    }}
                                  >
                                    {initials}
                                  </Avatar>
                                  <Box>
                                    <Typography fontWeight="600" sx={{ fontSize: '0.95rem' }}>
                                      {fullName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {userItem.designation || userItem.role || 'N/A'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{userItem.user_email || userItem.email || 'N/A'}</Typography>
                                {userItem.phone && (
                                  <Typography variant="caption" color="text.secondary">{userItem.phone}</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={getRoleName(userItem.roleRef)} 
                                  size="small"
                                  sx={{
                                    bgcolor: (userItem.roleRef?.includes('admin') || getRoleName(userItem.roleRef).toLowerCase().includes('admin')) 
                                      ? alpha('#2e7d32', 0.1) 
                                      : alpha('#1976d2', 0.1),
                                    color: (userItem.roleRef?.includes('admin') || getRoleName(userItem.roleRef).toLowerCase().includes('admin'))
                                      ? '#2e7d32'
                                      : '#1976d2',
                                    fontWeight: 600
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{userItem.organization || 'N/A'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={userItem.deactivated ? "Inactive" : "Active"} 
                                  color={userItem.deactivated ? "error" : "success"}
                                  size="small"
                                  sx={{ fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {userItem.id !== user.uid && (
                                  <Tooltip title={userItem.deactivated ? "Reactivate User" : "Deactivate User"}>
                                    <IconButton
                                      color={userItem.deactivated ? "success" : "error"}
                                      onClick={() => userItem.deactivated ? 
                                        handleDeactivateUser(userItem.id, false) : 
                                        openDeactivateDialog(userItem)
                                      }
                                      size="small"
                                      sx={{
                                        '&:hover': {
                                          transform: 'scale(1.1)'
                                        }
                                      }}
                                    >
                                      {userItem.deactivated ? <CheckCircleIcon /> : <BlockIcon />}
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {users.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <PeopleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" fontWeight={600}>
                        No users found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Users will appear here once they register
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </TabPanel>

            {/* Security & Audit Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: alpha('#2e7d32', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          <SecurityIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h6" fontWeight="700">Security Settings</Typography>
                      </Box>
                      
                      <Stack spacing={3}>
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <Box>
                            <Typography fontWeight={600} gutterBottom>Two-Factor Authentication</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Add an extra layer of security
                            </Typography>
                          </Box>
                          <Switch
                            checked={profile.twoFactor}
                            onChange={(e) => handleChange('twoFactor', e.target.checked)}
                            disabled={profile.deactivated}
                          />
                        </Box>
                        
                        <Button 
                          variant="outlined" 
                          size="large"
                          startIcon={<LockIcon />}
                          onClick={() => setChangePasswordDialogOpen(true)}
                          disabled={profile.deactivated}
                          fullWidth
                          sx={{ 
                            py: 1.5,
                            borderColor: '#2e7d32',
                            color: '#2e7d32',
                            '&:hover': {
                              borderColor: '#1b5e20',
                              bgcolor: alpha('#2e7d32', 0.05)
                            }
                          }}
                        >
                          Change Password
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Active Sessions */}
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ComputerIcon color="action" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="700">Active Sessions</Typography>
                        </Box>
                        <Badge badgeContent={activeSessions.length} color="primary">
                          <RefreshIcon color="action" />
                        </Badge>
                      </Box>
                      
                      {activeSessions.length > 0 ? (
                        <List>
                          {activeSessions.map((session, index) => (
                            <ListItem 
                              key={index} 
                              divider={index < activeSessions.length - 1}
                              sx={{ px: 0 }}
                            >
                              <ListItemIcon>
                                <PublicIcon color="action" />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${session.browser} on ${session.os}`}
                                secondary={`IP: ${session.ip} • Last active: ${session.lastActive}`}
                              />
                              <ListItemSecondaryAction>
                                <Tooltip title="Revoke Session">
                                  <IconButton 
                                    edge="end" 
                                    onClick={() => handleRevokeSession(session.id)}
                                    color="error"
                                    size="small"
                                  >
                                    <BlockIcon />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <ComputerIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography color="text.secondary">No active sessions</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  {/* Login History */}
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <HistoryIcon color="action" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="700">Login History</Typography>
                        </Box>
                        <Chip 
                          label={loginHistory.length}
                          size="small"
                          sx={{ bgcolor: alpha('#2e7d32', 0.1), color: '#2e7d32', fontWeight: 600 }}
                        />
                      </Box>
                      
                      {loginHistory.length > 0 ? (
                        <List sx={{ maxHeight: 340, overflow: 'auto' }}>
                          {loginHistory.map((login) => (
                            <ListItem key={login.id} divider sx={{ px: 0 }}>
                              <ListItemIcon>
                                <LoginIcon color={login.success ? "success" : "error"} />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight={600}>
                                    {login.ip || 'Unknown IP'} • {login.device || 'Unknown Device'}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    {login.timestamp ? 
                                      `${new Date(login.timestamp).toLocaleString()} • ${login.success ? 'Success' : 'Failed'}` :
                                      'Unknown time'
                                    }
                                  </Typography>
                                }
                              />
                              {!login.success && (
                                <Chip label="Suspicious" color="warning" size="small" />
                              )}
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography color="text.secondary">No login history available</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>

                  {/* Audit Logs */}
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <WarningIcon color="action" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="700">Recent Activity</Typography>
                        </Box>
                        {auditLogs.length > 0 && (
                          <Button 
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadLogs}
                            size="small"
                            sx={{ color: '#2e7d32' }}
                          >
                            Export
                          </Button>
                        )}
                      </Box>
                      
                      {auditLogs.length > 0 ? (
                        <List sx={{ maxHeight: 340, overflow: 'auto' }}>
                          {auditLogs.map((log) => (
                            <ListItem key={log.id} divider sx={{ px: 0 }}>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight={600}>
                                    {log.action || 'Unknown action'}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    {log.timestamp ? 
                                      `${new Date(log.timestamp).toLocaleString()} • IP: ${log.ip || 'Unknown'}` :
                                      'Unknown time'
                                    }
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <WarningIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography color="text.secondary">No activity logs available</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Preferences Tab */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: alpha('#2e7d32', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          <NotificationsIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h6" fontWeight="700">Notification Preferences</Typography>
                      </Box>
                      
                      <Stack spacing={2}>
                        {[
                          { label: 'Email Notifications', checked: profile.notifications, field: 'notifications' },
                          { label: 'Planting Request Alerts', checked: true, field: 'plantingAlerts' },
                          { label: 'Sensor Updates', checked: true, field: 'sensorAlerts' },
                          { label: 'System Maintenance Alerts', checked: true, field: 'maintenanceAlerts' }
                        ].map((item, index) => (
                          <Box 
                            key={index}
                            sx={{ 
                              p: 2, 
                              borderRadius: 2, 
                              border: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <Typography>{item.label}</Typography>
                            <Switch
                              checked={item.field === 'notifications' ? profile.notifications : item.checked}
                              onChange={(e) => item.field === 'notifications' && handleChange(item.field, e.target.checked)}
                              disabled={profile.deactivated || item.field !== 'notifications'}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: alpha('#2e7d32', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          {profile.theme === 'dark' ? 
                            <DarkModeIcon sx={{ color: '#2e7d32', fontSize: 28 }} /> : 
                            <LightModeIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
                          }
                        </Box>
                        <Typography variant="h6" fontWeight="700">Theme & Appearance</Typography>
                      </Box>
                      
                      <Stack spacing={3}>
                        <FormControl fullWidth disabled={profile.deactivated}>
                          <InputLabel>Theme</InputLabel>
                          <Select
                            value={profile.theme}
                            label="Theme"
                            onChange={(e) => handleChange('theme', e.target.value)}
                          >
                            <MenuItem value="light">Light Mode</MenuItem>
                            <MenuItem value="dark">Dark Mode</MenuItem>
                            <MenuItem value="auto">Auto (System)</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <FormControl fullWidth disabled={profile.deactivated}>
                          <InputLabel>Dashboard Layout</InputLabel>
                          <Select
                            value={profile.dashboardLayout}
                            label="Dashboard Layout"
                            onChange={(e) => handleChange('dashboardLayout', e.target.value)}
                          >
                            <MenuItem value="default">Default</MenuItem>
                            <MenuItem value="compact">Compact</MenuItem>
                            <MenuItem value="detailed">Detailed</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4, gap: 2 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => window.location.reload()}
                  disabled={saving}
                  sx={{ px: 4 }}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || profile.deactivated}
                  sx={{ 
                    px: 4,
                    bgcolor: '#2e7d32',
                    '&:hover': {
                      bgcolor: '#1b5e20'
                    }
                  }}
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </Box>
            </TabPanel>

            {/* Support Tab */}
            <TabPanel value={tabValue} index={4}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: alpha('#2e7d32', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          <HelpIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h6" fontWeight="700">Help & Support</Typography>
                      </Box>
                      
                      <Stack spacing={2}>
                        <Button 
                          variant="outlined" 
                          startIcon={<HelpIcon />}
                          fullWidth
                          size="large"
                          sx={{ 
                            justifyContent: 'flex-start',
                            py: 1.5,
                            borderColor: 'divider',
                            color: 'text.primary',
                            '&:hover': {
                              borderColor: '#2e7d32',
                              bgcolor: alpha('#2e7d32', 0.05)
                            }
                          }}
                        >
                          User Documentation
                        </Button>
                        
                        <Button 
                          variant="outlined" 
                          startIcon={<BugReportIcon />}
                          fullWidth
                          size="large"
                          sx={{ 
                            justifyContent: 'flex-start',
                            py: 1.5,
                            borderColor: 'divider',
                            color: 'text.primary',
                            '&:hover': {
                              borderColor: '#2e7d32',
                              bgcolor: alpha('#2e7d32', 0.05)
                            }
                          }}
                        >
                          Report a Bug
                        </Button>
                        
                        <Button 
                          variant="outlined" 
                          startIcon={<EmailIcon />}
                          fullWidth
                          size="large"
                          sx={{ 
                            justifyContent: 'flex-start',
                            py: 1.5,
                            borderColor: 'divider',
                            color: 'text.primary',
                            '&:hover': {
                              borderColor: '#2e7d32',
                              bgcolor: alpha('#2e7d32', 0.05)
                            }
                          }}
                        >
                          Contact Support Team
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ borderRadius: 2, border: '2px solid', borderColor: 'error.light', bgcolor: alpha('#f44336', 0.02) }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: alpha('#f44336', 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}>
                          <WarningIcon sx={{ color: 'error.main', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h6" fontWeight="700" color="error.main">Danger Zone</Typography>
                      </Box>
                      
                      <Alert severity="warning" sx={{ mb: 3 }}>
                        <Typography variant="body2" fontWeight={600}>
                          These actions are irreversible. Proceed with caution.
                        </Typography>
                      </Alert>
                      
                      <Stack spacing={2}>
                        <Button 
                          variant="contained" 
                          color="error"
                          size="large"
                          startIcon={<BlockIcon />}
                          onClick={() => setAdminDeactivateDialogOpen(true)}
                          disabled={profile.deactivated}
                          fullWidth
                          sx={{ py: 1.5 }}
                        >
                          Deactivate My Account
                        </Button>
                        
                        <Button 
                          variant="outlined"
                          color="error"
                          size="large"
                          startIcon={<LogoutIcon />}
                          onClick={logout}
                          fullWidth
                          sx={{ py: 1.5 }}
                        >
                          Log Out
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Container>

        {/* Change Password Dialog */}
        <Dialog 
          open={changePasswordDialogOpen} 
          onClose={() => setChangePasswordDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LockIcon sx={{ mr: 2, color: '#2e7d32' }} />
              <Typography variant="h6" fontWeight="700">Change Password</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
                helperText={
                  passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                    ? "Passwords do not match"
                    : ""
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button onClick={() => setChangePasswordDialogOpen(false)} size="large">Cancel</Button>
            <Button 
              onClick={handleChangePassword}
              variant="contained"
              size="large"
              disabled={
                !passwordData.currentPassword || 
                !passwordData.newPassword || 
                passwordData.newPassword !== passwordData.confirmPassword
              }
              sx={{ 
                bgcolor: '#2e7d32',
                '&:hover': {
                  bgcolor: '#1b5e20'
                }
              }}
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>

        {/* User Deactivation Dialog */}
        <Dialog 
          open={deactivateDialogOpen} 
          onClose={() => setDeactivateDialogOpen(false)}
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 2, color: 'error.main' }} />
              <Typography variant="h6" fontWeight="700">Confirm User Deactivation</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Are you sure you want to deactivate this user?
            </Typography>
            {selectedUser && (
              <Box sx={{ p: 2, bgcolor: alpha('#f44336', 0.05), borderRadius: 2, mb: 2, border: '1px solid', borderColor: 'error.light' }}>
                <Typography variant="body2" fontWeight={600} gutterBottom><strong>Name:</strong> {
                  `${selectedUser.user_Firstname || ''} ${selectedUser.user_Middlename || ''} ${selectedUser.user_Lastname || ''}`.trim() || 'Unknown User'
                }</Typography>
                <Typography variant="body2"><strong>Email:</strong> {selectedUser.user_email || selectedUser.email || 'N/A'}</Typography>
              </Box>
            )}
            <Alert severity="warning">
              This user will no longer be able to access the system. Their data will be preserved.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setDeactivateDialogOpen(false)} size="large">Cancel</Button>
            <Button 
              onClick={() => handleDeactivateUser(selectedUser?.id, true)} 
              color="error"
              variant="contained"
              size="large"
            >
              Deactivate User
            </Button>
          </DialogActions>
        </Dialog>

        {/* Admin Self-Deactivation Dialog */}
        <Dialog 
          open={adminDeactivateDialogOpen} 
          onClose={() => setAdminDeactivateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 2, color: 'error.main', fontSize: 32 }} />
              <Typography variant="h6" fontWeight="700">Deactivate Administrator Account</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Critical Action
              </Typography>
              <Typography variant="body2" paragraph>
                You are about to deactivate your own administrator account. This action will:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                <li>Immediately log you out of the system</li>
                <li>Prevent future login attempts</li>
                <li>Preserve all your data and activities</li>
                <li>Require another administrator to reactivate your account</li>
              </Box>
            </Alert>
            <Typography fontWeight={600}>
              Are you absolutely sure you want to proceed?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setAdminDeactivateDialogOpen(false)} variant="outlined" size="large">
              Cancel
            </Button>
            <Button 
              onClick={handleDeactivateAdmin} 
              color="error"
              variant="contained"
              size="large"
              startIcon={<BlockIcon />}
            >
              Yes, Deactivate My Account
            </Button>
          </DialogActions>
        </Dialog>

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

        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            severity="error" 
            onClose={() => setError(null)} 
            sx={{ width: '100%', borderRadius: 2 }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Profile;
