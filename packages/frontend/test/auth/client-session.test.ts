import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTRPCClientInstance } from '../../src/lib/trpc';
import { readAuthToken, writeAuthToken } from '../../src/lib/auth-storage';

const originalFetch = globalThis.fetch;
const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
let requests: { url: string; authorization: string | null; body: string | null }[];
let unauthorized: boolean;

beforeEach(() => {
  const data = new Map<string, string>();
  const browser = Object.assign(new EventTarget(), {
    location: { pathname: '/zh/account' },
    localStorage: {
      getItem: (key: string) => data.get(key) || null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => data.delete(key),
    },
  });
  Object.defineProperty(globalThis, 'window', { value: browser, configurable: true });
  writeAuthToken(null);
  requests = [];
  unauthorized = false;
  globalThis.fetch = async (url, options) => {
    const request = new Request(url, options);
    requests.push({
      url: request.url,
      authorization: request.headers.get('authorization'),
      body: request.method === 'POST' ? await request.text() : null,
    });
    const body = unauthorized
      ? {
          error: {
            message: 'Authentication required',
            code: -32001,
            data: { code: 'UNAUTHORIZED', httpStatus: 401 },
          },
        }
      : {
          result: {
            data: {
              id: 42,
              email: 'test@example.invalid',
              emailVerified: false,
              token: 'new-session',
              properties: [],
              totalCount: 0,
              filteredCount: 0,
            },
          },
        };
    const batch = new URL(request.url).searchParams.has('batch');
    return new Response(JSON.stringify(batch ? [body] : body), {
      status: unauthorized ? 401 : 200,
      headers: { 'content-type': 'application/json' },
    });
  };
});
afterEach(() => {
  writeAuthToken(null);
  globalThis.fetch = originalFetch;
  if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('a queued authenticated mutation cannot borrow the next account token', async () => {
  writeAuthToken('old-session');
  const client = createTRPCClientInstance();
  const pending = client.properties.subscribe.mutate({ propertyId: 7 });
  writeAuthToken('next-account-session');
  await pending;
  assert.equal(requests[0].authorization, 'Bearer old-session');
  assert.ok(!requests[0].url.includes('old-session'));
  assert.ok(!requests[0].body?.includes('old-session'));
});
test('a rejected current protected session is cleared', async () => {
  writeAuthToken('expired-session');
  unauthorized = true;
  await assert.rejects(createTRPCClientInstance().users.getProfile.query());
  assert.equal(readAuthToken(), null);
});
test('a late unauthorized response cannot log out the newly signed-in account', async () => {
  writeAuthToken('old-session');
  unauthorized = true;
  const pending = createTRPCClientInstance().users.getProfile.query();
  writeAuthToken('new-account-session');
  await assert.rejects(pending);
  assert.equal(readAuthToken(), 'new-account-session');
});
test('wrong credentials do not discard an existing valid session', async () => {
  writeAuthToken('existing-session');
  unauthorized = true;
  await assert.rejects(
    createTRPCClientInstance().auth.login.mutate({
      email: 'test@example.invalid',
      password: 'wrong-password',
    })
  );
  assert.equal(readAuthToken(), 'existing-session');
});
test('anonymous requests stay anonymous if login completes before their batch is sent', async () => {
  const pending = createTRPCClientInstance().properties.search.query({ targetSchool: 'UNSW' });
  writeAuthToken('new-account-session');
  await pending;
  assert.equal(requests[0].authorization, null);
});
