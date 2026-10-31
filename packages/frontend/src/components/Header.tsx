'use client';

import { useAuth } from '@/hooks/use-auth';
import { useAuthModalEvents } from '@/lib/auth-events';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HiLogout, HiMenu, HiUser, HiX } from 'react-icons/hi';
import AuthModal from './AuthModal';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, logout, isLoading, hasSessionError, refreshUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);
  const t = useTranslations('Header');
  const locale = useLocale();

  // 监听全局认证事件
  useAuthModalEvents(modalType => {
    setAuthMode(modalType);
    setAuthModalOpen(true);
  });

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    document.body.classList.remove('overflow-hidden');
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
    document.body.classList.toggle('overflow-hidden');
  };

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      setUserMenuOpen(false);
      closeDrawer();
    } catch {
      setLogoutError(t('signoutFailed'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-[60] mb-2 sm:mb-3">
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="h-16 px-2 sm:px-3 lg:px-4 flex items-center justify-between">
              {/* Left: logo + blog link */}
              <div className="flex items-center gap-6">
                <Link href={`/${locale}`} className="flex items-center" aria-label="Qrent home">
                  <Image
                    src="/media/qrent-logo-v1.svg"
                    alt="Qrent"
                    width={80}
                    height={80}
                    priority
                    className="rounded-md"
                  />
                </Link>
                <Link
                  href={`/${locale}/blog`}
                  className="hidden md:block text-slate-700 hover:text-blue-600 transition-colors font-bold"
                >
                  {t('rentalBlog')}
                </Link>
                <Link
                  href={`/${locale}/favorite`}
                  className="hidden md:block text-slate-700 hover:text-blue-600 transition-colors font-bold"
                >
                  {t('favorite')}
                </Link>
              </div>

              {/* Center: desktop nav */}
              <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
                {/* <a href="#guide" className="text-slate-700 hover:text-blue-600 transition-colors">Rental Guide</a>
              <a href="#docs" className="text-slate-700 hover:text-blue-600 transition-colors">Document Preparation</a> */}
              </nav>

              {/* Right: actions */}
              <div className="hidden md:flex items-center gap-3">
                <LanguageSwitcher />
                {isLoading || hasSessionError ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void refreshUser()}
                    className="px-3 py-2 text-sm text-slate-600"
                    aria-live="polite"
                  >
                    {t(isLoading ? 'loadingSession' : 'retrySession')}
                  </button>
                ) : !user ? (
                  <>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
                    >
                      {t('login')}
                    </button>
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                      {t('signup')}
                    </button>
                  </>
                ) : (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      aria-expanded={userMenuOpen}
                      aria-controls="account-menu"
                      className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-slate-200 hover:ring-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span className="sr-only">{t('userMenu')}</span>
                      {user.name ? (
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700"
                          aria-hidden="true"
                        >
                          {Array.from(user.name)[0]?.toUpperCase()}
                        </span>
                      ) : (
                        <HiUser className="h-5 w-5 text-slate-600" />
                      )}
                    </button>

                    {userMenuOpen && (
                      <div
                        id="account-menu"
                        className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-xl border border-gray-200 py-1 z-[9999]"
                      >
                        <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                          {user.name && <div className="font-medium">{user.name}</div>}
                          <div className="break-all text-gray-500">{user.email}</div>
                        </div>
                        <Link
                          href={`/${locale}/account`}
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-50"
                        >
                          {t('account')}
                        </Link>
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <HiLogout className="mr-2 h-4 w-4" />
                          {t('signout')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <div className="flex items-center md:hidden">
                <LanguageSwitcher />
                <button
                  onClick={toggleDrawer}
                  className="md:hidden inline-flex h-10 w-10 items-center justify-center text-slate-700 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-label={t('openMenu')}
                >
                  <HiMenu className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer and overlay */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={closeDrawer}></div>
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl">
            <div className="h-16 flex items-center justify-between px-4 border-b">
              <div className="flex items-center">
                <Link href={`/${locale}`} onClick={closeDrawer}>
                  <Image
                    src="/media/qrent-logo-v1.svg"
                    alt="Qrent"
                    width={36}
                    height={36}
                    className="rounded-md"
                  />
                </Link>
              </div>
              <button
                onClick={closeDrawer}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus:outline-none"
                aria-label={t('closeMenu')}
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-4 py-4 space-y-1" aria-label="Mobile">
              {/* <a href="#guide" className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600">{t('rentalGuide')}</a> */}
              {/* <a href="#docs" className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600">{t('documentPreparation')}</a> */}
              <Link
                href={`/${locale}`}
                onClick={closeDrawer}
                className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600"
              >
                {t('homepage')}
              </Link>
              <Link
                href={`/${locale}/blog`}
                onClick={closeDrawer}
                className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600"
              >
                {t('rentalBlog')}
              </Link>
              <Link
                href={`/${locale}/favorite`}
                onClick={closeDrawer}
                className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600"
              >
                {t('favorite')}
              </Link>
              <div className="my-3 h-px bg-slate-200"></div>
              {isLoading || hasSessionError ? (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void refreshUser()}
                  className="px-3 py-2 text-left text-sm text-slate-600"
                  aria-live="polite"
                >
                  {t(isLoading ? 'loadingSession' : 'retrySession')}
                </button>
              ) : !user ? (
                <>
                  <button
                    onClick={() => {
                      openAuthModal('login');
                      closeDrawer();
                    }}
                    className="block w-full text-left rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600"
                  >
                    {t('login')}
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('signup');
                      closeDrawer();
                    }}
                    className="block w-full text-left rounded-md px-3 py-2 text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {t('signup')}
                  </button>
                </>
              ) : (
                <>
                  <div className="px-3 py-2 text-sm text-gray-700 border-b border-gray-200">
                    {user.name && <div className="font-medium">{user.name}</div>}
                    <div className="text-gray-500">{user.email}</div>
                  </div>
                  <Link
                    href={`/${locale}/account`}
                    onClick={closeDrawer}
                    className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
                  >
                    {t('account')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center w-full rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600"
                  >
                    <HiLogout className="mr-2 h-4 w-4" />
                    {t('signout')}
                  </button>
                </>
              )}
            </nav>
          </aside>
        </>
      )}

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} initialMode={authMode} />
      {logoutError && (
        <p
          role="alert"
          className="fixed bottom-4 left-4 right-4 z-[10000] mx-auto max-w-md rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700 shadow-lg"
        >
          {logoutError}
        </p>
      )}
    </>
  );
}
