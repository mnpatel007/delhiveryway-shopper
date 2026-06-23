import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching issues
    config.params = {
      ...config.params,
      _t: Date.now(),
    };

    // Add auth token if available
    const token = localStorage.getItem('shopperToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(
      `✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`
    );
    return response;
  },
  async (error) => {
    const config = error.config;

    console.error(
      `❌ API Error: ${config?.method?.toUpperCase()} ${config?.url} - ${error.response?.status || 'Network Error'}`
    );

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('🔐 Authentication error - clearing auth data');
      localStorage.removeItem('shopperToken');
      localStorage.removeItem('shopperData');
      localStorage.removeItem('shopperAuth');

      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
