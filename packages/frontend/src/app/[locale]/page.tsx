import FilterModal from '@/components/FilterModal';
import HeroSection from '@/components/HeroSection';
import PropertyGrid from '@/components/PropertyGrid';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import RentalLinks from '@/components/RentalLinks';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '',
    locale === 'zh'
      ? '悉尼留学生租房 · UNSW、悉尼大学与 UTS | QRent'
      : 'Sydney Student Rentals near UNSW, USYD & UTS | QRent',
    locale === 'zh'
      ? '免费对比 Domain 和 Real Estate 的悉尼租房信息，按大学、周租、房型与公共交通通勤筛选。查看 UNSW、悉尼大学和 UTS 既有采集区域与租房指南。'
      : 'Compare Domain and Real Estate rental prices around UNSW, the University of Sydney and UTS. Filter by weekly rent, bedrooms and public transport commute, with practical rental guides.'
  );
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main>
      <HeroSection />
      {/* <UsefulGuide /> */}
      <PropertyGrid />
      <RentalLinks locale={locale} />
      <Suspense fallback={null}>
        <FilterModal />
      </Suspense>
    </main>
  );
}
