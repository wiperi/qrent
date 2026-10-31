'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useTRPC } from './trpc';
import { isUnauthorized, readAuthToken, subscribeAuthToken, writeAuthToken } from './auth-storage';

interface User {
  id: number;
  email: string;
  name?: string;
  phone?: string | null;
  gender?: number | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hasSessionError: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const loginEpoch = useRef(0);
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const loginMutation = useMutation(trpc.auth.login.mutationOptions());
  const registerMutation = useMutation(trpc.auth.register.mutationOptions());
  const logoutMutation = useMutation(trpc.auth.logout.mutationOptions());
  const userQuery = useQuery({
    ...trpc.users.getProfile.queryOptions(),
    enabled: hydrated && !!token,
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    const synchronize = () => {
      const next = readAuthToken();
      if (next !== tokenRef.current) {
        loginEpoch.current += 1;
        void queryClient.cancelQueries();
        // Public results also contain account-specific favorite flags.
        queryClient.clear();
        tokenRef.current = next;
        setToken(next);
      }
      setHydrated(true);
    };
    synchronize();
    return subscribeAuthToken(synchronize);
  }, [queryClient]);

  useEffect(() => {
    if (token && isUnauthorized(userQuery.error) && readAuthToken() === token) {
      writeAuthToken(null);
    }
  }, [token, userQuery.error]);

  const login = async (email: string, password: string) => {
    const epoch = ++loginEpoch.current;
    const result = await loginMutation.mutateAsync({ email, password });
    if (epoch === loginEpoch.current) writeAuthToken(result.token);
  };

  const register = async (email: string, password: string, name?: string) => {
    const epoch = ++loginEpoch.current;
    const result = await registerMutation.mutateAsync({ email, password, name });
    if (epoch === loginEpoch.current) writeAuthToken(result.token);
  };

  const logout = async () => {
    const current = readAuthToken();
    try {
      if (current) await logoutMutation.mutateAsync();
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
    }
    if (readAuthToken() === current) writeAuthToken(null);
  };

  const refreshUser = async () => {
    await userQuery.refetch();
  };

  const contextValue: AuthContextType = {
    user: token ? (userQuery.data as User | null) || null : null,
    token,
    isLoading: !hydrated || (!!token && userQuery.isPending),
    hasSessionError: !!token && userQuery.isError && !isUnauthorized(userQuery.error),
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
