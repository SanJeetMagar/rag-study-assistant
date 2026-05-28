// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages - Imported from filesystem
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import CourseDetailPage from './pages/CourseDetailPage';
import ChatPage from './pages/ChatPage';
import DocumentManagerPage from './pages/DocumentManagerPage';
import EnrollPage from './pages/EnrollPage';

/**
 * Route protection for authenticated sessions
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (!user) {
    // Return them to login if unauthenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Route protection for role isolation (e.g., Teacher only, Student only)
 */
function RoleRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user?.role?.toLowerCase() !== allowedRole.toLowerCase()) {
    // Graceful routing fallback to safe dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Core Shell Wrapper */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Redirect root query to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard available to both student and teacher roles */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* General course viewing */}
            <Route path="courses/:id" element={<CourseDetailPage />} />

            {/* Document Manager Area: Restricted to Teacher Role */}
            <Route
              path="documents"
              element={
                <RoleRoute allowedRole="teacher">
                  <DocumentManagerPage />
                </RoleRoute>
              }
            />

            {/* Enroll Area: Restricted to Student Role */}
            <Route
              path="enroll"
              element={
                <RoleRoute allowedRole="student">
                  <EnrollPage />
                </RoleRoute>
              }
            />

            {/* Chat Session Area: Restricted to Student Role */}
            <Route
              path="chat/:sessionId"
              element={
                <RoleRoute allowedRole="student">
                  <ChatPage />
                </RoleRoute>
              }
            />
          </Route>

          {/* Ultimate Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}