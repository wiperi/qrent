'use client';

import { HiSearch, HiAdjustments } from 'react-icons/hi';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SCHOOL } from '@qrent/shared/enum';

const BEDROOM_OPTIONS = [
  { value: '', label: 'Any bedrooms' },
  { value: '1', label: '1 bedroom' },
  { value: '2', label: '2 bedrooms' },
  { value: '3', label: '3 bedrooms' },
  { value: '4', label: '4 bedrooms' },
  { value: '5', label: '5+ bedrooms' },
] as const;

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // First-level filter states
  const [targetSchool, setTargetSchool] = useState<string>('UNSW');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [commuteTime, setCommuteTime] = useState<string>('');
  const [numBedrooms, setNumBedrooms] = useState<string>('');

  // Initialize first-level filters from URL parameters
  useEffect(() => {
    setTargetSchool(searchParams.get('university') || 'UNSW');
    setMaxPrice(searchParams.get('priceMax') || '');
    setCommuteTime(searchParams.get('commuteMax') || '');
    setNumBedrooms(searchParams.get('bedroomsMax') || '');
  }, [searchParams]);

  useEffect(() => {
    const heading = document.getElementById('results-heading') as HTMLHeadingElement | null;
    if (heading) heading.focus();
  }, [searchParams]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    // Set first-level filter parameters
    const setOrDelete = (key: string, val: string) => {
      if (val && val.trim() !== '') params.set(key, val);
      else params.delete(key);
    };

    setOrDelete('university', targetSchool);
    setOrDelete('priceMax', maxPrice);
    setOrDelete('commuteMax', commuteTime);
    setOrDelete('bedroomsMin', numBedrooms);
    
    if (parseInt(numBedrooms) < 5) {
      setOrDelete('bedroomsMax', numBedrooms);
    }

    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-200 p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
          {/* Target School */}
          <div className="flex flex-col flex-1">
            <label
              htmlFor="target-school"
              className="text-xs font-medium text-slate-700 mb-1 h-4 flex items-center"
            >
              Target School
            </label>
            <select
              id="target-school"
              value={targetSchool}
              onChange={e => setTargetSchool(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-9"
            >
              {Object.values(SCHOOL).map(school => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>

          {/* Max Price */}
          <div className="flex flex-col flex-1">
            <label
              htmlFor="max-price"
              className="text-xs font-medium text-slate-700 mb-1 h-4 flex items-center"
            >
              Max Price ($/week)
            </label>
            <input
              id="max-price"
              type="number"
              min="0"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Any"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-9"
            />
          </div>

          {/* Commute Time */}
          <div className="flex flex-col flex-1">
            <label
              htmlFor="commute-time"
              className="text-xs font-medium text-slate-700 mb-1 h-4 flex items-center"
            >
              Max Commute (min)
            </label>
            <input
              id="commute-time"
              type="number"
              min="0"
              value={commuteTime}
              onChange={e => setCommuteTime(e.target.value)}
              placeholder="Any"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-9"
            />
          </div>

          {/* Number of Bedrooms */}
          <div className="flex flex-col flex-1">
            <label
              htmlFor="num-bedrooms"
              className="text-xs font-medium text-slate-700 mb-1 h-4 flex items-center"
            >
              Bedrooms
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

              // Set first-level filter values before opening modal
              const setOrDelete = (key: string, val: string) => {
                if (val && val.trim() !== '') params.set(key, val);
                else params.delete(key);
              };

              setOrDelete('university', targetSchool);
              setOrDelete('priceMax', maxPrice);
              setOrDelete('commuteMax', commuteTime);
              setOrDelete('bedroomsMax', numBedrooms);

              if (pathname === '/search') {
                params.set('filters', 'open');
                router.replace(`/search?${params.toString()}`);
              } else {
                params.set('filters', 'open');
                const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
                router.replace(href);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 transition flex-shrink-0"
          >
            <HiAdjustments className="h-4 w-4" />
            Filter
          </button>

          {/* Search Button */}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition flex-shrink-0"
          >
            <HiSearch className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
