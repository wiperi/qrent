'use client';

import { Suspense, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { preconnect } from 'react-dom';
import { BACKEND_URL } from '@/lib/trpc';
import HarbourImage from './HarbourImage';
import SearchBar from '@/components/SearchBar';
import TodoProgressBar from './TodoProgressBar';
import styles from '@/styles/discovery.module.css';

export default function HeroSection({ rentalTools }: { rentalTools?: ReactNode }) {
  const t = useTranslations('home');
  preconnect(BACKEND_URL, { crossOrigin: 'anonymous' });

  return (
    <section className="relative pb-6">
      <div className={styles.heroIntro}>
        <h1 className={styles.heroTitle}>{t('title')}</h1>
        <p className={styles.heroCopy}>{t('description')}</p>
      </div>
      <div className={styles.container}>
        {/* Hero Section Wrapper */}
        <div className="flex flex-col gap-5">
          {/* Top: Hero Image & Search */}
          <div className="relative flex min-h-[430px] w-full items-center justify-center overflow-hidden rounded-2xl p-4 md:min-h-[320px]">
            <HarbourImage
              alt={t('bannerAlt')}
              priority
              className="absolute inset-0 h-full w-full object-cover"
              sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1279px) calc(100vw - 64px), 1216px"
            />

            {/* Search bar overlay */}
            <div className="relative w-full max-w-4xl">
              <Suspense fallback={<div className="h-16 animate-pulse rounded-2xl bg-white/80" />}>
                <SearchBar />
              </Suspense>
            </div>
          </div>

          {rentalTools}

          {/* Bottom: Rental Progress Bar */}
          <div className="w-full">
            <TodoProgressBar useSticky={false} maxHeight="auto" defaultCollapsed />
          </div>
        </div>
      </div>
    </section>
  );
}
