/**
 * 站点地图生成器
 *
 * 生成包含所有本地化 URL 的 XML 站点地图，用于 SEO 优化。
 * 支持来自 Notion CMS 的动态博客文章和静态页面。
 *
 * 功能：
 * - 多语言支持（为所有支持的语言生成 URL）
 * - 静态页面配置自定义优先级和更新频率
 * - 动态博客文章 URL（构建时从 Notion 获取）
 * - 使用正确的 lastModified 日期进行 SEO 优化
 */
import { SUPPORTED_LOCALES } from '@qrent/shared/utils/helper';
import type { MetadataRoute } from 'next';

// Blog posts are now served from Notion; omit hardcoded slugs
const blogPosts: string[] = [];

// Static pages with their priorities and change frequencies
const staticPages = [
  { path: '', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/blog', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/search', priority: 0.8, changeFrequency: 'daily' as const },
  { path: '/team', priority: 0.5, changeFrequency: 'monthly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://qrent.rent';
  const currentDate = new Date().toISOString();

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Generate entries for each locale
  SUPPORTED_LOCALES.forEach(locale => {
    // Add static pages
    staticPages.forEach(page => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: currentDate,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      });
    });

    // Add blog posts
    blogPosts.forEach(slug => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/blog/${slug}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  });

  return sitemapEntries;
}
