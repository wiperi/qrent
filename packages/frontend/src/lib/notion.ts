import { Client } from '@notionhq/client';
import { z } from 'zod';

/**
 * 类型安全的 Notion API 客户端
 *
 * 基于严格的类型定义，避免强制类型转换
 * 支持完整的错误处理和数据验证
 */

// ==================== 环境变量验证 ====================

const envSchema = z.object({
  NOTION_TOKEN: z.string().min(1, 'NOTION_TOKEN 不能为空'),
  NOTION_DATABASE_ID: z.string().min(1, 'NOTION_DATABASE_ID 不能为空'),
});

function validateEnv() {
  const result = envSchema.safeParse({
    NOTION_TOKEN: process.env.NOTION_TOKEN,
    NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
  });

  if (!result.success) {
    throw new Error(`环境变量配置错误: ${result.error.issues.map(i => i.message).join(', ')}`);
  }

  return result.data;
}

// ==================== 基础 Notion 类型定义 ====================

// 富文本类型
const RichTextSchema = z.object({
  type: z.literal('text'),
  text: z.object({
    content: z.string(),
    link: z
      .object({
        url: z.string(),
      })
      .nullable()
      .optional(),
  }),
  annotations: z.object({
    bold: z.boolean(),
    italic: z.boolean(),
    strikethrough: z.boolean(),
    underline: z.boolean(),
    code: z.boolean(),
    color: z.string(),
  }),
  plain_text: z.string(),
  href: z.string().nullable(),
});

// 选择属性类型
const SelectOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

// 多选属性类型
const MultiSelectOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

// 日期属性类型
const DateSchema = z.object({
  start: z.string(),
  end: z.string().nullable().optional(),
  time_zone: z.string().nullable().optional(),
});

// ==================== 博客文章属性类型定义 ====================
// 目前不直接在 Notion 响应 schema 中使用，保留业务字段结构的参考定义
const BlogPostPropertiesSchema = z.object({
  Title: z.object({
    id: z.string(),
    type: z.literal('title'),
    title: z.array(RichTextSchema),
  }),
  Title_en: z.object({
    id: z.string(),
    type: z.literal('rich_text'),
    rich_text: z.array(RichTextSchema),
  }),
  slug: z.object({
    id: z.string(),
    type: z.literal('rich_text'),
    rich_text: z.array(RichTextSchema),
  }),
  status: z.object({
    id: z.string(),
    type: z.literal('select'),
    select: SelectOptionSchema.nullable(),
  }),
  Published_at: z.object({
    id: z.string(),
    type: z.literal('date'),
    date: DateSchema.nullable(),
  }),
  excerpt_zh: z.object({
    id: z.string(),
    type: z.literal('rich_text'),
    rich_text: z.array(RichTextSchema),
  }),
  excerpt_en: z.object({
    id: z.string(),
    type: z.literal('rich_text'),
    rich_text: z.array(RichTextSchema),
  }),
  keywords: z.object({
    id: z.string(),
    type: z.literal('multi_select'),
    multi_select: z.array(MultiSelectOptionSchema),
  }),
  language: z.object({
    id: z.string(),
    type: z.literal('select'),
    select: SelectOptionSchema.nullable(),
  }),
});

// ==================== Notion 页面类型定义 ====================

// 这里只对页面的基础结构做校验，properties 保持宽松，避免因为数据库字段差异导致整体失败
const NotionPageSchema = z
  .object({
    object: z.literal('page'),
    id: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    created_by: z.object({
      object: z.literal('user'),
      id: z.string(),
    }),
    last_edited_by: z.object({
      object: z.literal('user'),
      id: z.string(),
    }),
    cover: z
      .object({
        type: z.enum(['external', 'file']),
        external: z
          .object({
            url: z.string(),
          })
          .optional(),
        file: z
          .object({
            url: z.string(),
            expiry_time: z.string(),
          })
          .optional(),
      })
      .nullable(),
    icon: z
      .object({
        type: z.enum(['emoji', 'external', 'file']),
        emoji: z.string().optional(),
        external: z
          .object({
            url: z.string(),
          })
          .optional(),
        file: z
          .object({
            url: z.string(),
            expiry_time: z.string(),
          })
          .optional(),
      })
      .nullable(),
    parent: z.object({
      type: z.literal('database_id'),
      database_id: z.string(),
    }),
    archived: z.boolean(),
    // 这里不再强绑定 BlogPostPropertiesSchema，而是接受任意属性，
    // 具体字段在 transformNotionPageToBlogPost 中处理
    properties: z.record(z.unknown()),
    url: z.string(),
    public_url: z.string().nullable(),
  })
  .passthrough();

