import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '@qrent/backend/src/trpc/routers';

// Create tRPC context for React components
export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

// Factory function to create a new QueryClient
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: unknown) => {
          // Don't retry on auth errors
          if (error && typeof error === 'object' && 'data' in error) {
            const errorData = error.data as { code?: string };
            if (errorData.code === 'UNAUTHORIZED') {
              return false;
            }
          }
          return failureCount < 3;
        },
      },
    },
  });
}

// Browser-side QueryClient singleton
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// Factory function to create tRPC client
export function createTRPCClientInstance() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3201';

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${backendUrl}/trpc`,
        headers() {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;

          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
