'use client';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { FaGlobe } from 'react-icons/fa';
import i18n from '../../i18n'; // Import i18n
import { useState } from 'react';
// import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  // const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className="font-serif text-xl ">
          {''}
          <FaGlobe className="text-xl" />
          {/* <span>Language</span> */}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Static Actions" className="bg-white shadow-md rounded-lg">
        <DropdownItem
          key="english"
          className="font-serif"
          onClick={() => handleLanguageChange('en')}
        >
          {/* {t('english')} */}
          English
        </DropdownItem>
        <DropdownItem
          key="ChineseSim"
          className="font-serif"
          onClick={() => handleLanguageChange('zh')}
        >
          {/* {t('chinese_simplified')} */}
          Chinese (Simplified)
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
