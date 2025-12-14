'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import { useTRPC } from './trpc';

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
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const trpc = useTRPC();

  const googleLoginMutation = useMutation(
    trpc.auth.googleOAuthLogin.mutationOptions()
  );
  const userQuery = useQuery({
    ...trpc.users.getProfile.queryOptions(),
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

  const googleLogin = async (idToken: string) => {
    const result = await googleLoginMutation.mutateAsync({ idToken });
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
    user: userQuery.data as User | null || null,
    token,
    isLoading: isLoading || userQuery.isLoading,
    googleLogin,
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

