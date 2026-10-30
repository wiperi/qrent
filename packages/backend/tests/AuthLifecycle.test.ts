jest.mock('@qrent/shared', () => {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    userSession: { create: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  return { prisma };
});
jest.mock('../src/utils/redisClient', () => ({
  __esModule: true,
  default: { eval: jest.fn(), setEx: jest.fn() },
}));
jest.mock('../src/utils/helper', () => ({ generateToken: jest.fn(() => 'offline-session') }));
jest.mock('../src/utils/bcrypt', () => ({
  hashPassword: jest.fn(async () => 'offline-hash'),
  comparePassword: jest.fn(async () => true),
}));
jest.mock('../src/services/EmailService', () => ({
  emailService: { availability: jest.fn(), sendVerificationCode: jest.fn() },
}));

import { prisma } from '@qrent/shared';
import redis from '../src/utils/redisClient';
import { authService } from '../src/services/AuthService';
import { userService } from '../src/services/UserService';
import { emailService } from '../src/services/EmailService';
import { comparePassword } from '../src/utils/bcrypt';
import { authKey } from '../src/utils/auth-security';

const db = prisma as unknown as {
  user: Record<string, jest.Mock>;
  userSession: Record<string, jest.Mock>;
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
};
const counts = new Map<string, number>();
const codes = new Map<string, string>();
const account = {
  id: 42,
  email: 'owner@example.com',
  name: 'Owner',
  gender: null,
  phone: null,
  password: 'private-hash',
  emailVerified: false,
  emailPreferences: [],
};

describe('account lifecycle without database, provider or mail I/O', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    counts.clear();
    codes.clear();
    db.user.findUnique.mockImplementation(async (query: { select?: Record<string, unknown> }) =>
      query.select
        ? Object.fromEntries(
            Object.keys(query.select).map(key => [key, account[key as keyof typeof account]])
          )
        : { ...account }
    );
    db.user.create.mockResolvedValue({ id: 42 });
    db.user.update.mockResolvedValue({});
    db.user.updateMany.mockResolvedValue({ count: 1 });
    db.$queryRaw.mockResolvedValue([{ password: account.password, email: account.email }]);
    db.userSession.create.mockResolvedValue({});
    db.userSession.deleteMany.mockResolvedValue({ count: 1 });
    db.$transaction.mockImplementation(async callback => callback(db));
    (comparePassword as jest.Mock).mockResolvedValue(true);
    (emailService.availability as jest.Mock).mockResolvedValue({ available: true });
    (emailService.sendVerificationCode as jest.Mock).mockResolvedValue(undefined);
    (redis.setEx as jest.Mock).mockImplementation(async (key, _ttl, value) => {
      codes.set(key, value);
    });
    (redis.eval as jest.Mock).mockImplementation(async (script, { keys, arguments: args }) => {
      const key = keys[0];
      if (script.includes('"INCR"')) {
        const n = (counts.get(key) || 0) + 1;
        counts.set(key, n);
        return n;
      }
      if (codes.get(key) === args[0]) {
        codes.delete(key);
        return 1;
      }
      return 0;
    });
  });

  it('does not expose password hashes or sessions in a profile response', async () => {
    const result = await userService.getProfile(42);
    expect(result).toEqual(
      expect.objectContaining({ id: 42, email: account.email, emailPreferences: [] })
    );
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('userSessions');
    expect(db.user.findUnique.mock.calls[0][0]).not.toHaveProperty('include');
  });

  it('allows REST registration input only through the same field boundary and transaction', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await authService.register({
      email: ' OWNER@example.com ',
      password: 'new-password-123',
      id: 1,
      emailVerified: true,
      properties: { connect: [{ id: 1 }] },
    });
    expect(db.user.create.mock.calls[0][0].data).toEqual({
      email: account.email,
      name: undefined,
      gender: undefined,
      phone: undefined,
      password: 'offline-hash',
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.userSession.create).toHaveBeenCalledTimes(1);
  });

  it('returns the same login failure for unknown accounts and wrong passwords', async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      authService.login({ email: account.email, password: '123456' })
    ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
    (comparePassword as jest.Mock).mockResolvedValueOnce(false);
    await expect(
      authService.login({ email: account.email, password: '123456' })
    ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
    expect(db.userSession.create).not.toHaveBeenCalled();
  });

  it('stops an eleventh login attempt before password/database work', async () => {
    counts.set(authKey('login', account.email), 10);
    await expect(
      authService.login({ email: account.email, password: '123456' })
    ).rejects.toMatchObject({ statusCode: 429 });
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(comparePassword).not.toHaveBeenCalled();
  });

  it('accepts existing passwords and creates a session on successful login', async () => {
    await expect(authService.login({ email: account.email, password: '123456' })).resolves.toBe(
      'offline-session'
    );
    expect(db.userSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 42, token: 'offline-session' }),
    });
  });

  it('preserves verification when changing only a phone, and resets it for a different email', async () => {
    db.user.findUnique
      .mockResolvedValueOnce({ ...account, emailVerified: true })
      .mockResolvedValueOnce(null);
    await authService.changeAuthProfile(42, 'old-password', { phone: '13800000000' });
    expect(db.user.updateMany.mock.calls[0][0].data).toEqual({ phone: '13800000000' });
    db.user.findUnique
      .mockResolvedValueOnce({ ...account, emailVerified: true })
      .mockResolvedValueOnce(null);
    await authService.changeAuthProfile(42, 'old-password', { email: 'new@example.com' });
    expect(db.user.updateMany.mock.calls[1][0].data.emailVerified).toBe(false);
  });

  it('changes the password and invalidates sessions in the same transaction', async () => {
    (comparePassword as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await authService.changeAuthProfile(42, 'old-password', { password: 'different-password' });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.userSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 42 } });
  });

  it('logs out only the authenticated session', async () => {
    await authService.logout(42, 'current-session');
    expect(db.userSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 42, token: 'current-session' },
    });
  });

  it('stores a digest, rate-limits resends and accepts a code only once', async () => {
    await authService.sendVerificationEmail(42);
    const code = (emailService.sendVerificationCode as jest.Mock).mock.calls[0][1];
    expect(code).toBeGreaterThanOrEqual(100000);
    expect(code).toBeLessThan(1000000);
    expect(codes.get(authKey('email-code', account.email))).not.toBe(String(code));
    await expect(authService.sendVerificationEmail(42)).rejects.toMatchObject({ statusCode: 429 });
    await authService.verifyEmail(account.email, code);
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 42, email: account.email, emailVerified: false },
      data: { emailVerified: true },
    });
    await expect(authService.verifyEmail(account.email, code)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(db.user.updateMany).toHaveBeenCalledTimes(1);
  });

  it('allows only one of two simultaneous code submissions', async () => {
    await authService.sendVerificationEmail(42);
    const code = (emailService.sendVerificationCode as jest.Mock).mock.calls[0][1];
    const outcomes = await Promise.allSettled([
      authService.verifyEmail(account.email, code),
      authService.verifyEmail(account.email, code),
    ]);
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(db.user.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does not accept an expired code or a sixth guess', async () => {
    for (let i = 0; i < 5; i++)
      await expect(authService.verifyEmail(account.email, 123456)).rejects.toMatchObject({
        statusCode: 400,
      });
    await expect(authService.verifyEmail(account.email, 123456)).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  it('does not send without included quota or report provider failure as success', async () => {
    (emailService.availability as jest.Mock).mockResolvedValueOnce({ available: false });
    await expect(authService.sendVerificationEmail(42)).rejects.toMatchObject({ statusCode: 503 });
    expect(emailService.sendVerificationCode).not.toHaveBeenCalled();
    expect(redis.setEx).not.toHaveBeenCalled();
    (emailService.sendVerificationCode as jest.Mock).mockRejectedValueOnce(
      new Error('uncertain provider response')
    );
    await expect(authService.sendVerificationEmail(42)).rejects.toMatchObject({ statusCode: 503 });
    expect(codes.size).toBe(0);
  });

  it('rejects a stale profile edit instead of restoring an old password/email snapshot', async () => {
    db.user.findUnique
      .mockResolvedValueOnce({ ...account, emailVerified: true })
      .mockResolvedValueOnce(null);
    db.user.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      authService.changeAuthProfile(42, 'old-password', { phone: '13800000000' })
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 42, password: account.password, email: account.email },
      data: { phone: '13800000000' },
    });
    expect(db.userSession.deleteMany).not.toHaveBeenCalled();
  });

  it('cannot verify the replacement email after an address change races with a code', async () => {
    await authService.sendVerificationEmail(42);
    const code = (emailService.sendVerificationCode as jest.Mock).mock.calls[0][1];
    db.user.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(authService.verifyEmail(account.email, code)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 42, email: account.email, emailVerified: false },
      data: { emailVerified: true },
    });
  });

  it('does not create an old-password login session after a concurrent password change', async () => {
    let passwordChanged = false;
    let releaseLogin: (valid: boolean) => void = () => {};
    let started: () => void = () => {};
    const checking = new Promise<void>(resolve => {
      started = resolve;
    });
    (comparePassword as jest.Mock)
      .mockImplementationOnce(() => {
        started();
        return new Promise<boolean>(resolve => {
          releaseLogin = resolve;
        });
      })
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    db.user.updateMany.mockImplementationOnce(async () => {
      passwordChanged = true;
      return { count: 1 };
    });
    db.$queryRaw.mockImplementation(async () => [
      { email: account.email, password: passwordChanged ? 'new-password-hash' : account.password },
    ]);
    const login = authService.login({ email: account.email, password: 'old-password' });
    await checking;
    await authService.changeAuthProfile(42, 'old-password', { password: 'different-password' });
    releaseLogin(true);
    await expect(login).rejects.toMatchObject({ statusCode: 401 });
    expect(db.userSession.create).not.toHaveBeenCalled();
    expect(db.$queryRaw.mock.calls[0][0].join('')).toContain('FOR UPDATE');
    expect(db.$queryRaw.mock.calls[0][1]).toBe(42);
  });
});
