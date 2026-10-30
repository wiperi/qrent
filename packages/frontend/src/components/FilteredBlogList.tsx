'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useCategory } from '@/components/CategoryContext';
import { LOCALE } from '@qrent/shared/enum';
import { type BlogPost as NotionBlogPost } from '@/lib/notion';

interface FilteredBlogListProps {
  posts: NotionBlogPost[];
  locale: string;
}

export default function FilteredBlogList({ posts, locale }: FilteredBlogListProps) {
  const { selectedCategories } = useCategory();
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 20;

  // 根据选择的分类筛选文章
  const filteredPosts = useMemo(() => {
    if (selectedCategories.length === 0) {
      return posts;
    }

    return posts.filter(post => {
      // 检查文章是否包含所有选择的分类（多选是AND关系）
      return selectedCategories.every(category =>
        post.keywords.some((keyword: string) => keyword.toLowerCase() === category.toLowerCase())
      );
    });
  }, [posts, selectedCategories]);

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
  }, [selectedCategories]);

  if (displayPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            {locale === LOCALE.ZH ? '暂无文章' : 'No Posts Found'}
          </h3>
          <p className="text-yellow-700 mb-4">
            {selectedCategories.length > 0
              ? locale === LOCALE.ZH
                ? '没有找到符合所选分类的文章，请尝试其他分类。'
                : 'No posts found matching the selected categories. Try different categories.'
              : locale === LOCALE.ZH
                ? '这可能是我们的问题，请联系我们的开发人员。'
                : 'This may be our problem, please contact our development team.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-t border-slate-200">
        {displayPosts.map(post => (
          <Link
            key={post.id}
            href={`/${locale}/blog/${post.slug}`}
            className="group block border-b border-slate-200 py-5 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <article>
              <h2 className="text-lg font-semibold leading-relaxed text-slate-900 group-hover:text-blue-700 group-hover:underline">
                {locale === LOCALE.ZH ? post.title : post.title_en}
              </h2>
              <p className="my-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-slate-600">
                {locale === LOCALE.ZH ? post.excerpt_zh : post.excerpt_en}
              </p>
              <time className="text-xs text-slate-500" dateTime={post.published_at}>
                {new Date(post.published_at).toLocaleDateString(
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
    </div>
  );
}
