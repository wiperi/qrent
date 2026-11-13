'use client';

import { readListingStats, type ListingStatsSnapshot } from '@/lib/listing-stats';
import { useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';

export default function ListingStats() {
  const t = useTranslations('PropertyGrid');
  const format = useFormatter();
  const { data, isError } = useQuery<ListingStatsSnapshot>({
    queryKey: ['listing-stats'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/listing-stats', { signal });
      if (!response.ok) throw new Error('Listing statistics unavailable');
      return response.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const stats = isError ? null : readListingStats(data);
  if (!stats) return null;

  return (
    <div className="mb-5 flex justify-center">
      <dl className="inline-grid max-w-full grid-cols-2 divide-x divide-blue-100 rounded-xl border border-blue-100 bg-blue-50/70 py-2.5">
        <div className="flex flex-col items-center gap-x-2 px-3 sm:flex-row sm:px-4">
          <dt className="order-2 text-center text-xs font-medium text-slate-700 sm:order-1 sm:text-sm">
            {t('updatedToday')}
          </dt>
          <dd className="order-1 text-lg font-semibold tabular-nums text-brand sm:order-2">
            {format.number(stats.updatedToday)}
            <span className="text-xs font-medium">{t('listingUnit')}</span>
          </dd>
        </div>
        <div className="flex flex-col items-center gap-x-2 px-3 sm:flex-row sm:px-4">
          <dt className="order-2 text-center text-xs font-medium text-slate-700 sm:order-1 sm:text-sm">
            {t('currentListings')}
          </dt>
          <dd className="order-1 text-lg font-semibold tabular-nums text-slate-900 sm:order-2">
            {format.number(stats.currentListings)}
            <span className="text-xs font-medium">{t('listingUnit')}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
