import createMiddleware from 'next-intl/middleware';
import { fallbackLocale, locales } from './i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale: fallbackLocale,

  // Always use locale prefix
  localePrefix: 'always',
});

export const config = {
  // Match all paths except for /api, /_next, /_vercel, and files with an extension (e.g., .js, .css, .png)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
