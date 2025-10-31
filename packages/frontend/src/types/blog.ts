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

// Notion 博客文章类型
export interface NotionBlogPost {
  id: string;
  slug: string;
  title: string;
  title_en: string;
  excerpt_zh: string;
  excerpt_en: string;
  published_at: string;
  status: string;
  keywords: string[];
  url: string;
  language: 'zh' | 'en'; // 新增：文章语言
  imageUrl?: string; // 新增：封面图片链接
}

// Notion 内容块类型
export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  children?: NotionBlock[];
  [key: string]: any;
}
