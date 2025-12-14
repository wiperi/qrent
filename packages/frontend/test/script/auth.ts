/*
  Minimal test script to call backend tRPC auth.googleOAuthLogin.
  Usage: pnpm --filter frontend run test:trpc

  NOTE: Traditional auth (register/login) has been removed.
  Only Google OAuth is supported now.
  To use this script, set GOOGLE_ID_TOKEN environment variable.
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
    const idToken = process.env.GOOGLE_ID_TOKEN;
    if (!idToken) {
      console.error('GOOGLE_ID_TOKEN environment variable is required');
      process.exitCode = 1;
      return;
    }

    const result = await client.auth.googleOAuthLogin.mutate({
      idToken,
    });
    console.log('Google OAuth Login OK:', result);
  } catch (err) {
    console.error('Login failed:', err);
    process.exitCode = 1;
  }
}

void main();
