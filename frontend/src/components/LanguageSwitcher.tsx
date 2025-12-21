'use client';

import { LOCALE } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { HiGlobeAlt } from 'react-icons/hi';

export default function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const switchLanguage = (newLocale: LOCALE) => {
    // Remove the current locale from the pathname
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    // Navigate to the new locale
    router.push(`/${newLocale}${pathWithoutLocale}`);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        aria-label="Switch language"
      >
        <HiGlobeAlt className="h-4 w-4" />
        <span className="hidden sm:inline">
          {locale === LOCALE.EN ? t('english') : t('chinese')}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-xl border border-gray-200 py-1 z-[9999]">
          <button
            onClick={() => switchLanguage(LOCALE.EN)}
            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${locale === LOCALE.EN ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
              }`}
          >
            {t('english')}
          </button>
          <button
            onClick={() => switchLanguage(LOCALE.ZH)}
            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${locale === LOCALE.ZH ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
              }`}
          >
            {t('chinese')}
          </button>
        </div>
      )}
    </div>
  );
}
