'use client';

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { FaGlobe } from 'react-icons/fa';
import { useRouter, usePathname } from '@/src/i18n/navigation';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const handleLanguageChange = (lang: string) => {
    if (lang !== currentLocale) {
      router.replace({ pathname }, { locale: lang }); // Change the locale
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className="font-serif text-xl flex items-center gap-2">
          <FaGlobe className="text-xl" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Language Selection" className="bg-white shadow-md rounded-lg">
        <DropdownItem
          key="english"
          className="font-serif"
          onClick={() => handleLanguageChange('en')}
        >
          English
        </DropdownItem>
        <DropdownItem
          key="chinese_simplified"
          className="font-serif"
          onClick={() => handleLanguageChange('zh')}
        >
          Chinese (Simplified)
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
