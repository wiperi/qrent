import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { TrpcContext } from './trpc';
import { LOCALE } from '@qrent/shared/enum';
import { isLocale } from '@qrent/shared/utils/helper';

export async function createTRPCContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<TrpcContext> {
  let userId: number | undefined;

  // Extract authentication info
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

  // Extract locale from headers
  let locale: LOCALE = LOCALE.EN;

  const acceptLanguage = req.headers['accept-language'] as string;
  const acceptLanguagePrefix = acceptLanguage?.split(',')[0]?.split('-')[0]; // e.g., "en-US" -> "en"
  const localeHeader = req.headers['x-locale'] as string;

  if (localeHeader && isLocale(localeHeader)) {
    locale = localeHeader;
  } else if (acceptLanguagePrefix && isLocale(acceptLanguagePrefix)) {
    locale = acceptLanguagePrefix;
  } else {
    locale = LOCALE.EN; // Default to English if unsupported locale
  }

  return { req, res, userId, locale };
}
