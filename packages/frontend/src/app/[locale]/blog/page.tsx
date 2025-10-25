import BlogContent from '@/components/BlogContent';
import { getBlogPosts, type BlogPost } from '@/lib/blog';

// Temporary stub image URLs
const BLOG_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',
  'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
];

// Simple hash function to consistently pick an image for each slug
function getImageForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % BLOG_IMAGE_URLS.length;
  return BLOG_IMAGE_URLS[index];
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <BlogContent
      posts={posts.map((post: BlogPost) => ({
        ...post,
        imageUrl: getImageForSlug(post.slug)
      }))}
    />
  );
}
