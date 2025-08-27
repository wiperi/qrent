import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@qrent/backend/src/trpc/routers';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3201';

export function createTRPCClient(authToken?: string) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${BACKEND_URL}/trpc`,
        headers() {
          return authToken ? { Authorization: `Bearer ${authToken}` } : {};
        },
      }),
    ],
  });
}

export function createAuthenticatedClient(authToken: string) {
  return createTRPCClient(authToken);
}

export function createUnauthenticatedClient() {
  return createTRPCClient();
}