import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, loginUser as apiLoginUser, registerUser as apiRegisterUser } from '../api/authApi.js';
import { setLogoutHandler } from '../api/axiosClient.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Logout handler to cleanly wipe user, token, and local storage
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // Register logout callback with axiosClient on mount
  useEffect(() => {
    setLogoutHandler(logout);
  }, [logout]);

  // Hydrate user on initial page load if token exists in localStorage
  useEffect(() => {
    let isMounted = true;

    const hydrateUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await getMe();
          if (isMounted) {
            if (res?.success && res?.user) {
              setUser(res.user);
              setToken(storedToken);
            } else {
              logout();
            }
          }
        } catch (error) {
          console.error('Failed to authenticate token on load:', error);
          if (isMounted) {
            logout();
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    hydrateUser();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // Login handler
  const login = async (credentials) => {
    const res = await apiLoginUser(credentials);
    if (res?.success && res?.token) {
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  // Register handler
  const register = async (userData) => {
    const res = await apiRegisterUser(userData);
    if (res?.success && res?.token) {
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: Boolean(token && user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access authentication context.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
