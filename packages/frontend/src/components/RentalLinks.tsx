import Link from 'next/link';
import { RENTAL_SCHOOLS } from '@/lib/rental-schools';
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
    <nav
      className={`${styles.links} ${compact ? styles.linksCompact : ''}`}
      aria-label={zh ? '悉尼租房与指南' : 'Sydney rentals and guides'}
    >
      <span className={styles.linksLabel}>{zh ? '悉尼租房' : 'Sydney rentals'}</span>
      <ul className={styles.linkItems}>
        {RENTAL_SCHOOLS.map(school => (
          <li key={school.code}>
            <Link key={school.code} href={`/${locale}/rentals/${school.slug}`}>
              {school.code}
            </Link>
          </li>
        ))}
        <li>
          <Link href={`/${locale}/rentals`}>{zh ? '所有区域' : 'All areas'}</Link>
        </li>
        <li>
          <Link href={`/${locale}/blog`}>{zh ? '租房攻略' : 'Rental guides'}</Link>
        </li>
      </ul>
    </nav>
  );
}
