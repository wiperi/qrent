'use client';

import { HiSearch, HiAdjustments } from 'react-icons/hi';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function SearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    const qFromUrl = searchParams.get('q') || '';
    setValue(qFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const heading = document.getElementById('results-heading') as HTMLHeadingElement | null;
    if (heading) heading.focus();
  }, [searchParams]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('q', value);
    else params.delete('q');
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-200 p-2 md:p-3">
        <div className="flex flex-col gap-2 md:grid md:grid-cols-[1fr_auto_auto] md:items-center">
          <label htmlFor="search-input" className="sr-only">
            Search rentals
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <HiSearch className="h-5 w-5" />
            </span>
            <input
              id="search-input"
              name="q"
              value=""
              disabled
              placeholder="🤖 AI-powered search coming soon..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-slate-500 placeholder-slate-500 bg-slate-50 cursor-not-allowed opacity-75"
            />
            <div className="absolute inset-0 rounded-xl bg-slate-50/80 flex items-center justify-center pointer-events-none">
              <div className="bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1 rounded-lg text-sm font-medium text-center">
                🔧 Adding Features<br/>
                <span className="text-xs">Filter & Search still work!</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              if (pathname === '/search') {
                params.set('filters', 'open');
                router.replace(`/search?${params.toString()}`);
              } else {
                params.set('filters', 'open');
                const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
                router.replace(href);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 transition"
          >
            <HiAdjustments className="h-5 w-5" />
            Filter
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 transition"
          >
            <HiSearch className="h-5 w-5" />
            Search
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-600 text-center">
        Text input temporarily disabled while adding AI features. Use Filter or Search to browse
        properties.
      </p>
    </form>
  );

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-200 p-2 md:p-3">
        <div className="flex flex-col gap-2 md:grid md:grid-cols-[1fr_auto_auto] md:items-center">
          <label htmlFor="search-input" className="sr-only">
            Search rentals
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <HiSearch className="h-5 w-5" />
            </span>
            <input
              id="search-input"
              name="q"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter location, property type..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-slate-700 placeholder-slate-400 focus:border-brand focus:ring-brand focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              if (pathname === '/search') {
                // Open on search page by updating the same URL
                params.set('filters', 'open');
                router.replace(`/search?${params.toString()}`);
              } else {
                // Open modal on current page (landing) without navigating
                if (value) params.set('q', value);
                params.set('filters', 'open');
                const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
                router.replace(href);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600 transition"
          >
            <HiAdjustments className="h-5 w-5" />
            Filter
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 transition"
          >
            <HiSearch className="h-5 w-5" />
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
