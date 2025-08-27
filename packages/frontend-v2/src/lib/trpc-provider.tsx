'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc, getTRPCClient } from './trpc';

export default function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
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
  }));
  
  const [trpcClient] = useState(() => getTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}