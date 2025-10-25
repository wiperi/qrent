'use client';

import { LOCALE } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { HiArrowLeft, HiCalendar, HiClock, HiTag } from 'react-icons/hi';

interface BlogPost {
  slug: string;
  title: string;
  titleEn: string;
  datePublished: string;
  keywords: string[];
  schema: Record<string, unknown>;
  content: string;
  excerpt: string;
}

interface BlogPostContentProps {
  post: BlogPost;
}

export default function BlogPostContent({ post }: BlogPostContentProps) {
  const locale = useLocale();
  const t = useTranslations('Blog');
  const [isExpanded, setIsExpanded] = useState(false);

  // 估算阅读时间（基于中文字符数和英文单词数）
  const estimateReadingTime = (content: string): number => {
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = content.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(word => word.length > 0).length;

    // 中文：300字/分钟，英文：200词/分钟
    const chineseTime = chineseChars / 300;
    const englishTime = englishWords / 200;

    return Math.max(1, Math.ceil(chineseTime + englishTime));
  };

  const readingTime = estimateReadingTime(post.content);
  const displayTitle = locale === LOCALE.ZH ? post.title : post.titleEn;

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === LOCALE.ZH ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 根据语言过滤内容
  const filterContentByLanguage = (content: string, locale: string): string => {
    const lines = content.split('\n');
    const filteredLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 空行总是保留
      if (!line.trim()) {
        filteredLines.push(line);
        continue;
      }

      // 检测标题
      const isTitle = /^#+\s/.test(line);
      if (isTitle) {
        const hasChineseChars = /[\u4e00-\u9fff]/.test(line);
        const hasEnglishChars = /[A-Za-z]/.test(line);

        if (locale === LOCALE.ZH) {
          // 中文模式：只显示包含中文字符的标题
          if (hasChineseChars) {
            filteredLines.push(line);
          }
        } else {
          // 英文模式：只显示包含英文字符且不包含中文的标题
          if (hasEnglishChars && !hasChineseChars) {
            filteredLines.push(line);
          }
        }
        continue;
      }

      // 检测段落内容
      const hasChineseChars = /[\u4e00-\u9fff]/.test(line);
      const hasEnglishChars = /[A-Za-z]/.test(line);

      if (locale === LOCALE.ZH) {
        // 中文模式：只显示包含中文字符的内容
        if (hasChineseChars) {
          filteredLines.push(line);
        } else if (!hasEnglishChars) {
          // 保留不包含任何语言字符的行（如符号、数字等）
          filteredLines.push(line);
        }
        // 跳过纯英文内容
      } else {
        // 英文模式：只显示包含英文字符且不包含中文的内容
        if (hasEnglishChars && !hasChineseChars) {
          filteredLines.push(line);
        } else if (!hasChineseChars && !hasEnglishChars) {
          // 保留不包含任何语言字符的行（如符号、数字等）
          filteredLines.push(line);
        }
        // 跳过包含中文的内容
      }
    }

    return filteredLines.join('\n');
  };

  // 将Markdown内容转换为HTML（简单版本）
  const formatContent = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-slate-900 mb-6 mt-8">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-slate-800 mb-4 mt-6">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-slate-800 mb-3 mt-4">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 class="text-lg font-semibold text-slate-700 mb-2 mt-3">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="mb-1">$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li class="mb-1">$2</li>')
      .replace(/\n\n/g, '</p><p class="text-slate-700 leading-relaxed mb-4">')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center text-slate-600 hover:text-blue-600 transition-colors"
          >
            <HiArrowLeft className="w-4 h-4 mr-2" />
            {locale === LOCALE.ZH ? '返回博客' : 'Back to Blog'}
          </Link>
        </div>

        {/* 文章头部 */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            {displayTitle}
          </h1>

          {/* 文章元信息 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-6">
            <div className="flex items-center">
              <HiCalendar className="w-4 h-4 mr-1" />
              <span>{formatDate(post.datePublished)}</span>
            </div>

            <div className="flex items-center">
              <HiClock className="w-4 h-4 mr-1" />
              <span>
                {readingTime} {locale === LOCALE.ZH ? '分钟阅读' : 'min read'}
              </span>
            </div>

            <div className="flex items-center">
              <span className="text-slate-500">by</span>
              <span className="ml-1 font-medium">{t('author')}</span>
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
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-slate-700 leading-relaxed italic">
              {post.excerpt}
            </p>
          </div>
        </header>

        {/* 文章内容 */}
        <article className="prose prose-slate max-w-none">
          <div
            className="text-slate-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: `<p class="text-slate-700 leading-relaxed mb-4">${formatContent(filterContentByLanguage(post.content, locale))}</p>`
            }}
          />
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
