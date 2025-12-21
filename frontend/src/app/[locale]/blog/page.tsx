import BlogPostCard from '@/components/BlogPostCard';
import { getNotionBlogPosts } from '@/lib/notion-blog';
import { LOCALE } from '@qrent/shared/enum';
import { Metadata } from 'next';

const BLOG_IMAGE_URLS = [
  '/banner.jpg',
  '/qrent.jpg',
];

function getImageForSlug(slug: string): string {
  const index = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % BLOG_IMAGE_URLS.length;
  return BLOG_IMAGE_URLS[index];
}

export const metadata: Metadata = {
  title: 'Blog - QRent',
  description: 'Latest rental insights and tips powered by Notion',
};

export const revalidate = 600; // Cache for 10 minutes

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const posts = await getNotionBlogPosts(locale);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {locale === LOCALE.ZH ? 'Qrent 经验贴' : 'Qrent Blog'}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            {locale === LOCALE.ZH
              ? '每一篇经验贴，都是从困惑到安心的故事'
              : 'Every experience post is a story from confusion to peace of mind'
            }
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                {locale === LOCALE.ZH ? '暂无文章' : 'No Posts Yet'}
              </h3>
              <p className="text-yellow-700 mb-4">
                {locale === LOCALE.ZH
                  ? '请先在 Notion 中创建博客文章，并确保环境变量配置正确。'
                  : 'Please create blog posts in Notion and ensure environment variables are configured correctly.'
                }
              </p>
              <p className="text-sm text-yellow-600">
                {locale === LOCALE.ZH
                  ? '查看 NOTION_BLOG_SETUP.md 了解详细设置步骤。'
                  : 'Check NOTION_BLOG_SETUP.md for detailed setup instructions.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <BlogPostCard
                key={post.id}
                title={post.title}
                author={locale === LOCALE.ZH ? 'QRent 团队' : 'QRent Team'}
                date={new Date(post.published_at).toLocaleDateString(locale === LOCALE.ZH ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                preview={locale === LOCALE.ZH ? post.excerpt_zh : post.excerpt_en}
                imageUrl={post.cover_url || getImageForSlug(post.slug)}
                slug={`/blog/${post.slug}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
