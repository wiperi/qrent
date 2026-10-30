import Link from 'next/link';
import { RENTAL_SCHOOLS } from '@/lib/rental-schools';
import { HiArrowRight } from 'react-icons/hi';
import styles from '@/styles/discovery.module.css';

export default function RentalLinks({
  locale,
  compact = false,
}: {
  locale: string;
  compact?: boolean;
}) {
  const zh = locale === 'zh';
  return (
    <section
      className={`${styles.links} ${compact ? styles.linksCompact : ''}`}
      aria-labelledby="rental-links-title"
    >
      <h2 id="rental-links-title" className={styles.sectionTitle}>
        {zh ? '按学校找悉尼房源' : 'Explore Sydney rentals by university'}
      </h2>
      {!compact && (
        <p className={styles.lead}>
          {zh
            ? '对比 Domain 与 Real Estate 的周租和公共交通通勤，再去源站核实可租状态。'
            : 'Compare weekly prices and public transport commutes from Domain and Real Estate, then confirm availability with the original listing.'}
        </p>
      )}
      <nav aria-label={zh ? '悉尼租房与指南' : 'Sydney rentals and guides'}>
        <div className={styles.universityLinks}>
          {RENTAL_SCHOOLS.map(school => (
            <Link key={school.code} href={`/${locale}/rentals/${school.slug}`}>
              {zh ? `${school.nameZh}（${school.code}）租房` : `${school.code} rentals`}
              <HiArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
        <div className={styles.secondaryLinks}>
          <Link href={`/${locale}/rentals`}>
            {zh ? '区域与学校目录' : 'University and area directory'}
          </Link>
          <Link href={`/${locale}/blog`}>{zh ? '租房指南' : 'Rental guides'}</Link>
        </div>
      </nav>
    </section>
  );
}
