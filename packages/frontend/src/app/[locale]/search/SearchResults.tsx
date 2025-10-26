
'use client';

import PropertyCard from '@/components/PropertyCard';
import { useTRPCClient } from '@/lib/trpc';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { HiSearch } from 'react-icons/hi';

type SearchParams = {
  q?: string
  page?: string
  university?: string
  propertyType?: string
  priceMin?: string
  priceMax?: string
  bedroomsMin?: string
  bedroomsMax?: string
  bathroomsMin?: string
  bathroomsMax?: string
  commuteMin?: string
  commuteMax?: string
  rating?: string
  moveInDate?: string
  areas?: string
}

type Property = {
  id: number
  address: string
  region: string | null
  price: number
  bedroomCount?: number
  bathroomCount?: number
  propertyType: number
  description?: string | null
  commuteTime?: number | null
  url: string
  averageScore: number
  keywords: string
  availableDate?: string | null
  createdAt: string
}

export default function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const page = Number(searchParams.page ?? '1') || 1

  // Build search parameters from URL - aligned with backend preferenceSchema
  const searchFilters = useMemo(() => {
    const university = searchParams.university || 'UNSW'
    const regions = searchParams.areas ? searchParams.areas.split(',').filter(Boolean).join(' ') : undefined

    return {
      targetSchool: university,
      page,
      pageSize: 12,
      minPrice: searchParams.priceMin ? Number(searchParams.priceMin) : undefined,
      maxPrice: searchParams.priceMax ? Number(searchParams.priceMax) : undefined,
      minBedrooms: searchParams.bedroomsMin ? Number(searchParams.bedroomsMin) : undefined,
      maxBedrooms: searchParams.bedroomsMax ? Number(searchParams.bedroomsMax) : undefined,
      minBathrooms: searchParams.bathroomsMin ? Number(searchParams.bathroomsMin) : undefined,
      maxBathrooms: searchParams.bathroomsMax ? Number(searchParams.bathroomsMax) : undefined,
      minCommuteTime: searchParams.commuteMin ? Number(searchParams.commuteMin) : undefined,
      maxCommuteTime: searchParams.commuteMax ? Number(searchParams.commuteMax) : undefined,
      minRating: searchParams.rating ? Number(searchParams.rating) : undefined,
      propertyType: searchParams.propertyType ? Number(searchParams.propertyType) : undefined,
      regions,
      moveInDate: searchParams.moveInDate ? (() => {
        const dateStr = searchParams.moveInDate;
        // Ensure the date string is in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          // Send as ISO string - backend will handle the conversion
          return dateStr + 'T00:00:00.000Z' as Date | string;
        }
        return undefined;
      })() : undefined,
      orderBy: [{
        averageScore: 'desc' as const,
      }]
    }
  }, [searchParams, page])

  const trpc = useTRPCClient()

  const { data, isPending, error } = useQuery({
    queryKey: ['properties.search', searchFilters],
    queryFn: () => trpc.properties.search.query(searchFilters)
  })

  const properties: Property[] = data?.properties || []
  const searchSummary = {
    totalCount: data?.totalCount || 0,
    filteredCount: data?.filteredCount || 0,
    averagePrice: data?.averagePrice || 0,
    averageCommuteTime: data?.averageCommuteTime || 0,
    topRegions: data?.topRegions || []
  }

  const totalPages = Math.max(1, Math.ceil(searchSummary.filteredCount / 12))

  return (
    <section className="pb-12 md:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left: stats/info */}
          <aside className="lg:col-span-3">
            <StatsPanel
              searchSummary={searchSummary}
              isPending={isPending}
            />
          </aside>

          {/* Right: pagination + results */}
          <div className="lg:col-span-9">
            <h2 id="results-heading" tabIndex={-1} className="sr-only">Search results</h2>
            <div className="flex items-center justify-between">
              <Pagination current={page} totalPages={totalPages} />
            </div>

            {/* 注意：如果 useQuery 不支持 suspense 这里写 Suspense 会报错，可以直接移除 Suspense 包裹 */}
            {isPending ? (
              <ResultsSkeleton />
            ) : error ? (
              <div className="mt-6 text-center py-8">
                <p className="text-slate-600">Unable to load properties. Please try again later.</p>
              </div>
            ) : properties.length === 0 ? (
              <EmptyState query={searchParams.q || ''} />
            ) : (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map(property => (
                  <PropertyCard
                    key={property.id}
                    address={property.address}
                    region={property.region || ''}
                    price={property.price}
                    bedroomCount={property.bedroomCount}
                    bathroomCount={property.bathroomCount}
                    propertyType={property.propertyType}
                    commuteTime={property.commuteTime ?? undefined}
                    url={property.url}
                    averageScore={property.averageScore}
                    keywords={property.keywords}
                    availableDate={property.availableDate}
                    createdAt={property.createdAt}
                  />
                ))}
              </div>
            )}

            <div className="mt-6">
              <Pagination current={page} totalPages={totalPages} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatsPanel({
  searchSummary,
  isPending
}: {
  searchSummary: {
    totalCount: number
    filteredCount: number
    averagePrice: number
    averageCommuteTime: number
    topRegions: { region: string | null; propertyCount: number; averagePrice: number; averageCommuteTime: number }[]
  }
  isPending: boolean
}) {
  const t = useTranslations('SearchResults');
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">{t('searchResults')}</div>
        {isPending ? (
          <div className="mt-1 h-8 bg-slate-200 rounded animate-pulse" />
        ) : (
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {searchSummary.filteredCount} of {searchSummary.totalCount}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">{t('averagePrice')}</div>
        {isPending ? (
          <div className="mt-1 h-6 bg-slate-200 rounded animate-pulse" />
        ) : (
          <div className="mt-1 text-lg font-semibold text-slate-900">
            ${Math.round(searchSummary.averagePrice)}{t('perWeek')}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">{t('averageCommute')}</div>
        {isPending ? (
          <div className="mt-1 h-6 bg-slate-200 rounded animate-pulse" />
        ) : (
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {Math.round(searchSummary.averageCommuteTime || 0)} {t('minutes')}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-800">{t('topRegions')}</div>
        {isPending ? (
          <div className="mt-2 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 bg-slate-200 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {searchSummary.topRegions.slice(0, 5).map((region, i) => (
              <div key={i} className="border-l-2 border-blue-200 pl-3">
                <div className="font-medium text-slate-800 capitalize text-sm">
                  {region.region?.replace(/-/g, ' ') || 'Unknown'}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="font-medium">{region.propertyCount}</span>
                    <span className="block text-slate-500">{t('properties')}</span>
                  </div>
                  <div>
                    <span className="font-medium">${Math.round(region.averagePrice)}</span>
                    <span className="block text-slate-500">{t('avgWeek')}</span>
                  </div>
                  <div>
                    <span className="font-medium">{Math.round(region.averageCommuteTime)} min</span>
                    <span className="block text-slate-500">{t('commute')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Pagination({ current, totalPages }: { current: number; totalPages: number }) {
  const searchParams = useSearchParams()
  const locale = useLocale()
  const t = useTranslations('SearchResults')
  const prevPage = Math.max(1, current - 1)
  const nextPage = Math.min(totalPages, current + 1)

  const makeHref = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pageNum))
    // Remove modal state parameter to prevent modal from opening on pagination
    params.delete('filters')
    return `/${locale}/search?${params.toString()}`
  }

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      <Link
        href={makeHref(prevPage)}
        aria-disabled={current === 1}
        className={`px-3 py-1.5 rounded-md border text-sm ${current === 1
          ? 'cursor-not-allowed border-slate-200 text-slate-300'
          : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
          }`}
      >
        {t('prev')}
      </Link>
      <span className="text-sm text-slate-600">
        {t('page')} <span className="font-medium text-slate-900">{current}</span> {t('of')} {totalPages}
      </span>
      <Link
        href={makeHref(nextPage)}
        aria-disabled={current === totalPages}
        className={`px-3 py-1.5 rounded-md border text-sm ${current === totalPages
          ? 'cursor-not-allowed border-slate-200 text-slate-300'
          : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
          }`}
      >
        {t('next')}
      </Link>
    </nav>
  )
}

function ResultsSkeleton() {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="p-4 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-200 rounded w-full" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  const t = useTranslations('SearchResults')
  const locale = useLocale()

  return (
    <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <HiSearch className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{t('noResults')}</h3>
      <p className="mt-2 text-sm text-slate-600">
        {query ? (
          <>{t('noResultsForQuery', { query })}</>
        ) : (
          <>{t('adjustFilters')}</>
        )}
      </p>
      <div className="mt-6">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
        >
          {t('goToHomepage')}
        </Link>
      </div>
    </div>
  )
}