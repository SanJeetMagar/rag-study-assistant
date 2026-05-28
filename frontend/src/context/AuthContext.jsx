// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, login as apiLogin } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Synchronize state and retrieve user credentials upon initial app load
  useEffect(() => {
    const fetchUserOnLoad = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (err) {
          // Tokens cleared within internal Axios interceptor automatically if invalid
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchUserOnLoad();
  }, []);

  // Handle user login sequence and update dynamic auth state
  const login = async (username, password) => {
    setError(null);
    setLoading(true);
    try {
      await apiLogin(username, password);
      const userData = await getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      const errMsg = err.data?.detail || 'Invalid username or password';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Perform secure teardown of credentials upon logging out
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setError(null);
  };

  // Safe checks for identity configuration matching RBAC spec
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    logout,
    setUser,
    isTeacher,
    isStudent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be called inside an AuthProvider scope');
  }
  return context;
};