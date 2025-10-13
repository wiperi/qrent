import { getBlogPosts } from '@/lib/blog';
import BlogPostCard from '@/components/BlogPostCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - Rental Guides | QRent',
  description: 'Australian rental tips and guides for international students',
  keywords: ['澳洲租房', '留学生租房', 'Australian rental', 'student housing', 'Qrent'],
};

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
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Learn how to boost your rental search
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Discover strategies to get your ideal rental properties with QRent. From search optimization and property evaluation to lease negotiation and move-in preparation, explore our resources and take control of your rental journey.
          </p>
        </div>

        {/* Blog Posts Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No blog posts available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <BlogPostCard
                key={post.slug}
                title={post.titleEn}
                author="QRent Team"
                date={new Date(post.datePublished).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                preview={post.excerpt}
                imageUrl={getImageForSlug(post.slug)}
                slug={`/blog/${post.slug}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
