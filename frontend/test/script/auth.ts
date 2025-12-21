/*
  Minimal test script to call backend tRPC auth.login.
  Usage: pnpm --filter frontend run test:trpc
*/
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@qrent/backend/trpc';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:3201';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      headers() {
        const auth = process.env.AUTH_TOKEN;
        return auth ? { Authorization: `Bearer ${auth}` } : {};
      },
    }),
  ],
});
async function main() {
  try {
    // const registerResult = await client.auth.register.mutate({
    //   email: 'hellofo23ijfo3ij@rpc.com',
    //   password: 'woefjoj23ofjo23jo',
    //   name: 'Hello',
    //   gender: 1,
    // })
    // console.log('Register OK:', registerResult);

    const result = await client.auth.login.mutate({
      email: 'hellofo23ijfo3ij001@rpc.com',
      password: 'woefjoj23ofjo23jo',
    });
    console.log('Login OK:', result);
  } catch (err) {
    console.error('Login failed:', err);
    process.exitCode = 1;
  }
}

void main();
