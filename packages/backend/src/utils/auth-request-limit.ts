import type { Request } from 'express';
import redis from './redisClient';
import { limitAuth } from './auth-security';

export async function limitAuthRequest(req: Request, operation: string) {
  // Trust the connected peer, not client-supplied forwarded headers. Behind a
  // reverse proxy this deliberately gives its shared peer a generous ceiling.
  const peer = req.socket?.remoteAddress || req.ip || 'unknown';
  await limitAuth(redis, `request:${operation}`, peer, 200, 60);
}
