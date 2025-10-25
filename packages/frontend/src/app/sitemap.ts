import { SUPPORTED_LOCALES } from '@qrent/shared/utils/helper';
import type { MetadataRoute } from 'next';

// Blog posts - you can later fetch these dynamically from your CMS/database
const blogPosts = [
  'bills-furniture-worth',
  'qrent-product-hunt',
  'rental-inspection-checklist',
  'sydney-uni-rental-prices',
  'unsw-rental-analysis',
];

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
