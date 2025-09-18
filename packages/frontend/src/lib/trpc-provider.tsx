'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { TRPCProvider, getQueryClient, createTRPCClientInstance } from './trpc';

export default function AppTRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() => createTRPCClientInstance());

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}