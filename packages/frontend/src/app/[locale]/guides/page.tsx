import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import Breadcrumbs from '@/components/Breadcrumbs';
import RentalGuideBrowser from '@/components/RentalGuideBrowser';
import {
  getRentalSearchItems,
  rentalGuideModules,
  RENTAL_LIBRARY_PUBLISHED_AT,
} from '@/lib/rental-library';
import { jsonLd, pageMetadata, SITE_URL } from '@/lib/seo';
import styles from '@/styles/rental-library.module.css';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return pageMetadata(
    locale,
    '/guides',
    locale === 'zh'
      ? '澳洲租房全流程攻略：预算、申请、看房与入住 | QRent'
      : 'Australian Rental Handbook: Budget, Apply, Inspect & Move In | QRent',
    locale === 'zh'
      ? '把 Qrent 原攻略与收藏经验按八个租房阶段整理，查找预算房型、学校选区、平台、申请材料、看房、合同押金、入住和退租的具体清单。'
      : 'Browse eight source-attributed rental stages: budget, areas, platforms, application documents, inspections, leases and bonds, moving in, and repairs or moving out.'
  );
}

export default async function GuideLibrary({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'zh' ? 'zh' : 'en';
  setRequestLocale(locale);
  const zh = locale === 'zh';
  return (
    <main className={styles.page}>
      <Breadcrumbs
        locale={locale}
        items={[
          { name: zh ? '首页' : 'Home', path: '' },
          { name: zh ? '租房攻略' : 'Rental guides', path: '/blog' },
          { name: zh ? '全流程目录' : 'Handbook', path: '/guides' },
        ]}
      />
      <h1>{zh ? '澳洲租房全流程攻略' : 'Your Australian rental handbook'}</h1>
      <p className={styles.lead}>
        {zh
          ? '从预算到退租，按阶段找清单，也可以直接搜索问题。'
          : 'Find a checklist for each rental stage, or search for a specific question.'}
      </p>
      <RentalGuideBrowser
        locale={locale}
        modules={rentalGuideModules.map(module => ({
          slug: module.slug,
          title: module.title[locale],
          summary: module.summary[locale],
          sections: module.sections.map(section => ({
            id: section.id,
            title: section.title[locale],
          })),
        }))}
        searchItems={getRentalSearchItems(locale)}
      />
      <div className={styles.libraryFoot}>
        <p>
          {zh
            ? '依据 Qrent 2025 年原攻略与 2026-10-30 收藏整理，保留原文出处；历史价格和个人经历有明确区分。'
            : 'Organised from the 2025 Qrent handbook and collection compiled on 30 October 2026, with source references and dated examples.'}
        </p>
        <Link href={`/${locale}/blog`}>
          {zh ? '继续阅读原有经验帖' : 'Read the existing experience articles'}
        </Link>
        <Link href={`/${locale}/rentals`}>
          {zh ? '按学校查悉尼房源' : 'Explore Sydney rentals by university'}
        </Link>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: zh ? '澳洲租房全流程攻略' : 'Australian rental handbook',
            url: `${SITE_URL}/${locale}/guides`,
            inLanguage: zh ? 'zh-CN' : 'en-AU',
            datePublished: RENTAL_LIBRARY_PUBLISHED_AT,
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: rentalGuideModules.map((module, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: module.title[locale],
                url: `${SITE_URL}/${locale}/guides/${module.slug}`,
              })),
            },
          }),
        }}
      />
    </main>
  );
}
