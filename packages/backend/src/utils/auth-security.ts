import { createHash, randomInt } from 'crypto';
import HttpError from '../error/HttpError';

type AtomicStore = {
  isReady?: boolean;
  eval: (script: string, options: { keys: string[]; arguments: string[] }) => Promise<unknown>;
};

export async function authStoreCall<T>(
  store: AtomicStore,
  operation: () => Promise<T>
): Promise<T> {
  if (store.isReady === false) throw new HttpError(503, 'Account service temporarily unavailable');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Account store deadline')), 5000);
      }),
    ]);
  } catch {
    throw new HttpError(503, 'Account service temporarily unavailable');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function authKey(action: string, identity: string): string {
  const hash = createHash('sha256').update(identity.trim().toLowerCase()).digest('hex');
  return `auth:v2:${action}:${hash}`;
}

export async function limitAuth(
  store: AtomicStore,
  action: string,
  identity: string,
  maximum: number,
  seconds: number
): Promise<void> {
  // Increment and initial expiry are one operation, including concurrent requests.
  const count = await authStoreCall(store, () =>
    store.eval(
      'local n = redis.call("INCR", KEYS[1]); if n == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end; return n',
      { keys: [authKey(action, identity)], arguments: [String(seconds)] }
    )
  );
  if (!Number.isInteger(Number(count)) || Number(count) < 1) {
    throw new HttpError(503, 'Account service temporarily unavailable');
  }
  if (Number(count) > maximum)
    throw new HttpError(429, 'Too many attempts. Please try again later.');
}

export function newVerificationCode(): number {
  return randomInt(100000, 1000000);
}

export function verificationDigest(email: string, code: number): string {
  return createHash('sha256').update(`${email.trim().toLowerCase()}:${code}`).digest('hex');
}

export async function consumeVerification(
  store: AtomicStore,
  email: string,
  code: number
): Promise<boolean> {
  // Matching and consuming are atomic: two simultaneous submissions cannot win.
  const result = await authStoreCall(store, () =>
    store.eval(
      'if redis.call("GET", KEYS[1]) == ARGV[1] then redis.call("DEL", KEYS[1]); return 1 end; return 0',
      { keys: [authKey('email-code', email)], arguments: [verificationDigest(email, code)] }
    )
  );
  return Number(result) === 1;
}

export async function reserveIncludedEmail(
  store: AtomicStore,
  providerIdentity: string,
  periodEnd: string,
  remaining: number
): Promise<void> {
  const allocated = await authStoreCall(store, () =>
    store.eval(
      'local n = tonumber(redis.call("GET", KEYS[1]) or ARGV[1]); n = math.min(n, tonumber(ARGV[1])); if n < 1 then return 0 end; redis.call("SET", KEYS[1], n - 1, "EX", 3888000); return 1',
      {
        keys: [authKey('mail-included-credit', `${providerIdentity}:${periodEnd}`)],
        arguments: [String(remaining)],
      }
    )
  );
  // Reservations remain consumed after an uncertain provider response.
  if (Number(allocated) !== 1) throw new HttpError(503, 'Included email quota is unavailable');
}
