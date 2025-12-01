// src/context/AuthContext.js - UPDATED VERSION
import { useState, createContext, useContext, useEffect } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext();

// Helper functions
const getErrorMessage = (error) => {
  return error.message || 'An error occurred';
};

const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const AuthProvider = ({ children }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Check for existing user session on app start
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token') || localStorage.getItem('firebaseToken');
        
        if (storedUser && token) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          // ✅ FIXED: Check if getUser method exists before calling
          if (apiService.getUser && typeof apiService.getUser === 'function') {
            try {
              const currentUser = await apiService.getUser();
              if (currentUser && currentUser.id === userData.id) {
                setUser(currentUser);
                localStorage.setItem('user', JSON.stringify(currentUser));
              }
            } catch (error) {
              console.warn('Token validation failed:', error.message);
              // Token is invalid, logout user
              logout();
            }
          }
        }
      } catch (err) {
        console.error('Error checking existing auth:', err);
        logout();
      }
    };

    checkExistingAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError("");
      setLoading(true);

      console.log('🔐 Attempting login for:', email);

      // ✅ FIXED: Check if login method exists
      if (!apiService.login || typeof apiService.login !== 'function') {
        throw new Error('Login service not available');
      }

      const response = await apiService.login(email, password);

      if (!response.user) {
        throw new Error('Invalid response from server: missing user data');
      }

      // Store user data and token
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Store token if provided by backend
      if (response.token) {
        localStorage.setItem('token', response.token);
        // ✅ FIXED: Check if setAuthToken exists
        if (apiService.setAuthToken && typeof apiService.setAuthToken === 'function') {
          apiService.setAuthToken(response.token);
        }
      }
      
      // If using Firebase auth, store Firebase token
      if (response.firebaseToken) {
        localStorage.setItem('firebaseToken', response.firebaseToken);
        if (apiService.setAuthToken && typeof apiService.setAuthToken === 'function') {
          apiService.setAuthToken(response.firebaseToken);
        }
      }

      setUser(response.user);

      console.log('✅ Login successful for user:', response.user.email);

      return { 
        success: true, 
        user: response.user,
        message: response.message || 'Login successful'
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = getErrorMessage(error);
      
      // User-friendly error messages
      if (errorMessage.includes('invalid credential') || errorMessage.includes('wrong password')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('user not found')) {
        errorMessage = 'No account found with this email address.';
      } else if (errorMessage.includes('network') || errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (errorMessage.includes('too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (errorMessage.includes('service not available')) {
        errorMessage = 'Login service is currently unavailable. Please try again later.';
      }

      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError("");
      setLoading(true);

      if (!validateEmailFormat(userData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (userData.password && userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      console.log('👤 Attempting registration for:', userData.email);

      // ✅ FIXED: Check if register method exists
      if (!apiService.register || typeof apiService.register !== 'function') {
        throw new Error('Registration service not available');
      }

      const response = await apiService.register(userData);

      console.log('✅ Registration successful for:', userData.email);

      return { 
        success: true, 
        message: response.message || 'Registration successful! You can now log in.',
        user: response.user
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      let errorMessage = getErrorMessage(error);
      
      // User-friendly error messages
      if (errorMessage.includes('email already') || errorMessage.includes('user exists')) {
        errorMessage = 'An account with this email already exists.';
      } else if (errorMessage.includes('password') && errorMessage.includes('weak')) {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (errorMessage.includes('network') || errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (errorMessage.includes('service not available')) {
        errorMessage = 'Registration service is currently unavailable. Please try again later.';
      }

      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // ✅ FIXED: Only call logout if the method exists
      if (apiService.logout && typeof apiService.logout === 'function') {
        try {
          await apiService.logout();
        } catch (error) {
          console.warn('Backend logout failed:', error.message);
          // Continue with client-side logout anyway
        }
      }

      // Clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('firebaseToken');
      
      // ✅ FIXED: Only call these methods if they exist
      if (apiService.clearAuthToken && typeof apiService.clearAuthToken === 'function') {
        apiService.clearAuthToken();
      }
      
      if (apiService.clearAllCache && typeof apiService.clearAllCache === 'function') {
        apiService.clearAllCache();
      }
      
      // Reset state
      setUser(null);
      setError('');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force cleanup even if there's an error
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('firebaseToken');
      setUser(null);
      setError('');
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError("");
      setLoading(true);

      if (!validateEmailFormat(email)) {
        throw new Error('Please enter a valid email address');
      }

      console.log('🔐 Forgot password request for:', email);
      
      // ✅ FIXED: Check if forgotPassword method exists
      if (!apiService.forgotPassword || typeof apiService.forgotPassword !== 'function') {
        throw new Error('Password reset service not available');
      }

      const response = await apiService.forgotPassword(email);

      if (response.success) {
        console.log('✅ Password reset email sent successfully');
        return { 
          success: true, 
          message: response.message || 'Password reset email sent successfully. Please check your inbox.',
          resetLink: response.resetLink
        };
      } else {
        throw new Error(response.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.message.includes('Invalid email') || error.message.includes('valid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('user not found') || error.message.includes('no account')) {
        errorMessage = 'No account found with this email address.';
      } else if (error.message.includes('too many attempts')) {
        errorMessage = 'Too many reset attempts. Please try again later.';
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        errorMessage = 'Access denied. Please contact support.';
      } else if (error.message.includes('service not available')) {
        errorMessage = 'Password reset service is currently unavailable.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError("");
      setLoading(true);

      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      console.log('🔄 Attempting password reset');

      // ✅ FIXED: Check if resetPassword method exists
      if (!apiService.resetPassword || typeof apiService.resetPassword !== 'function') {
        throw new Error('Password reset service not available');
      }

      const response = await apiService.resetPassword(token, newPassword);

      if (response.success) {
        console.log('✅ Password reset successful');
        return { 
          success: true, 
          message: response.message || 'Password reset successfully! You can now log in with your new password.'
        };
      } else {
        throw new Error(response.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      
      let errorMessage = getErrorMessage(error);
      
      if (errorMessage.includes('invalid token') || errorMessage.includes('expired')) {
        errorMessage = 'The reset link has expired or is invalid. Please request a new password reset.';
      } else if (errorMessage.includes('network') || errorMessage.includes('CORS')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (errorMessage.includes('service not available')) {
        errorMessage = 'Password reset service is currently unavailable.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError("");
      setLoading(true);

      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      console.log('🔄 Attempting password change');

      // ✅ FIXED: Check if changePassword method exists
      if (!apiService.changePassword || typeof apiService.changePassword !== 'function') {
        throw new Error('Password change service not available');
      }

      const response = await apiService.changePassword({
        currentPassword,
        newPassword
      });

      if (response.success) {
        console.log('✅ Password change successful');
        return { 
          success: true, 
          message: response.message || 'Password changed successfully!'
        };
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('❌ Password change error:', error);
      
      let errorMessage = getErrorMessage(error);
      
      if (errorMessage.includes('current password') || errorMessage.includes('incorrect password')) {
        errorMessage = 'Current password is incorrect.';
      } else if (errorMessage.includes('network') || errorMessage.includes('CORS')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (errorMessage.includes('service not available')) {
        errorMessage = 'Password change service is currently unavailable.';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError("");
      setLoading(true);

      console.log('📝 Updating user profile');

      // ✅ FIXED: Check if updateProfile method exists
      if (!apiService.updateProfile || typeof apiService.updateProfile !== 'function') {
        throw new Error('Profile update service not available');
      }

      const response = await apiService.updateProfile(profileData);

      if (response.user) {
        // Update local user state
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        console.log('✅ Profile updated successfully');
        return { 
          success: true, 
          user: response.user,
          message: response.message || 'Profile updated successfully!'
        };
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('❌ Profile update error:', error);
      
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      // ✅ FIXED: Check if getUser method exists
      if (apiService.getUser && typeof apiService.getUser === 'function') {
        const currentUser = await apiService.getUser();
        if (currentUser) {
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
          return currentUser;
        }
      }
      return user; // Return current user if refresh fails
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error.message);
      return user;
    }
  };

  const value = {
    user,
    error,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    refreshUser,
    setError,
    clearError: () => setError('')
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
