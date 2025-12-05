# Notion 博客系统文档

## 概述

QRent 博客系统使用 Notion 作为内容管理系统（CMS），使内容编辑者能够直接在 Notion 中管理博客文章。系统通过 Notion API 动态获取内容，并在 QRent 网站上进行渲染，同时提供适当的样式和 SEO 优化。

这种方法将内容管理与代码分离，使非技术团队成员能够：
- 在熟悉的 Notion 界面中创建和编辑博客文章
- 独立管理双语内容（中文/英文）
- 无需部署代码即可控制发布状态
- 使用丰富的内容格式（标题、列表、图片、代码块等）

---

## 目录

1. [快速开始](#快速开始)
2. [环境设置](#环境设置)
3. [Notion 数据库配置](#notion-数据库配置)
4. [创建博客文章](#创建博客文章)
5. [系统架构](#系统架构)
6. [内容工作流](#内容工作流)
7. [支持的内容类型](#支持的内容类型)
8. [API 参考](#api-参考)
9. [故障排除](#故障排除)
10. [最佳实践](#最佳实践)

---

## 快速开始

### 前置条件

- 拥有工作区的 Notion 账户
- QRent 仓库的访问权限
- Node.js 18+ 和 pnpm 已安装

### 设置步骤

1. **创建 Notion 集成**
   - 访问 https://www.notion.so/my-integrations
   - 点击"新建集成"
   - 命名为"QRent Blog"
   - 选择你的工作区
   - 复制"内部集成令牌"（以 `ntn_` 开头）

2. **创建 Notion 数据库**
   - 在你的 Notion 工作区中创建新数据库
   - 命名为"QRent Blog"或类似名称
   - 从 URL 中复制数据库 ID（32 个字符的字符串）
   - 与你的集成共享数据库（点击"共享" → 添加你的集成）

3. **配置环境变量**
   
   创建或更新 `packages/frontend/.env.local`：
   
   ```env
   NOTION_TOKEN="your_notion_integration_token"
   NOTION_DATABASE_ID="your_database_id"
   ```

4. **设置数据库架构**
   
   在你的 Notion 数据库中添加以下属性：
   
   | 属性名称 | 类型 | 必需 | 说明 |
   |---------|------|------|------|
   | Title | 标题 | ✅ | 中文标题（默认属性） |
   | Title_en | 文本 | ✅ | 英文标题 |
   | slug | 文本 | ✅ | URL 友好标识符（必须唯一） |
   | status | 选择 | ✅ | 发布状态 |
   | Published_at | 日期 | ✅ | 发布日期 |
   | excerpt_zh | 文本 | ✅ | 中文摘要 |
   | excerpt_en | 文本 | ✅ | 英文摘要 |
   | keywords | 多选 | ✅ | 文章的标签/关键词 |
   | language | 选择 | ✅ | 文章的主要语言 |

5. **配置选择选项**
   
   **对于 `status` 属性：**
   - Published（已发布）
   - Draft（草稿）
   - Archived（已归档）
   
   **对于 `language` 属性：**
   - zh
   - en

6. **启动开发服务器**
   
   ```bash
   cd packages/frontend
   pnpm dev
   ```
   
   访问 http://localhost:3000/en/blog 或 http://localhost:3000/zh/blog

---

## 环境设置

### 必需的环境变量

在 `packages/frontend/.env.local` 中配置：

```env
# Notion API Token - 从 https://www.notion.so/my-integrations 获取
NOTION_TOKEN="ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Notion Database ID - 从数据库 URL 获取
# URL 格式：https://www.notion.so/{workspace}/{DATABASE_ID}?v={view_id}
NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 安全注意事项

⚠️ **重要安全提示：**

- 切勿将 `.env.local` 提交到 git（已在 `.gitignore` 中）
- 为开发和生产使用不同的 Notion 令牌
- 仅限制集成对所需数据库的权限
- 定期轮换令牌以确保安全
- 在生产环境中，使用托管平台的环境变量（如 Vercel、Netlify）

### 测试连接

配置环境变量后，测试连接：

```bash
cd packages/frontend
pnpm dev
```

检查控制台是否有错误。如果配置正确，你应该看不到与 Notion 相关的错误。

---

## Notion 数据库配置

### 数据库结构

你的 Notion 数据库作为所有博客文章的内容存储库。数据库中的每个页面代表一篇博客文章。

### 必需属性（字段）

#### 1. Title（标题类型）
- **类型：** 标题（Notion 默认属性）
- **用途：** 中文主标题
- **示例：** "租房前期：信息与渠道"
- **验证：** 不能为空
- **显示位置：** 博客列表和文章详情页（当语言环境为中文时）

#### 2. Title_en（文本类型）
- **类型：** 富文本
- **用途：** 英文标题
- **示例：** "Before Renting: Information and Channels"
- **验证：** 不能为空
- **显示位置：** 博客列表和文章详情页（当语言环境为英文时）

#### 3. slug（文本类型）
- **类型：** 富文本
- **用途：** URL 友好标识符
- **示例：** "before-renting-guide"
- **验证：** 
  - 必须在所有文章中唯一
  - 仅使用小写字母、数字和连字符
  - 不能有空格或特殊字符
- **用途：** 形成 URL：`/blog/before-renting-guide`
- **提示：** 保持简短且具有描述性

#### 4. status（选择类型）
- **类型：** 选择
- **用途：** 控制文章可见性
- **选项：**
  - **Published（已发布）：** 文章在网站上可见
  - **Draft（草稿）：** 文章隐藏（用于进行中的工作）
  - **Archived（已归档）：** 文章隐藏（用于旧内容）
- **验证：** 必须是三个选项之一
- **注意：** 只有状态为"Published"的文章会出现在网站上

#### 5. Published_at（日期类型）
- **类型：** 日期
- **用途：** 发布日期（影响排序）
- **示例：** "2025-10-30"
- **验证：** 已发布文章不能为空
- **用途：** 
  - 显示在博客卡片和文章详情页
  - 用于排序文章（最新的在前）
- **提示：** 使用未来日期可以安排内容

#### 6. excerpt_zh（文本类型）
- **类型：** 富文本
- **用途：** 中文摘要/预览文本
- **示例：** "澳大利亚的租房市场以其竞争激烈著称..."
- **验证：** 可以为空，但建议填写
- **显示位置：** 
  - 博客列表卡片中作为预览
  - 文章顶部作为摘要框
- **建议长度：** 100-200 个字符

#### 7. excerpt_en（文本类型）
- **类型：** 富文本
- **用途：** 英文摘要/预览文本
- **示例：** "Australia's rental market is known for being highly competitive..."
- **验证：** 可以为空，但建议填写
- **显示位置：** 
  - 博客列表卡片中作为预览（英文语言环境）
  - 文章顶部作为摘要框
- **建议长度：** 100-200 个字符

#### 8. keywords（多选类型）
- **类型：** 多选
- **用途：** 文章的标签/类别
- **示例：** ["guide", "rent", "help"]
- **验证：** 可以为空，但建议有 3-5 个关键词
- **显示位置：** 文章详情页上的标签
- **用途：** 有助于 SEO 和内容组织
- **提示：** 创建一致的关键词选项以便更好地组织

#### 9. language（选择类型）
- **类型：** 选择
- **用途：** 文章内容的主要语言
- **选项：**
  - **zh：** 中文内容
  - **en：** 英文内容
- **验证：** 必须是"zh"或"en"
- **用途：** 
  - 根据用户的语言环境过滤文章
  - 确保显示正确的语言内容
- **注意：** 对于双语内容，创建两个具有相同 slug 但不同 language 值的单独文章

### 可选属性

你可以添加额外的属性供内部使用（它们不会影响网站）：
- **Author（作者）：** 人员属性，用于跟踪文章作者
- **Review Status（审核状态）：** 选择属性，用于编辑工作流
- **Notes（备注）：** 文本属性，用于内部评论
- **Cover Image（封面图片）：** 文件和媒体属性（当前使用回退图片）

---

## 创建博客文章

### 分步指南

#### 1. 在数据库中创建新页面

1. 在 Notion 中打开你的 QRent Blog 数据库
2. 点击"+ 新建"创建新页面
3. 页面打开时会有一个空白画布

#### 2. 填写必需属性

点击每个属性字段并填写信息：

```
Title: 租房前期：信息与渠道
Title_en: Before Renting: Information and Channels
slug: before-renting-guide
status: Draft（准备好后更改为 Published）
Published_at: 2025-10-30
excerpt_zh: 澳大利亚的租房市场以其竞争激烈著称，了解正确的信息渠道是成功租房的第一步。
excerpt_en: Australia's rental market is known for being competitive. Understanding the right information channels is the first step to successful renting.
keywords: guide, rent, help, australia
language: zh
```

#### 3. 编写内容

在页面内部，使用 Notion 的丰富格式编写内容：

**示例结构：**
```
# 主要标题（标题 1）

这是段落文本。可以使用**粗体**和*斜体*。

## 二级标题（标题 2）

### 三级标题（标题 3）

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

#### 4. 添加图片和媒体

- **图片：** 直接将图片拖放到内容中
- **视频：** 使用 Notion 的视频块嵌入
- **文件：** 使用文件块添加可下载文件
- **标题：** 为图片添加标题以提高可访问性

#### 5. 预览和发布

1. 在工作时保持 `status` 为"Draft"
2. 在本地开发服务器上预览
3. 根据需要进行调整
4. 准备好后，将 `status` 更改为"Published"
5. 等待约 10 分钟以刷新缓存（或重启开发服务器）

### 创建双语内容

对于两种语言的内容：

1. **创建两个单独的页面**（每种语言一个）
2. **对两个页面使用相同的 Slug**
3. **设置不同的 `language` 值：**
   - 中文文章：`language = zh`
   - 英文文章：`language = en`
4. **独立填写所有字段**
5. **在两个版本之间匹配内容结构**

**示例：**
```
页面 1：
- Title: 租房前期：信息与渠道
- slug: before-renting-guide
- language: zh
- （中文内容）

页面 2：
- Title_en: Before Renting: Information and Channels
- slug: before-renting-guide
- language: en
- （英文内容）
```

用户将根据其语言环境设置自动看到正确的语言版本。

---

## 系统架构

### 高级概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                               │
│  (http://qrent.rent/en/blog 或 http://qrent.rent/zh/blog)       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP 请求
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js 前端                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  博客页面（App Router）                                   │   │
│  │  - /[locale]/blog/page.tsx（列表）                       │   │
│  │  - /[locale]/blog/[slug]/page.tsx（详情）               │   │
│  └────────────┬─────────────────────────────────────────────┘   │
│               │                                                  │
│               │ 服务器端 API 调用                                │
│               ▼                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Notion API 层                                            │   │
│  │  - lib/notion.ts（类型安全客户端）                        │   │
│  │  - lib/notion-blog.ts（业务逻辑）                         │   │
│  └────────────┬─────────────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────────────┘
                │
                │ HTTPS API 调用
                │ （Bearer 令牌认证）
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Notion API                                  │
│  - 通过集成令牌认证                                              │
│  - 数据库查询 API                                                │
│  - 块子级 API                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 组件架构

#### 前端组件

1. **博客列表页（`/[locale]/blog/page.tsx`）**
   - 获取当前语言环境的所有已发布文章
   - 显示带有标题、摘要、日期和图片的博客卡片
   - 处理空状态并提供有用的错误消息
   - 实现 ISR（增量静态再生），缓存 10 分钟

2. **博客详情页（`/[locale]/blog/[slug]/page.tsx`）**
   - 根据 slug 和语言环境获取单篇文章
   - 获取文章的所有内容块
   - 动态生成 SEO 元数据
   - 实现 ISR，缓存 10 分钟
   - 如果未找到文章或 API 失败，显示错误页面

3. **BlogPostCard 组件（`components/BlogPostCard.tsx`）**
   - 博客列表的可重用卡片组件
   - 显示文章预览信息
   - 处理图片加载错误并提供回退
   - 链接到详情页

4. **NotionBlogContent 组件（`components/NotionBlogContent.tsx`）**
   - 博客文章详情页的容器
   - 显示文章元数据（标题、日期、阅读时间、关键词）
   - 在样式框中呈现摘要
   - 包括导航（返回列表、页脚 CTA）
   - 根据内容块估算阅读时间

5. **NotionBlockRenderer 组件（`components/NotionBlockRenderer.tsx`）**
   - 递归地将 Notion 块呈现为 React 组件
   - 支持 20 多种 Notion 块类型
   - 通过 Tailwind CSS 应用一致的样式
   - 处理嵌套块（列表、折叠、列）

#### API 层

1. **类型安全的 Notion 客户端（`lib/notion.ts`）**
   - 包装官方 `@notionhq/client` SDK
   - 实现 Zod 架构进行运行时验证
   - 提供错误处理和日志记录
   - 导出便捷函数：
     - `getPublishedBlogPosts(language?)`
     - `getBlogPostBySlug(slug, language?)`
     - `getBlogPostContent(pageId)`
   - 定义 TypeScript 接口以确保类型安全

2. **业务逻辑层（`lib/notion-blog.ts`）**
   - 博客操作的高级函数
   - 提供与旧博客系统的向后兼容性
   - 导出辅助函数：
     - `getNotionBlogPosts(locale)`
     - `getNotionBlogPost(slug, locale)`
     - `getNotionBlogSlugs()`
     - `convertNotionPostToBlogPost()`
     - `generateNotionBlogMetadata()`

#### 类型定义

位于 `src/types/blog.ts`：
- `NotionBlogPost`：主要博客文章接口
- `NotionBlock`：内容块接口
- `BlogPostStatusType`：文章状态枚举
- `SupportedLanguageType`：语言枚举

---

## 内容工作流

### 数据加载流程

#### 1. 博客列表页加载

```
用户访问 /en/blog
        ↓
Next.js 服务器组件渲染
        ↓
调用 getNotionBlogPosts(locale='en')
        ↓
lib/notion-blog.ts 确定语言（EN）
        ↓
lib/notion.ts 查询 Notion API
        ↓
过滤：status = Published AND language = en
排序：Published_at 降序
        ↓
返回博客文章元数据数组（无内容块）
        ↓
页面渲染 BlogPostCard 组件
        ↓
ISR 缓存 10 分钟（revalidate = 600）
```

**性能：**
- 快速初始加载（仅元数据，无内容块）
- 轻量级响应（每篇文章约 1-2KB）
- 缓存 10 分钟以减少 API 调用

#### 2. 博客详情页加载

```
用户点击博客文章卡片
        ↓
导航到 /en/blog/before-renting-guide
        ↓
Next.js 服务器组件渲染
        ↓
调用 getNotionBlogPost(slug='before-renting-guide', locale='en')
        ↓
lib/notion-blog.ts 通过 slug + language 查询文章
        ↓
lib/notion.ts：
  1. getBlogPostBySlug() → 获取元数据
  2. getBlogPostContent() → 递归获取所有内容块
        ↓
返回 { post: BlogPost, blocks: NotionBlock[] }
        ↓
NotionBlogContent 组件渲染
        ↓
NotionBlockRenderer 递归渲染每个块
        ↓
ISR 缓存 10 分钟（revalidate = 600）
```

**性能：**
- 加载较重（包括所有内容块）
- 嵌套块的递归获取
- 第一次请求后缓存 10 分钟
- 10 分钟内的后续访问是即时的（从缓存提供）

### 缓存策略

系统使用**增量静态再生（ISR）**以获得最佳性能：

```typescript
// 在页面组件中
export const revalidate = 600; // 10 分钟
```

**工作原理：**
1. **第一次请求：** 页面在服务器端生成，响应被缓存
2. **10 分钟内：** 立即提供缓存版本
3. **10 分钟后：** 下一个请求触发后台再生
4. **Stale-While-Revalidate：** 用户在生成新版本时获得缓存版本

**优点：**
- 大多数用户的页面加载几乎即时
- 减少 Notion API 调用（成本和速率限制）
- 内容每 10 分钟更新一次
- 内容更新无需构建步骤

**手动清除缓存：**
```bash
# 在开发中重启开发服务器以清除缓存
pnpm dev

# 在生产中，等待 10 分钟或重新部署
```

### 错误处理

系统在多个层面实现优雅的错误处理：

#### 1. API 级错误

**自定义错误类：**
- `NotionApiError`：Notion API 失败（网络、认证、速率限制）
- `NotionValidationError`：数据验证失败（缺少字段、无效类型）

**示例：**
```typescript
try {
  const posts = await getPublishedBlogPosts(language);
} catch (error) {
  if (error instanceof NotionApiError) {
    // 记录并处理 API 错误
    console.error('Notion API 错误:', error.message);
    return [];
  }
}
```

#### 2. 页面级错误

**空状态（列表页）：**
```tsx
{posts.length === 0 ? (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
    <h3>暂无文章</h3>
    <p>请先在 Notion 中创建博客文章，并确保环境变量配置正确。</p>
    <p>查看 NOTION_BLOG.md 了解详细设置步骤。</p>
  </div>
) : (
  // 渲染文章
)}
```

**未找到文章（详情页）：**
```tsx
if (!result) {
  notFound(); // Next.js 404 页面
}
```

**API 失败（详情页）：**
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

## 支持的内容类型

NotionBlockRenderer 组件支持以下 Notion 块类型：

### 文本块

#### 1. **段落**（`paragraph`）
- 基本文本内容
- 支持内联格式（粗体、斜体、代码、链接）
- 空段落呈现为空行

**示例：**
```
这是一个带有**粗体**和*斜体*文本的段落。
```

#### 2. **标题 1**（`heading_1`）
- 主要章节标题
- 呈现为 `<h1>`，带有大号粗体样式

**示例：**
```
# 这是主标题
```

#### 3. **标题 2**（`heading_2`）
- 子章节标题
- 呈现为 `<h2>`，带有中等半粗体样式

**示例：**
```
## 这是子标题
```

#### 4. **标题 3**（`heading_3`）
- 子子章节标题
- 呈现为 `<h3>`，带有较小的半粗体样式

**示例：**
```
### 这是次要标题
```

### 列表块

#### 4. **无序列表**（`bulleted_list_item`）
- 无序列表项
- 支持嵌套（子项）

**示例：**
```
- 第一项
- 第二项
  - 嵌套项
```

#### 5. **有序列表**（`numbered_list_item`）
- 有序列表项
- 支持嵌套（子项）

**示例：**
```
1. 第一步
2. 第二步
   1. 子步骤
```

#### 6. **待办事项列表**（`to_do`）
- 带复选框的清单项
- 已选中的项显示删除线

**示例：**
```
☐ 未完成任务
☑ 已完成任务
```

### 特殊块

#### 7. **引用**（`quote`）
- 带左边框的块引用
- 样式为浅蓝色背景

**示例：**
```
> 这是引用或重要提示
```

#### 8. **提示框**（`callout`）
- 带表情符号图标的突出显示框
- 样式为黄色背景（默认）

**示例：**
```
💡 这是一个包含重要信息的提示框
```

#### 9. **代码块**（`code`）
- 语法高亮代码
- 支持语言规范
- 等宽字体，灰色背景

**示例：**
````
```javascript
function hello() {
  console.log("Hello World");
}
```
````

#### 10. **分隔线**（`divider`）
- 水平线
- 章节之间的视觉分隔符

**示例：**
```
---
```

#### 11. **折叠块**（`toggle`）
- 可折叠内容部分
- 呈现为 `<details>` 元素
- 支持嵌套内容

**示例：**
```
▶ 点击展开
  这里是隐藏内容
```

### 媒体块

#### 12. **图片**（`image`）
- 嵌入图片（外部或上传）
- 使用 Next.js Image 组件的响应式大小
- 可选标题

**示例：**
```
[图片]
标题：这是图片标题
```

#### 13. **视频**（`video`）
- 嵌入视频（外部或上传）
- HTML5 视频播放器，带控件

**示例：**
```
[视频]
标题：视频描述
```

#### 14. **文件**（`file`）
- 可下载文件
- 呈现为下载按钮

**示例：**
```
📎 下载：document.pdf
```

#### 15. **书签**（`bookmark`）
- 链接预览卡片
- 显示 URL 和可选标题

**示例：**
```
🔗 https://example.com
链接描述
```

### 布局块

#### 16. **表格**（`table` + `table_row`）
- 多列表格
- 响应式，带水平滚动
- 边框样式

**示例：**
```
| 标题 1 | 标题 2 |
|--------|--------|
| 单元格 1 | 单元格 2 |
```

#### 17. **列列表**（`column_list` + `column`）
- 多列布局
- 响应式（在移动设备上堆叠）
- 支持嵌套内容

**示例：**
```
[ 列 1 ]  [ 列 2 ]
这里内容  这里内容
```

### 不支持的块

尚不支持的块将显示警告：

```
⚠ 不支持的内容类型：{block_type}
```

**示例：**
- `synced_block`（同步块）
- `template`（模板块）
- `link_preview`（链接预览）
- `child_page`（子页面）
- `child_database`（子数据库）

---

## API 参考

### 主要函数

#### `getNotionBlogPosts(locale?: string): Promise<NotionBlogPost[]>`

获取特定语言环境的所有已发布博客文章。

**参数：**
- `locale`（可选）：`'en'` 或 `'zh'`。如果未提供，默认为所有语言。

**返回：**
- `NotionBlogPost` 对象数组（仅元数据，无内容块）

**示例：**
```typescript
const posts = await getNotionBlogPosts('en');
// 返回：[{ id, slug, title, title_en, excerpt_en, published_at, ... }]
```

**应用的过滤器：**
- `status = 'Published'`
- `language = locale`（如果提供）

**排序：**
- 按 `published_at` 降序（最新的在前）

---

#### `getNotionBlogPost(slug: string, locale?: string): Promise<{ post: NotionBlogPost; blocks: NotionBlock[] } | null>`

获取单篇博客文章及其所有内容块。

**参数：**
- `slug`（必需）：文章的 URL slug
- `locale`（可选）：`'en'` 或 `'zh'`

**返回：**
- 包含 `post`（元数据）和 `blocks`（内容）的对象
- 如果未找到文章，则为 `null`

**示例：**
```typescript
const result = await getNotionBlogPost('before-renting-guide', 'en');
if (result) {
  const { post, blocks } = result;
  // post: { id, slug, title, ... }
  // blocks: [{ id, type, paragraph, ... }, ...]
}
```

**应用的过滤器：**
- `status = 'Published'`
- `slug = slug`
- `language = locale`（如果提供）

---

#### `getNotionBlogSlugs(): Promise<string[]>`

从已发布文章中获取所有唯一的 slug（用于静态路径生成）。

**返回：**
- slug 字符串数组

**示例：**
```typescript
const slugs = await getNotionBlogSlugs();
// 返回：['before-renting-guide', 'melbourne-housing-tips', ...]
```

---

### 类型安全的 Notion 客户端函数

#### `getPublishedBlogPosts(language?: SupportedLanguageType): Promise<BlogPost[]>`

直接查询 Notion API 的低级函数。

**参数：**
- `language`（可选）：`SupportedLanguage.EN` 或 `SupportedLanguage.ZH`

**返回：**
- 带有验证类型的 `BlogPost` 对象数组

---

#### `getBlogPostBySlug(slug: string, language?: SupportedLanguageType): Promise<BlogPost | null>`

通过 slug 查询单篇文章的低级函数。

**参数：**
- `slug`（必需）：URL slug
- `language`（可选）：`SupportedLanguage.EN` 或 `SupportedLanguage.ZH`

**返回：**
- `BlogPost` 对象或 `null`（如果未找到）

---

#### `getBlogPostContent(pageId: string): Promise<NotionBlock[]>`

获取特定页面的所有内容块。

**参数：**
- `pageId`（必需）：Notion 页面 ID

**返回：**
- `NotionBlock` 对象数组

**注意：** 这由 `getNotionBlogPost()` 自动调用。

---

### 辅助函数

#### `generateNotionBlogMetadata(post: NotionBlogPost, locale: string)`

为 SEO 生成 Next.js 元数据。

**返回：**
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

将 Notion 富文本转换为 HTML 字符串。

**示例：**
```typescript
const html = richTextToHtml([
  { plain_text: "Hello", annotations: { bold: true } }
]);
// 返回："<strong>Hello</strong>"
```

---

## 故障排除

### 常见问题和解决方案

#### 1. "暂无文章" / 未显示文章

**症状：**
- 博客列表页显示空状态
- 显示黄色警告框

**可能原因：**
- Notion 数据库中没有文章
- 文章未标记为"Published"
- 环境变量未配置
- 语言过滤器不匹配

**解决方案：**
1. **检查 Notion 数据库：**
   - 打开你的 Notion 数据库
   - 验证至少存在一篇文章
   - 确保 `status = Published`
   - 验证 `language` 与你的语言环境匹配（`en` 或 `zh`）

2. **验证环境变量：**
   ```bash
   # 检查 .env.local 文件
   cat packages/frontend/.env.local
   
   # 应包含：
   # NOTION_TOKEN="ntn_..."
   # NOTION_DATABASE_ID="..."
   ```

3. **测试 API 连接：**
   ```bash
   # 重启开发服务器
   cd packages/frontend
   pnpm dev
   
   # 检查控制台是否有错误
   ```

4. **验证数据库权限：**
   - 访问 Notion 数据库
   - 点击"共享"按钮
   - 确保你的集成有访问权限

---

#### 2. "未找到文章" / 404 错误

**症状：**
- 点击博客卡片导致 404 页面
- 详情页显示"未找到"错误

**可能原因：**
- 列表和详情之间的 slug 不匹配
- 列表缓存后文章更改为 Draft/Archived
- 语言过滤器问题（文章使用不同语言）

**解决方案：**
1. **验证 slug：**
   - 在 Notion 中打开文章
   - 检查 `slug` 属性是否与 URL 匹配
   - 确保没有拼写错误或特殊字符

2. **检查文章状态：**
   - 确保 `status = Published`
   - 确保 `language` 与语言环境匹配

3. **清除缓存：**
   ```bash
   # 重启开发服务器
   pnpm dev
   ```

4. **检查 URL：**
   - 确保 URL 格式：`/en/blog/{slug}` 或 `/zh/blog/{slug}`
   - Slug 应完全匹配（区分大小写）

---

#### 3. "Notion API 错误" / 连接失败

**症状：**
- 详情页上的红色错误框
- 控制台显示 Notion API 错误
- "加载文章时出错"消息

**可能原因：**
- 无效的 Notion 令牌
- 过期的集成
- 网络连接问题
- 速率限制

**解决方案：**
1. **验证 Notion 令牌：**
   - 访问 https://www.notion.so/my-integrations
   - 检查集成是否处于活动状态
   - 如果需要，重新生成令牌
   - 使用新令牌更新 `.env.local`

2. **检查令牌格式：**
   ```bash
   # 令牌应以"ntn_"开头
   # 长度：约 50 个字符
   NOTION_TOKEN="ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

3. **测试 API 访问：**
   ```bash
   # 使用 curl 测试 API
   curl -X POST https://api.notion.com/v1/databases/YOUR_DB_ID/query \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Notion-Version: 2022-06-28" \
     -H "Content-Type: application/json"
   ```

4. **检查速率限制：**
   - Notion 有速率限制（每秒 3 个请求）
   - 如果达到限制，等待几分钟
   - 在代码中实现指数退避

---

#### 4. 内容未渲染 / 空白页

**症状：**
- 标题和元数据显示，但没有内容
- 块未正确渲染
- 控制台显示渲染错误

**可能原因：**
- 不支持的块类型
- 块中缺少必需属性
- React 渲染错误

**解决方案：**
1. **检查浏览器控制台：**
   - 打开 DevTools（F12）
   - 查找 React 错误或警告
   - 检查"不支持的块类型"警告

2. **简化内容：**
   - 暂时删除复杂块
   - 使用简单的段落文本测试
   - 逐个添加块

3. **检查块类型：**
   - 参考[支持的内容类型](#支持的内容类型)
   - 用替代方案替换不支持的块

4. **重启开发服务器：**
   ```bash
   pnpm dev
   ```

---

#### 5. 图片未加载 / 损坏的图片

**症状：**
- 显示图片占位符
- 显示回退图片
- 控制台显示 403/404 错误

**可能原因：**
- Notion 文件 URL 过期
- 外部图片 URL 被阻止
- CORS 问题
- Next.js Image 配置

**解决方案：**
1. **重新上传图片：**
   - 在 Notion 中删除图片块
   - 再次上传图片
   - Notion 生成新 URL

2. **使用外部图片托管：**
   - 将图片上传到 imgur、cloudinary 等
   - 使用"嵌入"块和外部 URL

3. **检查 Next.js 配置：**
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

4. **测试图片 URL：**
   ```bash
   # 检查 URL 是否可访问
   curl -I "IMAGE_URL"
   ```

---

#### 6. 页面加载缓慢 / 性能问题

**症状：**
- 页面加载需要几秒钟
- 博客列表加载缓慢
- 服务器响应时间长

**可能原因：**
- 未使用 ISR 缓存
- API 调用过多
- 大型内容块
- 缺少 `revalidate` 导出

**解决方案：**
1. **验证 ISR 配置：**
   ```typescript
   // 在 page.tsx 文件中
   export const revalidate = 600; // 10 分钟
   ```

2. **检查缓存行为：**
   - 首次加载应该很慢（预期）
   - 后续加载应该很快（已缓存）
   - 等待 10 分钟以刷新缓存

3. **优化内容：**
   - 限制 Notion 中的图片大小
   - 减少每篇文章的块数
   - 将长文章拆分为多个部分

4. **监控 Notion API 调用：**
   ```bash
   # 检查控制台的 API 调用频率
   # 应该只在首次加载时看到"从 Notion 获取"
   ```

---

#### 7. 双语内容无法工作

**症状：**
- 仅显示英文或中文文章
- 语言切换不起作用
- 显示错误的语言内容

**可能原因：**
- `language` 属性设置不正确
- 语言版本之间的 slug 不匹配
- 语言环境路由问题

**解决方案：**
1. **验证语言属性：**
   - 在 Notion 中打开两个语言版本
   - 检查中文的 `language = zh`
   - 检查英文的 `language = en`

2. **验证 slug 匹配：**
   ```
   中文文章：slug = "before-renting-guide", language = "zh"
   英文文章：slug = "before-renting-guide", language = "en"
   ```

3. **测试语言切换：**
   - 点击标题中的语言切换器
   - URL 应更改：`/en/blog` ↔ `/zh/blog`
   - 文章应按语言过滤

4. **检查路由：**
   ```bash
   # 测试两个 URL
   http://localhost:3000/en/blog
   http://localhost:3000/zh/blog
   ```

---

#### 8. 环境变量未加载

**症状：**
- "环境变量配置错误"错误
- "NOTION_TOKEN 不能为空"错误
- API 调用失败

**可能原因：**
- `.env.local` 文件缺失
- 文件位置错误
- 变量前缀不正确
- 服务器未重启

**解决方案：**
1. **检查文件位置：**
   ```bash
   # 文件应在这里：
   packages/frontend/.env.local
   
   # 不在这里：
   .env.local（根目录）
   packages/frontend/.env
   ```

2. **验证文件内容：**
   ```bash
   cat packages/frontend/.env.local
   
   # 应显示：
   # NOTION_TOKEN="ntn_..."
   # NOTION_DATABASE_ID="..."
   ```

3. **检查变量名称：**
   ```env
   # 正确：
   NOTION_TOKEN="..."
   NOTION_DATABASE_ID="..."
   
   # 错误：
   NEXT_PUBLIC_NOTION_TOKEN="..."  # 不要使用 NEXT_PUBLIC_
   ```

4. **重启服务器：**
   ```bash
   # 停止服务器（Ctrl+C）
   pnpm dev
   ```

---

### 调试清单

故障排除时，请检查此清单：

- [ ] Notion 集成存在且处于活动状态
- [ ] 集成有权访问数据库
- [ ] 数据库 ID 正确（32 个字符）
- [ ] Notion 令牌有效且以 `ntn_` 开头
- [ ] 环境变量在 `packages/frontend/.env.local` 中
- [ ] Notion 中至少存在一篇文章
- [ ] 文章的 `status = Published`
- [ ] 文章的 `language` 值正确（`en` 或 `zh`）
- [ ] 必需属性已填写（Title、slug 等）
- [ ] Slug 唯一且 URL 友好
- [ ] 开发服务器最近已重启
- [ ] 浏览器控制台无错误
- [ ] 网络选项卡显示成功的 API 调用
- [ ] 缓存已清除（等待 10 分钟或重启）

---

## 最佳实践

### 内容创建

#### 1. 撰写优质内容

**标题指南：**
- 为了 SEO，标题保持在 60 个字符以内
- 使用清晰、描述性的语言
- 在中英文版本之间匹配语气
- 自然地包含相关关键词

**摘要指南：**
- 编写引人注目的 100-200 个字符摘要
- 突出主要价值主张
- 避免点击诱饵或误导性描述
- 以问题或号召性用语结束

**内容结构：**
- 从引人入胜的介绍开始
- 使用标题组织章节（H2、H3）
- 保持段落简短（3-4 句）
- 使用列表便于扫描
- 添加图片以分隔文本
- 以结论或号召性用语结束

#### 2. SEO 优化

**Slug 最佳实践：**
```
✅ 好的：
- before-renting-guide
- melbourne-housing-tips
- student-visa-requirements

❌ 不好的：
- Before-Renting-Guide（大写）
- before_renting_guide（下划线）
- guide-1（不具描述性）
- 租房指南（非 ASCII 字符）
```

**关键词最佳实践：**
- 每篇文章使用 3-5 个相关关键词
- 在标题和摘要中包含主要关键词
- 在 Notion 中创建一致的关键词选项
- 使用具体的，而非通用的关键词
- 示例："melbourne-rental"、"student-housing"、"lease-agreement"

**元数据优化：**
- 完整填写所有必需字段
- 使用描述性、唯一的标题
- 编写引人注目的摘要
- 设置准确的发布日期
- 选择适当的关键词

#### 3. 图片管理

**图片指南：**
- 使用高质量、相关的图片
- 上传前优化文件大小（< 1MB）
- 添加描述性替代文本/标题
- 使用一致的宽高比（封面使用 16:9）
- 优先使用外部托管（imgur、cloudinary）以获得更好的性能

**图片放置：**
- 在文章顶部添加封面图片
- 将图片放在相关文本附近
- 使用图片分隔长章节
- 不要在文章中添加太多图片

#### 4. 双语内容策略

**一致性：**
- 一起创建两个语言版本
- 保持内容结构相同
- 对两个版本使用相同的 slug
- 同时发布两个版本
- 进行更改时更新两个版本

**文化适应：**
- 为每个受众调整示例
- 使用文化适当的语气
- 翻译习语，不要只是复制
- 考虑不同的阅读模式
- 尊重文化敏感性

**质量保证：**
- 让母语人士审查内容
- 测试语言切换
- 验证两个版本都正确渲染
- 检查图片是否文化适当

### 工作流优化

#### 1. 编辑工作流

**草稿 → 审核 → 发布流程：**

1. **草稿阶段：**
   - 设置 `status = Draft`
   - 自由撰写内容
   - 不用担心完美

2. **审核阶段：**
   - 添加"审核状态"属性（可选）
   - 与团队共享以获取反馈
   - 进行修订

3. **发布前清单：**
   - [ ] 所有必需字段已填写
   - [ ] 双语版本结构匹配
   - [ ] 图片正确加载
   - [ ] 无拼写/语法错误
   - [ ] 链接正常工作
   - [ ] SEO 元数据已优化

4. **发布：**
   - 设置 `status = Published`
   - 设置 `Published_at` 日期
   - 等待约 10 分钟以刷新缓存

#### 2. 内容维护

**定期任务：**
- 每季度审查旧文章
- 更新过时信息
- 修复损坏的链接
- 如果图片过期，刷新图片
- 根据表现更新 SEO 关键词
- 归档不相关的文章（`status = Archived`）

**版本控制：**
- 使用 Notion 的版本历史跟踪更改
- 添加"最后更新"日期属性（可选）
- 在 Notion 中保留更改日志（可选）

#### 3. 性能监控

**关键指标：**
- 页面加载时间（应 < 3 秒）
- Notion API 响应时间
- 缓存命中率（应 > 90%）
- 每天的 API 调用数

**优化提示：**
- 保持文章少于 50 个块
- 使用外部图片托管
- 最小化使用复杂块（表格、列）
- 监控 Notion API 速率限制

### 开发最佳实践

#### 1. 代码组织

**文件结构：**
```
src/
├── app/
│   └── [locale]/
│       └── blog/
│           ├── page.tsx           # 列表页
│           └── [slug]/
│               └── page.tsx       # 详情页
├── components/
│   ├── BlogPostCard.tsx
│   ├── NotionBlogContent.tsx
│   └── NotionBlockRenderer.tsx
├── lib/
│   ├── notion.ts                  # 低级 API
│   └── notion-blog.ts             # 业务逻辑
└── types/
    └── blog.ts                    # 类型定义
```

#### 2. 错误处理

**始终处理错误：**
```typescript
try {
  const posts = await getNotionBlogPosts(locale);
  // 成功情况
} catch (error) {
  if (error instanceof NotionApiError) {
    // 处理 API 错误
  } else if (error instanceof NotionValidationError) {
    // 处理验证错误
  } else {
    // 处理未知错误
  }
}
```

**提供有用的错误消息：**
- 显示出了什么问题
- 建议如何修复
- 包含文档链接
- 记录错误以进行调试

#### 3. 类型安全

**使用 Zod 进行运行时验证：**
```typescript
const result = BlogPostSchema.safeParse(data);
if (!result.success) {
  throw new NotionValidationError('验证失败', result.error);
}
return result.data; // 类型安全！
```

**避免类型断言：**
```typescript
// ❌ 不好：
const post = data as BlogPost;

// ✅ 好的：
const result = BlogPostSchema.safeParse(data);
if (result.success) {
  const post = result.data;
}
```

#### 4. 测试

**测试关键场景：**
- [ ] 博客列表加载文章
- [ ] 博客列表显示空状态
- [ ] 博客详情正确加载
- [ ] 无效 slug 显示 404 页面
- [ ] 语言切换工作
- [ ] 图片正确加载
- [ ] 错误页面正确显示
- [ ] 缓存行为按预期工作

**手动测试清单：**
```bash
# 1. 测试列表页
curl http://localhost:3000/en/blog

# 2. 测试详情页
curl http://localhost:3000/en/blog/your-slug

# 3. 测试语言切换
curl http://localhost:3000/zh/blog

# 4. 测试 404
curl http://localhost:3000/en/blog/nonexistent

# 5. 测试缓存（第二次请求应该更快）
time curl http://localhost:3000/en/blog
time curl http://localhost:3000/en/blog
```

---

## 其他资源

### 官方文档

- **Notion API：** https://developers.notion.com/
- **Notion SDK：** https://github.com/makenotion/notion-sdk-js
- **Next.js ISR：** https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration
- **Zod 验证：** https://github.com/colinhacks/zod

### 内部链接

- **仓库：** https://github.com/wiperi/qrent
- **前端包：** `packages/frontend/`
- **博客组件：** `packages/frontend/src/components/`
- **API 层：** `packages/frontend/src/lib/`

### 支持

如有问题或疑问：
1. 首先查看本文档
2. 查看[故障排除](#故障排除)部分
3. 搜索现有的 GitHub issues
4. 创建包含详细信息的新 issue
5. 联系开发团队

---

## 更新日志

### 版本 1.0.0（2025-10-31）
- 初始 Notion 博客系统实现
- 类型安全的 Notion API 客户端
- 支持 20 多种 Notion 块类型
- 双语内容支持（中文/英文）
- ISR 缓存以提高性能
- 全面的错误处理

---

## 许可证

本文档是 QRent 项目的一部分，根据非商业许可证（NCL 1.0）授权。商业使用需要单独授权。

---

**文档版本：** 1.0.0  
**最后更新：** 2025-11-19  
**维护者：** QRent 开发团队
