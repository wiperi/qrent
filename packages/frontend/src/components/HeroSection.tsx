'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import SearchBar from '@/components/SearchBar';
import TodoProgressBar from './TodoProgressBar';
import SchoolRotate from '@/components/SchoolRotate'
import { useTranslations } from 'next-intl'

export default function HeroSection() {
  const t = useTranslations('HeroSection')

  return (
    <section className="relative pb-6">
      <div className="max-w-7xl mx-auto px-5">
        {/* Hero Section Wrapper - 上下布局容器 */}
        <div className="flex flex-col gap-5">
          {/* Top: Hero Image & Search */}
          <div className="relative h-[520px] w-full overflow-hidden rounded-2xl">
            <Image
              src="/banner.jpg"
              alt="Homepage banner"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
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
              <h2 className="absolute top-[30%] left-1/2 -translate-x-1/2 text-xl sm:text-2xl md:text-3xl font-semibold text-white text-center drop-shadow-lg whitespace-nowrap"> 
                {t('supportedPrefix')} <SchoolRotate /> {t('supportedSuffix')}
              </h2>
            </div>
          </div>

          {/* Bottom: Rental Progress Bar */}
          <div className="w-full">
            <TodoProgressBar useSticky={false} maxHeight="auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
