import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@qrent/shared/utils/helper';
import { setRequestLocale } from 'next-intl/server';
import Breadcrumbs from '@/components/Breadcrumbs';
import RentalLinks from '@/components/RentalLinks';
import { RENTAL_SCHOOLS, areaName } from '@/lib/rental-schools';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/rentals',
    locale === 'zh'
      ? '悉尼大学周边租房与区域目录 | QRent'
      : 'Sydney University Rental & Area Directory | QRent',
    locale === 'zh'
      ? '浏览 UNSW、悉尼大学与 UTS 既有采集区域，比较 Domain 与 Real Estate 租金、公共交通通勤及租房准备事项。'
      : 'Explore the existing rental collection around UNSW, the University of Sydney and UTS. Compare Domain and Real Estate prices, commute information and rental guides.'
  );
}

export default async function RentalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const zh = locale === 'zh';
  return (
    <main className="max-w-7xl mx-auto px-5 py-10">
      <Breadcrumbs
        locale={locale}
        items={[
          { name: zh ? '首页' : 'Home', path: '' },
          { name: zh ? '悉尼租房目录' : 'Sydney rental directory', path: '/rentals' },
        ]}
      />
      <h1 className="text-3xl font-bold mb-5">
        {zh ? '悉尼大学周边租房与区域' : 'Rentals and areas around Sydney universities'}
      </h1>
      <p className="max-w-3xl text-slate-600 leading-relaxed mb-8">
        {zh
          ? 'QRent 免费整合 Domain 与 Real Estate 的房源信息。先按学校了解既有采集区域，再按周租、卧室和公共交通时间筛选。当前恢复更新以悉尼三校范围为主，区域列表表示我们的采集范围，不代表到校步行距离或整个悉尼市场覆盖。'
          : 'QRent is a free way to compare rental information from Domain and Real Estate. Start with your university, then filter by weekly rent, bedrooms and public transport commute. Restored updates currently focus on the three Sydney universities below. Areas describe the existing collection scope, not walking distance or the entire Sydney rental market.'}
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {RENTAL_SCHOOLS.map(school => (
          <section key={school.code} className="rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-3">
              <Link href={`/${locale}/rentals/${school.slug}`} className="text-blue-700 underline">
                {zh ? school.nameZh : school.name} ({school.code})
              </Link>
            </h2>
            <p className="text-slate-600 mb-3">{school.focus[zh ? 'zh' : 'en']}</p>
            <p className="text-sm text-slate-600">{school.areas.map(areaName).join(' · ')}</p>
          </section>
        ))}
      </div>
      <RentalLinks locale={locale} />
    </main>
  );
}
