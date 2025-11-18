'use client';

import React from 'react';
import { NotionBlock, NotionBlogPost } from '@/types/blog';
import { LOCALE } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { HiArrowLeft, HiCalendar, HiClock, HiTag } from 'react-icons/hi';
import NotionBlockRenderer from './NotionBlockRenderer';

interface NotionBlogContentProps {
  post: NotionBlogPost;
  blocks: NotionBlock[];
}

export default function NotionBlogContent({ post, blocks }: NotionBlogContentProps) {
  const locale = useLocale();
  const t = useTranslations('Blog');
  const [isExpanded, setIsExpanded] = useState(false);

  // 估算阅读时间（基于块数量）
  const estimateReadingTime = (blocks: NotionBlock[]): number => {
    const textBlocks = blocks.filter(block =>
      ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item'].includes(block.type)
    );
    // 假设每个文本块平均需要15秒阅读
    return Math.max(1, Math.ceil(textBlocks.length * 0.25));
  };

  const readingTime = estimateReadingTime(blocks);
  const displayTitle = locale === LOCALE.ZH ? post.title : post.title_en;
  const displayExcerpt = locale === LOCALE.ZH ? post.excerpt_zh : post.excerpt_en;

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat(
      locale === LOCALE.ZH ? 'zh-CN' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }
    );
    return formatter.format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <div className="mb-8">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center text-slate-600 hover:text-blue-600 transition-colors"
          >
            <HiArrowLeft className="w-4 h-4 mr-2" />
            {locale === LOCALE.ZH ? '返回博客列表' : 'Back to Blog'}
          </Link>
        </div>

        {/* 文章头部 */}
        <header className="mb-12">
          {/* 标题 */}
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            {displayTitle}
          </h1>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-6 text-slate-600 mb-6">
            <div className="flex items-center">
              <HiCalendar className="w-4 h-4 mr-2" />
              <time dateTime={post.published_at}>
                {formatDate(post.published_at)}
              </time>
            </div>

            <div className="flex items-center">
              <HiClock className="w-4 h-4 mr-2" />
              <span>
                {readingTime} {locale === LOCALE.ZH ? '分钟阅读' : 'min read'}
              </span>
            </div>

            <div className="flex items-center">
              <span className="text-slate-500">
                {t('author')}
              </span>
            </div>
          </div>

          {/* 关键词标签 */}
          {post.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <HiTag className="w-4 h-4 text-slate-500 mt-1" />
              {post.keywords.slice(0, isExpanded ? post.keywords.length : 5).map((keyword, index) => (
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
                    ? (locale === LOCALE.ZH ? '收起' : 'Show less')
                    : `+${post.keywords.length - 5} ${locale === LOCALE.ZH ? '更多' : 'more'}`
                  }
                </button>
              )}
            </div>
          )}

          {/* 摘要 */}
          {displayExcerpt && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <p className="text-slate-700 leading-relaxed italic">
                {displayExcerpt}
              </p>
            </div>
          )}
        </header>

        {/* 文章内容 */}
        <article className="prose prose-slate max-w-none">
          <div className="space-y-4">
            {blocks.map((block) => (
              <NotionBlockRenderer
                key={block.id}
                block={block}
                locale={locale}
              />
            ))}
          </div>
        </article>

        {/* 文章底部 */}
        <footer className="mt-12 pt-8 border-t border-slate-200">
          <div className="bg-slate-50 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {locale === LOCALE.ZH ? '喜欢这篇文章吗？' : 'Like this article?'}
              </h3>
              <p className="text-slate-600 mb-4">
                {locale === LOCALE.ZH
                  ? '访问 QRent.rent 获取更多澳洲租房信息和专业建议！'
                  : 'Visit QRent.rent for more Australian rental information and professional advice!'
                }
              </p>
              <Link
                href={`/${locale}`}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {locale === LOCALE.ZH ? '开始找房' : 'Start House Hunting'}
              </Link>
            </div>
          </div>
        </footer>

        {/* 返回顶部按钮 */}
        <div className="mt-8 text-center">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center text-slate-600 hover:text-blue-600 transition-colors"
          >
            <HiArrowLeft className="w-4 h-4 mr-2" />
            {locale === LOCALE.ZH ? '查看更多文章' : 'Read More Articles'}
          </Link>
        </div>
      </div>
    </div>
  );
}
