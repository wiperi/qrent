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
    <dl className="flex w-fit max-w-full shrink-0 items-center divide-x divide-slate-200">
      <div className="flex flex-wrap items-baseline gap-x-1.5 pr-3 sm:pr-4">
        <dt className="text-xs font-medium text-slate-600">{t('newToday')}</dt>
        <dd className="whitespace-nowrap text-lg/6 font-semibold tabular-nums text-brand">
          {format.number(stats.newToday)}
          <span className="text-xs font-medium">{t('listingUnit')}</span>
        </dd>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1.5 pl-3 sm:pl-4">
        <dt className="text-xs font-medium text-slate-600">{t('currentListings')}</dt>
        <dd className="whitespace-nowrap text-lg/6 font-semibold tabular-nums text-slate-900">
          {format.number(stats.currentListings)}
          <span className="text-xs font-medium">{t('listingUnit')}</span>
        </dd>
      </div>
    </dl>
  );
}
