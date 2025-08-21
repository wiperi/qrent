import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@qrent/backend/src/trpc/routers';
import { authToken } from './cookies';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:3201';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      headers() {
        const token = authToken.get();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export default client;