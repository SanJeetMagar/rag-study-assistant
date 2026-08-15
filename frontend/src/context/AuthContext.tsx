import React, {createContext, useContext, useEffect, useMemo, useState} from "react";
import {auth, tokens} from "../services/api";
import type {Role, User} from "../types";

interface AuthContextValue {
  user: User | null;
  /** True only while the stored token is being checked on first load. */
  initialising: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [initialising, setInitialising] = useState(true);

  // A stored token may be expired or revoked, so confirm it with the server
  // rather than trusting its presence.
  useEffect(() => {
    if (!tokens.access()) {
      setInitialising(false);
      return;
    }
    auth
      .me()
      .then(setUser)
      .catch(() => tokens.clear())
      .finally(() => setInitialising(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initialising,
      async login(email, password) {
        const account = await auth.login(email, password);
        setUser(account);
        return account;
      },
      async register(payload) {
        const account = await auth.register(payload);
        setUser(account);
        return account;
      },
      logout() {
        auth.logout();
        setUser(null);
      },
    }),
    [user, initialising],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
