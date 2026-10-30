import type { Request, Response } from 'express';
import type { TrpcContext } from './trpc';
import { LOCALE } from '@qrent/shared/enum';
import { isLocale } from '@qrent/shared/utils/helper';
import { bearerToken, sessionUserId } from '../utils/auth-session';

export async function createTRPCContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<TrpcContext> {
  const userId = await sessionUserId(bearerToken(req.headers.authorization));

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