// Notion API 查询响应类型：只校验基础字段，其他字段放宽
const NotionQueryResponseSchema = z
  .object({
    object: z.literal('list'),
    results: z.array(NotionPageSchema),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional(),
  })
  .passthrough();

// ==================== 业务类型定义 ====================

// 博客文章状态枚举
export const BlogPostStatus = {
  PUBLISHED: 'Published',
  DRAFT: 'Draft',
  ARCHIVED: 'Archived',
} as const;

export type BlogPostStatusType = (typeof BlogPostStatus)[keyof typeof BlogPostStatus];

// 支持的语言枚举
export const SupportedLanguage = {
  ZH: 'zh',
  EN: 'en',
} as const;

export type SupportedLanguageType = (typeof SupportedLanguage)[keyof typeof SupportedLanguage];

// 最终的博客文章类型
export const BlogPostSchema = z.object({
  id: z.string(),
  slug: z.string().min(1, 'slug 不能为空'),
  title: z.string().min(1, '标题不能为空'),
  title_en: z.string().min(1, '英文标题不能为空'),
  excerpt_zh: z.string(),
  excerpt_en: z.string(),
  published_at: z.string().min(1, '发布日期不能为空'),
  status: z.nativeEnum(BlogPostStatus),
  keywords: z.array(z.string()),
  language: z.nativeEnum(SupportedLanguage),
  url: z.string().url('无效的 URL'),
  cover_url: z.string().url().optional(),
  created_time: z.string(),
  last_edited_time: z.string(),
});

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type NotionPage = z.infer<typeof NotionPageSchema>;
export type NotionQueryResponse = z.infer<typeof NotionQueryResponseSchema>;

// Notion 内容块类型（为了向后兼容）
export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  children?: NotionBlock[];
  [key: string]: unknown;
}

// ==================== 辅助函数 ====================

/**
 * 从富文本数组中提取纯文本
 */
function extractPlainText(richText: z.infer<typeof RichTextSchema>[]): string {
  return richText.map(text => text.plain_text).join('');
}

/**
 * 从富文本数组中提取 HTML
 */
function extractHtml(richText: z.infer<typeof RichTextSchema>[]): string {
  return richText
    .map(text => {
      let html = text.plain_text;

      if (text.annotations.bold) html = `<strong>${html}</strong>`;
      if (text.annotations.italic) html = `<em>${html}</em>`;
      if (text.annotations.strikethrough) html = `<del>${html}</del>`;
      if (text.annotations.underline) html = `<u>${html}</u>`;
      if (text.annotations.code) html = `<code>${html}</code>`;

      if (text.href) {
        html = `<a href="${text.href}" target="_blank" rel="noopener noreferrer">${html}</a>`;
      }

      return html;
    })
    .join('');
}

/**
 * 获取封面图片 URL
 */
function getCoverUrl(cover: NotionPage['cover']): string | undefined {
  if (!cover) return undefined;

  if (cover.type === 'external') {
    return cover.external?.url;
  }

  if (cover.type === 'file') {
    return cover.file?.url;
  }

  return undefined;
}

/**
 * 安全地从 Notion 属性中提取富文本内容
 */
function safeExtractRichText(property: unknown): string {
  try {
    if (typeof property === 'object' && property !== null) {
      const prop = property as Record<string, unknown>;

      // 处理 title 类型
      if (prop.type === 'title' && Array.isArray(prop.title)) {
        return extractPlainText(prop.title);
      }

      // 处理 rich_text 类型
      if (prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
        return extractPlainText(prop.rich_text);
      }
    }
  } catch (error) {
    console.warn('提取富文本失败:', error);
  }

  return '';
}

/**
 * 安全地从 Notion 属性中提取选择项内容
 */
function safeExtractSelect(property: unknown): string {
  try {
    if (typeof property === 'object' && property !== null) {
      const prop = property as Record<string, unknown>;
      if (
        prop.type === 'select' &&
        typeof prop.select === 'object' &&
        prop.select !== null &&
        typeof (prop.select as Record<string, unknown>).name === 'string'
      ) {
        return (prop.select as Record<string, unknown>).name as string;
      }
    }
  } catch (error) {
    console.warn('提取选择项失败:', error);
  }

  return '';
}

/**
 * 安全地从 Notion 属性中提取多选项内容
 */
function safeExtractMultiSelect(property: unknown): string[] {
  try {
    if (typeof property === 'object' && property !== null) {
      const prop = property as Record<string, unknown>;
      if (prop.type === 'multi_select' && Array.isArray(prop.multi_select)) {
        return prop.multi_select
          .filter(
            (item: unknown) =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as Record<string, unknown>).name === 'string'
          )
          .map((item: unknown) => (item as Record<string, unknown>).name as string);
      }
    }
  } catch (error) {
    console.warn('提取多选项失败:', error);
  }

  return [];
}

