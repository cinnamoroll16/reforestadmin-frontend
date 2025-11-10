// src/context/AuthContext.js
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
          
          // Verify the token is still valid by fetching current user
          try {
            const currentUser = await apiService.getUser();
            if (currentUser && currentUser.id === userData.id) {
              setUser(currentUser);
              localStorage.setItem('user', JSON.stringify(currentUser));
            }
          } catch (error) {
            console.warn('Token validation failed:', error);
            // Token is invalid, logout user
            logout();
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

      const response = await apiService.login({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (!response.user) {
        throw new Error('Invalid response from server: missing user data');
      }

      // Store user data and token
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Store token if provided by backend
      if (response.token) {
        localStorage.setItem('token', response.token);
        apiService.setAuthToken(response.token);
      }
      
      // If using Firebase auth, store Firebase token
      if (response.firebaseToken) {
        localStorage.setItem('firebaseToken', response.firebaseToken);
        apiService.setAuthToken(response.firebaseToken);
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
      } else if (errorMessage.includes('network') || errorMessage.includes('CORS')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (errorMessage.includes('too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.';
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

      const response = await apiService.register({
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        firstName: userData.firstName?.trim(),
        lastName: userData.lastName?.trim(),
        role: userData.role || 'user',
        phone: userData.phone,
        organization: userData.organization,
        designation: userData.designation,
        department: userData.department,
      });

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
      } else if (errorMessage.includes('network') || errorMessage.includes('CORS')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
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
      // Call backend logout if available
      try {
        await apiService.logout();
      } catch (error) {
        console.warn('Backend logout failed:', error);
        // Continue with client-side logout anyway
      }

      // Clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('firebaseToken');
      
      // Clear API cache and tokens
      apiService.clearAuthToken();
      
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
      const currentUser = await apiService.getUser();
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
        return currentUser;
      }
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
      // Don't logout here, just return current user
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
