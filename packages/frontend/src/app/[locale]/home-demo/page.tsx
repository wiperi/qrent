import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { HiArrowRight, HiBookOpen, HiLocationMarker } from 'react-icons/hi';
import { SCHOOL } from '@qrent/shared/enum';
import HarbourImage from '@/components/HarbourImage';
import SearchBar from '@/components/SearchBar';
import FilterModal from '@/components/FilterModal';
import HomeDemoListings from '@/components/HomeDemoListings';
import TodoProgressBar from '@/components/TodoProgressBar';
import { RENTAL_SCHOOLS, areaName, rentalSearchPath } from '@/lib/rental-schools';
import { pageMetadata } from '@/lib/seo';
import styles from '@/styles/home-demo.module.css';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...pageMetadata(
      locale,
      '/home-demo',
      'QRent | Homepage preview',
      'Sydney student rental search preview.'
    ),
    robots: { index: false, follow: true },
  };
}

export default async function HomeDemo({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale === 'zh';
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1>{zh ? '在悉尼，找到合适的家。' : 'Find your place in Sydney.'}</h1>
          <p>
            {zh
              ? '对比 Domain 与 Real Estate，按预算和到校通勤选房。'
              : 'Compare Domain and Real Estate by rent and commute.'}
          </p>
        </div>
        <div className={styles.heroPhoto}>
          <HarbourImage
            alt={
              zh
                ? '从悉尼社区望向海港大桥与歌剧院'
                : 'Sydney neighbourhoods overlooking the Harbour Bridge and Opera House'
            }
            sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 42vw, 500px"
            className={styles.harbour}
          />
        </div>
        <div className={styles.search}>
          <Suspense fallback={<div className={styles.searchSkeleton} />}>
            <SearchBar schoolOptions={[SCHOOL.UNSW, SCHOOL.USYD, SCHOOL.UTS]} />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<div className={styles.searchSkeleton} />}>
        <HomeDemoListings />
      </Suspense>

      <section className={styles.explore} aria-labelledby="explore-heading">
        <div className={styles.sectionHeading}>
          <h2 id="explore-heading">{zh ? '从熟悉的区域开始' : 'Start with a neighbourhood'}</h2>
          <Link href={`/${locale}/rentals`}>
            {zh ? '查看区域目录' : 'Explore all areas'}
            <HiArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.areaGroups}>
          {RENTAL_SCHOOLS.map(school => (
            <div key={school.code} className={styles.areaGroup}>
              <Link className={styles.schoolLink} href={`/${locale}/rentals/${school.slug}`}>
                <HiLocationMarker aria-hidden="true" />
                <strong>{school.code}</strong>
                <span>{school.campus}</span>
              </Link>
              <div className={styles.areaLinks}>
                {(school.code === 'UNSW'
                  ? ['kensington', 'kingsford', 'randwick', 'eastgardens']
                  : school.areas.slice(4, 8)
                ).map(area => (
                  <Link key={area} href={rentalSearchPath(locale, school.code, area)}>
                    {areaName(area)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.guide}>
        <div className={styles.guideIntro}>
          <HiBookOpen aria-hidden="true" />
          <div>
            <h2>{zh ? '第一次租房，也有章可循。' : 'Your first rental, one step at a time.'}</h2>
            <p>
              {zh
                ? '从准备材料、预约看房，到申请和入住。'
                : 'Prepare your documents, inspect, apply and move in.'}
            </p>
          </div>
          <Link href={`/${locale}/blog`}>
            {zh ? '阅读租房攻略' : 'Read rental guides'}
            <HiArrowRight aria-hidden="true" />
          </Link>
        </div>
        <TodoProgressBar useSticky={false} maxHeight="auto" defaultCollapsed />
      </section>
      <p className={styles.dataNote}>
        {zh
          ? '房源来自现有数据库，价格为澳元周租。通勤仅供参考，申请前请核对源站房源与实际路线。'
          : 'Listings come from the current database. Prices are AUD per week. Confirm availability and your actual journey before applying.'}
      </p>
      <Suspense fallback={null}>
        <FilterModal />
      </Suspense>
    </main>
  );
}
