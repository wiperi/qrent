import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  readAuthToken,
  writeAuthToken,
  subscribeAuthToken,
  isUnauthorized,
} from '../../src/lib/auth-storage';
import { contactEmailDraft } from '../../src/lib/contact-email';

let values: Map<string, string>;
let browser: EventTarget & {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
};
const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
beforeEach(() => {
  values = new Map();
  browser = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
  });
  Object.defineProperty(globalThis, 'window', { value: browser, configurable: true });
  writeAuthToken(null);
});
afterEach(() => {
  writeAuthToken(null);
  if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('restoration reads an existing token without erasing it during hydration', () => {
  values.set('auth-token', 'existing-session');
  assert.equal(readAuthToken(), 'existing-session');
  assert.equal(values.get('auth-token'), 'existing-session');
});
test('same-tab login and logout publish a single durable token change', () => {
  const changes: (string | null)[] = [];
  const unsubscribe = subscribeAuthToken(() => changes.push(readAuthToken()));
  writeAuthToken('first-session');
  writeAuthToken(null);
  unsubscribe();
  writeAuthToken('next-session');
  assert.deepEqual(changes, ['first-session', null]);
});
test('another tab changing the account or clearing storage synchronizes this tab', () => {
  const changes: (string | null)[] = [];
  const unsubscribe = subscribeAuthToken(() => changes.push(readAuthToken()));
  values.set('auth-token', 'other-account');
  const login = Object.assign(new Event('storage'), { key: 'auth-token' });
  browser.dispatchEvent(login);
  values.clear();
  browser.dispatchEvent(Object.assign(new Event('storage'), { key: null }));
  unsubscribe();
  assert.deepEqual(changes, ['other-account', null]);
});
test('storage-denied browsers retain a usable in-memory session without throwing', () => {
  const fail = () => {
    throw new Error('Storage blocked');
  };
  browser.localStorage = { getItem: fail, setItem: fail, removeItem: fail };
  writeAuthToken('memory-session');
  assert.equal(readAuthToken(), 'memory-session');
  writeAuthToken(null);
  assert.equal(readAuthToken(), null);
});
test('transient failures do not masquerade as unauthorized sessions', () => {
  assert.equal(isUnauthorized(new Error('Network error')), false);
  assert.equal(isUnauthorized({ data: { code: 'INTERNAL_SERVER_ERROR' } }), false);
  assert.equal(isUnauthorized({ data: { code: 'UNAUTHORIZED', httpStatus: 401 } }), true);
});
test('readable quota-full storage cannot replace a new login with the previous account', () => {
  values.set('auth-token', 'previous-account');
  assert.equal(readAuthToken(), 'previous-account');
  browser.localStorage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  writeAuthToken('new-memory-account');
  assert.equal(readAuthToken(), 'new-memory-account');
  assert.equal(values.has('auth-token'), false);
  writeAuthToken(null);
  assert.equal(readAuthToken(), null);
});
test('a later external logout overrides an in-memory fallback', () => {
  browser.localStorage.setItem = () => {
    throw new Error('Read-only storage');
  };
  browser.localStorage.removeItem = () => {
    throw new Error('Read-only storage');
  };
  writeAuthToken('memory-account');
  const unsubscribe = subscribeAuthToken(() => {});
  values.clear();
  browser.dispatchEvent(Object.assign(new Event('storage'), { key: null }));
  assert.equal(readAuthToken(), null);
  unsubscribe();
});
test('the contact form prepares an encoded draft without pretending it sent mail', () => {
  const url = new URL(
    contactEmailDraft({
      name: 'A & B',
      email: 'reply@example.com',
      subject: 'Test\r\nBcc: other',
      message: '你好 & hello\nSecond line',
    })
  );
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'yyzyfish5@gmail.com');
  assert.equal(url.searchParams.get('subject'), 'Test  Bcc: other');
  assert.equal(
    url.searchParams.get('body'),
    'Name: A & B\nReply to: reply@example.com\n\n你好 & hello\nSecond line'
  );
  assert.equal(url.searchParams.has('bcc'), false);
});
