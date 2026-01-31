/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { apiRequest, parseApiResponse } from '../utils/request';
import { AuthState } from '../types';

interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  setup: (credentials: LoginCredentials) => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  authCheckError: string | null;
  checkAuth: () => Promise<void>;
  isCheckingAuth: boolean;
  isSettingUp: boolean;
  isLoggingIn: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    setAuthCheckError(null);

    try {
      const response = await apiRequest('/api/state', { method: 'GET' });
      const result = await parseApiResponse(response, AuthState);
      if (!result.ok) {
        throw new Error(result.error.error);
      }
      setIsInitialized(result.data.isInitialized);
      setIsAuthenticated(result.data.isAuthenticated);
    } catch {
      setAuthCheckError('Failed to check authentication state.');
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const setup = async (credentials: LoginCredentials): Promise<void> => {
    setIsSettingUp(true);

    try {
      const response = await apiRequest('/api/setup', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const result = await parseApiResponse(response, z.unknown());
      if (!result.ok) {
        throw new Error(result.error.error);
      }

      await checkAuth();
    } finally {
      setIsSettingUp(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoggingIn(true);

    try {
      const response = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const result = await parseApiResponse(response, z.unknown());
      if (!result.ok) {
        throw new Error(result.error.error);
      }

      await checkAuth();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    void apiRequest('/api/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  const value: AuthContextType = {
    isInitialized,
    isAuthenticated,
    setup,
    login,
    logout,
    checkAuth,
    authCheckError,
    isCheckingAuth,
    isSettingUp,
    isLoggingIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
