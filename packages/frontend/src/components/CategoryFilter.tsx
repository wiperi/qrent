'use client';

import { useCategory } from '@/components/CategoryContext';
import { LOCALE } from '@qrent/shared/enum';

interface CategoryFilterProps {
  categories: string[];
  locale: string;
}

export default function CategoryFilter({ categories, locale }: CategoryFilterProps) {
  const { selectedCategories, toggleCategory, setSelectedCategories } = useCategory();

  const handleCategoryClick = (category: string) => {
    if (category === '全部') {
      // 选择"全部"时清空其他选择
      setSelectedCategories([]);
    } else {
      toggleCategory(category);
    }
  };

  const isAllSelected = selectedCategories.length === 0;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">
        {locale === LOCALE.ZH ? '分类筛选' : 'Category Filter'}
      </h3>
      <div className="flex flex-wrap gap-2">
        {/* 全部按钮 */}
        <button
          onClick={() => handleCategoryClick('全部')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            isAllSelected
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {locale === LOCALE.ZH ? '全部' : 'All'}
        </button>

        {/* 分类按钮 */}
        {categories.map(category => {
          const isSelected = selectedCategories.includes(category);
          return (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* 已选择的分类显示 */}
      {selectedCategories.length > 0 && (
        <div className="mt-3 text-sm text-gray-600">
          {locale === LOCALE.ZH ? '已选择: ' : 'Selected: '}
          <span className="font-medium">
            {selectedCategories.join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}