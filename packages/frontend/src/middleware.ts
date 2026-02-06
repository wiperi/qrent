import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { fallbackLocale, locales } from './i18n';
import { isMobileDevice } from './lib/device';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale: fallbackLocale,

  // Always use locale prefix
  localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
  // First handle internationalization
  const intlResponse = intlMiddleware(request);

  // Check if this is a redirect response from intl middleware
  if (intlResponse.headers.get('location')) {
    return intlResponse;
  }

  // Get the device type from user agent
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = isMobileDevice(userAgent);

  // If it's not a mobile device, return the original response
  if (!isMobile) {
    return intlResponse;
  }

  // Get the current pathname
  const pathname = request.nextUrl.pathname;

  // Check if the pathname already contains /mobile
  if (pathname.includes('/mobile')) {
    return intlResponse;
  }

  // Check if this is a locale path (e.g., /en/search)
  const localeMatch = pathname.match(/^\/([a-z]{2})\/(.*)$/);

  if (localeMatch) {
    const [, locale, restPath] = localeMatch;

    // Construct the mobile path
    const mobilePath = `/${locale}/${restPath}/mobile`;

    // Create a new request with the mobile path
    const mobileRequest = new NextRequest(new URL(mobilePath, request.url), request);

    // Try to fetch the mobile page
    return NextResponse.rewrite(mobilePath);
  }

  // For non-locale paths, return original response
  return intlResponse;
}

export const config = {
  // Match all paths except for /api, /_next, /_vercel, and files with an extension (e.g., .js, .css, .png)
  matcher: ['/((?!api|_next|_vercel|.*\..*).*)'],
};
