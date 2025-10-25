import { LOCALE } from '../enum';

/**
 * Type guard to check if a value is a valid LOCALE
 * This properly narrows the type to LOCALE
 */
export function isLocale(value: unknown): value is LOCALE {
  return typeof value === 'string' && Object.values(LOCALE).includes(value as LOCALE);
}

/**
 * Get all supported locale values as a readonly array
 */
export const SUPPORTED_LOCALES = Object.values(LOCALE) as ReadonlyArray<LOCALE>;

/**
 * Default locale for the application
 */
export const DEFAULT_LOCALE: LOCALE = LOCALE.EN;
