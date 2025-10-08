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
  const [targetSchool, setTargetSchool] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [commuteTime, setCommuteTime] = useState<string>('');
  const [numBedrooms, setNumBedrooms] = useState<string>('');

  // Load from localStorage on mount, with URL taking precedence
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem('searchFilters');
      if (savedFilters) {
        const { targetSchool: lsSchool, maxPrice: lsPrice, commuteTime: lsCommute, numBedrooms: lsBedrooms } =
          JSON.parse(savedFilters) || {};

        const urlSchool = searchParams.get('university');
        const urlPrice = searchParams.get('priceMax');
        const urlCommute = searchParams.get('commuteMax');
        const urlBedroomsMax = searchParams.get('bedroomsMax');
        const urlBedroomsMin = searchParams.get('bedroomsMin');

        setTargetSchool(urlSchool || lsSchool || SCHOOL.UNSW);
        setMaxPrice(urlPrice || lsPrice || '');
        setCommuteTime(urlCommute || lsCommute || '');

        // 初始化卧室逻辑：优先 Max；否则用 Min（Min>=5 视为 '5'）；否则用 localStorage；否则空
        const initBedrooms =
          urlBedroomsMax ||
          (urlBedroomsMin && parseInt(urlBedroomsMin) >= 5 ? '5' : urlBedroomsMin) ||
          lsBedrooms ||
          '';
        setNumBedrooms(initBedrooms);
      } else {
        // 无 localStorage 时完全从 URL 推断；没有时落到默认
        const urlSchool = searchParams.get('university');
        const urlPrice = searchParams.get('priceMax');
        const urlCommute = searchParams.get('commuteMax');
        const urlBedroomsMax = searchParams.get('bedroomsMax');
        const urlBedroomsMin = searchParams.get('bedroomsMin');

        setTargetSchool(urlSchool || SCHOOL.UNSW);
        setMaxPrice(urlPrice || '');
        setCommuteTime(urlCommute || '');

        const initBedrooms =
          urlBedroomsMax ||
          (urlBedroomsMin && parseInt(urlBedroomsMin) >= 5 ? '5' : urlBedroomsMin) ||
          '';
        setNumBedrooms(initBedrooms);
      }
    } catch (error) {
      console.error('Failed to parse search filters from localStorage', error);

      // JSON 解析异常时：URL 优先，否则默认
      const urlSchool = searchParams.get('university');
      const urlPrice = searchParams.get('priceMax');
      const urlCommute = searchParams.get('commuteMax');
      const urlBedroomsMax = searchParams.get('bedroomsMax');
      const urlBedroomsMin = searchParams.get('bedroomsMin');

      setTargetSchool(urlSchool || SCHOOL.UNSW);
      setMaxPrice(urlPrice || '');
      setCommuteTime(urlCommute || '');

      const initBedrooms =
        urlBedroomsMax ||
        (urlBedroomsMin && parseInt(urlBedroomsMin) >= 5 ? '5' : urlBedroomsMin) ||
        '';
      setNumBedrooms(initBedrooms);
    }
    // 仅首挂载执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to localStorage whenever filters change
  useEffect(() => {
    const filters = { targetSchool, maxPrice, commuteTime, numBedrooms };
    localStorage.setItem('searchFilters', JSON.stringify(filters));
  }, [targetSchool, maxPrice, commuteTime, numBedrooms]);

  // URL params always take precedence: 每次 URL 变化都同步到状态（不会造成循环）
  useEffect(() => {
    const university = searchParams.get('university');
    const priceMax = searchParams.get('priceMax');
    const commuteMax = searchParams.get('commuteMax');
    const bedroomsMax = searchParams.get('bedroomsMax');
    const bedroomsMin = searchParams.get('bedroomsMin');

    if (university !== null) setTargetSchool(university || '');
    if (priceMax !== null) setMaxPrice(priceMax || '');
    if (commuteMax !== null) setCommuteTime(commuteMax || '');

    if (bedroomsMax !== null) {
      setNumBedrooms(bedroomsMax || '');
    } else if (bedroomsMin !== null) {
      if (bedroomsMin && parseInt(bedroomsMin) >= 5) setNumBedrooms('5');
      else setNumBedrooms(bedroomsMin || '');
    }
  }, [searchParams]);

  // 可访问性：URL 变化时把焦点移到结果标题
  useEffect(() => {
    const heading = document.getElementById('results-heading') as HTMLHeadingElement | null;
    if (heading) heading.focus();
  }, [searchParams]);

  // 统一的 URL 参数更新逻辑（Search 与 Filter 复用）
  const updateUrlParams = () => {
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, val: string) => {
      if (val && val.trim() !== '') params.set(key, val);
      else params.delete(key);
    };

    setOrDelete('university', targetSchool);
    setOrDelete('priceMax', maxPrice);
    setOrDelete('commuteMax', commuteTime);
    setOrDelete('bedroomsMin', numBedrooms);

    // “5+” 规则：<5 才写 Max；选择 5+ 时删除 Max
    if (numBedrooms && parseInt(numBedrooms) < 5) {
      params.set('bedroomsMax', numBedrooms);
    } else {
      params.delete('bedroomsMax');
    }

    return params;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = updateUrlParams();
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  const onFilterClick = () => {
    const params = updateUrlParams();
    params.set('filters', 'open');
    const href = pathname === '/search' ? `/search?${params.toString()}` : `${pathname}?${params.toString()}`;
    router.replace(href);
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
            onClick={onFilterClick}
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
