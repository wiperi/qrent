'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MdClose } from 'react-icons/md';
import { PROPERTY_TYPE } from '@qrent/shared/enum';

type Tag = { key: string; label: string; value: string };

export default function CurrentFiltersBar({ className = '' }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tm = useTranslations('FilterModal');

  const tags = useMemo<Tag[]>(() => {
    const p = searchParams;
    const read = (k: string) => p.get(k) ?? '';
    const has = (k: string) => {
      const v = p.get(k);
      return v !== null && v.trim() !== '' && v !== '0';
    };

    const list: Tag[] = [];

    if (has('propertyType')) {
      const type = Number(read('propertyType'));
      const map: Record<number, string> = {
        [PROPERTY_TYPE.House]: tm('house'),
        [PROPERTY_TYPE.Apartment]: tm('apartment'),
      };
      list.push({ key: 'propertyType', label: tm('propertyType'), value: map[type] ?? String(type) });
    }

    if (has('priceMin') || has('priceMax')) {
      const min = read('priceMin'), max = read('priceMax');
      const val = has('priceMin') && has('priceMax') ? `$${min} ~ $${max}` : has('priceMin') ? `≥$${min}` : `≤$${max}`;
      list.push({ key: 'price', label: tm('price'), value: val });
    }

    if (has('bedroomsMin') || has('bedroomsMax')) {
      const min = read('bedroomsMin'), max = read('bedroomsMax');
      const bedSuffix = tm('bedroomSuffix');
      const val = has('bedroomsMin') && has('bedroomsMax') ? `${min}~${max}${bedSuffix}` : has('bedroomsMin') ? `≥${min}${bedSuffix}` : `≤${max}${bedSuffix}`;
      list.push({ key: 'bedrooms', label: tm('bedrooms'), value: val });
    }

    if (has('bathroomsMin') || has('bathroomsMax')) {
      const min = read('bathroomsMin'), max = read('bathroomsMax');
      const bathSuffix = tm('bathroomSuffix');
      const val = has('bathroomsMin') && has('bathroomsMax') ? `${min}~${max}${bathSuffix}` : has('bathroomsMin') ? `≥${min}${bathSuffix}` : `≤${max}${bathSuffix}`;
      list.push({ key: 'bathrooms', label: tm('bathrooms'), value: val });
    }

    if (has('commuteMin') || has('commuteMax')) {
      const min = read('commuteMin'), max = read('commuteMax');
      const minutes = tm('minutes');
      const val = has('commuteMin') && has('commuteMax') ? `${min}~${max}${minutes}` : has('commuteMin') ? `≥${min}${minutes}` : `≤${max}${minutes}`;
      list.push({ key: 'commute', label: tm('commute'), value: val });
    }

    if (has('rating')) {
      const ratingValue = Number(read('rating'));
      if (ratingValue !== 13) {
        const ratingSuffix = tm('ratingSuffix');
        list.push({ key: 'rating', label: tm('rating'), value: `${read('rating')}${ratingSuffix}` });
      }
    }

    if (has('moveInDate')) {
      list.push({ key: 'moveInDate', label: tm('availableDate'), value: read('moveInDate').replace(/-/g, '.') });
    }

    const areas = (read('areas') || '').split(',').map(s => s.trim()).filter(Boolean);
    if (areas.length > 0) {
      areas.forEach((area, index) => {
        const displayValue = area.replace('-', ' ');
        list.push({ 
          key: `area:${area}`, 
          label: index === 0 ? tm('location') : '', 
          value: displayValue 
        });
      });
    }

    return list;
  }, [searchParams, tm]);

  const buildHref = (params: URLSearchParams) => { 
    params.set('page', '1'); 
    return `${pathname}?${params.toString()}`; 
  };

  const removeOne = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'price') { 
      params.delete('priceMin'); 
      params.delete('priceMax'); 
    } else if (key === 'bedrooms') { 
      params.delete('bedroomsMin'); 
      params.delete('bedroomsMax'); 
    } else if (key === 'bathrooms') { 
      params.delete('bathroomsMin'); 
      params.delete('bathroomsMax'); 
    } else if (key === 'commute') { 
      params.delete('commuteMin'); 
      params.delete('commuteMax'); 
    } else if (key === 'moveInDate') { 
      params.delete('moveInDate'); 
    } else if (key === 'propertyType' || key === 'rating' || key === 'university') { 
      params.delete(key); 
    } else if (key.startsWith('area:')) {
      const name = key.slice(5);
      const left = (params.get('areas') || '').split(',').map(s => s.trim()).filter(Boolean).filter(a => a !== name);
      if (left.length) {
        params.set('areas', left.join(','));
      } else {
        params.delete('areas');
      }
    }
    router.push(buildHref(params));
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    ['university','propertyType','priceMin','priceMax','bedroomsMin','bedroomsMax','bathroomsMin','bathroomsMax','commuteMin','commuteMax','rating','moveInDate','areas'].forEach(k => params.delete(k));
    router.push(buildHref(params));
  };

  if (tags.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow">
      <div className={`flex items-center flex-wrap gap-3 gap-y-2 ${className}`}>
        <span className="text-sm font-medium text-slate-700 whitespace-nowrap select-none">{tm('currentFilters')}</span>

        {tags.map(tag => (
          <div
            key={tag.key}
            className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 text-sm select-none cursor-default"
          >
            {tag.label && <span className="font-medium mr-1">{tag.label}:</span>}
            <span>{tag.value}</span>
            <button
              type="button"
              aria-label="remove filter"
              title={tm('clearAllFilters')}
              onClick={() => removeOne(tag.key)}
              className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-blue-200 focus:outline-none"
            >
              <MdClose className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button
          onClick={clearAll}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap ml-1"
        >
          {tm('clearAllFilters')}
        </button>
      </div>
    </div>
  );
}