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
 * 获取推荐文章（混合模式：标签相关 > 最新发布）
 */
export async function getRecommendedPosts(
  currentSlug: string,
  keywords: string[],
  locale?: string,
  limit: number = 3
): Promise<NotionBlogPost[]> {
  try {
    const language = locale === 'en' ? SupportedLanguage.EN : SupportedLanguage.ZH;
    const allPosts = await getPublishedBlogPosts(language);

    // 1. 过滤掉当前文章
    const otherPosts = allPosts.filter(post => post.slug !== currentSlug);

    // 2. 计算相关性得分
    const scoredPosts = otherPosts.map(post => {
      // 计算标签重合数量
      const intersection = post.keywords.filter(k => keywords.includes(k));
      return {
        ...post,
        score: intersection.length,
      };
    });

    // 3. 排序：优先重合度高，其次发布时间新
    scoredPosts.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score; // 分数降序
      }
      // 日期降序 (假设 published_at 是 ISO 字符串)
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // 4. 返回前 N 篇
    return scoredPosts.slice(0, limit);
  } catch (error) {
    console.error('获取推荐文章失败:', error);
    // 出错时尝试返回最新的文章作为兜底，需重新获取一次（避免复用可能污染的数据）
    try {
      const language = locale === 'en' ? SupportedLanguage.EN : SupportedLanguage.ZH;
      const allPosts = await getPublishedBlogPosts(language);
      return allPosts
        .filter(post => post.slug !== currentSlug)
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        .slice(0, limit);
    } catch (e) {
      return [];
    }
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
    coverUrl: notionPost.cover_url,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: locale === LOCALE.ZH ? notionPost.title : notionPost.title_en,
      image: notionPost.cover_url ? [notionPost.cover_url] : [],
      datePublished: notionPost.published_at,
      dateModified: notionPost.last_edited_time,
      author: {
        '@type': 'Organization',
        name: 'Qrent',
        url: 'https://qrent.com.au',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Qrent',
        logo: {
          '@type': 'ImageObject',
          url: 'https://qrent.com.au/qrent-logo.svg',
        },
      },
      description: locale === LOCALE.ZH ? notionPost.excerpt_zh : notionPost.excerpt_en,
      keywords: notionPost.keywords.join(', '),
      inLanguage: locale === LOCALE.ZH ? 'zh-CN' : 'en-US',
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
      modifiedTime: post.last_edited_time,
      authors: ['Qrent'],
      tags: post.keywords,
      images: post.cover_url ? [{ url: post.cover_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: excerpt,
      images: post.cover_url ? [post.cover_url] : [],
    },
  };
}
