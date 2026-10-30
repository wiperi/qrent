'use client';

import { useId } from 'react';
import { useCategory } from '@/components/CategoryContext';

export default function CategoryFilter({
  categories,
  locale,
}: {
  categories: string[];
  locale: string;
}) {
  const { selectedCategories, setSelectedCategories } = useCategory();
  const id = useId();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label htmlFor={id} className="text-sm text-slate-600">
        {locale === 'zh' ? '按主题筛选' : 'Filter by topic'}
      </label>
      <select
        id={id}
        value={selectedCategories[0] ?? ''}
        onChange={event => setSelectedCategories(event.target.value ? [event.target.value] : [])}
        className="min-h-11 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <option value="">{locale === 'zh' ? '全部主题' : 'All topics'}</option>
        {categories.map(category => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
}
