jest.mock('@qrent/shared', () => ({ prisma: { userSession: { findFirst: jest.fn() } } }));
import { prisma } from '@qrent/shared';
import jwt from 'jsonwebtoken';
import { bearerToken, sessionUserId } from '../src/utils/auth-session';
import { generateToken, authenticate } from '../src/utils/helper';

const find = prisma.userSession.findFirst as jest.Mock;
const oldSecret = process.env.BACKEND_JWT_SECRET_KEY;
const secret = 'offline-fixture-not-a-production-key';

describe('existing session table remains authoritative', () => {
  beforeEach(() => {
    process.env.BACKEND_JWT_SECRET_KEY = secret;
    find.mockReset();
  });
  afterAll(() => {
    if (oldSecret === undefined) delete process.env.BACKEND_JWT_SECRET_KEY;
    else process.env.BACKEND_JWT_SECRET_KEY = oldSecret;
  });

  it('keeps an original valid HS256 token with an unexpired stored session', async () => {
    const token = jwt.sign({ userId: 42 }, secret, { expiresIn: '90d' });
    find.mockResolvedValue({ userId: 42 });
    await expect(sessionUserId(token)).resolves.toBe(42);
    expect(find).toHaveBeenCalledWith({
      where: { userId: 42, token, expiresAt: { gt: expect.any(Date) } },
      select: { userId: true },
    });
  });

  it('rejects a cryptographically valid token whose session was revoked or expired', async () => {
    find.mockResolvedValue(null);
    await expect(sessionUserId(generateToken(42))).resolves.toBeUndefined();
  });

  it.each([
    () => jwt.sign({ userId: 42 }, secret, { expiresIn: -1 }),
    () => jwt.sign({ userId: 42 }, secret, { algorithm: 'HS384' }),
    () => jwt.sign({ userId: '42' }, secret),
    () => jwt.sign({ userId: -1 }, secret),
    () => 'invalid',
  ])('rejects invalid signatures/claims before database work', async make => {
    await expect(sessionUserId(make())).resolves.toBeUndefined();
    expect(find).not.toHaveBeenCalled();
  });

  it('issues unique tokens within the same second that fit the original token column', () => {
    const a = generateToken(42),
      b = generateToken(42);
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(255);
  });

  it('enforces the same revocation rule on REST while anonymous search stays public', async () => {
    find.mockResolvedValue(null);
    const next = jest.fn();
    const request = {
      path: '/users/profile',
      headers: { authorization: 'Bearer ' + generateToken(42) },
    };
    await authenticate(request as never, {} as never, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    next.mockReset();
    await authenticate({ path: '/properties/search', headers: {} } as never, {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('does not accept another authorization scheme', () => {
    expect(bearerToken('Basic credentials')).toBeUndefined();
    expect(bearerToken()).toBeUndefined();
  });
});
