'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useCategory } from '@/components/CategoryContext';
import { LOCALE } from '@qrent/shared/enum';
import type { GuideIndexEntry } from '@/lib/guide-index';
import { filterGuideIndex } from '@/lib/guide-index-search';

interface FilteredBlogListProps {
  entries: GuideIndexEntry[];
  locale: string;
}

export default function FilteredBlogList({ entries, locale }: FilteredBlogListProps) {
  const { query, setQuery, selectedCategories, clearCategories } = useCategory();
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 20;

  const filteredPosts = useMemo(
    () => filterGuideIndex(entries, query, selectedCategories),
    [entries, query, selectedCategories]
  );
  const zh = locale === LOCALE.ZH;
  const resetFilters = () => {
    setQuery('');
    clearCategories();
  };

  // Derive the first page during SSR so crawlers and no-JS users see articles.
  const displayPosts = useMemo(
    () => filteredPosts.slice(0, currentPage * POSTS_PER_PAGE),
    [filteredPosts, currentPage]
  );

  // 滚动加载更多
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        if (displayPosts.length < filteredPosts.length) {
          setCurrentPage(prev => prev + 1);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayPosts.length, filteredPosts.length]);

  // 当筛选条件改变时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCategories]);

  if (displayPosts.length === 0) {
    return (
      <section
        id="blog-results"
        className="border-t border-slate-200 py-8 text-sm leading-relaxed text-slate-600"
        aria-label={zh ? '攻略列表' : 'Guide list'}
      >
        <p role="status">{zh ? '找到 0 篇攻略' : '0 guides found'}</p>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          {zh ? '未找到相关攻略' : 'No matching guides'}
        </h2>
        <p>
          {zh
            ? '可以换个关键词，或清除筛选后浏览全部攻略。'
            : 'Try another keyword, or clear the filters to browse every guide.'}
        </p>
        <button
          className="min-h-11 cursor-pointer text-blue-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-blue-600"
          type="button"
          onClick={resetFilters}
        >
          {zh ? '清除筛选' : 'Clear filters'}
        </button>
      </section>
    );
  }

  return (
    <section id="blog-results" className="space-y-6" aria-label={zh ? '攻略列表' : 'Guide list'}>
      <p role="status" className="mb-3 text-sm leading-relaxed text-slate-600">
        {zh
          ? `找到 ${filteredPosts.length} 篇攻略`
          : `${filteredPosts.length} guide${filteredPosts.length === 1 ? '' : 's'} found`}
      </p>
      <div className="border-t border-slate-200">
        {displayPosts.map(post => (
          <Link
            key={post.id}
            href={post.path}
            className="group block border-b border-slate-200 py-5 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <article>
              <h2 className="text-lg font-semibold leading-relaxed text-slate-900 group-hover:text-blue-700 group-hover:underline">
                {post.title}
              </h2>
              <p className="my-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-slate-600">
                {post.excerpt}
              </p>
              <time className="text-xs text-slate-500" dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString(
                  locale === LOCALE.ZH ? 'zh-CN' : 'en-AU',
                  { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Australia/Sydney' }
                )}
              </time>
            </article>
          </Link>
        ))}
      </div>

      {/* 加载更多提示 */}
      {displayPosts.length < filteredPosts.length && (
        <div className="text-center py-4">
          <div className="text-gray-500">
            {locale === LOCALE.ZH ? '滚动加载更多文章...' : 'Scroll to load more posts...'}
          </div>
        </div>
      )}
    </section>
  );
}
