/*
  Test script for tRPC properties and users endpoints.
  Usage: pnpm --filter frontend-v2 run test:endpoints
*/
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@qrent/backend/trpc';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:3201';

async function main() {
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

  try {
    console.log('🔍 Testing Properties Search (public)...');
    const searchResult = await client.properties.search.mutate({
      targetSchool: 'UNSW',
      page: 1,
      pageSize: 10,
    });
    console.log('✅ Properties search result:', searchResult);

    if (process.env.AUTH_TOKEN) {
      console.log('\n👤 Testing User Profile (authenticated)...');
      const profile = await client.users.getProfile.query();
      console.log('✅ User profile:', profile);

      console.log('\n📋 Testing User Preferences (authenticated)...');
      const preferences = await client.users.getPreference.query();
      console.log('✅ User preferences:', preferences);

      console.log('\n🏠 Testing Property Subscriptions (authenticated)...');
      const subscriptions = await client.properties.getSubscriptions.query();
      console.log('✅ Property subscriptions:', subscriptions);
    } else {
      console.log('\n⚠️  Skipping authenticated tests (no AUTH_TOKEN provided)');
      console.log('To test authenticated endpoints, set AUTH_TOKEN environment variable');
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  }
}

void main();
