jest.mock('../src/utils/redisClient', () => ({ __esModule: true, default: { eval: jest.fn() } }));
jest.mock('../src/services/AuthService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    capabilities: jest.fn(),
    logout: jest.fn(),
  },
}));
jest.mock('@qrent/shared', () => ({ prisma: { userSession: { findFirst: jest.fn() } } }));
import redis from '../src/utils/redisClient';
import { authService } from '../src/services/AuthService';
import { authRouter } from '../src/trpc/routers/auth';
import { createTRPC, TrpcContext } from '../src/trpc/trpc';
import HttpError from '../src/error/HttpError';

const t = createTRPC();
const router = t.router({ auth: authRouter });
const req = {
  headers: { authorization: 'Bearer current-session' },
  socket: { remoteAddress: '127.0.0.1' },
};
const caller = (userId?: number) =>
  router.createCaller({ userId, req, res: {}, locale: 'en' } as TrpcContext).auth;

describe('public/protected auth procedure and HTTP error contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redis.eval as jest.Mock).mockResolvedValue(1);
  });

  it('does not disclose internals or require login for the mail capability check', async () => {
    (authService.capabilities as jest.Mock).mockResolvedValue({
      emailVerification: false,
      verificationResendSeconds: 60,
    });
    await expect(caller().capabilities()).resolves.toEqual({
      emailVerification: false,
      verificationResendSeconds: 60,
    });
    expect(redis.eval).not.toHaveBeenCalled();
  });
  it('converts credential failures and rate limits to the real tRPC error code', async () => {
    (authService.login as jest.Mock).mockRejectedValueOnce(
      new HttpError(401, 'Invalid email or password')
    );
    await expect(
      caller().login({ email: 'test@example.invalid', password: '123456' })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    (redis.eval as jest.Mock).mockResolvedValueOnce(201);
    await expect(
      caller().login({ email: 'test@example.invalid', password: '123456' })
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });
  it('strips forged account fields before the service even on the tRPC path', async () => {
    (authService.register as jest.Mock).mockResolvedValue('new-session');
    await caller().register({
      email: 'TEST@example.invalid',
      password: 'new-password-123',
      emailVerified: true,
    } as never);
    expect(authService.register).toHaveBeenCalledWith({
      email: 'test@example.invalid',
      password: 'new-password-123',
    });
  });
  it('requires a session for logout and revokes exactly its bearer', async () => {
    await expect(caller().logout()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(caller(42).logout()).resolves.toEqual({ ok: true });
    expect(authService.logout).toHaveBeenCalledWith(42, 'current-session');
  });
});
