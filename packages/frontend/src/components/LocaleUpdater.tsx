'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

export default function LocaleUpdater() {
  const locale = useLocale();

  useEffect(() => {
    // Update the html lang attribute on the client side
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
