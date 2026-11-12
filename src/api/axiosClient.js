import axios from 'axios';

const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Axios instance configured with baseURL from environment variables.
 */
export const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let onLogoutCallback = null;
let onNavigateCallback = null;

/**
 * Register a logout callback from AuthContext to clear state on 401.
 */
export const setLogoutHandler = (callback) => {
  onLogoutCallback = callback;
};

export const registerLogoutCallback = setLogoutHandler;

/**
 * Register a navigation callback from React Router for seamless SPA redirection.
 */
export const setNavigateHandler = (callback) => {
  onNavigateCallback = callback;
};

// 1. Request Interceptor: attach Bearer token from localStorage
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: handle session expiry / 401 unauthorized
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Ignore 401 on login and register routes
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthRoute) {
      // Clear token from localStorage
      localStorage.removeItem('token');

      // Trigger registered logout callback to wipe user & cached state
      if (typeof onLogoutCallback === 'function') {
        try {
          onLogoutCallback();
        } catch (err) {
          console.error('Error invoking logout callback:', err);
        }
      }

      // Redirect to /login with session expired message
      if (typeof onNavigateCallback === 'function') {
        onNavigateCallback('/login', {
          state: { message: 'Your session has expired' },
        });
      } else if (typeof window !== 'undefined') {
        // Fallback for window navigation
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