/**
 * 安全地从 Notion 属性中提取日期内容
 */
function safeExtractDate(property: unknown): string {
  try {
    if (typeof property === 'object' && property !== null) {
      const prop = property as Record<string, unknown>;
      if (
        prop.type === 'date' &&
        typeof prop.date === 'object' &&
        prop.date !== null &&
        typeof (prop.date as Record<string, unknown>).start === 'string'
      ) {
        return (prop.date as Record<string, unknown>).start as string;
      }
    }
  } catch (error) {
    console.warn('提取日期失败:', error);
  }

  return '';
}

/**
 * 将 Notion 页面转换为博客文章
 */
function transformNotionPageToBlogPost(page: NotionPage): BlogPost {
  const properties = page.properties;

  // 安全地提取各个字段的值
  const title = safeExtractRichText(properties.Title);
  const title_en = safeExtractRichText(properties.Title_en);
  const slug = safeExtractRichText(properties.slug);
  const excerpt_zh = safeExtractRichText(properties.excerpt_zh);
  const excerpt_en = safeExtractRichText(properties.excerpt_en);
  const keywords = safeExtractMultiSelect(properties.keywords);

  // 处理状态
  const statusName = safeExtractSelect(properties.status);
  if (!statusName || !Object.values(BlogPostStatus).includes(statusName as BlogPostStatusType)) {
    throw new Error(`无效的状态值: ${statusName}`);
  }

  // 处理语言
  const languageName = safeExtractSelect(properties.language);
  if (
    !languageName ||
    !Object.values(SupportedLanguage).includes(languageName as SupportedLanguageType)
  ) {
    throw new Error(`无效的语言值: ${languageName}`);
  }

  // 处理发布日期
  const publishedAt = safeExtractDate(properties.Published_at);
  if (!publishedAt) {
    throw new Error('发布日期不能为空');
  }

  // 构建博客文章对象
  const blogPostData = {
    id: page.id,
    slug,
    title,
    title_en,
    excerpt_zh,
    excerpt_en,
    published_at: publishedAt,
    status: statusName as BlogPostStatusType,
    keywords,
    language: languageName as SupportedLanguageType,
    url: page.url,
    cover_url: getCoverUrl(page.cover),
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
  };

  // 使用 Zod 验证最终结果
  const result = BlogPostSchema.safeParse(blogPostData);
  if (!result.success) {
    throw new Error(`博客文章数据验证失败: ${result.error.message}`);
  }

  return result.data;
}

// ==================== 错误类型定义 ====================

export class NotionApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'NotionApiError';
  }
}

export class NotionValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'NotionValidationError';
  }
}

// ==================== 类型安全的 Notion 客户端 ====================

export class TypeSafeNotionClient {
  private client: Client;
  private databaseId: string;

  constructor() {
    const env = validateEnv();

    this.client = new Client({
      auth: env.NOTION_TOKEN,
    });

    this.databaseId = env.NOTION_DATABASE_ID;
  }

  /**
   * 查询数据库
   */
  private async queryDatabase(filter?: object, sorts?: object[]): Promise<NotionQueryResponse> {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${this.databaseId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          filter,
          sorts,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { message: errorText };
        }

        throw new NotionApiError(
          `Notion API error: ${response.status} ${response.statusText}. Details: ${errorText}`,
          response.status,
          errorDetails.code,
          errorDetails.request_id
        );
      }

      const data = await response.json();

      // 验证 API 响应格式
      const result = NotionQueryResponseSchema.safeParse(data);
      if (!result.success) {
        throw new NotionValidationError('Notion API 返回的数据格式不正确', result.error.issues);
      }

