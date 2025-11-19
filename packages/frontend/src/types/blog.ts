/**
 * 博客类型定义
 *
 * 定义博客文章数据结构的 TypeScript 接口。
 * 支持旧版基于文件系统的博客文章和新的 Notion 驱动博客系统。
 *
 * 类型：
 * - BlogPostFrontmatter：从博客文章前言提取的元数据
 * - BlogPost：包含内容和摘要的完整博客文章
 * - NotionBlogPost：从 Notion API 客户端重新导出，保持向后兼容性
 * - NotionBlock：Notion 内容块结构（来自 Notion API）
 * - BlogPostStatusType：状态枚举（已发布/草稿/已归档）
 * - SupportedLanguageType：语言枚举（英语/中文）
 */
export interface BlogPostFrontmatter {
  slug: string;
  title: string;
  titleEn: string;
  datePublished: string;
  keywords: string[];
  schema: {
    '@context': string;
    '@type': string;
    title?: string;
    headline?: string;
    keywords?: string[];
    language?: string;
    datePublished?: string;
    [key: string]: unknown;
  };
}

export interface BlogPost extends BlogPostFrontmatter {
  content: string;
  excerpt: string;
}

// 重新导出 Notion 相关类型，保持向后兼容性
export type {
  BlogPostStatusType,
  BlogPost as NotionBlogPost,
  SupportedLanguageType,
} from '@/lib/notion';

// Notion 内容块类型（保持现有接口）
export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  children?: NotionBlock[];
  [key: string]: unknown;
}
