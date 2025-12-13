'use client';

import { useState, useEffect, useMemo } from 'react';
import BlogPostCard from '@/components/BlogPostCard';
import { useCategory } from '@/components/CategoryContext';
import { LOCALE } from '@qrent/shared/enum';
import { type BlogPost as NotionBlogPost } from '@/lib/notion';

interface FilteredBlogListProps {
  posts: NotionBlogPost[];
  locale: string;
}

export default function FilteredBlogList({ posts, locale }: FilteredBlogListProps) {
  const { selectedCategories } = useCategory();
  const [displayPosts, setDisplayPosts] = useState<NotionBlogPost[]>([]);
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
        post.keywords.some((keyword:string) => keyword.toLowerCase() === category.toLowerCase())
      );
    });
  }, [posts, selectedCategories]);

  // 分页显示
  useEffect(() => {
    const startIndex = 0;
    const endIndex = currentPage * POSTS_PER_PAGE;
    setDisplayPosts(filteredPosts.slice(startIndex, endIndex));
  }, [filteredPosts, currentPage]);

  // 滚动加载更多
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
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

  const BLOG_IMAGE_URLS = ['/banner.jpg', '/qrent.jpg'];

  function getImageForSlug(slug: string): string {
    const index =
      slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % BLOG_IMAGE_URLS.length;
    return BLOG_IMAGE_URLS[index];
  }

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayPosts.map(post => (
          <BlogPostCard
            key={post.id}
            title={post.title}
            author={locale === LOCALE.ZH ? 'QRent 团队' : 'QRent Team'}
            date={new Date(post.published_at).toLocaleDateString(
              locale === LOCALE.ZH ? 'zh-CN' : 'en-US',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }
            )}
            preview={locale === LOCALE.ZH ? post.excerpt_zh : post.excerpt_en}
            imageUrl={post.cover_url || getImageForSlug(post.slug)}
            slug={`/blog/${post.slug}`}
          />
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

      {/* 已加载全部提示 */}
      {displayPosts.length >= filteredPosts.length && filteredPosts.length > 0 && (
        <div className="text-center py-4">
          <div className="text-gray-500">
            {locale === LOCALE.ZH ? '已加载全部文章' : 'All posts loaded'}
          </div>
        </div>
      )}
    </div>
  );
}