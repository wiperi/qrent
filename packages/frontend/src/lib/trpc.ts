import type { AppRouter } from '@qrent/backend/trpc';
import { DEFAULT_LOCALE, isLocale } from '@qrent/shared/utils/helper';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink, httpLink, splitLink, type TRPCLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { observable } from '@trpc/server/observable';
import { isUnauthorized, readAuthToken, writeAuthToken } from './auth-storage';

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
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3201' : 'https://api.qrent.rent');

  const headers = (token: string | null | undefined) => {
    const pathLocale =
      typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : DEFAULT_LOCALE;
    return {
      'x-locale': isLocale(pathLocale) ? pathLocale : DEFAULT_LOCALE,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };
  const sessionLink: TRPCLink<AppRouter> =
    () =>
    ({ op, next }) => {
      const token = readAuthToken();
      return observable(observer =>
        next({ ...op, context: { ...op.context, sessionToken: token } }).subscribe({
          next: value => observer.next(value),
          complete: () => observer.complete(),
          error: error => {
            if (
              token &&
              isUnauthorized(error) &&
              !['auth.login', 'auth.register', 'auth.verifyEmail'].includes(op.path) &&
              readAuthToken() === token
            )
              writeAuthToken(null);
            observer.error(error);
          },
        })
      );
    };

  return createTRPCClient<AppRouter>({
    links: [
      sessionLink,
      splitLink({
        // Freeze the bearer per authenticated operation. A cross-tab account change
        // must not send an already queued mutation using the next account's token.
        condition: op => !!op.context.sessionToken || op.type === 'mutation',
        true: httpLink({
          url: `${backendUrl}/trpc`,
          headers: ({ op }) => headers(op.context.sessionToken as string | null),
        }),
        false: httpBatchLink({ url: `${backendUrl}/trpc`, headers: () => headers(null) }),
      }),
    ],
  });
}
