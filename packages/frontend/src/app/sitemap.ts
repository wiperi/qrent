import { getNotionBlogPosts } from '@/lib/notion-blog';
import { sitemapEntries } from '@/lib/seo';

export const revalidate = 600;
export default async function sitemap() {
  return sitemapEntries(await getNotionBlogPosts());
}
