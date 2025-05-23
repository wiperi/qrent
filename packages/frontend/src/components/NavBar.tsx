'use client';
import React from 'react';
import Logo from './Logo';
import DropDownList from './DropDownList';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const NavBar = () => {
  const t = useTranslations('NavBar');

  return (
    <>
      <header>
        <nav>
          <div className="relative z-50 flex h-20 px-10 border border-gray-200 rounded-lg p-4">
            <div className="h-full flex items-center">
              <Logo />
            </div>
            <div className="h-full flex items-center mt-1.5 ml-16 pl-2">
              <ul className="hidden md:flex space-x-4 text-lg font-sans font-semibold items-center justify-center tracking-wide whitespace-nowrap">
                <li>
                  <Link href="/rentalGuide" className="text-blue-primary hover:text-blue-600">
                    {t('rental-guide')}
                  </Link>
                </li>
                <li>
                  <Link href="/prepareDocuments" className="text-blue-primary hover:text-blue-600">
                    {t('prepare-documents')}
                  </Link>
                </li>
                <li>
                  <Link href="/findAHome" className="text-blue-primary hover:text-blue-600">
                    {t('efficiency-filter')}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="h-full flex items-center ml-auto mt-1.5">
              <LanguageSwitcher />
              <DropDownList />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default NavBar;
