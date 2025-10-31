import { Client } from '@notionhq/client';

/**
 * Notion API 客户端配置
 * 
 * 使用前请先设置环境变量：
 * 1. 创建 .env.local 文件在 packages/frontend/ 目录下
 * 2. 添加以下环境变量：
 *    NOTION_TOKEN="secret_YOUR_TOKEN_HERE"
 *    NOTION_DATABASE_ID="YOUR_DATABASE_ID_HERE"
 * 
 * 获取 Token: https://www.notion.so/my-integrations
 * 获取 Database ID: 从你的 Notion 数据库 URL 中复制
 */

// 初始化 Notion 客户端
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// 博客文章的数据结构类型定义
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

export interface NotionBlock {
  id: string;
  type: string;
  [key: string]: any;
}

/**
 * 获取所有已发布的博客文章
 */
export const getPublishedBlogPosts = async (locale?: string): Promise<NotionBlogPost[]> => {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const token = process.env.NOTION_TOKEN;


  if (!databaseId) {
    throw new Error('NOTION_DATABASE_ID 环境变量未设置');
  }

  if (!token) {
    throw new Error('NOTION_TOKEN 环境变量未设置');
  }

  try {
    // 使用 fetch 直接调用 Notion API
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: locale ? {
          and: [
            {
              property: 'status',
              select: {
                equals: 'Published',
              },
            },
            {
              property: 'language',
              select: {
                equals: locale,
              },
            },
          ],
        } : {
          property: 'status',
          select: {
            equals: 'Published',
          },
        },
        sorts: [
          {
            property: 'Published_at',
            direction: 'descending',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }

    const data = await response.json();

    // 转换 Notion API 响应为我们的数据结构
    const posts: NotionBlogPost[] = data.results.map((page: any) => {
      const properties = page.properties;
      const cover = page.cover;

      // 解析封面图片
      let imageUrl: string | undefined;
      if (cover) {
        if (cover.type === 'file') {
          imageUrl = cover.file.url;
        } else if (cover.type === 'external') {
          imageUrl = cover.external.url;
        }
      }

      return {
        id: page.id,
        slug: getPropertyValue(properties.slug, 'rich_text'),
        title: getPropertyValue(properties.TItle, 'title'), // 使用实际的属性名 TItle
        title_en: getPropertyValue(properties.TItle_en, 'rich_text'), // 使用实际的属性名 TItle_en
        excerpt_zh: getPropertyValue(properties.excerpt_zh, 'rich_text'),
        excerpt_en: getPropertyValue(properties.excerpt_en, 'rich_text'),
        published_at: getPropertyValue(properties.Published_at, 'date'), // 使用实际的属性名 Published_at
        status: getPropertyValue(properties.status, 'select'),
        keywords: getPropertyValue(properties.keywords, 'multi_select'),
        url: page.url,
        language: getPropertyValue(properties.language, 'select'),
        imageUrl,
      };
    });

    return posts;
  } catch (error) {
    console.error('获取博客文章失败:', error);
    throw new Error('无法获取博客文章');
  }
};

/**
 * 根据 slug 获取单篇博客文章
 */
export const getBlogPost = async (slug: string, locale?: string): Promise<NotionBlogPost | null> => {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error('NOTION_DATABASE_ID 环境变量未设置');
  }

  try {
    // 使用 fetch 直接调用 Notion API
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          and: locale ? [
            {
              property: 'status',
              select: {
                equals: 'Published',
              },
            },
            {
              property: 'slug',
              rich_text: {
                equals: slug,
              },
            },
            {
              property: 'language',
              select: {
                equals: locale,
              },
            },
          ] : [
            {
              property: 'status',
              select: {
                equals: 'Published',
              },
            },
            {
              property: 'slug',
              rich_text: {
                equals: slug,
              },
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }

    const data = await response.json();

    if (data.results.length === 0) {
      return null;
    }

    const page = data.results[0] as any;
    const properties = page.properties;
    const cover = page.cover;

    // 解析封面图片
    let imageUrl: string | undefined;
    if (cover) {
      if (cover.type === 'file') {
        imageUrl = cover.file.url;
      } else if (cover.type === 'external') {
        imageUrl = cover.external.url;
      }
    }

    return {
      id: page.id,
      slug: getPropertyValue(properties.slug, 'rich_text'),
      title: getPropertyValue(properties.TItle, 'title'), // 使用实际的属性名 TItle
      title_en: getPropertyValue(properties.TItle_en, 'rich_text'), // 使用实际的属性名 TItle_en
      excerpt_zh: getPropertyValue(properties.excerpt_zh, 'rich_text'),
      excerpt_en: getPropertyValue(properties.excerpt_en, 'rich_text'),
      published_at: getPropertyValue(properties.Published_at, 'date'), // 使用实际的属性名 Published_at
      status: getPropertyValue(properties.status, 'select'),
      keywords: getPropertyValue(properties.keywords, 'multi_select'),
      url: page.url,
      language: getPropertyValue(properties.language, 'select'),
      imageUrl,
    };
  } catch (error) {
    console.error(`获取博客文章 ${slug} 失败:`, error);
    return null;
  }
};

/**
 * 获取博客文章的内容块
 */
export const getBlogPostContent = async (pageId: string): Promise<NotionBlock[]> => {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100, // 一次最多获取100个块
    });

    return response.results as NotionBlock[];
  } catch (error) {
    console.error(`获取页面内容失败 (${pageId}):`, error);
    throw new Error('无法获取页面内容');
  }
};

