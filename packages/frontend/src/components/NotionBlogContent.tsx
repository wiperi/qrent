'use client';

import { NotionBlock, NotionBlogPost } from '@/types/blog';
import { LOCALE } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { HiArrowLeft, HiCalendar, HiTag } from 'react-icons/hi';
import BlogPostCard from './BlogPostCard';
import NotionBlockRenderer from './NotionBlockRenderer';

interface NotionBlogContentProps {
  post: NotionBlogPost;
  blocks: NotionBlock[];
  relatedPosts?: NotionBlogPost[];
}

export default function NotionBlogContent({
  post,
  blocks,
  relatedPosts = [],
}: NotionBlogContentProps) {
  const locale = useLocale();
  const t = useTranslations('Blog');
  const [isExpanded, setIsExpanded] = useState(false);

  const displayTitle = locale === LOCALE.ZH ? post.title : post.title_en;
  const displayExcerpt = locale === LOCALE.ZH ? post.excerpt_zh : post.excerpt_en;

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat(locale === LOCALE.ZH ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Australia/Sydney',
    });
    return formatter.format(date);
  };

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 文章头部 */}
        <header className="mb-8">
          {/* 标题 */}
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-5 leading-snug">
            {displayTitle}
          </h1>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-6 text-slate-600 mb-6">
            <div className="flex items-center">
              <HiCalendar className="w-4 h-4 mr-2" />
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            </div>

            <div className="flex items-center">
              <span className="text-slate-500">{t('author')}</span>
            </div>
          </div>

          {/* 关键词标签 */}
          {post.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <HiTag className="w-4 h-4 text-slate-500 mt-1" />
              {post.keywords
                .slice(0, isExpanded ? post.keywords.length : 5)
                .map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              {post.keywords.length > 5 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                >
                  {isExpanded
                    ? locale === LOCALE.ZH
                      ? '收起'
                      : 'Show less'
                    : `+${post.keywords.length - 5} ${locale === LOCALE.ZH ? '更多' : 'more'}`}
                </button>
              )}
            </div>
          )}

          {/* 摘要 */}
          {displayExcerpt && (
            <div className="border-t border-slate-200 pt-5">
              <p className="text-slate-600 leading-relaxed">{displayExcerpt}</p>
            </div>
          )}
        </header>

        {/* 文章内容 */}
        <article className="prose prose-slate max-w-none">
          <div className="space-y-4">
            {blocks.map(block => (
              <NotionBlockRenderer key={block.id} block={block} locale={locale} />
            ))}
          </div>
        </article>

        {/* 相关文章推荐 */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              {locale === LOCALE.ZH ? '相关阅读' : 'Recommended for you'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map(post => (
                <BlogPostCard
                  key={post.id}
                  title={locale === LOCALE.ZH ? post.title : post.title_en}
                  author="Qrent Team"
                  date={formatDate(post.published_at)}
                  preview={locale === LOCALE.ZH ? post.excerpt_zh : post.excerpt_en}
                  imageUrl={post.cover_url || '/banner.jpg'}
                  slug={`/blog/${post.slug}`}
                />
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 flex flex-wrap gap-6 border-t border-slate-200 py-6 text-sm text-blue-700">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex min-h-11 items-center hover:underline"
          >
            {locale === LOCALE.ZH ? '返回全部攻略' : 'All rental guides'}
          </Link>
          <Link href={`/${locale}`} className="inline-flex min-h-11 items-center hover:underline">
            {locale === LOCALE.ZH ? '开始找房' : 'Find a rental'}
          </Link>
        </footer>
      </div>
    </div>
  );
}
