import Link from 'next/link';
import { getNotionBlogPosts } from '@/lib/notion-blog';
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

export const revalidate = 600;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const localGuides = await getNotionBlogPosts(locale);
  const guides = (localGuides.length ? localGuides : await getNotionBlogPosts('zh')).slice(0, 3);
  const chineseFallback = locale === 'en' && !localGuides.length;
  return (
    <main>
      <HeroSection />
      {/* <UsefulGuide /> */}
      <PropertyGrid />
      <RentalLinks locale={locale} />
      {guides.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 pb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {locale === 'zh'
              ? '租房准备指南'
              : chineseFallback
                ? 'Rental guides available in Chinese'
                : 'Practical rental guides'}
          </h2>
          <ul className="grid gap-3 md:grid-cols-3">
            {guides.map(guide => (
              <li key={guide.id} className="rounded-xl border border-slate-200 p-5">
                <Link
                  className="text-blue-700 font-semibold underline"
                  href={`/${guide.language}/blog/${encodeURIComponent(guide.slug)}`}
                  lang={guide.language === 'zh' ? 'zh-CN' : 'en-AU'}
                >
                  {guide.language === 'zh' ? guide.title : guide.title_en}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Suspense fallback={null}>
        <FilterModal />
      </Suspense>
    </main>
  );
}
