'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiArrowRight, HiExternalLink, HiPhotograph } from 'react-icons/hi';
import { FaBath, FaBed } from 'react-icons/fa';
import { SCHOOL } from '@qrent/shared/enum';
import { useTRPCClient } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { RENTAL_SCHOOLS, rentalSearchPath } from '@/lib/rental-schools';
import { validPreviewRow } from '@/lib/rental-preview';
import styles from '@/styles/home-demo.module.css';

function RentalPhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.cardPhoto}>
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 46vw, (max-width: 1279px) 30vw, 390px"
          className={styles.propertyPhoto}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.photoFallback}>
          <HiPhotograph aria-hidden="true" />
          {alt}
        </span>
      )}
    </div>
  );
}

function streetName(value: string) {
  // Preserve unit numbers; only replace the separator used by legacy source slugs.
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export default function HomeDemoListings() {
  const locale = useLocale();
  const zh = locale === 'zh';
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const school = (RENTAL_SCHOOLS.find(item => item.code === searchParams.get('university'))?.code ??
    SCHOOL.UNSW) as SCHOOL;
  const selectSchool = (code: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('university', code);
    router.replace(`${pathname}?${params}`, { scroll: false });
  };
  const trpc = useTRPCClient();
  const { user, isLoading } = useAuth();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['home-demo.properties', school, user?.id, locale],
    queryFn: () =>
      trpc.properties.search.query({
        targetSchool: school,
        page: 1,
        pageSize: 6,
        orderBy: [{ publishedAt: 'desc' }, { averageScore: 'desc' }],
      }),
    enabled: !isLoading,
    staleTime: 600_000,
    retry: 1,
  });
  const rows =
    data?.properties.filter(row =>
      validPreviewRow({
        id: row.id,
        address: row.address,
        region: row.region ?? '',
        price: row.price,
        url: row.url,
      })
    ) ?? [];
  return (
    <section className={styles.listings} aria-labelledby="demo-listings-heading">
      <div className={styles.sectionHeading}>
        <h2 id="demo-listings-heading">
          {zh ? '看看学校周边的房源' : 'Rentals around your university'}
        </h2>
        <Link href={rentalSearchPath(locale, school)}>
          {zh ? '查看全部房源' : 'View all rentals'}
          <HiArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div
        className={styles.schoolTabs}
        role="group"
        aria-label={zh ? '选择大学' : 'Choose a university'}
      >
        {RENTAL_SCHOOLS.map(item => (
          <button
            key={item.code}
            aria-pressed={school === item.code}
            onClick={() => selectSchool(item.code)}
            type="button"
          >
            {item.code}
            <span>{zh ? item.nameZh : item.name}</span>
          </button>
        ))}
      </div>
      <div aria-live="polite" aria-busy={isPending}>
        {isPending ? (
          <div className={styles.cardGrid} aria-label={zh ? '房源加载中' : 'Loading rentals'}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <p>
              {zh
                ? '暂时无法读取房源，请重试。'
                : 'We could not load the listings. Please try again.'}
            </p>
            <button type="button" onClick={() => void refetch()}>
              {zh ? '重新加载' : 'Try again'}
            </button>
          </div>
        ) : !rows.length ? (
          <div className={styles.empty}>
            <p>
              {zh
                ? '这个学校暂时没有可预览的房源。'
                : 'No listings are available to preview for this university.'}
            </p>
            <Link href={rentalSearchPath(locale, school)}>
              {zh ? '前往完整搜索' : 'Open rental search'}
            </Link>
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {rows.map(row => {
              const source = new URL(row.url).hostname.includes('realestate')
                ? 'Real Estate'
                : 'Domain';
              return (
                <a
                  key={row.id}
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.card}
                >
                  <RentalPhoto
                    key={row.thumbnailUrl}
                    src={row.thumbnailUrl}
                    alt={`${streetName(row.address)}, ${row.region}`}
                  />
                  <div className={styles.cardBody}>
                    <div className={styles.priceRow}>
                      <p>
                        <strong>${row.price.toLocaleString('en-AU')}</strong>
                        <span>{zh ? ' / 周' : ' / week'}</span>
                      </p>
                      <span className={styles.source}>
                        {source}
                        <HiExternalLink aria-hidden="true" />
                      </span>
                    </div>
                    <h3>{streetName(row.address)}</h3>
                    <p className={styles.region}>{streetName(row.region ?? '')}</p>
                    <div className={styles.cardDetails}>
                      <span>
                        <FaBed aria-hidden="true" />
                        {row.bedroomCount ?? '?'}
                        <span className="sr-only">{zh ? '卧室' : 'bedrooms'}</span>
                      </span>
                      <span>
                        <FaBath aria-hidden="true" />
                        {row.bathroomCount ?? '?'}
                        <span className="sr-only">{zh ? '浴室' : 'bathrooms'}</span>
                      </span>
                      {row.commuteTime != null &&
                        Number.isFinite(row.commuteTime) &&
                        row.commuteTime > 0 && (
                          <span className={styles.commute}>
                            {zh
                              ? `${row.commuteTime} 分钟到 ${school}`
                              : `${row.commuteTime} min to ${school}`}
                          </span>
                        )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
