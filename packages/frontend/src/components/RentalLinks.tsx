import Link from 'next/link';
import { RENTAL_SCHOOLS } from '@/lib/rental-schools';

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
      className={`max-w-7xl mx-auto px-5 ${compact ? 'py-6' : 'py-12'}`}
      aria-labelledby="rental-links-title"
    >
      <h2 id="rental-links-title" className="text-xl font-bold text-slate-900 mb-3">
        {zh ? '按学校找悉尼房源' : 'Explore Sydney rentals by university'}
      </h2>
      {!compact && (
        <p className="text-slate-600 mb-5">
          {zh
            ? '对比 Domain 与 Real Estate 的周租和公共交通通勤，再去源站核实可租状态。'
            : 'Compare weekly prices and public transport commutes from Domain and Real Estate, then confirm availability with the original listing.'}
        </p>
      )}
      <nav
        className="flex flex-wrap gap-3"
        aria-label={zh ? '悉尼租房与指南' : 'Sydney rentals and guides'}
      >
        {RENTAL_SCHOOLS.map(school => (
          <Link
            key={school.code}
            href={`/${locale}/rentals/${school.slug}`}
            className="rounded-lg border border-slate-200 px-4 py-3 text-blue-700 hover:bg-blue-50"
          >
            {zh ? `${school.nameZh}（${school.code}）租房` : `${school.code} rentals`}
          </Link>
        ))}
        <Link href={`/${locale}/rentals`} className="px-4 py-3 text-blue-700 underline">
          {zh ? '区域与学校目录' : 'University and area directory'}
        </Link>
        <Link href={`/${locale}/blog`} className="px-4 py-3 text-blue-700 underline">
          {zh ? '租房指南' : 'Rental guides'}
        </Link>
      </nav>
    </section>
  );
}
