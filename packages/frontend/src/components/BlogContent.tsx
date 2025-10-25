'use client';

import { LOCALE } from '@qrent/shared/enum';
import { useLocale, useTranslations } from 'next-intl';
import BlogPostCard from './BlogPostCard';

interface BlogPost {
  slug: string;
  title: string; // 中文标题
  titleEn: string; // 英文标题
  datePublished: string;
  keywords: string[];
  schema: Record<string, unknown>;
  content: string;
  excerpt: string;
  imageUrl: string;
}

interface BlogContentProps {
  posts: BlogPost[];
}

export default function BlogContent({ posts }: BlogContentProps) {
  const t = useTranslations('Blog');
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Blog Posts Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">{t('noPosts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <BlogPostCard
                key={post.slug}
                title={locale === LOCALE.ZH ? post.title : post.titleEn}
                author={t('author')}
                date={new Date(post.datePublished).toLocaleDateString(locale === LOCALE.ZH ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                preview={post.excerpt}
                imageUrl={post.imageUrl}
                slug={`/blog/${post.slug}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
