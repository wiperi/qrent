# Notion Blog System Documentation

## Overview

The Qrent blog system uses Notion as a Content Management System (CMS), enabling content editors to manage blog posts directly in Notion. The system fetches content dynamically through the Notion API and renders it on the Qrent website with proper styling and SEO optimization.

This approach separates content management from code, allowing non-technical team members to:
- Create and edit blog posts in a familiar Notion interface
- Manage bilingual content (Chinese/English) independently
- Control publication status without deploying code
- Use rich content formatting (headings, lists, images, code blocks, etc.)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Notion Database Configuration](#notion-database-configuration)
4. [Creating Blog Posts](#creating-blog-posts)
5. [System Architecture](#system-architecture)
6. [Content Workflow](#content-workflow)
7. [Supported Content Types](#supported-content-types)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

- A Notion account with a workspace
- Access to the Qrent repository
- Node.js 18+ and pnpm installed

### Setup Steps

1. **Create a Notion Integration**
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Name it "Qrent Blog"
   - Select your workspace
   - Copy the "Internal Integration Token" (starts with `ntn_`)

2. **Create a Notion Database**
   - Create a new database in your Notion workspace
   - Name it "Qrent Blog" or similar
   - Copy the database ID from the URL (the 32-character string)
   - Share the database with your integration (click "Share" → Add your integration)

3. **Configure Environment Variables**
   
   Create or update `packages/frontend/.env.local`:
   
   ```env
   NOTION_TOKEN="your_notion_integration_token"
   NOTION_DATABASE_ID="your_database_id"
   ```

4. **Set Up Database Schema**
   
   Add these properties to your Notion database:
   
   | Property Name | Type | Required | Description |
   |--------------|------|----------|-------------|
   | Title | Title | ✅ | Chinese title (default property) |
   | Title_en | Text | ✅ | English title |
   | slug | Text | ✅ | URL-friendly identifier (must be unique) |
   | status | Select | ✅ | Publication status |
   | Published_at | Date | ✅ | Publication date |
   | excerpt_zh | Text | ✅ | Chinese summary/excerpt |
   | excerpt_en | Text | ✅ | English summary/excerpt |
   | keywords | Multi-select | ✅ | Tags/keywords for the post |
   | language | Select | ✅ | Primary language of the post |

5. **Configure Select Options**
   
   **For `status` property:**
   - Published
   - Draft
   - Archived
   
   **For `language` property:**
   - zh
   - en

6. **Start Development Server**
   
   ```bash
   cd packages/frontend
   pnpm dev
   ```
   
   Visit http://localhost:3000/en/blog or http://localhost:3000/zh/blog

---

## Environment Setup

### Required Environment Variables

Configure these in `packages/frontend/.env.local`:

```env
# Notion API Token - Get from https://www.notion.so/my-integrations
NOTION_TOKEN="ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Notion Database ID - Get from database URL
# URL format: https://www.notion.so/{workspace}/{DATABASE_ID}?v={view_id}
NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Security Considerations

⚠️ **Important Security Notes:**

- Never commit `.env.local` to git (already in `.gitignore`)
- Use different Notion tokens for development and production
- Restrict integration permissions to only required databases
- Rotate tokens periodically for security
- For production, use environment variables in your hosting platform (e.g., Vercel, Netlify)

### Testing the Connection

After configuring environment variables, test the connection:

```bash
cd packages/frontend
pnpm dev
```

Check the console for errors. If configured correctly, you should see no Notion-related errors.

---

## Notion Database Configuration

### Database Structure

Your Notion database acts as the content repository for all blog posts. Each page in the database represents one blog post.

### Required Properties (Fields)

#### 1. Title (Title type)
- **Type:** Title (default Notion property)
- **Purpose:** Primary title in Chinese
- **Example:** "租房前期：信息与渠道"
- **Validation:** Cannot be empty
- **Displayed:** In blog list and post detail pages (when locale is Chinese)

#### 2. Title_en (Text type)
- **Type:** Rich Text
- **Purpose:** English title
- **Example:** "Before Renting: Information and Channels"
- **Validation:** Cannot be empty
- **Displayed:** In blog list and post detail pages (when locale is English)

#### 3. slug (Text type)
- **Type:** Rich Text
- **Purpose:** URL-friendly identifier
- **Example:** "before-renting-guide"
- **Validation:** 
  - Must be unique across all posts
  - Use only lowercase letters, numbers, and hyphens
  - No spaces or special characters
- **Usage:** Forms the URL: `/blog/before-renting-guide`
- **Tip:** Keep it short and descriptive

#### 4. status (Select type)
- **Type:** Select
- **Purpose:** Controls post visibility
- **Options:**
  - **Published:** Post is visible on the website
  - **Draft:** Post is hidden (for work in progress)
  - **Archived:** Post is hidden (for old content)
- **Validation:** Must be one of the three options
- **Note:** Only posts with "Published" status appear on the website

#### 5. Published_at (Date type)
- **Type:** Date
- **Purpose:** Publication date (affects sorting)
- **Example:** "2025-10-30"
- **Validation:** Cannot be empty for published posts
- **Usage:** 
  - Displayed on blog cards and post detail pages
  - Used to sort posts (newest first)
- **Tip:** Use future dates to schedule content

#### 6. excerpt_zh (Text type)
- **Type:** Rich Text
- **Purpose:** Chinese summary/preview text
- **Example:** "澳大利亚的租房市场以其竞争激烈著称..."
- **Validation:** Can be empty but recommended to fill
- **Displayed:** 
  - In blog list cards as preview
  - At the top of the article as a summary box
- **Recommended Length:** 100-200 characters

#### 7. excerpt_en (Text type)
- **Type:** Rich Text
- **Purpose:** English summary/preview text
- **Example:** "Australia's rental market is known for being highly competitive..."
- **Validation:** Can be empty but recommended to fill
- **Displayed:** 
  - In blog list cards as preview (English locale)
  - At the top of the article as a summary box
- **Recommended Length:** 100-200 characters

#### 8. keywords (Multi-select type)
- **Type:** Multi-select
- **Purpose:** Tags/categories for the post
- **Example:** ["guide", "rent", "help"]
- **Validation:** Can be empty but recommended to have 3-5 keywords
- **Displayed:** As tags on the post detail page
- **Usage:** Helps with SEO and content organization
- **Tip:** Create consistent keyword options for better organization

#### 9. language (Select type)
- **Type:** Select
- **Purpose:** Primary language of the post content
- **Options:**
  - **zh:** Chinese content
  - **en:** English content
- **Validation:** Must be either "zh" or "en"
- **Usage:** 
  - Filters posts based on user's locale
  - Ensures correct language content is shown
- **Note:** For bilingual content, create two separate posts with the same slug but different language values

### Optional Properties

You can add additional properties for internal use (they won't affect the website):
- **Author:** Person property for tracking who wrote the post
- **Review Status:** Select property for editorial workflow
- **Notes:** Text property for internal comments
- **Cover Image:** Files & media property (currently using fallback images)

---

## Creating Blog Posts

### Step-by-Step Guide

#### 1. Create a New Page in the Database

1. Open your Qrent Blog database in Notion
2. Click "+ New" to create a new page
3. The page opens with a blank canvas

#### 2. Fill in Required Properties

Click on each property field and fill in the information:

```
Title: 租房前期：信息与渠道
Title_en: Before Renting: Information and Channels
slug: before-renting-guide
status: Draft (change to Published when ready)
Published_at: 2025-10-30
excerpt_zh: 澳大利亚的租房市场以其竞争激烈著称，了解正确的信息渠道是成功租房的第一步。
excerpt_en: Australia's rental market is known for being competitive. Understanding the right information channels is the first step to successful renting.
keywords: guide, rent, help, australia
language: zh
```

#### 3. Write Content

Inside the page, write your content using Notion's rich formatting:

**Example Structure:**
```
# 主要标题 (Heading 1)

这是段落文本。可以使用**粗体**和*斜体*。

## 二级标题 (Heading 2)

### 三级标题 (Heading 3)

- 无序列表项 1
- 无序列表项 2

1. 有序列表项 1
2. 有序列表项 2

> 这是引用块

💡 这是一个提示框（使用 Callout）

`代码内容` 或者：

```javascript
function hello() {
  console.log("Hello World");
}
```
```

#### 4. Add Images and Media

- **Images:** Drag and drop images directly into the content
- **Videos:** Embed using Notion's video block
- **Files:** Add downloadable files using file blocks
- **Captions:** Add captions to images for better accessibility

#### 5. Preview and Publish

1. Keep `status` as "Draft" while working
2. Preview on your local development server
3. Make adjustments as needed
4. When ready, change `status` to "Published"
5. Wait ~10 minutes for cache to refresh (or restart dev server)

### Creating Bilingual Content

For content in both languages:

1. **Create Two Separate Pages** (one for each language)
2. **Use the Same Slug** for both pages
3. **Set Different `language` Values:**
   - Chinese post: `language = zh`
   - English post: `language = en`
4. **Fill in All Fields** for each language independently
5. **Match the Content Structure** between both versions

**Example:**
```
Page 1:
- Title: 租房前期：信息与渠道
- slug: before-renting-guide
- language: zh
- (Chinese content)

Page 2:
- Title_en: Before Renting: Information and Channels
- slug: before-renting-guide
- language: en
- (English content)
```

Users will automatically see the correct language version based on their locale setting.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  (http://qrent.rent/en/blog or http://qrent.rent/zh/blog)       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Request
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Blog Pages (App Router)                                 │   │
│  │  - /[locale]/blog/page.tsx (List)                        │   │
│  │  - /[locale]/blog/[slug]/page.tsx (Detail)              │   │
│  └────────────┬─────────────────────────────────────────────┘   │
│               │                                                  │
│               │ Server-Side API Calls                            │
│               ▼                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Notion API Layer                                        │   │
│  │  - lib/notion.ts (Type-safe client)                      │   │
│  │  - lib/notion-blog.ts (Business logic)                   │   │
│  └────────────┬─────────────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────────────┘
                │
                │ HTTPS API Calls
                │ (Bearer Token Authentication)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Notion API                                  │
│  - Authentication via Integration Token                          │
│  - Database Query API                                            │
│  - Block Children API                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Frontend Components

1. **Blog List Page (`/[locale]/blog/page.tsx`)**
   - Fetches all published posts for the current locale
   - Displays blog cards with title, excerpt, date, and image
   - Handles empty state with helpful error messages
   - Implements ISR (Incremental Static Regeneration) with 10-minute cache

2. **Blog Detail Page (`/[locale]/blog/[slug]/page.tsx`)**
   - Fetches single post by slug and locale
   - Fetches all content blocks for the post
   - Generates SEO metadata dynamically
   - Implements ISR with 10-minute cache
   - Shows error page if post not found or API fails

3. **BlogPostCard Component (`components/BlogPostCard.tsx`)**
   - Reusable card component for blog list
   - Shows post preview information
   - Handles image loading errors with fallback
   - Links to detail page

4. **NotionBlogContent Component (`components/NotionBlogContent.tsx`)**
   - Container for blog post detail page
   - Displays post metadata (title, date, reading time, keywords)
   - Renders excerpt in styled box
   - Includes navigation (back to list, footer CTA)
   - Estimates reading time based on content blocks

5. **NotionBlockRenderer Component (`components/NotionBlockRenderer.tsx`)**
   - Recursively renders Notion blocks as React components
   - Supports 20+ Notion block types
   - Applies consistent styling via Tailwind CSS
   - Handles nested blocks (lists, toggles, columns)

#### API Layer

1. **Type-Safe Notion Client (`lib/notion.ts`)**
   - Wraps official `@notionhq/client` SDK
   - Implements Zod schemas for runtime validation
   - Provides error handling and logging
   - Exports convenience functions:
     - `getPublishedBlogPosts(language?)`
     - `getBlogPostBySlug(slug, language?)`
     - `getBlogPostContent(pageId)`
   - Defines TypeScript interfaces for type safety

2. **Business Logic Layer (`lib/notion-blog.ts`)**
   - Higher-level functions for blog operations
   - Provides backward compatibility with old blog system
   - Exports helper functions:
     - `getNotionBlogPosts(locale)`
     - `getNotionBlogPost(slug, locale)`
     - `getNotionBlogSlugs()`
     - `convertNotionPostToBlogPost()`
     - `generateNotionBlogMetadata()`

#### Type Definitions

Located in `src/types/blog.ts`:
- `NotionBlogPost`: Main blog post interface
- `NotionBlock`: Content block interface
- `BlogPostStatusType`: Enum for post status
- `SupportedLanguageType`: Enum for languages

---

## Content Workflow

### Data Loading Flow

#### 1. Blog List Page Load

```
User visits /en/blog
        ↓
Next.js Server Component renders
        ↓
Calls getNotionBlogPosts(locale='en')
        ↓
lib/notion-blog.ts determines language (EN)
        ↓
lib/notion.ts queries Notion API
        ↓
Filter: status = Published AND language = en
Sort: Published_at descending
        ↓
Returns array of blog post metadata (NO content blocks)
        ↓
Page renders BlogPostCard components
        ↓
ISR caches for 10 minutes (revalidate = 600)
```

**Performance:**
- Fast initial load (metadata only, no content blocks)
- Lightweight response (~1-2KB per post)
- Cached for 10 minutes to reduce API calls

#### 2. Blog Detail Page Load

```
User clicks on blog post card
        ↓
Navigates to /en/blog/before-renting-guide
        ↓
Next.js Server Component renders
        ↓
Calls getNotionBlogPost(slug='before-renting-guide', locale='en')
        ↓
lib/notion-blog.ts queries post by slug + language
        ↓
lib/notion.ts:
  1. getBlogPostBySlug() → fetches metadata
  2. getBlogPostContent() → recursively fetches ALL content blocks
        ↓
Returns { post: BlogPost, blocks: NotionBlock[] }
        ↓
NotionBlogContent component renders
        ↓
NotionBlockRenderer recursively renders each block
        ↓
ISR caches for 10 minutes (revalidate = 600)
```

**Performance:**
- Heavier load (includes all content blocks)
- Recursive fetching for nested blocks
- Cached for 10 minutes after first request
- Subsequent visits within 10 minutes are instant (served from cache)

### Caching Strategy

The system uses **Incremental Static Regeneration (ISR)** for optimal performance:

```typescript
// In page components
export const revalidate = 600; // 10 minutes
```

**How it works:**
1. **First Request:** Page is generated server-side, response is cached
2. **Within 10 minutes:** Cached version is served instantly
3. **After 10 minutes:** Next request triggers background regeneration
4. **Stale-While-Revalidate:** User gets cached version while new version generates

**Benefits:**
- Near-instant page loads for most users
- Reduced Notion API calls (cost and rate limits)
- Fresh content updates every 10 minutes
- No build step required for content updates

**Manual Cache Clear:**
```bash
# Restart dev server to clear cache in development
pnpm dev

# In production, wait 10 minutes or redeploy
```

### Error Handling

The system implements graceful error handling at multiple levels:

#### 1. API Level Errors

**Custom Error Classes:**
- `NotionApiError`: Notion API failures (network, authentication, rate limits)
- `NotionValidationError`: Data validation failures (missing fields, invalid types)

**Example:**
```typescript
try {
  const posts = await getPublishedBlogPosts(language);
} catch (error) {
  if (error instanceof NotionApiError) {
    // Log and handle API errors
    console.error('Notion API error:', error.message);
    return [];
  }
}
```

#### 2. Page Level Errors

**Empty State (List Page):**
```tsx
{posts.length === 0 ? (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
    <h3>暂无文章</h3>
    <p>请先在 Notion 中创建博客文章，并确保环境变量配置正确。</p>
    <p>查看 NOTION_BLOG.md 了解详细设置步骤。</p>
  </div>
) : (
  // Render posts
)}
```

**Post Not Found (Detail Page):**
```tsx
if (!result) {
  notFound(); // Next.js 404 page
}
```

**API Failure (Detail Page):**
```tsx
<div className="bg-red-50 border border-red-200 rounded-lg p-8">
  <h1>加载文章时出错</h1>
  <p>无法从 Notion 加载文章内容。请检查：</p>
  <ul>
    <li>• Notion Token 是否有效</li>
    <li>• 数据库权限是否正确</li>
    <li>• 文章是否已发布</li>
    <li>• 网络连接是否正常</li>
  </ul>
</div>
```

---

## Supported Content Types

The NotionBlockRenderer component supports the following Notion block types:

### Text Blocks

#### 1. **Paragraph** (`paragraph`)
- Basic text content
- Supports inline formatting (bold, italic, code, links)
- Empty paragraphs render as blank lines

**Example:**
```
This is a paragraph with **bold** and *italic* text.
```

#### 2. **Heading 1** (`heading_1`)
- Main section headings
- Rendered as `<h1>` with large, bold styling

**Example:**
```
# This is a Main Heading
```

#### 3. **Heading 2** (`heading_2`)
- Subsection headings
- Rendered as `<h2>` with medium, semibold styling

**Example:**
```
## This is a Subheading
```

#### 4. **Heading 3** (`heading_3`)
- Sub-subsection headings
- Rendered as `<h3>` with smaller, semibold styling

**Example:**
```
### This is a Minor Heading
```

### List Blocks

#### 4. **Bulleted List** (`bulleted_list_item`)
- Unordered list items
- Supports nesting (children)

**Example:**
```
- First item
- Second item
  - Nested item
```

#### 5. **Numbered List** (`numbered_list_item`)
- Ordered list items
- Supports nesting (children)

**Example:**
```
1. First step
2. Second step
   1. Sub-step
```

#### 6. **To-Do List** (`to_do`)
- Checklist items with checkbox
- Checked items show strikethrough

**Example:**
```
☐ Unchecked task
☑ Completed task
```

### Special Blocks

#### 7. **Quote** (`quote`)
- Block quotes with left border
- Styled with light blue background

**Example:**
```
> This is a quote or important note
```

#### 8. **Callout** (`callout`)
- Highlighted boxes with emoji icon
- Styled with yellow background (default)

**Example:**
```
💡 This is a callout with important information
```

#### 9. **Code Block** (`code`)
- Syntax-highlighted code
- Supports language specification
- Monospace font with gray background

**Example:**
````
```javascript
function hello() {
  console.log("Hello World");
}
```
````

#### 10. **Divider** (`divider`)
- Horizontal rule
- Visual separator between sections

**Example:**
```
---
```

#### 11. **Toggle** (`toggle`)
- Collapsible content section
- Rendered as `<details>` element
- Supports nested content

**Example:**
```
▶ Click to expand
  Hidden content here
```

### Media Blocks

#### 12. **Image** (`image`)
- Embedded images (external or uploaded)
- Responsive sizing with Next.js Image component
- Optional captions

**Example:**
```
[Image]
Caption: This is an image caption
```

#### 13. **Video** (`video`)
- Embedded videos (external or uploaded)
- HTML5 video player with controls

**Example:**
```
[Video]
Caption: Video description
```

#### 14. **File** (`file`)
- Downloadable files
- Rendered as download button

**Example:**
```
📎 Download: document.pdf
```

#### 15. **Bookmark** (`bookmark`)
- Link preview cards
- Shows URL and optional caption

**Example:**
```
🔗 https://example.com
Description of the link
```

### Layout Blocks

#### 16. **Table** (`table` + `table_row`)
- Multi-column tables
- Responsive with horizontal scroll
- Bordered styling

**Example:**
```
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

#### 17. **Column List** (`column_list` + `column`)
- Multi-column layouts
- Responsive (stacks on mobile)
- Supports nested content

**Example:**
```
[ Column 1 ]  [ Column 2 ]
Content here  Content here
```

### Unsupported Blocks

Blocks not yet supported will show a warning:

```
⚠ Unsupported content type: {block_type}
```

**Examples:**
- `synced_block` (Synced blocks)
- `template` (Template blocks)
- `link_preview` (Link previews)
- `child_page` (Child pages)
- `child_database` (Child databases)

---

## API Reference

### Main Functions

#### `getNotionBlogPosts(locale?: string): Promise<NotionBlogPost[]>`

Fetches all published blog posts for a specific locale.

**Parameters:**
- `locale` (optional): `'en'` or `'zh'`. Defaults to all languages if not provided.

**Returns:**
- Array of `NotionBlogPost` objects (metadata only, no content blocks)

**Example:**
```typescript
const posts = await getNotionBlogPosts('en');
// Returns: [{ id, slug, title, title_en, excerpt_en, published_at, ... }]
```

**Filters Applied:**
- `status = 'Published'`
- `language = locale` (if provided)

**Sorting:**
- By `published_at` in descending order (newest first)

---

#### `getNotionBlogPost(slug: string, locale?: string): Promise<{ post: NotionBlogPost; blocks: NotionBlock[] } | null>`

Fetches a single blog post with all its content blocks.

**Parameters:**
- `slug` (required): URL slug of the post
- `locale` (optional): `'en'` or `'zh'`

**Returns:**
- Object with `post` (metadata) and `blocks` (content)
- `null` if post not found

**Example:**
```typescript
const result = await getNotionBlogPost('before-renting-guide', 'en');
if (result) {
  const { post, blocks } = result;
  // post: { id, slug, title, ... }
  // blocks: [{ id, type, paragraph, ... }, ...]
}
```

**Filters Applied:**
- `status = 'Published'`
- `slug = slug`
- `language = locale` (if provided)

---

#### `getNotionBlogSlugs(): Promise<string[]>`

Fetches all unique slugs from published posts (for static path generation).

**Returns:**
- Array of slug strings

**Example:**
```typescript
const slugs = await getNotionBlogSlugs();
// Returns: ['before-renting-guide', 'melbourne-housing-tips', ...]
```

---

### Type-Safe Notion Client Functions

#### `getPublishedBlogPosts(language?: SupportedLanguageType): Promise<BlogPost[]>`

Low-level function to query Notion API directly.

**Parameters:**
- `language` (optional): `SupportedLanguage.EN` or `SupportedLanguage.ZH`

**Returns:**
- Array of `BlogPost` objects with validated types

---

#### `getBlogPostBySlug(slug: string, language?: SupportedLanguageType): Promise<BlogPost | null>`

Low-level function to query single post by slug.

**Parameters:**
- `slug` (required): URL slug
- `language` (optional): `SupportedLanguage.EN` or `SupportedLanguage.ZH`

**Returns:**
- `BlogPost` object or `null` if not found

---

#### `getBlogPostContent(pageId: string): Promise<NotionBlock[]>`

Fetches all content blocks for a specific page.

**Parameters:**
- `pageId` (required): Notion page ID

**Returns:**
- Array of `NotionBlock` objects

**Note:** This is called automatically by `getNotionBlogPost()`.

---

### Helper Functions

#### `generateNotionBlogMetadata(post: NotionBlogPost, locale: string)`

Generates Next.js metadata for SEO.

**Returns:**
```typescript
{
  title: string;
  description: string;
  keywords: string;
  openGraph: { ... };
  twitter: { ... };
}
```

---

#### `richTextToHtml(richText: unknown): string`

Converts Notion rich text to HTML string.

**Example:**
```typescript
const html = richTextToHtml([
  { plain_text: "Hello", annotations: { bold: true } }
]);
// Returns: "<strong>Hello</strong>"
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "暂无文章" / No Posts Showing

**Symptoms:**
- Blog list page shows empty state
- Yellow warning box displayed

**Possible Causes:**
- No posts in Notion database
- Posts not marked as "Published"
- Environment variables not configured
- Language filter mismatch

**Solutions:**
1. **Check Notion database:**
   - Open your Notion database
   - Verify at least one post exists
   - Ensure `status = Published`
   - Verify `language` matches your locale (`en` or `zh`)

2. **Verify environment variables:**
   ```bash
   # Check .env.local file
   cat packages/frontend/.env.local
   
   # Should contain:
   # NOTION_TOKEN="ntn_..."
   # NOTION_DATABASE_ID="..."
   ```

3. **Test API connection:**
   ```bash
   # Restart dev server
   cd packages/frontend
   pnpm dev
   
   # Check console for errors
   ```

4. **Verify database permissions:**
   - Go to Notion database
   - Click "Share" button
   - Ensure your integration has access

---

#### 2. "Post Not Found" / 404 Error

**Symptoms:**
- Clicking blog card leads to 404 page
- Detail page shows "not found" error

**Possible Causes:**
- Slug mismatch between list and detail
- Post changed to Draft/Archived after list was cached
- Language filter issue (post in different language)

**Solutions:**
1. **Verify slug:**
   - Open the post in Notion
   - Check the `slug` property matches the URL
   - Ensure no typos or special characters

2. **Check post status:**
   - Ensure `status = Published`
   - Ensure `language` matches locale

3. **Clear cache:**
   ```bash
   # Restart dev server
   pnpm dev
   ```

4. **Check URL:**
   - Ensure URL format: `/en/blog/{slug}` or `/zh/blog/{slug}`
   - Slug should match exactly (case-sensitive)

---

#### 3. "Notion API Error" / Connection Failed

**Symptoms:**
- Red error box on detail page
- Console shows Notion API errors
- "加载文章时出错" message

**Possible Causes:**
- Invalid Notion token
- Expired integration
- Network connectivity issues
- Rate limiting

**Solutions:**
1. **Verify Notion token:**
   - Go to https://www.notion.so/my-integrations
   - Check if integration is active
   - Regenerate token if needed
   - Update `.env.local` with new token

2. **Check token format:**
   ```bash
   # Token should start with "ntn_"
   # Length: ~50 characters
   NOTION_TOKEN="ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

3. **Test API access:**
   ```bash
   # Use curl to test API
   curl -X POST https://api.notion.com/v1/databases/YOUR_DB_ID/query \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Notion-Version: 2022-06-28" \
     -H "Content-Type: application/json"
   ```

4. **Check rate limits:**
   - Notion has rate limits (3 requests/second)
   - Wait a few minutes if hitting limits
   - Implement exponential backoff in code

---

#### 4. Content Not Rendering / Blank Page

**Symptoms:**
- Title and metadata show, but no content
- Blocks not rendering properly
- Console shows rendering errors

**Possible Causes:**
- Unsupported block types
- Missing required properties in blocks
- React rendering errors

**Solutions:**
1. **Check browser console:**
   - Open DevTools (F12)
   - Look for React errors or warnings
   - Check for "不支持的块类型" warnings

2. **Simplify content:**
   - Remove complex blocks temporarily
   - Test with simple paragraph text
   - Add blocks back one by one

3. **Check block types:**
   - Refer to [Supported Content Types](#supported-content-types)
   - Replace unsupported blocks with alternatives

4. **Restart dev server:**
   ```bash
   pnpm dev
   ```

---

#### 5. Images Not Loading / Broken Images

**Symptoms:**
- Image placeholders showing
- Fallback images displayed
- Console shows 403/404 errors

**Possible Causes:**
- Expired Notion file URLs
- External image URLs blocked
- CORS issues
- Next.js Image configuration

**Solutions:**
1. **Re-upload images:**
   - Delete image block in Notion
   - Upload image again
   - Notion generates new URL

2. **Use external image hosting:**
   - Upload images to imgur, cloudinary, etc.
   - Use "Embed" block with external URL

3. **Check Next.js config:**
   ```typescript
   // next.config.mjs
   images: {
     domains: [
       'www.notion.so',
       's3.us-west-2.amazonaws.com',
       'images.unsplash.com',
     ],
   }
   ```

4. **Test image URL:**
   ```bash
   # Check if URL is accessible
   curl -I "IMAGE_URL"
   ```

---

#### 6. Slow Page Load / Performance Issues

**Symptoms:**
- Pages take several seconds to load
- Blog list loads slowly
- High server response time

**Possible Causes:**
- Not using ISR cache
- Too many API calls
- Large content blocks
- Missing `revalidate` export

**Solutions:**
1. **Verify ISR configuration:**
   ```typescript
   // In page.tsx files
   export const revalidate = 600; // 10 minutes
   ```

2. **Check cache behavior:**
   - First load should be slow (expected)
   - Subsequent loads should be fast (cached)
   - Wait 10 minutes for cache refresh

3. **Optimize content:**
   - Limit image sizes in Notion
   - Reduce number of blocks per post
   - Split long posts into parts

4. **Monitor Notion API calls:**
   ```bash
   # Check console for API call frequency
   # Should see "Fetching from Notion" only on first load
   ```

---

#### 7. Bilingual Content Not Working

**Symptoms:**
- Only English or Chinese posts showing
- Language switching doesn't work
- Wrong language content displayed

**Possible Causes:**
- `language` property not set correctly
- Slugs don't match between language versions
- Locale routing issue

**Solutions:**
1. **Verify language property:**
   - Open both language versions in Notion
   - Check `language = zh` for Chinese
   - Check `language = en` for English

2. **Verify slugs match:**
   ```
   Chinese post:  slug = "before-renting-guide", language = "zh"
   English post:  slug = "before-renting-guide", language = "en"
   ```

3. **Test language switching:**
   - Click language switcher in header
   - URL should change: `/en/blog` ↔ `/zh/blog`
   - Posts should filter by language

4. **Check routing:**
   ```bash
   # Test both URLs
   http://localhost:3000/en/blog
   http://localhost:3000/zh/blog
   ```

---

#### 8. Environment Variables Not Loading

**Symptoms:**
- "环境变量配置错误" error
- "NOTION_TOKEN 不能为空" error
- API calls failing

**Possible Causes:**
- `.env.local` file missing
- Wrong file location
- Variables not prefixed correctly
- Server not restarted

**Solutions:**
1. **Check file location:**
   ```bash
   # File should be here:
   packages/frontend/.env.local
   
   # NOT here:
   .env.local (root directory)
   packages/frontend/.env
   ```

2. **Verify file contents:**
   ```bash
   cat packages/frontend/.env.local
   
   # Should show:
   # NOTION_TOKEN="ntn_..."
   # NOTION_DATABASE_ID="..."
   ```

3. **Check variable names:**
   ```env
   # Correct:
   NOTION_TOKEN="..."
   NOTION_DATABASE_ID="..."
   
   # Wrong:
   NEXT_PUBLIC_NOTION_TOKEN="..."  # Don't use NEXT_PUBLIC_
   ```

4. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```

---

### Debug Checklist

When troubleshooting, work through this checklist:

- [ ] Notion integration exists and is active
- [ ] Integration has access to the database
- [ ] Database ID is correct (32 characters)
- [ ] Notion token is valid and starts with `ntn_`
- [ ] Environment variables are in `packages/frontend/.env.local`
- [ ] At least one post exists in Notion
- [ ] Post has `status = Published`
- [ ] Post has correct `language` value (`en` or `zh`)
- [ ] Required properties are filled (Title, slug, etc.)
- [ ] Slug is unique and URL-friendly
- [ ] Dev server has been restarted recently
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls
- [ ] Cache has been cleared (wait 10 min or restart)

---

## Best Practices

### Content Creation

#### 1. Writing Quality Content

**Title Guidelines:**
- Keep titles under 60 characters for SEO
- Use clear, descriptive language
- Match tone between Chinese and English versions
- Include relevant keywords naturally

**Excerpt Guidelines:**
- Write compelling 100-200 character summaries
- Highlight the main value proposition
- Avoid clickbait or misleading descriptions
- End with a question or call to action

**Content Structure:**
- Start with an engaging introduction
- Use headings to organize sections (H2, H3)
- Keep paragraphs short (3-4 sentences)
- Use lists for easy scanning
- Add images to break up text
- End with a conclusion or call to action

#### 2. SEO Optimization

**Slug Best Practices:**
```
✅ Good:
- before-renting-guide
- melbourne-housing-tips
- student-visa-requirements

❌ Bad:
- Before-Renting-Guide (uppercase)
- before_renting_guide (underscores)
- guide-1 (not descriptive)
- 租房指南 (non-ASCII characters)
```

**Keywords Best Practices:**
- Use 3-5 relevant keywords per post
- Include primary keyword in title and excerpt
- Create consistent keyword options in Notion
- Use specific, not generic keywords
- Examples: "melbourne-rental", "student-housing", "lease-agreement"

**Metadata Optimization:**
- Fill all required fields completely
- Use descriptive, unique titles
- Write compelling excerpts
- Set accurate publication dates
- Choose appropriate keywords

#### 3. Image Management

**Image Guidelines:**
- Use high-quality, relevant images
- Optimize file size before uploading (< 1MB)
- Add descriptive alt text/captions
- Use consistent aspect ratios (16:9 for covers)
- Prefer external hosting (imgur, cloudinary) for better performance

**Image Placement:**
- Add cover image at top of post
- Place images near relevant text
- Use images to break up long sections
- Don't overload posts with too many images

#### 4. Bilingual Content Strategy

**Consistency:**
- Create both language versions together
- Keep content structure identical
- Use same slug for both versions
- Publish both versions simultaneously
- Update both versions when making changes

**Cultural Adaptation:**
- Adapt examples for each audience
- Use culturally appropriate tone
- Translate idioms, don't just copy
- Consider different reading patterns
- Respect cultural sensitivities

**Quality Assurance:**
- Have native speakers review content
- Test language switching
- Verify both versions render correctly
- Check that images are culturally appropriate

### Workflow Optimization

#### 1. Editorial Workflow

**Draft → Review → Publish Process:**

1. **Draft Phase:**
   - Set `status = Draft`
   - Write content freely
   - Don't worry about perfection

2. **Review Phase:**
   - Add "Review Status" property (optional)
   - Share with team for feedback
   - Make revisions

3. **Pre-Publish Checklist:**
   - [ ] All required fields filled
   - [ ] Bilingual versions match structure
   - [ ] Images load correctly
   - [ ] No spelling/grammar errors
   - [ ] Links work correctly
   - [ ] SEO metadata optimized

4. **Publish:**
   - Set `status = Published`
   - Set `Published_at` date
   - Wait ~10 minutes for cache refresh

#### 2. Content Maintenance

**Regular Tasks:**
- Review old posts quarterly
- Update outdated information
- Fix broken links
- Refresh images if expired
- Update SEO keywords based on performance
- Archive irrelevant posts (`status = Archived`)

**Version Control:**
- Use Notion's version history for tracking changes
- Add "Last Updated" date property (optional)
- Keep changelog in Notion (optional)

#### 3. Performance Monitoring

**Key Metrics:**
- Page load time (should be < 3 seconds)
- Notion API response time
- Cache hit rate (should be > 90%)
- Number of API calls per day

**Optimization Tips:**
- Keep posts under 50 blocks
- Use external image hosting
- Minimize use of complex blocks (tables, columns)
- Monitor Notion API rate limits

### Development Best Practices

#### 1. Code Organization

**File Structure:**
```
src/
├── app/
│   └── [locale]/
│       └── blog/
│           ├── page.tsx           # List page
│           └── [slug]/
│               └── page.tsx       # Detail page
├── components/
│   ├── BlogPostCard.tsx
│   ├── NotionBlogContent.tsx
│   └── NotionBlockRenderer.tsx
├── lib/
│   ├── notion.ts                  # Low-level API
│   └── notion-blog.ts             # Business logic
└── types/
    └── blog.ts                    # Type definitions
```

#### 2. Error Handling

**Always Handle Errors:**
```typescript
try {
  const posts = await getNotionBlogPosts(locale);
  // Success case
} catch (error) {
  if (error instanceof NotionApiError) {
    // Handle API errors
  } else if (error instanceof NotionValidationError) {
    // Handle validation errors
  } else {
    // Handle unknown errors
  }
}
```

**Provide Helpful Error Messages:**
- Show what went wrong
- Suggest how to fix it
- Include links to documentation
- Log errors for debugging

#### 3. Type Safety

**Use Zod for Runtime Validation:**
```typescript
const result = BlogPostSchema.safeParse(data);
if (!result.success) {
  throw new NotionValidationError('Validation failed', result.error);
}
return result.data; // Type-safe!
```

**Avoid Type Assertions:**
```typescript
// ❌ Bad:
const post = data as BlogPost;

// ✅ Good:
const result = BlogPostSchema.safeParse(data);
if (result.success) {
  const post = result.data;
}
```

#### 4. Testing

**Test Key Scenarios:**
- [ ] Blog list loads with posts
- [ ] Blog list shows empty state
- [ ] Blog detail loads correctly
- [ ] 404 page shows for invalid slugs
- [ ] Language switching works
- [ ] Images load correctly
- [ ] Error pages display properly
- [ ] Cache behavior works as expected

**Manual Testing Checklist:**
```bash
# 1. Test list page
curl http://localhost:3000/en/blog

# 2. Test detail page
curl http://localhost:3000/en/blog/your-slug

# 3. Test language switching
curl http://localhost:3000/zh/blog

# 4. Test 404
curl http://localhost:3000/en/blog/nonexistent

# 5. Test cache (second request should be faster)
time curl http://localhost:3000/en/blog
time curl http://localhost:3000/en/blog
```

---

## Additional Resources

### Official Documentation

- **Notion API:** https://developers.notion.com/
- **Notion SDK:** https://github.com/makenotion/notion-sdk-js
- **Next.js ISR:** https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration
- **Zod Validation:** https://github.com/colinhacks/zod

### Internal Links

- **Repository:** https://github.com/wiperi/qrent
- **Frontend Package:** `packages/frontend/`
- **Blog Components:** `packages/frontend/src/components/`
- **API Layer:** `packages/frontend/src/lib/`

### Support

For questions or issues:
1. Check this documentation first
2. Review the [Troubleshooting](#troubleshooting) section
3. Search existing GitHub issues
4. Create a new issue with detailed information
5. Contact the development team

---

## Changelog

### Version 1.0.0 (2025-10-31)
- Initial Notion blog system implementation
- Type-safe Notion API client
- Support for 20+ Notion block types
- Bilingual content support (Chinese/English)
- ISR caching for performance
- Comprehensive error handling

---

## License

This documentation is part of the Qrent project, licensed under the Non-Commercial License (NCL 1.0). Commercial use requires separate authorization.

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-11-19  
**Maintained By:** Qrent Development Team