/**
 * 递归获取所有子块（用于处理嵌套内容）
 */
export const getAllBlocks = async (blockId: string): Promise<NotionBlock[]> => {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  try {
    do {
      const response = await notion.blocks.children.list({
        block_id: blockId,
        page_size: 100,
        start_cursor: cursor,
      });

      const currentBlocks = response.results as NotionBlock[];
      blocks.push(...currentBlocks);

      // 递归获取有子块的块
      for (const block of currentBlocks) {
        if (block.has_children) {
          const childBlocks = await getAllBlocks(block.id);
          // 将子块添加到父块的 children 属性中
          (block as any).children = childBlocks;
        }
      }

      cursor = response.next_cursor || undefined;
    } while (cursor);

    return blocks;
  } catch (error) {
    console.error(`获取所有块失败 (${blockId}):`, error);
    throw new Error('无法获取块内容');
  }
};

/**
 * 辅助函数：从 Notion 属性中提取值
 */
function getPropertyValue(property: any, type: string): any {
  if (!property) return '';

  switch (type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    case 'select':
      return property.select?.name || '';
    case 'multi_select':
      return property.multi_select?.map((item: any) => item.name) || [];
    case 'date':
      return property.date?.start || '';
    case 'number':
      return property.number || 0;
    case 'checkbox':
      return property.checkbox || false;
    case 'url':
      return property.url || '';
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    default:
      return '';
  }
}

/**
 * 将富文本数组转换为纯文本
 */
export const richTextToPlainText = (richText: any[]): string => {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(text => text.plain_text || '').join('');
};

/**
 * 将富文本数组转换为 HTML
 */
export const richTextToHtml = (richText: any[]): string => {
  if (!richText || !Array.isArray(richText)) return '';

  return richText.map(text => {
    let html = text.plain_text || '';

    // 应用格式化
    if (text.annotations) {
      if (text.annotations.bold) html = `<strong>${html}</strong>`;
      if (text.annotations.italic) html = `<em>${html}</em>`;
      if (text.annotations.strikethrough) html = `<del>${html}</del>`;
      if (text.annotations.underline) html = `<u>${html}</u>`;
      if (text.annotations.code) html = `<code>${html}</code>`;
      if (text.annotations.color && text.annotations.color !== 'default') {
        html = `<span style="color: ${text.annotations.color}">${html}</span>`;
      }
    }

    // 处理链接
    if (text.href) {
      html = `<a href="${text.href}" target="_blank" rel="noopener noreferrer">${html}</a>`;
    }

    return html;
  }).join('');
};
