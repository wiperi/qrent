'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import HarbourImage from './HarbourImage';
import SearchBar from '@/components/SearchBar';
import TodoProgressBar from './TodoProgressBar';
import styles from '@/styles/discovery.module.css';

export default function HeroSection() {
  const t = useTranslations('home');

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
          <div className="relative h-[430px] md:h-[320px] w-full overflow-hidden rounded-2xl">
            <HarbourImage
              alt={t('bannerAlt')}
              priority
              className="absolute inset-0 h-full w-full object-cover"
              sizes="(max-width: 1280px) calc(100vw - 40px), 1240px"
            />

            {/* Search bar overlay */}
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div className="w-full max-w-4xl">
                <Suspense
                  fallback={
                    <div className="h-16 bg-white/80 backdrop-blur rounded-2xl animate-pulse" />
                  }
                >
                  <SearchBar />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Bottom: Rental Progress Bar */}
          <div className="w-full">
            <TodoProgressBar useSticky={false} maxHeight="auto" defaultCollapsed />
          </div>
        </div>
      </div>
    </section>
  );
}
