import axios from 'axios';

/**
 * VoltWay Centralized Axios Client
 * Configured with configurable base URL and automatic Bearer JWT injection.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach stored Supabase access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('voltway_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize response handling & normalize errors
api.interceptors.response.use(
  (response) => {
    // Return standard backend envelope { success, message, data }
    return response.data;
  },
  (error) => {
    // Extract backend error message if available
    const backendMessage = error.response?.data?.message;
    const statusCode = error.response?.status;

    // Build normalized error object
    const normalizedError = new Error(
      backendMessage || error.message || 'An unexpected network error occurred.'
    );
    normalizedError.statusCode = statusCode;
    normalizedError.data = error.response?.data;

    // Handle token expiration / unauthorized
    if (statusCode === 401 && !error.config.url.includes('/auth/login')) {
      // Optional: Clear stale token if rejected
      // (AuthContext will also synchronize session state)
    }

    return Promise.reject(normalizedError);
  }
);

export default api;
