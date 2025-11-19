/**
 * Blog Type Definitions
 * 
 * Defines TypeScript interfaces for blog post data structures.
 * Supports both legacy filesystem-based blog posts and new Notion-powered blog system.
 * 
 * Types:
 * - BlogPostFrontmatter: Metadata extracted from blog post frontmatter
 * - BlogPost: Complete blog post with content and excerpt
 * - NotionBlogPost: Re-exported from Notion API client for backward compatibility
 * - NotionBlock: Notion content block structure (from Notion API)
 * - BlogPostStatusType: Status enum (Published/Draft/Archived)
 * - SupportedLanguageType: Language enum (EN/ZH)
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