      return result.data;
    } catch (error) {
      if (error instanceof NotionApiError || error instanceof NotionValidationError) {
        throw error;
      }
      throw new NotionApiError(
        `查询数据库失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取已发布的博客文章
   */
  async getPublishedBlogPosts(language?: SupportedLanguageType): Promise<BlogPost[]> {
    try {
      // 构建过滤条件
      const filter = language
        ? {
            and: [
              {
                property: 'status',
                select: {
                  equals: BlogPostStatus.PUBLISHED,
                },
              },
              {
                property: 'language',
                select: {
                  equals: language,
                },
              },
            ],
          }
        : {
            property: 'status',
            select: {
              equals: BlogPostStatus.PUBLISHED,
            },
          };

      // 构建排序条件
      const sorts = [
        {
          property: 'Published_at',
          direction: 'descending' as const,
        },
      ];

      const response = await this.queryDatabase(filter, sorts);

      // 转换页面为博客文章
      const blogPosts: BlogPost[] = [];
      const errors: Array<{ pageId: string; error: string }> = [];

      for (const page of response.results) {
        try {
          const blogPost = transformNotionPageToBlogPost(page);
          blogPosts.push(blogPost);
        } catch (error) {
          errors.push({
            pageId: page.id,
            error: error instanceof Error ? error.message : String(error),
          });
          console.warn(`跳过无效的博客文章 (ID: ${page.id}):`, error);
        }
      }

      if (errors.length > 0) {
        console.warn(`处理博客文章时发现 ${errors.length} 个错误:`, errors);
      }

      return blogPosts;
    } catch (error) {
      if (error instanceof NotionApiError || error instanceof NotionValidationError) {
        throw error;
      }
      throw new NotionApiError(
        `获取博客文章失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 根据 slug 获取单篇博客文章
   */
  async getBlogPostBySlug(
    slug: string,
    language?: SupportedLanguageType
  ): Promise<BlogPost | null> {
    try {
      // 构建过滤条件
      const filter = {
        and: [
          {
            property: 'status',
            select: {
              equals: BlogPostStatus.PUBLISHED,
            },
          },
          {
            property: 'slug',
            rich_text: {
              equals: slug,
            },
          },
          ...(language
            ? [
                {
                  property: 'language',
                  select: {
                    equals: language,
                  },
                },
              ]
            : []),
        ],
      };

      const response = await this.queryDatabase(filter);

      if (response.results.length === 0) {
        return null;
      }

      if (response.results.length > 1) {
        console.warn(`发现多个相同 slug 的文章: ${slug}`);
      }

      const page = response.results[0];
      return transformNotionPageToBlogPost(page);
    } catch (error) {
      if (error instanceof NotionApiError || error instanceof NotionValidationError) {
        throw error;
      }
      throw new NotionApiError(
        `获取博客文章失败 (slug: ${slug}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取博客文章内容块
   */
  async getBlogPostContent(pageId: string): Promise<NotionBlock[]> {
    try {
      const response = await this.client.blocks.children.list({
        block_id: pageId,
        page_size: 100,
      });

      return response.results as NotionBlock[];
    } catch (error) {
      throw new NotionApiError(
        `获取页面内容失败 (${pageId}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// ==================== 导出的便捷函数 ====================

// 创建全局客户端实例
let clientInstance: TypeSafeNotionClient | null = null;

function getClient(): TypeSafeNotionClient {
  if (!clientInstance) {
    clientInstance = new TypeSafeNotionClient();
  }
  return clientInstance;
}

/**
 * 获取已发布的博客文章
 */
export async function getPublishedBlogPosts(language?: SupportedLanguageType): Promise<BlogPost[]> {
  return getClient().getPublishedBlogPosts(language);
}

/**
 * 根据 slug 获取单篇博客文章
 */
export async function getBlogPostBySlug(
  slug: string,
  language?: SupportedLanguageType
): Promise<BlogPost | null> {
  return getClient().getBlogPostBySlug(slug, language);
}

/**
 * 获取博客文章内容
 */
export async function getBlogPostContent(pageId: string): Promise<NotionBlock[]> {
  return getClient().getBlogPostContent(pageId);
}

// ==================== 辅助工具函数 ====================

/**
 * 将富文本转换为纯文本
 */
export function richTextToPlainText(richText: unknown): string {
  const richTextArraySchema = z.array(RichTextSchema);
  const result = richTextArraySchema.safeParse(richText);

  if (!result.success) {
    return '';
  }

  return extractPlainText(result.data);
}

/**
 * 将富文本转换为 HTML
 */
export function richTextToHtml(richText: unknown): string {
  const richTextArraySchema = z.array(RichTextSchema);
  const result = richTextArraySchema.safeParse(richText);

  if (!result.success) {
    return '';
  }

  return extractHtml(result.data);
}

// ==================== 向后兼容性 ====================

/**
 * @deprecated 使用 getBlogPostBySlug 替代
 */
export async function getBlogPost(slug: string, locale?: string): Promise<BlogPost | null> {
  const language = locale === 'en' ? SupportedLanguage.EN : SupportedLanguage.ZH;
  return getBlogPostBySlug(slug, language);
}

/**
 * @deprecated 使用 getBlogPostContent 替代
 */
export async function getAllBlocks(blockId: string): Promise<NotionBlock[]> {
  return getBlogPostContent(blockId);
}
