// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, loginUser, registerUser } from '../services/api';

const AuthContext = createContext(null);

// Auth state context provider configuration
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Checks storage and verifies JWT dynamically during bootstrap phase
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Silent fallback handling; invalid tokens clear automatically in API layer
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Signs in standard accounts and loads details into context
  const login = async (username, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await loginUser(username, password);
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      
      const userData = await getCurrentUser();
      setUser(userData);
      setLoading(false);
      return userData;
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.detail || 'Invalid username or password';
      setAuthError(message);
      throw new Error(message);
    }
  };

  // Registers a student or teacher into database securely
  const register = async (username, email, password, role) => {
    setLoading(true);
    setAuthError(null);
    try {
      await registerUser(username, email, password, role);
      // Seamlessly log in newly created user right after a clean registration
      const response = await loginUser(username, password);
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);

      const userData = await getCurrentUser();
      setUser(userData);
      setLoading(false);
      return userData;
    } catch (error) {
      setLoading(false);
      const errors = error.response?.data;
      let message = 'Registration failed. Please review guidelines.';
      if (errors) {
        if (typeof errors === 'object') {
          message = Object.entries(errors)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
            .join(' | ');
        } else {
          message = errors;
        }
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  // Destroys token storage context securely
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setAuthError(null);
  };

  const value = {
    user,
    loading,
    authError,
    login,
    register,
    logout,
    isTeacher: user?.role?.toLowerCase() === 'teacher',
    isStudent: user?.role?.toLowerCase() === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom consumption hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed cleanly inside an AuthProvider component hierarchy');
  }
  return context;
};