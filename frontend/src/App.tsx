/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

import {AuthProvider, useAuth} from "./context/AuthContext";
import {RequireAuth} from "./components/RequireAuth";
import {DashboardLayout} from "./layouts/DashboardLayout";

import {ChatPage} from "./pages/ChatPage";
import {CourseDetailPage} from "./pages/CourseDetailPage";
import {DashboardPage} from "./pages/DashboardPage";
import {DocumentViewerPage} from "./pages/DocumentViewerPage";
import {QuizPage} from "./pages/QuizPage";
import {LandingPage} from "./pages/LandingPage";
import {LoginPage} from "./pages/LoginPage";
import {NotFoundPage} from "./pages/NotFoundPage";
import {RegisterPage} from "./pages/RegisterPage";
import {SettingsPage} from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The 401 interceptor already handles expired tokens; retrying a genuine
      // auth or permission failure just delays the error the user needs to see.
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Wraps a page in the dashboard chrome and the auth gate. */
const Protected: React.FC<{children: React.ReactNode}> = ({children}) => (
  <RequireAuth>
    <DashboardLayout>{children}</DashboardLayout>
  </RequireAuth>
);

const AppRoutes: React.FC = () => {
  const {user, initialising} = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          initialising ? null : <Navigate to={user ? "/dashboard" : "/landing"} replace />
        }
      />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/courses/:courseId"
        element={
          <Protected>
            <CourseDetailPage />
          </Protected>
        }
      />
      <Route
        path="/courses/:courseId/chat"
        element={
          <Protected>
            <ChatPage />
          </Protected>
        }
      />
      <Route
        path="/documents/:documentId"
        element={
          <Protected>
            <DocumentViewerPage />
          </Protected>
        }
      />
      <Route
        path="/quizzes/:quizId"
        element={
          <Protected>
            <QuizPage />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <SettingsPage />
          </Protected>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen text-slate-900 bg-amber-50 font-sans">
          <AppRoutes />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
