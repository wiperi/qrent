'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { trpc } from './trpc';

interface User {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  gender?: number;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const userQuery = trpc.users.getProfile.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('auth-token');
    if (storedToken) {
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth-token', token);
    } else {
      localStorage.removeItem('auth-token');
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const result = await loginMutation.mutateAsync({ email, password });
    setToken(result.token);
  };

  const register = async (email: string, password: string, name?: string) => {
    const result = await registerMutation.mutateAsync({ email, password, name });
    setToken(result.token);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('auth-token');
    window.location.href = '/';
  };

  const refreshUser = () => {
    userQuery.refetch();
  };

  const contextValue: AuthContextType = {
    user: userQuery.data || null,
    token,
    isLoading: isLoading || userQuery.isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}