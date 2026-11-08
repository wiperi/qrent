import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import HttpError from '@/error/HttpError';
import { authStoreCall, limitAuth } from '@/utils/auth-security';
import redis from '@/utils/redisClient';

const interest = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .email()
    .transform(value => value.toLowerCase()),
  locale: z.enum(['en', 'zh']),
});

const rentalAlertInterestKey = 'qrent:rental-alerts:interest:v1';
const router: Router = Router();

router.post('/interest', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const input = interest.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ code: 'invalid_email' });
    return;
  }
  const { email, locale } = input.data;
  const peer = req.socket.remoteAddress ?? 'unknown';
  try {
    await limitAuth(redis, 'rental-alert-interest-peer', peer, 60, 60);
    await limitAuth(redis, 'rental-alert-interest-day', 'all', 1200, 86400);
    const digest = createHash('sha256').update(email).digest('hex');
    await authStoreCall(redis, () =>
      redis.hSetNX(
        rentalAlertInterestKey,
        digest,
        JSON.stringify({ email, locale, registeredAt: new Date().toISOString() })
      )
    );
    // Use the same receipt for duplicates so the public form cannot disclose signups.
    res.status(201).json({ status: 'registered' });
  } catch (error) {
    const limited = error instanceof HttpError && error.statusCode === 429;
    res.status(limited ? 429 : 503).json({ code: limited ? 'rate_limit' : 'storage_unavailable' });
  }
});

export default router;
