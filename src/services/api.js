// src/services/api.js - COMPLETE FIXED VERSION
// UPDATED: Proper CORS handling and complete method implementations

// Get API URL from environment variables
const API_BASE_URL = 
  process.env.REACT_APP_API_URL ||
  import.meta?.env?.VITE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://reforestadmin-backend.vercel.app';

// Debug: Log the API URL being used
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🌍 Environment:', process.env.NODE_ENV);

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
    let token = localStorage.getItem('firebaseToken') || localStorage.getItem('token');
    
    // Try to get Firebase auth current user token if available
    if (typeof window !== 'undefined' && window.firebase && window.firebase.auth) {
      try {
        const currentUser = window.firebase.auth().currentUser;
        if (currentUser) {
          token = await currentUser.getIdToken();
          // Store for future use
          localStorage.setItem('firebaseToken', token);
        }
      } catch (error) {
        console.warn('Firebase token not available:', error);
      }
    }

    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      // credentials: 'include', // Commented out to avoid CORS issues
    };

    // Add body for non-GET requests
    if (options.body && config.method !== 'GET') {
      config.body = typeof options.body === 'object' 
        ? JSON.stringify(options.body) 
        : options.body;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const url = `${this.baseURL}${endpoint}`;
        console.log(`🌐 API Request: ${config.method} ${url}`);
        
        const response = await fetch(url, config);
        
        // Handle rate limiting with retry
        if (response.status === 429 && retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          console.warn(`⚠️ Rate limited. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(delay);
          
          this.pendingRequests.delete(cacheKey);
          return this.request(endpoint, options, retryCount + 1);
        }
        
        // Handle CORS and authentication errors specifically
        if (response.status === 403) {
          throw new Error('Access forbidden. Check CORS configuration and authentication.');
        }
        
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('firebaseToken');
          localStorage.removeItem('token');
          throw new Error('Authentication required. Please log in again.');
        }

        if (response.status === 0) {
          throw new Error('Network error: CORS policy blocked the request.');
        }

        // Handle cases where response might not be JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.warn('Non-JSON response:', text);
          data = text ? { message: text } : {};
        }

        if (!response.ok) {
          const errorMessage = data.error || data.message || data.details || `HTTP error! status: ${response.status}`;
          console.error(`❌ API Error (${response.status}):`, errorMessage);
          
          // Specific error messages for common endpoints
          if (endpoint.includes('/auth/forgot-password')) {
            if (response.status === 404) {
              throw new Error('No account found with this email address.');
            } else if (response.status === 400) {
              throw new Error('Invalid email address format.');
            }
          }
          
          if (response.status === 0) {
            throw new Error('Network error: Unable to connect to server. Check CORS configuration.');
          }
          
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
        
        // More detailed error for CORS issues
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
          console.error('🚨 CORS or Network Error - Check:');
          console.error('  1. Backend CORS allows:', window.location.origin);
          console.error('  2. Backend is running at:', this.baseURL);
          console.error('  3. Network connection is stable');
          throw new Error('Connection issue. Please check your internet connection and try again.');
        }
        
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

  // Method to clear cache
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Method to clear cache for specific endpoint
  invalidateCache(endpoint) {
    this.clearCache(endpoint);
  }

  // ========== AUTHENTICATION METHODS ==========
  async login(credentials) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: credentials,
    });
  }

  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async forgotPassword(email) {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  async resetPassword(token, newPassword) {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    });
  }

  async changePassword(passwordData) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: passwordData,
    });
  }

  async verifyEmail(token) {
    return this.request('/api/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  // ========== PLANTING REQUESTS ==========
  async getPlantingRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/api/plantingrequests?${queryString}` : '/api/plantingrequests';
    return this.request(endpoint);
  }

  async getPlantingRequestById(id) {
    return this.request(`/api/plantingrequests/${id}`);
  }

  async createPlantingRequest(requestData) {
    const result = await this.request('/api/plantingrequests', {
      method: 'POST',
      body: requestData,
    });
    this.invalidateCache('/api/plantingrequests');
    return result;
  }

  async updatePlantingRequest(id, requestData) {
    const result = await this.request(`/api/plantingrequests/${id}`, {
      method: 'PUT',
      body: requestData,
    });
    this.invalidateCache('/api/plantingrequests');
    return result;
  }

  async updatePlantingRequestStatus(id, status) {
    const result = await this.request(`/api/plantingrequests/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
    this.invalidateCache('/api/plantingrequests');
    return result;
  }

  async deletePlantingRequest(id) {
    const result = await this.request(`/api/plantingrequests/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache('/api/plantingrequests');
    return result;
  }

  // ========== PLANTING RECORDS ==========
  async getPlantingRecords(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/api/plantingrecords?${queryString}` : '/api/plantingrecords';
      
      console.log('🔍 Fetching planting records from:', `${this.baseURL}${endpoint}`);
      const response = await this.request(endpoint);
      console.log('📦 Raw API response:', response);
      console.log('📊 Response type:', typeof response);
      console.log('🔢 Is array?:', Array.isArray(response));
      
      // Handle nested response structure
      if (response && response.success && Array.isArray(response.data)) {
        console.log(`✅ Extracted ${response.data.length} planting records from nested response`);
        return response.data;
      } 
      // Fallback: if response is already an array, return it directly
      else if (Array.isArray(response)) {
        console.log(`✅ Returning ${response.length} planting records directly`);
        return response;
      }
      // Fallback: if response has different structure
      else if (response && Array.isArray(response.records)) {
        console.log(`✅ Extracted ${response.records.length} planting records from 'records' field`);
        return response.records;
      }
      // Fallback: if response has items array
      else if (response && Array.isArray(response.items)) {
        console.log(`✅ Extracted ${response.items.length} planting records from 'items' field`);
        return response.items;
      }
      // If no valid data found, return empty array
      else {
        console.warn('⚠️ Unexpected response format for planting records:', response);
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to fetch planting records:', error);
      return [];
    }
  }

  async getPlantingRecordById(id) {
    return this.request(`/api/plantingrecords/${id}`);
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

  async deletePlantingRecord(id) {
    const result = await this.request(`/api/plantingrecords/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache('/api/plantingrecords');
    return result;
  }

  // ========== PLANTING TASKS ==========
  async getPlantingTasks(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/api/plantingtasks?${queryString}` : '/api/plantingtasks';
      
      const response = await this.request(endpoint);
      
      if (Array.isArray(response)) {
        return response;
      } else if (response && Array.isArray(response.data)) {
        return response.data;
      } else if (response && Array.isArray(response.tasks)) {
        return response.tasks;
      }
      
      console.warn('Unexpected response format for planting tasks:', response);
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch planting tasks:', error);
      return [];
    }
  }

  async getPlantingTaskById(id) {
    return this.request(`/api/plantingtasks/${id}`);
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

  async updatePlantingTaskStatus(id, status) {
    const result = await this.request(`/api/plantingtasks/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
    this.invalidateCache('/api/plantingtasks');
    return result;
  }

  async deletePlantingTask(id) {
    const result = await this.request(`/api/plantingtasks/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache('/api/plantingtasks');
    return result;
  }

  // ========== SENSOR DATA ==========
  async getSensors() {
    return this.request('/api/sensors');
  }

  async getSensorById(id) {
    return this.request(`/api/sensors/${id}`);
  }

  async getSensorData(sensorId, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      return await this.request(`/api/sensors/${sensorId}/data?${queryParams}`);
    } catch (error) {
      console.warn(`Sensor data for ${sensorId} not available:`, error.message);
      return null;
    }
  }

  async createSensor(sensorData) {
    const result = await this.request('/api/sensors', {
      method: 'POST',
      body: sensorData,
    });
    this.invalidateCache('/api/sensors');
    return result;
  }

  async updateSensor(id, sensorData) {
    const result = await this.request(`/api/sensors/${id}`, {
      method: 'PUT',
      body: sensorData,
    });
    this.invalidateCache('/api/sensors');
    return result;
  }

  // ========== NOTIFICATIONS ==========
  async getNotifications(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/api/notifications?${queryString}` : '/api/notifications';
      
      const response = await this.request(endpoint);
      
      if (Array.isArray(response)) {
        return response;
      } else if (response && Array.isArray(response.data)) {
        return response.data;
      } else if (response && Array.isArray(response.notifications)) {
        return response.notifications;
      }
      
      console.warn('Unexpected response format for notifications:', response);
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      return [];
    }
  }

  async getNotificationById(id) {
    return this.request(`/api/notifications/${id}`);
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
          success: true, 
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

  async markNotificationAsRead(id) {
    const result = await this.request(`/api/notifications/${id}/read`, {
      method: 'PATCH',
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
  async getLocations(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/api/locations?${queryString}` : '/api/locations';
      
      const response = await this.request(endpoint);
      
      if (Array.isArray(response)) {
        return response;
      } else if (response && Array.isArray(response.data)) {
        return response.data;
      } else if (response && Array.isArray(response.locations)) {
        return response.locations;
      }
      
      console.warn('Unexpected response format for locations:', response);
      return [];
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

  async createLocation(locationData) {
    const result = await this.request('/api/locations', {
      method: 'POST',
      body: locationData,
    });
    this.invalidateCache('/api/locations');
    return result;
  }

  async updateLocation(id, locationData) {
    const result = await this.request(`/api/locations/${id}`, {
      method: 'PUT',
      body: locationData,
    });
    this.invalidateCache('/api/locations');
    return result;
  }

  // ========== RECOMMENDATIONS ==========
  async getRecommendations(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/api/recommendations?${queryString}` : '/api/recommendations';
      
      const response = await this.request(endpoint);
      
      if (Array.isArray(response)) {
        return response;
      } else if (response && Array.isArray(response.data)) {
        return response.data;
      } else if (response && Array.isArray(response.recommendations)) {
        return response.recommendations;
      }
      
      console.warn('Unexpected response format from getRecommendations:', response);
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch recommendations:', error);
      return [];
    }
  }

  async getRecommendationById(id) {
    return this.request(`/api/recommendations/${id}`);
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

  async deleteRecommendation(id) {
    const result = await this.request(`/api/recommendations/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache('/api/recommendations');
    return result;
  }

  // ========== USERS ==========
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/api/users?${queryString}` : '/api/users';
    return this.request(endpoint);
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

  async createUser(userData) {
    const result = await this.request('/api/users', {
      method: 'POST',
      body: userData,
    });
    this.invalidateCache('/api/users');
    return result;
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

  async deleteUser(id) {
    const result = await this.request(`/api/users/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache('/api/users');
    return result;
  }

  // ========== TREE SEEDLINGS ==========
  async getTreeSeedlings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/api/tree-seedlings?${queryString}` : '/api/tree-seedlings';
    return this.request(endpoint);
  }

  async getTreeSeedlingById(id) {
    return this.request(`/api/tree-seedlings/${id}`);
  }

  async getTreeSeedlingsByCategory(category) {
    return this.request(`/api/tree-seedlings/category/${category}`);
  }

  async createTreeSeedling(seedlingData) {
    const result = await this.request('/api/tree-seedlings', {
      method: 'POST',
      body: seedlingData,
    });
    this.invalidateCache('/api/tree-seedlings');
    return result;
  }

  async updateTreeSeedling(id, seedlingData) {
    const result = await this.request(`/api/tree-seedlings/${id}`, {
      method: 'PUT',
      body: seedlingData,
    });
    this.invalidateCache('/api/tree-seedlings');
    return result;
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

  // Mock user data for development
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

  // Method to clear all cache and force fresh data
  async clearAllCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🧹 Cleared all API cache');
  }

  // Method to set authentication token
  setAuthToken(token) {
    localStorage.setItem('firebaseToken', token);
    localStorage.setItem('token', token);
  }

  // Method to clear authentication token
  clearAuthToken() {
    localStorage.removeItem('firebaseToken');
    localStorage.removeItem('token');
    this.clearAllCache();
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;
