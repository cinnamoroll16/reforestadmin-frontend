// src/pages/ForgotPassword.jsx - SIMPLIFIED VERSION
import React, { useState, useEffect } from 'react';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Link,
  Alert,
  InputAdornment,
  CircularProgress,
  Fade,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Email, CheckCircle, ArrowBack, ErrorOutline, ContentCopy, Close, OpenInNew } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  
  const [formData, setFormData] = useState({ email: '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [showResetLinkDialog, setShowResetLinkDialog] = useState(false);

  // Auto-open dialog when resetLink changes and success is true
  useEffect(() => {
    if (success && resetLink) {
      console.log('🔄 Auto-opening reset link dialog');
      setTimeout(() => {
        setShowResetLinkDialog(true);
      }, 100); // Small delay to ensure state is updated
    }
  }, [success, resetLink]);
  // Add this useEffect to debug
useEffect(() => {
  console.log('🔍 State Debug:', {
    success,
    resetLink,
    showResetLinkDialog,
    shouldShowDialog: success && resetLink
  });
}, [success, resetLink, showResetLinkDialog]);
  // Email validation
  const validateEmailFormat = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear errors when user types
    if (error) setError('');
    if (fieldError) setFieldError('');
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setFieldError('Email address is required');
      return false;
    }

    if (!validateEmailFormat(formData.email)) {
      setFieldError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous state
    setError('');
    setFieldError('');
    setResetLink('');
    setSuccess(false);
    setShowResetLinkDialog(false);
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      console.log('📧 Sending password reset email to:', formData.email);
      
      // Call API
      const result = await forgotPassword(formData.email.trim());
      
      if (result.success) {
        console.log('✅ Password reset email sent successfully');
        
        // Check if we got a reset link
        if (result.resetLink) {
          console.log('🔗 Reset link received:', result.resetLink);
          setResetLink(result.resetLink);
        }
        
        setSuccess(true);
        
      } else {
        throw new Error(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      console.error('❌ Forgot password error:', err);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = async () => {
    setError('');
    setFieldError('');
    setResetLink('');
    setSuccess(false);
    setShowResetLinkDialog(false);
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Resending password reset email to:', formData.email);
      
      const result = await forgotPassword(formData.email.trim());
      
      if (result.success) {
        console.log('✅ Password reset email resent successfully');
        
        if (result.resetLink) {
          setResetLink(result.resetLink);
        }
        
        setSuccess(true);
        setError('');
      } else {
        throw new Error(result.error || 'Failed to resend email');
      }
    } catch (err) {
      console.error('❌ Resend error:', err);
      
      let errorMessage = 'Failed to resend email. Please try again.';
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResetLink = () => {
    if (resetLink) {
      navigator.clipboard.writeText(resetLink);
      setError('Reset link copied to clipboard!');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleOpenResetLink = () => {
    if (resetLink) {
      console.log('🌐 Opening reset link:', resetLink);
      window.open(resetLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCloseDialog = () => {
    setShowResetLinkDialog(false);
  };

  // Success state UI
  if (success) {
    return (
      <>
        <Box
          sx={{ 
            minHeight: '100vh', 
            display: 'flex',
            width: '100%',
            margin: 0,
            padding: 0,
          }}
        >
          <Grid container sx={{ flex: 1, minHeight: '100vh', margin: 0 }}>
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: '#f8f9fa',
                p: { xs: 3, md: 6 },
                minHeight: '100vh',
              }}
            >
              <Fade in={success}>
                <Paper
                  elevation={3}
                  sx={{
                    width: '100%',
                    maxWidth: 450,
                    p: { xs: 4, md: 5 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: '#e8f5e9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 40, color: '#2e7d32' }} />
                  </Box>

                  <Typography 
                    variant="h4" 
                    fontWeight="600" 
                    align="center" 
                    gutterBottom
                    sx={{ color: '#1a1a1a', mb: 2 }}
                  >
                    {resetLink ? 'Reset Link Generated!' : 'Check Your Email'}
                  </Typography>

                  <Typography
                    variant="body1"
                    align="center"
                    color="text.secondary"
                    sx={{ mb: 3, lineHeight: 1.6 }}
                  >
                    {resetLink 
                      ? 'Your password reset link has been generated.'
                      : `We've sent password reset instructions to ${formData.email}`
                    }
                  </Typography>

                  {resetLink && (
                    <Alert 
                      severity="info" 
                      sx={{ 
                        mb: 3, 
                        width: '100%',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2">
                        <strong>Development Mode:</strong> Click the button below to open the reset link.
                      </Typography>
                    </Alert>
                  )}

                  {/* Error/Success Alert */}
                  {error && (
                    <Alert 
                      severity={error.includes('copied') ? "success" : "error"}
                      sx={{ 
                        mb: 3, 
                        width: '100%',
                        borderRadius: 2
                      }}
                    >
                      {error}
                    </Alert>
                  )}

                  {/* Show Reset Link Button */}
                  {resetLink && (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setShowResetLinkDialog(true)}
                      startIcon={<OpenInNew />}
                      sx={{
                        py: 1.5,
                        mb: 2,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontSize: '16px',
                        fontWeight: 600,
                        backgroundColor: '#ff9800',
                        '&:hover': {
                          backgroundColor: '#f57c00',
                        },
                      }}
                    >
                      Open Reset Link
                    </Button>
                  )}

                  {/* Resend Email Button */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleResendEmail}
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      mb: 2,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontSize: '16px',
                      fontWeight: 600,
                      borderColor: '#2e7d32',
                      color: '#2e7d32',
                      '&:hover': {
                        borderColor: '#1b5e20',
                        bgcolor: alpha('#2e7d32', 0.04),
                      },
                      '&:disabled': {
                        borderColor: '#a5d6a7',
                        color: '#a5d6a7',
                      }
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      'Resend Email'
                    )}
                  </Button>

                  {/* Back to Login Button */}
                  <Button
                    fullWidth
                    variant="text"
                    startIcon={<ArrowBack />}
                    onClick={handleBackToLogin}
                    sx={{
                      py: 1.5,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#666',
                      '&:hover': {
                        bgcolor: alpha('#2e7d32', 0.04),
                      }
                    }}
                  >
                    Back to Sign In
                  </Button>
                </Paper>
              </Fade>
            </Grid>

            {/* Right Panel */}
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                position: 'relative',
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'url(/images/loginImage.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    zIndex: 1,
                  }
                }}
              />
              
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 2,
                  color: '#fff',
                  textAlign: 'center',
                  p: 4,
                }}
              >
                <Typography
                  variant="h2"
                  fontWeight="700"
                  sx={{ 
                    textShadow: '3px 3px 8px rgba(0,0,0,0.7)',
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.5rem' }
                  }}
                >
                  REFOREST
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ 
                    textShadow: '2px 2px 6px rgba(0,0,0,0.7)',
                    opacity: 0.9,
                    fontWeight: 400,
                    maxWidth: 400,
                    mx: 'auto'
                }}
                >
                  Join us in restoring our planet, one tree at a time
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Reset Link Dialog */}
        <Dialog
          open={showResetLinkDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: 2,
            }
          }}
        >
          <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight={600}>
                🔗 Password Reset Link
              </Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Development Mode:</strong> This reset link would normally be sent via email.
              </Typography>
            </Alert>
            
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
              Click "Open Reset Page" to reset your password, or copy the link below:
            </Typography>
            
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                backgroundColor: '#f9f9f9',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                maxHeight: 150,
                overflow: 'auto',
              }}
            >
              {resetLink}
            </Paper>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              <strong>Redirects to:</strong> https://reforestadmin-frontend.vercel.app/reset-password
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              ⏰ <strong>Note:</strong> This link expires in 1 hour.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 1, borderTop: '1px solid #e0e0e0' }}>
            <Button onClick={handleCloseDialog} sx={{ mr: 1 }}>
              Close
            </Button>
            <Tooltip title="Copy reset link">
              <Button 
                startIcon={<ContentCopy />}
                onClick={handleCopyResetLink}
                variant="outlined"
                sx={{ mr: 1 }}
              >
                Copy Link
              </Button>
            </Tooltip>
            <Button 
              onClick={handleOpenResetLink}
              variant="contained"
              startIcon={<OpenInNew />}
              sx={{
                backgroundColor: '#2e7d32',
                '&:hover': { backgroundColor: '#1b5e20' }
              }}
            >
              Open Reset Page
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
  
  // Form state UI
  return (
    <Box
      sx={{ 
        minHeight: '100vh', 
        display: 'flex',
        width: '100%',
        margin: 0,
        padding: 0,
      }}
    >
      <Grid container sx={{ flex: 1, minHeight: '100vh', margin: 0 }}>
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#f8f9fa',
            p: { xs: 3, md: 6 },
            minHeight: '100vh',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              width: '100%',
              maxWidth: 450,
              p: { xs: 4, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 3,
              bgcolor: '#ffffff',
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: '#e3f2fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              <Email sx={{ fontSize: 30, color: '#2e7d32' }} />
            </Box>

            <Typography 
              variant="h4" 
              fontWeight="600" 
              align="center" 
              gutterBottom
              sx={{ color: '#1a1a1a', mb: 1 }}
            >
              Reset Password
            </Typography>
            <Typography
              variant="body1"
              align="center"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Enter your email address and we'll send you instructions to reset your password.
            </Typography>

            {/* Error Alerts */}
            {error && (
              <Alert 
                severity="error" 
                icon={<ErrorOutline />}
                sx={{ 
                  mb: 3, 
                  width: '100%',
                  borderRadius: 2
                }}
              >
                {error}
              </Alert>
            )}

            {fieldError && (
              <Alert 
                severity="error" 
                icon={<ErrorOutline />}
                sx={{ 
                  mb: 3, 
                  width: '100%',
                  borderRadius: 2
                }}
              >
                {fieldError}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ width: '100%' }}
            >
              <TextField
                fullWidth
                required
                id="email"
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                error={!!fieldError}
                helperText={fieldError}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !formData.email.trim()}
                sx={{
                  backgroundColor: '#2e7d32',
                  '&:hover': { 
                    backgroundColor: '#1b5e20',
                    boxShadow: 4,
                  },
                  '&:disabled': { backgroundColor: '#a5d6a7' },
                  py: 1.5,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: 2,
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Sending Reset Email...
                  </Box>
                ) : (
                  'Send Reset Email'
                )}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Remember your password?{' '}
                  <Link 
                    component={RouterLink} 
                    to="/login"
                    sx={{ 
                      color: '#2e7d32',
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Back to Sign In
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Panel */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            position: 'relative',
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'url(/images/loginImage.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                zIndex: 1,
              }
            }}
          />
          
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              color: '#fff',
              textAlign: 'center',
              p: 4,
            }}
          >
            <Typography
              variant="h2"
              fontWeight="700"
              sx={{ 
                textShadow: '3px 3px 8px rgba(0,0,0,0.7)',
                mb: 2,
                fontSize: { xs: '2.5rem', md: '3.5rem' }
              }}
            >
              REFOREST
            </Typography>
            <Typography
              variant="h5"
              sx={{ 
                textShadow: '2px 2px 6px rgba(0,0,0,0.7)',
                opacity: 0.9,
                fontWeight: 400,
                maxWidth: 400,
                mx: 'auto'
              }}
            >
              Join us in restoring our planet, one tree at a time
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ForgotPassword;
