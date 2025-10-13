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
