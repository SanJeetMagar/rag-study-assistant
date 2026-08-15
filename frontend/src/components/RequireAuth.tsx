import React from "react";
import {Navigate, useLocation} from "react-router-dom";
import {useAuth} from "../context/AuthContext";

/**
 * Gate for authenticated routes.
 *
 * Waits for the initial token check before deciding — redirecting during that
 * window would bounce a signed-in user to the login page on every refresh.
 */
export const RequireAuth: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {user, initialising} = useAuth();
  const location = useLocation();

  if (initialising) {
    return (
      <div className="min-h-screen grid place-items-center bg-amber-50">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="w-4 h-4 rounded-full border-2 border-rose-600 border-t-transparent animate-spin" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{from: location.pathname}} />;
  }

  return <>{children}</>;
};
