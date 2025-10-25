import { LOCALE } from '@qrent/shared/enum';
import { DEFAULT_LOCALE, isLocale, SUPPORTED_LOCALES } from '@qrent/shared/utils/helper';
import { getRequestConfig } from 'next-intl/server';

// Re-export shared locale constants for frontend use
export const locales = SUPPORTED_LOCALES;
export type Locale = LOCALE;
export const fallbackLocale = DEFAULT_LOCALE;

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  const resolvedLocale = await requestLocale;
  const locale = isLocale(resolvedLocale) ? resolvedLocale : fallbackLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
