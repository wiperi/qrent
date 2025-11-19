/**
 * 博客文章详情页
 * 
 * 展示来自 Notion CMS 的单篇博客文章。
 * 此页面根据 slug 参数从 Notion API 动态获取博客文章内容。
 * 
 * 功能：
 * - 为所有博客文章动态生成路由（generateStaticParams）
 * - 从 Notion 文章属性生成 SEO 元数据
 * - ISR（增量静态再生成）10 分钟缓存
 * - 文章未找到时返回 404
 * - 递归渲染 Notion 块，支持嵌套内容
 */
import NotionBlogContent from '@/components/NotionBlogContent';
import { generateNotionBlogMetadata, getNotionBlogPost } from '@/lib/notion-blog';
import type { NotionBlock as NotionBlockFromTypes, NotionBlogPost as NotionBlogPostFromTypes } from '@/types/blog';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const { getNotionBlogSlugs } = await import('@/lib/notion-blog');
    const slugs = await getNotionBlogSlugs();
    const { locales } = await import('@/i18n');

    // Generate params for all combinations of locales and slugs
    const params = [];
    for (const locale of locales) {
      for (const slug of slugs) {
        params.push({ locale, slug });
      }
    }

    return params;
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;

  try {
    const result = await getNotionBlogPost(slug, locale);
    if (!result) {
      return {
        title: 'Article Not Found',
      };
    }

    return generateNotionBlogMetadata(result.post, locale);
  } catch (error) {
    console.error('生成元数据失败:', error);
    return {
      title: 'Error Loading Article',
    };
  }
}

export const revalidate = 600;

export default async function BlogPostPage({ params }: PageProps) {
  const { slug, locale } = await params;

  try {
    const result = await getNotionBlogPost(slug, locale);

    if (!result) {
      notFound();
    }

    const compatBlocks: NotionBlockFromTypes[] = result.blocks.map(
      block => block as NotionBlockFromTypes
    );

    return <NotionBlogContent post={result.post as NotionBlogPostFromTypes} blocks={compatBlocks} />;
  } catch (error) {
    console.error(`加载博客文章失败 (${slug}):`, error);

    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h1 className="text-xl font-semibold text-red-800 mb-4">
              加载文章时出错
            </h1>
            <p className="text-red-700 mb-4">
              无法从 Notion 加载文章内容。请检查：
            </p>
            <ul className="text-sm text-red-600 text-left space-y-1">
              <li>• Notion Token 是否有效</li>
              <li>• 数据库权限是否正确</li>
              <li>• 文章是否已发布</li>
              <li>• 网络连接是否正常</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
