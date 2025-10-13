import { getBlogPost, getBlogPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BlogPostContent from '@/components/BlogPostContent';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.titleEn} | QRent Blog`,
    description: post.excerpt,
    keywords: post.keywords,
    authors: [{ name: 'QRent Team' }],
    openGraph: {
      title: post.titleEn,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.datePublished,
      authors: ['QRent Team'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.titleEn,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(post.schema),
        }}
      />
      <BlogPostContent post={post} />
    </>
  );
}
