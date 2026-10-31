const TOKEN_KEY = 'auth-token';
const TOKEN_EVENT = 'qrent-auth-change';
let memoryToken: string | null = null;
let memoryOverridesStorage = false;

export function readAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (memoryOverridesStorage) return memoryToken;
  try {
    memoryToken = window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Storage-disabled/private browsers can still use an in-memory session.
  }
  return memoryToken;
}

export function writeAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  memoryToken = token;
  memoryOverridesStorage = false;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    memoryOverridesStorage = true;
    // Quota-full storage can often still remove a stale previous identity.
    if (token) {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
      } catch {}
    }
    // Do not turn a successful server login into a browser storage exception.
  }
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function subscribeAuthToken(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === null) {
      memoryOverridesStorage = false;
      onChange();
    }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(TOKEN_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(TOKEN_EVENT, onChange);
  };
}

export function isUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('data' in error)) return false;
  const data = error.data as { code?: string; httpStatus?: number } | null;
  return data?.code === 'UNAUTHORIZED' || data?.httpStatus === 401;
}
