import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@qrent/backend/src/trpc/routers';

export const trpc = createTRPCReact<AppRouter>();

export function getTRPCClient() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3201';
  
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${backendUrl}/trpc`,
        headers() {
          const token = typeof window !== 'undefined' 
            ? localStorage.getItem('auth-token') 
            : null;
          
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}