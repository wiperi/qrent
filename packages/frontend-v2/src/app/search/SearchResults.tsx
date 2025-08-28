'use client'

import PropertyCard from '@/components/PropertyCard'
import { HiSearch } from 'react-icons/hi'
import Link from 'next/link'
import { Suspense, useEffect, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTRPC } from '@/lib/trpc'
import { SCHOOL } from '@qrent/shared/enum'
import { useSearchParams } from 'next/navigation'

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
  areas?: string
}

export default function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const page = Number(searchParams.page ?? '1') || 1
  
  // Build search parameters from URL
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
      propertyType: searchParams.propertyType ? Number(searchParams.propertyType.split(',')[0]) : undefined,
      regions,
    }
  }, [searchParams, page])

  const trpc = useTRPC()
  const { mutate, data, isPending, error } = useMutation(trpc.properties.search.mutationOptions())

  useEffect(() => {
    mutate(searchFilters)
  }, [mutate, searchFilters])

  console.log('k2542', data)

  const properties = data?.properties || []
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
              query={searchParams.q || ''}
              isPending={isPending}
            />
          </aside>

          {/* Right: pagination + results */}
          <div className="lg:col-span-9">
            <h2 id="results-heading" tabIndex={-1} className="sr-only">Search results</h2>
            <div className="flex items-center justify-between">
              <Pagination current={page} totalPages={totalPages} />
            </div>

            <Suspense fallback={<ResultsSkeleton />}>
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
                      region={property.region}
                      price={property.price}
                      bedroomCount={property.bedroomCount}
                      bathroomCount={property.bathroomCount}
                      propertyType={property.propertyType}
                      descriptionEn={property.descriptionEn}
                      commuteTime={property.commuteTime}
                      url={property.url}
                    />
                  ))}
                </div>
              )}
            </Suspense>

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
  query, 
  isPending 
}: { 
  searchSummary: {
    totalCount: number
    filteredCount: number
    averagePrice: number
    averageCommuteTime: number
    topRegions: any[]
  }
  query: string
  isPending: boolean 
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">Search Results</div>
        {isPending ? (
          <div className="mt-1 h-8 bg-slate-200 rounded animate-pulse" />
        ) : (
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {searchSummary.filteredCount} of {searchSummary.totalCount}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">Average Price</div>
        {isPending ? (
          <div className="mt-1 h-6 bg-slate-200 rounded animate-pulse" />
        ) : (
          <div className="mt-1 text-lg font-semibold text-slate-900">
            ${Math.round(searchSummary.averagePrice)}/week
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">Average Commute</div>
        {isPending ? (
          <div className="mt-1 h-6 bg-slate-200 rounded animate-pulse" />
        ) : (
          <div className="mt-1 text-lg font-semibold text-slate-900">
            {Math.round(searchSummary.averageCommuteTime || 0)} minutes
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-800">Top Regions</div>
        {isPending ? (
          <div className="mt-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="mt-2 text-sm text-slate-600 space-y-1">
            {searchSummary.topRegions.slice(0, 5).map((region, i) => (
              <li key={i} className="flex justify-between">
                <span className="capitalize">{region.region?.replace('-', ' ')}</span>
                <span>{region.propertyCount} properties</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Pagination({ current, totalPages }: { current: number; totalPages: number }) {
  const prevPage = Math.max(1, current - 1)
  const nextPage = Math.min(totalPages, current + 1)

  const makeHref = (pageNum: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', String(pageNum))
    return `/search?${params.toString()}`
  }

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      <Link
        href={makeHref(prevPage)}
        aria-disabled={current === 1}
        className={`px-3 py-1.5 rounded-md border text-sm ${
          current === 1
            ? 'cursor-not-allowed border-slate-200 text-slate-300'
            : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
        }`}
      >
        Prev
      </Link>
      <span className="text-sm text-slate-600">
        Page <span className="font-medium text-slate-900">{current}</span> of {totalPages}
      </span>
      <Link
        href={makeHref(nextPage)}
        aria-disabled={current === totalPages}
        className={`px-3 py-1.5 rounded-md border text-sm ${
          current === totalPages
            ? 'cursor-not-allowed border-slate-200 text-slate-300'
            : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600'
        }`}
      >
        Next
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
  return (
    <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <HiSearch className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">No results</h3>
      <p className="mt-2 text-sm text-slate-600">
        {query ? (
          <>We couldn't find any results for "{query}". Try different keywords.</>
        ) : (
          <>Try adjusting your search filters to find properties.</>
        )}
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  )
}