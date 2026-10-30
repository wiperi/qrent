import jwt from 'jsonwebtoken';
import { prisma } from '@qrent/shared';

export function bearerToken(header?: string): string | undefined {
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

export async function sessionUserId(token?: string): Promise<number | undefined> {
  const secret = process.env.BACKEND_JWT_SECRET_KEY;
  if (!token || !secret) return undefined;
  let userId: number;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (
      typeof decoded === 'string' ||
      !Number.isSafeInteger(decoded.userId) ||
      decoded.userId <= 0
    ) {
      return undefined;
    }
    userId = decoded.userId;
  } catch {
    return undefined;
  }
  // The existing session table is authoritative for logout and expiry.
  const session = await prisma.userSession.findFirst({
    where: { userId, token, expiresAt: { gt: new Date() } },
    select: { userId: true },
  });
  return session?.userId;
}
