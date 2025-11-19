/**
 * Notion 博客 API 包装器
 *
 * 提供从 Notion CMS 获取博客文章的高级函数。
 * 充当应用程序与底层 Notion API 客户端之间的适配器层。
 *
 * 功能：
 * - 获取所有已发布的博客文章，支持语言环境过滤
 * - 通过 slug 检索单篇博客文章
 * - 获取完整的博客文章内容（元数据 + 所有内容块）
 * - 为博客文章生成 SEO 元数据
 * - 获取所有博客文章 slug 用于静态生成
 * - 错误处理并提供后备值
 *
 * 数据流：
 * 1. 列表页：getNotionBlogPosts() → 仅返回文章元数据（无内容块）
 * 2. 详情页：getNotionBlogPost() → 返回元数据 + 递归加载所有内容块
 * 3. 静态生成：getNotionBlogSlugs() → 返回所有 slug 用于预渲染
 */
import { LOCALE } from '@qrent/shared/enum';
import {
  getBlogPostBySlug,
  getBlogPostContent,
  getPublishedBlogPosts,
  SupportedLanguage,
  type BlogPost as NotionBlogPost,
} from './notion';

// 为了向后兼容，定义 NotionBlock 类型
export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  children?: NotionBlock[];
  [key: string]: unknown;
}

/**
 * 获取所有已发布的博客文章（用于博客列表页面）
 */
export async function getNotionBlogPosts(locale?: string): Promise<NotionBlogPost[]> {
  try {
    const language = locale === 'en' ? SupportedLanguage.EN : SupportedLanguage.ZH;
    return await getPublishedBlogPosts(language);
  } catch (error) {
    console.error('获取 Notion 博客文章失败:', error);
    return [];
  }
}

/**
 * 获取单篇博客文章及其内容（用于博客详情页面）
 */
export async function getNotionBlogPost(
  slug: string,
  locale?: string
): Promise<{
  post: NotionBlogPost;
  blocks: NotionBlock[];
} | null> {
  try {
    const language = locale === 'en' ? SupportedLanguage.EN : SupportedLanguage.ZH;
    const post = await getBlogPostBySlug(slug, language);
    if (!post) {
      return null;
    }

    const blocks = await getBlogPostContent(post.id);

    return {
      post,
      blocks: blocks as NotionBlock[],
    };
  } catch (error) {
    console.error(`获取 Notion 博客文章 ${slug} 失败:`, error);
    return null;
  }
}

/**
 * 获取所有博客文章的 slug（用于 generateStaticParams）
 */
export async function getNotionBlogSlugs(): Promise<string[]> {
  try {
    // 获取所有语言的文章，以便生成所有可能的路径
    const posts = await getPublishedBlogPosts();
    return posts.map(post => post.slug);
  } catch (error) {
    console.error('获取博客 slug 列表失败:', error);
    return [];
  }
}

/**
 * 将 NotionBlogPost 转换为兼容现有 BlogPost 接口的格式
 * 这样可以在不破坏现有代码的情况下逐步迁移
 */
export function convertNotionPostToBlogPost(
  notionPost: NotionBlogPost,
  locale: string = LOCALE.ZH
) {
  return {
    slug: notionPost.slug,
    title: locale === LOCALE.ZH ? notionPost.title : notionPost.title_en,
    titleEn: notionPost.title_en,
    datePublished: notionPost.published_at,
    keywords: notionPost.keywords,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      title: locale === LOCALE.ZH ? notionPost.title : notionPost.title_en,
      keywords: notionPost.keywords,
      language: locale === LOCALE.ZH ? 'zh-CN' : 'en-US',
      datePublished: notionPost.published_at,
    },
    content: '', // Notion 内容通过 blocks 处理，这里留空
    excerpt: locale === LOCALE.ZH ? notionPost.excerpt_zh : notionPost.excerpt_en,
  };
}

/**
 * 生成博客文章的 SEO 元数据
 */
export function generateNotionBlogMetadata(post: NotionBlogPost, locale: string = LOCALE.ZH) {
  const title = locale === LOCALE.ZH ? post.title : post.title_en;
  const excerpt = locale === LOCALE.ZH ? post.excerpt_zh : post.excerpt_en;

  return {
    title,
    description: excerpt,
    keywords: post.keywords.join(', '),
    openGraph: {
      title,
      description: excerpt,
      type: 'article',
      publishedTime: post.published_at,
      tags: post.keywords,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: excerpt,
    },
  };
}
