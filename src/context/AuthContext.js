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
    const checkExistingAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
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

      const response = await apiService.login(email, password);

      if (response.user) {
        // Store user data
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('token', 'firebase-auth-token');

        setUser(response.user);

        return { 
          success: true, 
          user: response.user,
          message: response.message || 'Login successful'
        };
      } else {
        throw new Error(response.error || 'Invalid response from server');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
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

      const response = await apiService.register(userData);

      return { 
        success: true, 
        message: response.message || 'Registration successful! You can now log in.',
        user: response.user
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setError('');
    apiService.clearAllCache();
  };

  // UPDATED FORGOT PASSWORD FUNCTION
  const forgotPassword = async (email) => {
    try {
      console.log('🔐 Forgot password request for:', email);
      setError('');
      setLoading(true);

      const result = await apiService.forgotPassword(email);

      if (result.success) {
        console.log('✅ Password reset email sent successfully');
        return { 
          success: true, 
          message: result.message,
          resetLink: result.resetLink, // Include reset link if provided
          email: result.email,
          userId: result.userId
        };
      } else {
        throw new Error(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Additional auth methods
  const verifyResetCode = async (oobCode) => {
    try {
      setLoading(true);
      const result = await apiService.verifyResetCode(oobCode);
      return result;
    } catch (error) {
      console.error('❌ Verify reset code error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmPasswordReset = async (oobCode, newPassword) => {
    try {
      setLoading(true);
      const result = await apiService.confirmPasswordReset(oobCode, newPassword);
      return result;
    } catch (error) {
      console.error('❌ Confirm password reset error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      const result = await apiService.changePassword(passwordData);
      return result;
    } catch (error) {
      console.error('❌ Change password error:', error);
      throw error;
    } finally {
      setLoading(false);
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
    verifyResetCode,
    confirmPasswordReset,
    changePassword,
    setError,
    setLoading
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
