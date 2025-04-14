// This is an adapter file to make next-intl work without the use-intl package
// It forwards all necessary functions from next-intl to components that expect use-intl

import { useTranslations as useNextIntlTranslations } from 'next-intl';

// Export the same interface as use-intl would
export const useTranslations = useNextIntlTranslations;

// Add any other functions from use-intl that you might need
export const useLocale = () => {
  // You can implement this based on your routing configuration
  // For now, return a default locale
  return 'en';
};

export default {
  useTranslations,
  useLocale,
}; 