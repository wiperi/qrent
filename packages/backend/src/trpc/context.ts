import type { TrpcContext } from './trpc';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export async function createTRPCContext({ req, res }: { req: Request; res: Response }): Promise<TrpcContext> {
  let userId: number | undefined;

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  const secret = process.env.BACKEND_JWT_SECRET_KEY;

  if (token && secret) {
    try {
      const decoded = jwt.verify(token, secret) as { userId?: number };
      if (decoded && typeof decoded.userId === 'number') {
        userId = decoded.userId;
      }
    } catch (_) {
      // ignore invalid token for public procedures
    }
  }

  return { req, res, userId };
}



