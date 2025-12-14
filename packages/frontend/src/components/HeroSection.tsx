'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import SearchBar from '@/components/SearchBar';
import TodoProgressBar from './TodoProgressBar';

export default function HeroSection() {
  return (
    <section className="relative pb-6">
      <div className="max-w-7xl mx-auto px-5">
        {/* Hero Section Wrapper - 左右布局容器 */}
        <div className="flex gap-5 flex-col md:flex-row items-start">
          {/* Left Sidebar: Timeline */}
          <div className="w-full md:w-auto">
            <TodoProgressBar useSticky={false} maxHeight="520px" />
          </div>

          
          {/* Right Content: Hero Image & Search */}
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
