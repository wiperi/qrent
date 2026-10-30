jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: { setApiKey: jest.fn(), send: jest.fn() },
}));
jest.mock('../src/utils/redisClient', () => ({ __esModule: true, default: { eval: jest.fn() } }));
import sgMail from '@sendgrid/mail';
import redis from '../src/utils/redisClient';
import { EmailService } from '../src/services/EmailService';
import { authStoreCall, limitAuth } from '../src/utils/auth-security';

const originalFetch = global.fetch;
const originalKey = process.env.SENDGRID_API_KEY;
const fixtureKey = ['SG', 'offline', 'fixture'].join('.');
const future = () => new Date(Date.now() + 86400000).toISOString();

describe('included-quota email protection, without sending email or HTTP requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENDGRID_API_KEY = fixtureKey;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ remain: 5, overage: 0, next_reset: future() }),
    });
    (redis.eval as jest.Mock).mockResolvedValue(1);
    (sgMail.send as jest.Mock).mockResolvedValue([{ statusCode: 202 }]);
  });
  afterAll(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.SENDGRID_API_KEY;
    else process.env.SENDGRID_API_KEY = originalKey;
  });

  it.each([
    { remain: 0, overage: 0, next_reset: future() },
    { remain: 100, overage: 1, next_reset: future() },
    { remain: 100, overage: 0, next_reset: '2020-01-01' },
    { remain: '100', overage: 0, next_reset: future() },
    {},
  ])('does not send with exhausted, overdrawn, expired or malformed quota: %j', async quota => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => quota });
    const service = new EmailService();
    await expect(service.availability()).resolves.toMatchObject({ available: false });
    await expect(
      service.sendVerificationCode('test@example.invalid', 123456)
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(sgMail.send).not.toHaveBeenCalled();
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('fails closed without a key or readable provider quota', async () => {
    delete process.env.SENDGRID_API_KEY;
    await expect(new EmailService().availability()).resolves.toMatchObject({ available: false });
    expect(global.fetch).not.toHaveBeenCalled();
    process.env.SENDGRID_API_KEY = fixtureKey;
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network unavailable'));
    await expect(new EmailService().availability()).resolves.toMatchObject({ available: false });
  });

  it('coalesces simultaneous capability checks and keeps provider secrets off the response', async () => {
    const service = new EmailService();
    const results = await Promise.all(Array.from({ length: 12 }, () => service.availability()));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(results.every(x => x.available)).toBe(true);
    expect(JSON.stringify(results)).not.toContain(fixtureKey);
  });

  it('reserves quota before sending, and a local exhausted reservation prevents another send', async () => {
    const service = new EmailService();
    await service.sendVerificationCode('test@example.invalid', 123456);
    expect(redis.eval).toHaveBeenCalledTimes(1);
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    expect((redis.eval as jest.Mock).mock.calls[0][1].keys[0]).not.toContain(fixtureKey);
    (redis.eval as jest.Mock).mockResolvedValueOnce(0);
    await expect(
      service.sendVerificationCode('test@example.invalid', 123456)
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(sgMail.send).toHaveBeenCalledTimes(1);
  });

  it('does not refund a reservation or retry after an uncertain send response', async () => {
    (sgMail.send as jest.Mock).mockRejectedValueOnce(
      new Error('timeout after acceptance is unknown')
    );
    await expect(
      new EmailService().sendVerificationCode('test@example.invalid', 123456)
    ).rejects.toThrow('unknown');
    expect(redis.eval).toHaveBeenCalledTimes(1);
    expect(sgMail.send).toHaveBeenCalledTimes(1);
  });

  it('fails promptly when Redis is offline, and bounds a stalled store request', async () => {
    const store = { isReady: false, eval: jest.fn() };
    await expect(limitAuth(store, 'login', 'test@example.invalid', 10, 900)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(store.eval).not.toHaveBeenCalled();
    jest.useFakeTimers();
    try {
      const pending = authStoreCall({ eval: jest.fn() }, () => new Promise(() => {}));
      const rejected = expect(pending).rejects.toMatchObject({ statusCode: 503 });
      await jest.advanceTimersByTimeAsync(5001);
      await rejected;
    } finally {
      jest.useRealTimers();
    }
  });
});
