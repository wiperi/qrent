import NotionBlogContent from '@/components/NotionBlogContent';
import Breadcrumbs from '@/components/Breadcrumbs';
import RentalLinks from '@/components/RentalLinks';
import {
  generateNotionBlogMetadata,
  getNotionBlogPost,
  getNotionBlogPosts,
  getRecommendedPosts,
} from '@/lib/notion-blog';
import { SITE_URL, SITE_IMAGE, jsonLd } from '@/lib/seo';
import type { NotionBlock, NotionBlogPost } from '@/types/blog';
import { isLocale } from '@qrent/shared/utils/helper';
import { setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { canonicalGuideSlug } from '@/lib/guide-routes';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}
export const revalidate = 600;
export async function generateStaticParams() {
  const posts = await getNotionBlogPosts();
  return posts.map(post => ({ locale: post.language, slug: post.slug }));
}
export async function generateMetadata({ params }: PageProps) {
  const { locale, slug } = await params;
  const canonical = canonicalGuideSlug(locale, slug);
  if (canonical && canonical !== slug) permanentRedirect(`/${locale}/blog/${canonical}`);
  const result = await getNotionBlogPost(slug, locale);
  if (!result)
    return {
      title: locale === 'zh' ? '找不到文章 | QRent' : 'Article not found | QRent',
      robots: { index: false },
    };
  return generateNotionBlogMetadata(result.post, locale, ['zh', 'en']);
}
export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const canonical = canonicalGuideSlug(locale, slug);
  if (canonical && canonical !== slug) permanentRedirect(`/${locale}/blog/${canonical}`);
  const result = await getNotionBlogPost(slug, locale);
  // Keep notFound outside catch: it is a Next.js response, not a content error.
  if (!result) notFound();
  const relatedPosts = await getRecommendedPosts(slug, result.post.keywords, locale);
  const zh = locale === 'zh';
  const title = zh ? result.post.title : result.post.title_en;
  const description = zh ? result.post.excerpt_zh : result.post.excerpt_en;
  const url = `${SITE_URL}/${locale}/blog/${encodeURIComponent(slug)}`;
  return (
    <main>
      <div className="max-w-4xl mx-auto px-5 pt-8">
        <Breadcrumbs
          locale={locale}
          items={[
            { name: zh ? '首页' : 'Home', path: '' },
            { name: zh ? '租房指南' : 'Rental guides', path: '/blog' },
            { name: zh ? '正文' : 'Article', path: `/blog/${encodeURIComponent(slug)}` },
          ]}
        />
      </div>
      <NotionBlogContent
        post={result.post as NotionBlogPost}
        blocks={result.blocks as NotionBlock[]}
        relatedPosts={relatedPosts as NotionBlogPost[]}
      />
      <RentalLinks locale={locale} compact />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: title,
            description,
            url,
            mainEntityOfPage: url,
            inLanguage: zh ? 'zh-CN' : 'en-AU',
            datePublished: result.post.published_at,
            dateModified: result.post.last_edited_time,
            image: SITE_IMAGE,
            author: { '@type': 'Organization', name: 'QRent', url: `${SITE_URL}/${locale}/team` },
            publisher: {
              '@type': 'Organization',
              name: 'QRent',
              url: SITE_URL,
              logo: { '@type': 'ImageObject', url: SITE_IMAGE },
            },
          }),
        }}
      />
    </main>
  );
}
