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
            _t: Date.now()
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
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
    },
    async (error) => {
        const config = error.config;

        console.error(`❌ API Error: ${config?.method?.toUpperCase()} ${config?.url} - ${error.response?.status || 'Network Error'}`);

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

// Shopper API endpoints
export const shopperAPI = {
    login: (credentials) => api.post('/shopper/auth/login', credentials),
    signup: (userData) => api.post('/shopper/auth/register', userData),
    getProfile: () => api.get('/shopper/profile'),
    updateProfile: (data) => api.put('/shopper/profile', data),

    // Order management
    getAvailableOrders: () => api.get('/shopper/orders/available'),
    getMyOrders: () => api.get('/shopper/orders/my'),
    acceptOrder: (orderId) => api.put(`/orders/${orderId}/status`, { status: 'accepted_by_shopper' }),
    updateOrderStatus: (orderId, data) => api.put(`/orders/${orderId}/status`, data),
    reviseOrderItems: (orderId, data) => api.put(`/orders/${orderId}/revise`, data),

    // Dashboard stats
    getDashboardStats: () => api.get('/shopper/dashboard'),
};

// Error handling utility
export const handleApiError = (error) => {
    if (!error.response) {
        return {
            message: 'Unable to connect to server. Please check your internet connection.',
            status: 0,
            success: false,
            type: 'NETWORK_ERROR'
        };
    }

    const status = error.response.status;
    const data = error.response.data;

    let message = data?.message || 'An unexpected error occurred';

    switch (status) {
        case 400:
            message = data?.message || 'Invalid request. Please check your input.';
            break;
        case 401:
            message = 'Authentication required. Please log in again.';
            break;
        case 403:
            message = 'Access denied. You don\'t have permission for this action.';
            break;
        case 404:
            message = 'The requested resource was not found.';
            break;
        case 500:
            message = 'Server error. Please try again later.';
            break;
        default:
            message = data?.message || `Server error (${status}). Please try again.`;
    }

    return {
        message,
        status,
        success: false,
        type: 'API_ERROR',
        details: data
    };
};

export default api;
