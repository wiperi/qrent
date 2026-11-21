'use client';

import { SCHOOL } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { HiAdjustments, HiSearch } from 'react-icons/hi';

// BEDROOM_OPTIONS will be created inside the component to use translations

export default function SearchBar({
  schoolOptions = Object.values(SCHOOL),
}: {
  schoolOptions?: readonly SCHOOL[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('SearchBar');
  const [isNavigating, startSearch] = useTransition();

  // Create bedroom options with translations
  const BEDROOM_OPTIONS = [
    { value: '', label: t('anyBedrooms') },
    { value: '1', label: t('oneBedroom') },
    { value: '2', label: t('twoBedrooms') },
    { value: '3', label: t('threeBedrooms') },
    { value: '4', label: t('fourBedrooms') },
    { value: '5', label: t('fivePlusBedrooms') },
  ] as const;

  // First-level filter states
  const [address, setAddress] = useState('');
  const [targetSchool, setTargetSchool] = useState<string>('UNSW');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [commuteTime, setCommuteTime] = useState<string>('');
  const [numBedrooms, setNumBedrooms] = useState<string>('');

  // Initialize first-level filters from URL parameters
  useEffect(() => {
    setAddress(searchParams.get('q')?.slice(0, 120) || '');
    setTargetSchool(searchParams.get('university') || 'UNSW');
    setMaxPrice(searchParams.get('priceMax') || '');
    setCommuteTime(searchParams.get('commuteMax') || '');
    setNumBedrooms(searchParams.get('bedroomsMin') || '');
  }, [searchParams]);

  useEffect(() => {
    const heading = document.getElementById('results-heading') as HTMLHeadingElement | null;
    if (heading) heading.focus({ preventScroll: true });
  }, [searchParams]);

  // Helper function to update search params with filter values
  const updateSearchParamsWithFilters = (params: URLSearchParams) => {
    const setOrDelete = (key: string, val: string) => {
      if (val && val.trim() !== '') params.set(key, val);
      else params.delete(key);
    };

    setOrDelete('q', address.trim());
    setOrDelete('university', targetSchool);
    setOrDelete('priceMax', maxPrice);
    setOrDelete('commuteMax', commuteTime);
    if (numBedrooms !== (searchParams.get('bedroomsMin') || '')) {
      setOrDelete('bedroomsMin', numBedrooms);
      setOrDelete('bedroomsMax', numBedrooms && parseInt(numBedrooms) < 5 ? numBedrooms : '');
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNavigating) return;

    const params = new URLSearchParams(searchParams.toString());
    updateSearchParamsWithFilters(params);
    params.set('page', '1');
    const mobileSearchPath = `/${locale}/search/mobile`;
    const searchPath = pathname === mobileSearchPath ? mobileSearchPath : `/${locale}/search`;
    startSearch(() => router.push(`${searchPath}?${params.toString()}`));
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-200 p-4 md:p-5">
        <div className="mb-4">
          <label
            htmlFor="property-address"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            {t('addressLabel')}
          </label>
          <div className="relative">
            <HiSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="property-address"
              type="search"
              value={address}
              onChange={event => setAddress(event.target.value)}
              maxLength={120}
              autoComplete="off"
              placeholder={t('addressPlaceholder')}
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          {/* Target School */}
          <div className="flex flex-col flex-1">
            <label
              htmlFor="target-school"
              className="text-xs font-medium text-slate-700 mb-1 h-4 flex items-center"
            >
              {t('targetSchool')}
            </label>
            <select
              id="target-school"
              value={targetSchool}
              onChange={e => setTargetSchool(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-9"
            >
              {schoolOptions.map(school => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>

          {/* Max Price */}
          <div className="flex flex-col flex-1 min-w-0">
            <label
              htmlFor="max-price"
              className="text-xs font-medium text-slate-700 mb-1 h-4 flex items-center"
            >
              {t('maxPrice')}
            </label>
            <input
              id="max-price"
              type="number"
              min="0"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder={t('anyPlaceholder')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-9 w-full"
            />
          </div>

          {/* Commute Time */}
          <div className="flex flex-col flex-1 min-w-0">
            <label
              htmlFor="commute-time"
              className="text-xs font-medium text-slate-700 mb-1 h-4 flex items-center"
            >
              {t('maxCommute')}
            </label>
            <input
              id="commute-time"
              type="number"
              min="0"
              value={commuteTime}
              onChange={e => setCommuteTime(e.target.value)}
              placeholder={t('anyPlaceholder')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-9 w-full"
            />
          </div>

          {/* Number of Bedrooms */}
          <div className="flex flex-col flex-1 min-w-0">
            <label
              htmlFor="num-bedrooms"
              className="text-xs font-medium text-slate-700 mb-1 h-4 flex items-center"
            >
              {t('bedrooms')}
            </label>
            <select
              id="num-bedrooms"
              value={numBedrooms}
              onChange={e => setNumBedrooms(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-9"
            >
              {BEDROOM_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              updateSearchParamsWithFilters(params);

              if (pathname === `/${locale}/search`) {
                params.set('filters', 'open');
                router.replace(`/${locale}/search?${params.toString()}`);
              } else {
                params.set('filters', 'open');
                const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
                router.replace(href);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 transition flex-shrink-0"
          >
            <HiAdjustments className="h-4 w-4" />
            {t('filters')}
          </button>

          {/* Search Button */}
          <button
            type="submit"
            disabled={isNavigating}
            className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-700 flex-shrink-0"
          >
            {isNavigating ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
              />
            ) : (
              <HiSearch aria-hidden="true" className="h-4 w-4" />
            )}
            {t(isNavigating ? 'searching' : 'searchButton')}
          </button>
        </div>
      </div>
    </form>
  );
}
