import { getNotionBlogSlugs } from '@/lib/notion-blog';
import { SUPPORTED_LOCALES } from '@qrent/shared/utils/helper';
import type { MetadataRoute } from 'next';

// Static pages with their priorities and change frequencies
const staticPages = [
  { path: '', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/blog', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/search', priority: 0.8, changeFrequency: 'daily' as const },
  { path: '/team', priority: 0.5, changeFrequency: 'monthly' as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://qrent.rent';
  const currentDate = new Date().toISOString();

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Fetch dynamic blog slugs from Notion
  let blogSlugs: string[] = [];
  try {
    blogSlugs = await getNotionBlogSlugs();
  } catch (error) {
    console.error('Failed to fetch blog slugs for sitemap:', error);
    // Continue with static pages even if blog fetch fails
  }

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

    // Add dynamic blog posts
    blogSlugs.forEach(slug => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/blog/${slug}`,
        lastModified: currentDate, // Ideally this should be the post's last_edited_time, but using current for now is acceptable
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  });

  return sitemapEntries;
}
