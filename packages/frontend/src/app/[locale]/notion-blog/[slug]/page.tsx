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

// 临时禁用静态路径生成，改用动态渲染
// 这样可以避免构建时的 Notion API 访问问题
export async function generateStaticParams() {
  // 返回空数组，让页面在运行时动态生成
  return [];
}

// 强制动态渲染
export const dynamic = 'force-dynamic';

// 生成页面元数据
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

// 启用 ISR，每10分钟最多重新生成一次
export const revalidate = 600;

export default async function NotionBlogPostPage({ params }: PageProps) {
  const { slug, locale } = await params;

  try {
    const result = await getNotionBlogPost(slug, locale);

    if (!result) {
      notFound();
    }

    // 类型兼容修正：将 lib/notion.ts 的 NotionBlock 数组转换为 @/types/blog 的 NotionBlock
    // 假定 @/types/blog 的 NotionBlock 要求 has_children 字段
    // 兜底加上 has_children 字段，实际如果 lib 返回有该字段则无影响

    const compatBlocks: NotionBlockFromTypes[] = result.blocks.map(block => ({
      has_children: !!(block as Record<string, unknown>).has_children, // 强制兜底
      ...block,
    }));

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
