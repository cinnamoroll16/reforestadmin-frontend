// src/services/api.js - WITH RETRY LOGIC & EXPONENTIAL BACKOFF
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay
  }

  getCacheKey(endpoint, options = {}) {
    return `${options.method || 'GET'}_${endpoint}_${JSON.stringify(options.body || {})}`;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const cacheKey = this.getCacheKey(endpoint, options);
    
    // Check if we have a pending request for this endpoint
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for pending request: ${endpoint}`);
      return this.pendingRequests.get(cacheKey);
    }

    // Check cache for GET requests only
    if (!options.method || options.method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`💾 Using cached data: ${endpoint}`);
        return cached.data;
      }
    }

    // Get Firebase token
    let token;
    
    // Try to get Firebase auth current user token
    if (typeof window !== 'undefined' && window.firebase) {
      try {
        const currentUser = window.firebase.auth().currentUser;
        if (currentUser) {
          token = await currentUser.getIdToken();
        }
      } catch (error) {
        console.warn('Firebase token not available:', error);
      }
    }
    
    // Fallback to localStorage token
    if (!token) {
      token = localStorage.getItem('firebaseToken') || localStorage.getItem('token');
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        // Handle rate limiting with retry
        if (response.status === 429 && retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`⚠️ Rate limited. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(delay);
          
          // Remove from pending requests before retry
          this.pendingRequests.delete(cacheKey);
          
          // Retry the request
          return this.request(endpoint, options, retryCount + 1);
        }
        
        // Handle cases where response might not be JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.warn('Non-JSON response:', text);
          data = text;
        }

        if (!response.ok) {
          const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
          console.error(`❌ API Error: ${errorMessage}`);
          throw new Error(errorMessage);
        }

        // Cache successful GET requests
        if (!options.method || options.method === 'GET') {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }

        console.log(`✅ API Success: ${endpoint}`);
        return data;
      } catch (error) {
        console.error('❌ API Request failed:', error);
        throw error;
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(cacheKey);
      }
    })();

    // Store the pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  // ========== AUTH METHODS ==========
  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: { email: email.toLowerCase().trim(), password }
    });
  }

  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: {
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        role: userData.role
      }
    });
  }

  // IMPROVED FORGOT PASSWORD METHOD
  async forgotPassword(email) {
    try {
      console.log('📧 Sending password reset request for:', email);
      
      const response = await this.request('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() }
      });

      console.log('✅ Forgot password API response:', response);

      if (response.success) {
        return {
          success: true,
          message: response.message,
          resetLink: response.resetLink, // Will be undefined in production
          email: response.email,
          userId: response.userId
        };
      } else {
        // Handle specific error cases from backend
        if (response.message.includes('not enabled')) {
          throw new Error('Password reset is temporarily unavailable. Please contact support.');
        } else if (response.message.includes('Too many requests')) {
          throw new Error('Too many attempts. Please wait a few minutes before trying again.');
        } else {
          throw new Error(response.message || 'Failed to send reset email');
        }
      }
    } catch (error) {
      console.error('❌ Forgot password API error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else {
        // Use the error message from the backend if available
        errorMessage = error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  }

  async verifyResetCode(oobCode) {
    return this.request('/api/auth/verify-reset-code', {
      method: 'POST',
      body: { oobCode }
    });
  }

  async confirmPasswordReset(oobCode, newPassword) {
    return this.request('/api/auth/confirm-password-reset', {
      method: 'POST',
      body: { oobCode, newPassword }
    });
  }

  async changePassword(passwordData) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: passwordData
    });
  }

  // Health check for forgot password service
  async checkForgotPasswordHealth() {
    return this.request('/api/auth/forgot-password-health');
  }

  // Method to clear all cache and force fresh data
  clearAllCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🧹 Cleared all API cache');
  }

  // Method to clear cache for specific endpoint
  invalidateCache(endpoint) {
    for (const key of this.cache.keys()) {
      if (key.includes(endpoint)) {
        this.cache.delete(key);
      }
    }
  }

  // ========== PLANTING REQUESTS ==========
  async getPlantingRequests() {
    return this.request('/api/plantingrequests');
  }

  async updatePlantingRequest(id, updateData) {
    console.log('🌐 Calling updatePlantingRequest with:', { id, updateData });
    
    try {
      const result = await this.request(`/api/plantingrequests/${id}`, {
        method: 'PATCH',
        body: updateData,
      });
      
      this.invalidateCache('/api/plantingrequests');
      console.log('✅ updatePlantingRequest result:', result);
      return result;
    } catch (error) {
      console.error('❌ updatePlantingRequest failed:', error);
      throw error;
    }
  }

  // ========== PLANTING RECORDS ==========
  async getPlantingRecords() {
    try {
      console.log('🔍 Fetching planting records from:', `${this.baseURL}/api/plantingrecords`);
      const response = await this.request('/api/plantingrecords');
      console.log('📦 Raw API response:', response);
      
      if (Array.isArray(response)) {
        console.log(`📈 Number of records: ${response.length}`);
        return response;
      } else if (response && typeof response === 'object') {
        // Handle nested response structures
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (Array.isArray(response.records)) {
          return response.records;
        } else if (Array.isArray(response.plantingRecords)) {
          return response.plantingRecords;
        }
      }
      
      console.warn('⚠️ Unexpected response format for planting records:', response);
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch planting records:', error);
      return [];
    }
  }
  
  async createPlantingRecord(recordData) {
    const result = await this.request('/api/plantingrecords', {
      method: 'POST',
      body: recordData,
    });
    this.invalidateCache('/api/plantingrecords');
    return result;
  }

  async updatePlantingRecord(id, recordData) {
    const result = await this.request(`/api/plantingrecords/${id}`, {
      method: 'PUT',
      body: recordData,
    });
    this.invalidateCache('/api/plantingrecords');
    return result;
  }

  // ========== PLANTING TASKS ==========
  async getPlantingTasks() {
    try {
      const response = await this.request('/api/plantingtasks');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch planting tasks:', error);
      return [];
    }
  }
  
  async createPlantingTask(taskData) {
    const result = await this.request('/api/plantingtasks', {
      method: 'POST',
      body: taskData,
    });
    this.invalidateCache('/api/plantingtasks');
    return result;
  }
  
  async updatePlantingTask(id, taskData) {
    const result = await this.request(`/api/plantingtasks/${id}`, {
      method: 'PUT',
      body: taskData,
    });
    this.invalidateCache('/api/plantingtasks');
    return result;
  }

  // ========== SENSOR DATA ==========
  async getSensorData(sensorId, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      return await this.request(`/api/sensors/${sensorId}/data?${queryParams}`);
    } catch (error) {
      console.warn(`Sensor data for ${sensorId} not available:`, error.message);
      return null;
    }
  }

  // ========== NOTIFICATIONS ==========
  async getNotifications() {
    try {
      const response = await this.request('/api/notifications');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      return [];
    }
  }

  async createNotification(notificationData) {
    try {
      const result = await this.request('/api/notifications', {
        method: 'POST',
        body: notificationData,
      });
      this.invalidateCache('/api/notifications');
      return result;
    } catch (error) {
      // If endpoint doesn't exist (404), return mock success
      if (error.message.includes('Route not found') || error.message.includes('404')) {
        console.warn('⚠️ Notifications endpoint not available on backend');
        return { 
          success: false, 
          id: `mock-${Date.now()}`,
          message: 'Notification endpoint not available' 
        };
      }
      throw error;
    }
  }

  async updateNotification(id, notificationData) {
    const result = await this.request(`/api/notifications/${id}`, {
      method: 'PUT',
      body: notificationData,
    });
    this.invalidateCache('/api/notifications');
    return result;
  }

  async deleteNotification(id) {
    const result = await this.request(`/api/notifications/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache('/api/notifications');
    return result;
  }

  // ========== LOCATIONS ==========
  async getLocations() {
    try {
      const response = await this.request('/api/locations');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch locations:', error);
      return [];
    }
  }

  async getLocationById(id) {
    try {
      return await this.request(`/api/locations/${id}`);
    } catch (error) {
      console.warn(`Location ${id} not found:`, error.message);
      return null;
    }
  }

  // ========== RECOMMENDATIONS ==========
  async getRecommendations() {
    try {
      const response = await this.request('/api/recommendations');
      
      if (Array.isArray(response)) {
        return response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.recommendations)) {
          return response.recommendations;
        }
        return [response];
      }
      
      console.warn('Unexpected response format from getRecommendations:', response);
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch recommendations:', error);
      return [];
    }
  }

  async getRecommendation(id) {
    return this.getRecommendationById(id);
  }

  async getRecommendationById(id) {
    return this.request(`/api/recommendations/${id}`);
  }

  async deleteRecommendation(id) {
    const result = await this.request(`/api/recommendations/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache('/api/recommendations');
    return result;
  }

  async createRecommendation(recommendationData) {
    const result = await this.request('/api/recommendations', {
      method: 'POST',
      body: recommendationData,
    });
    this.invalidateCache('/api/recommendations');
    return result;
  }

  async updateRecommendation(id, recommendationData) {
    const result = await this.request(`/api/recommendations/${id}`, {
      method: 'PUT',
      body: recommendationData,
    });
    this.invalidateCache('/api/recommendations');
    return result;
  }

  // ========== USERS ==========
  async getUsers() {
    return this.request('/api/users');
  }

  async getUser(userId = null) {
    try {
      if (!userId) {
        return await this.request('/api/users/me');
      }
      return await this.request(`/api/users/${userId}`);
    } catch (error) {
      console.warn('Failed to fetch user:', error.message);
      
      if (process.env.NODE_ENV === 'development') {
        return this.getMockUserData();
      }
      
      throw new Error('User not found: ' + error.message);
    }
  }

  async getUserById(id) {
    return this.request(`/api/users/${id}`);
  }

  async updateUser(id, userData) {
    const result = await this.request(`/api/users/${id}`, {
      method: 'PUT',
      body: userData,
    });
    this.invalidateCache('/api/users');
    return result;
  }

  async updateProfile(userData) {
    const result = await this.request('/api/users/profile', {
      method: 'PUT',
      body: userData,
    });
    this.invalidateCache('/api/users');
    return result;
  }

  getMockUserData() {
    console.log('Using mock user data for development');
    return {
      id: 'mock-user-id',
      uid: 'mock-user-uid',
      user_firstname: 'Admin',
      user_middlename: '',
      user_lastname: 'User',
      user_email: 'admin@reforest.org',
      phone: '+1234567890',
      organization: 'DENR',
      designation: 'System Administrator',
      department: 'Administration',
      role: 'admin',
      notifications: true,
      twoFactor: false,
      theme: 'light',
      dashboardLayout: 'default',
      deactivated: false,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // ========== SENSORS ==========
  async getSensors() {
    return this.request('/api/sensors');
  }

  async getSensorById(id) {
    return this.request(`/api/sensors/${id}`);
  }

  // ========== TREE SEEDLINGS ==========
  async getTreeSeedlings() {
    return this.request('/api/tree-seedlings');
  }

  async getTreeSeedlingById(id) {
    return this.request(`/api/tree-seedlings/${id}`);
  }

  async getTreeSeedlingsByCategory(category) {
    return this.request(`/api/tree-seedlings/category/${category}`);
  }

  // ========== HEALTH CHECK ==========
  async healthCheck() {
    return this.request('/health');
  }

  // ========== ADDITIONAL PROFILE METHODS ==========
  async getRoles() {
    try {
      return await this.request('/api/roles');
    } catch (error) {
      console.warn('Roles endpoint not available:', error.message);
      return [
        { id: 'admin', role_name: 'Administrator' },
        { id: 'user', role_name: 'User' },
        { id: 'viewer', role_name: 'Viewer' }
      ];
    }
  }

  async getLoginHistory(userId) {
    try {
      return await this.request(`/api/users/${userId}/login-history`);
    } catch (error) {
      console.warn('Login history not available:', error.message);
      return [{
        id: '1',
        timestamp: new Date().toISOString(),
        ip: '192.168.1.1',
        device: 'Chrome on Windows',
        success: true
      }];
    }
  }

  async getAuditLogs(userId) {
    try {
      return await this.request(`/api/users/${userId}/audit-logs`);
    } catch (error) {
      console.warn('Audit logs not available:', error.message);
      return [{
        id: '1',
        timestamp: new Date().toISOString(),
        action: 'Profile updated',
        details: 'User updated their profile information',
        ip: '192.168.1.1'
      }];
    }
  }

  async createAuditLog(logData) {
    try {
      return await this.request('/api/audit-logs', {
        method: 'POST',
        body: logData,
      });
    } catch (error) {
      console.warn('Audit log creation failed:', error.message);
      return { success: true };
    }
  }

  async getActiveSessions(userId) {
    try {
      return await this.request(`/api/users/${userId}/active-sessions`);
    } catch (error) {
      console.warn('Active sessions not available:', error.message);
      return [{
        id: '1',
        browser: 'Chrome',
        os: 'Windows',
        ip: '192.168.1.1',
        lastActive: new Date().toISOString()
      }];
    }
  }

  async revokeSession(sessionId) {
    try {
      return await this.request(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Session revocation failed:', error.message);
      return { success: true };
    }
  }

  async exportAuditLogs(userId) {
    try {
      return await this.request(`/api/users/${userId}/export-audit-logs`);
    } catch (error) {
      console.warn('Export audit logs failed:', error.message);
      return { logs: [] };
    }
  }
}

export const apiService = new ApiService();
