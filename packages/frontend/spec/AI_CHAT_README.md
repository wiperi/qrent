# AI 聊天框功能文档

## 概述

本项目已成功集成了一个自定义的AI聊天框，支持桌面端和移动端响应式设计。

## 已实现的功能

### 1. 全局状态管理 (Zustand)

使用 `zustand` 进行全局状态管理，任何组件都可以访问和控制聊天框。

**文件位置**: `src/lib/ai-chat-store.ts`

**主要功能**:
- `openChat()`: 打开聊天框
- `closeChat()`: 关闭聊天框
- `toggleChat()`: 切换聊天框状态
- `addMessage()`: 添加消息
- `setWidth()`: 设置聊天框宽度（20%-60%）
- `clearMessages()`: 清空聊天记录

### 2. UI 组件

**文件位置**: `src/components/AIChatBox.tsx`

#### 桌面端样式
- ✅ 固定在页面右侧
- ✅ 默认宽度30%，可通过拖拽左边缘调整（20%-60%）
- ✅ 高度100%全屏
- ✅ 折叠状态下宽度为0，右上角显示 copilot 图标
- ✅ 展开后显示消息区域、输入框和发送按钮
- ✅ 左上角有折叠按钮
- ✅ **展开时主内容区域自动压缩，不会被覆盖**
- ✅ 平滑的展开/收起动画（300ms）

#### 移动端样式
- ✅ 全屏显示
- ✅ 顶部有关闭按钮
- ✅ 折叠状态下在右下角显示悬浮图标
- ✅ 点击图标展开全屏聊天框

### 3. 主内容包装器

**文件位置**: `src/components/MainContentWrapper.tsx`

- ✅ 桌面端：当聊天框展开时，自动添加右侧边距，确保内容不被覆盖
- ✅ 移动端：不受影响，因为聊天框是全屏覆盖模式
- ✅ 响应式设计：自动检测屏幕尺寸并调整行为
- ✅ 平滑过渡动画，与聊天框展开/收起同步

### 4. API Route

**文件位置**: `src/app/api/ai-chat/route.ts`

- ✅ Next.js Serverless 函数作为中间层
- ✅ POST `/api/ai-chat` 接口处理聊天请求
- ⚠️ 当前使用模拟响应，需要接入实际AI模型

### 5. 根布局集成

**文件位置**: `src/app/layout.tsx`

聊天框已集成到根布局，全局可用，不受页面切换影响。

## 使用方法

### 在任何组件中使用

```tsx
'use client';

import { useAIChatStore } from '@/lib/ai-chat-store';
import { Button } from '@/components/ui/button';

export function MyComponent() {
  const { openChat, toggleChat, addMessage } = useAIChatStore();

  return (
    <div>
      {/* 简单打开聊天框 */}
      <Button onClick={openChat}>
        联系AI助手
      </Button>

      {/* 打开聊天框并预填消息 */}
      <Button onClick={() => {
        addMessage({
          role: 'user',
          content: '我想找一个靠近大学的房源'
        });
        openChat();
      }}>
        寻找房源帮助
      </Button>

      {/* 切换聊天框 */}
      <Button onClick={toggleChat}>
        切换AI助手
      </Button>
    </div>
  );
}
```

### 示例组件

查看 `src/components/ExampleAIChatUsage.tsx` 获取更多使用示例。

## 下一步：接入真实AI模型

目前 API Route 使用的是模拟响应。要接入真实的AI模型，请编辑 `src/app/api/ai-chat/route.ts`：

### 示例：接入 OpenAI

1. 安装依赖：
```bash
pnpm add openai
```

2. 添加环境变量到 `.env`：
```
OPENAI_API_KEY=your-api-key-here
```

3. 修改 `src/app/api/ai-chat/route.ts`：

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for a rental property platform called QRent."
        },
        ...history.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: "user", content: message }
      ],
    });

    const aiResponse = completion.choices[0].message.content;

    return NextResponse.json({ message: aiResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 其他AI模型选项

- **Anthropic Claude**: 使用 `@anthropic-ai/sdk`
- **Google Gemini**: 使用 `@google/generative-ai`
- **Azure OpenAI**: 使用 `openai` with Azure endpoint
- **本地模型**: 使用 Ollama 或其他本地部署方案

## 技术栈

- **状态管理**: Zustand 5.0
- **UI框架**: Next.js 15 + React 19
- **样式**: Tailwind CSS v4
- **图标**: react-icons
- **类型安全**: TypeScript

## 文件结构

```
packages/frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── ai-chat/
│   │   │       └── route.ts          # API Route
│   │   └── layout.tsx                # 根布局（集成聊天框）
│   ├── components/
│   │   ├── AIChatBox.tsx            # AI聊天框组件
│   │   ├── MainContentWrapper.tsx   # 主内容包装器（处理布局压缩）
│   │   └── ExampleAIChatUsage.tsx   # 使用示例
│   └── lib/
│       └── ai-chat-store.ts         # Zustand store
```

## 注意事项

1. **性能**: 聊天框使用客户端组件 (`'use client'`)，确保只在需要时加载
2. **安全**: API密钥应存储在环境变量中，不要提交到代码库
3. **成本**: 使用付费AI API时注意控制调用频率和token使用
4. **用户体验**: 可以添加加载状态、错误提示、消息历史持久化等功能

## 未来改进建议

- [ ] 添加消息历史持久化（LocalStorage/数据库）
- [ ] 支持Markdown格式化
- [ ] 添加代码高亮
- [ ] 支持文件上传
- [ ] 添加对话上下文管理
- [ ] 实现打字动画效果
- [ ] 添加语音输入支持
- [ ] 多语言支持（中英文切换）
