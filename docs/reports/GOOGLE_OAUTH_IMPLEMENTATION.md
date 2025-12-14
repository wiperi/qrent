# Google OAuth 登录实现文档

## 📋 概述

本文档描述了 QRent 平台 Google OAuth 登录功能的完整实现。系统已完全移除传统的邮箱密码登录方式，仅支持 Google OAuth 2.0 认证。

### 核心特性

- ✅ **单一登录方式**：仅支持 Google OAuth 登录
- ✅ **自动账号合并**：同一邮箱的账号自动关联
- ✅ **无需密码**：OAuth 用户无需设置或管理密码
- ✅ **类型安全**：全栈 tRPC 实现，端到端类型安全
- ✅ **可扩展架构**：预留其他 OAuth 提供商（微信等）的扩展接口

---

## 🏗️ 架构设计

### 技术栈

- **后端**: Node.js + Express + tRPC
- **前端**: Next.js 15 + React 19
- **OAuth 库**:
  - 后端：`google-auth-library`
  - 前端：`@react-oauth/google`
- **数据库**: MySQL 8.0 + Prisma ORM

### 认证流程

```
┌─────────┐                 ┌──────────┐                 ┌──────────┐
│  用户   │                 │  前端    │                 │  后端    │
└────┬────┘                 └────┬─────┘                 └────┬─────┘
     │                           │                            │
     │ 1. 点击 Google 登录        │                            │
     ├──────────────────────────>│                            │
     │                           │                            │
     │ 2. 打开 Google OAuth 弹窗  │                            │
     │<──────────────────────────┤                            │
     │                           │                            │
     │ 3. Google 授权完成         │                            │
     ├──────────────────────────>│                            │
     │    (返回 ID Token)         │                            │
     │                           │                            │
     │                           │ 4. 发送 ID Token           │
     │                           ├───────────────────────────>│
     │                           │                            │
     │                           │                            │ 5. 验证 Token
     │                           │                            │    (google-auth-library)
     │                           │                            │
     │                           │                            │ 6. 查找/创建用户
     │                           │                            │    - 检查 oauthProviderId
     │                           │                            │    - 检查 email (合并)
     │                           │                            │    - 创建新用户
     │                           │                            │
     │                           │ 7. 返回 JWT Token          │
     │                           │<───────────────────────────┤
     │                           │                            │
     │ 8. 登录成功                │                            │
     │<──────────────────────────┤                            │
     │   (保存 token 到 localStorage)                         │
     │                           │                            │
```

---

## 📁 文件结构

### 后端文件

```
packages/backend/src/
├── services/
│   ├── OAuthService.ts          # OAuth token 验证服务
│   └── AuthService.ts           # 认证业务逻辑（仅 OAuth）
├── trpc/routers/
│   └── auth.ts                  # tRPC 认证路由（移除 register/login）
└── utils/
    └── helper.ts                # JWT token 生成工具
```

### 前端文件

```
packages/frontend/src/
├── lib/
│   ├── oauth-provider.tsx       # Google OAuth Provider 配置
│   └── auth-context.tsx         # 认证上下文（仅 googleLogin）
├── components/
│   ├── GoogleLoginButton.tsx   # Google 登录按钮组件
│   ├── LoginForm.tsx            # 简化的登录表单
│   └── SignupForm.tsx           # 简化的注册表单
└── app/
    └── layout.tsx               # 集成 OAuthProvider
```

### 数据库文件

```
packages/shared/
└── prisma/
    └── schema.prisma            # User 模型（添加 OAuth 字段）
```

---

## 🗄️ 数据库设计

### User 模型字段

```prisma
model User {
  id               Int               @id @default(autoincrement())
  email            String            @unique
  password         String?           // 可选，OAuth 用户为 null
  name             String            @default("User")
  gender           Int?
  phone            String?           @unique
  emailVerified    Boolean           @default(false)

  // OAuth 相关字段
  authProvider     String?           @default("email")    // "email" | "google" | "wechat"
  oauthProviderId  String?           @unique              // Google User ID (sub)
  avatarUrl        String?                                // Google 头像 URL

  // 关系
  emailPreferences EmailPreference[]
  preferences      Preference[]
  userSessions     UserSession[]
  properties       Property[]

  @@index([authProvider])
  @@index([oauthProviderId])
  @@map("users")
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `authProvider` | String | 认证提供商标识（"google", "wechat" 等） |
| `oauthProviderId` | String | OAuth 提供商的唯一用户 ID（Google 的 `sub`） |
| `avatarUrl` | String | 用户头像 URL（从 Google 获取） |
| `password` | String? | 已改为可选，OAuth 用户无需密码 |

---

## ⚙️ 环境配置

### 1. Google OAuth 配置

在 Google Cloud Console 创建 OAuth 2.0 凭据，获取：

- **Client ID**: `YOUR_GOOGLE_CLIENT_ID`
- **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET`

配置授权来源：
- JavaScript origins: `https://www.qrent.rent`
- Redirect URIs: `https://api.qrent.rent/oauth2/callback`

### 2. 后端环境变量

在 `.env` 文件中添加：

```bash
# Google OAuth
GOOGLE_OAUTH_CLIENT_ID="foo"
GOOGLE_OAUTH_CLIENT_SECRET="bar"
```

### 3. 前端环境变量

在 `.env` 或 `.env.local` 文件中添加：

```bash
# 必须以 NEXT_PUBLIC_ 开头才能在客户端访问
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID="foo"
```

### 4. 数据库迁移

运行 Prisma 迁移以添加新字段：

```bash
pnpm --filter @qrent/shared db:push
```

---

## 🔧 实现细节

### 后端实现

#### 1. OAuthService - Token 验证

**文件**: `packages/backend/src/services/OAuthService.ts`

```typescript
class OAuthService {
  private googleClient: OAuth2Client;

  async verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // 验证邮箱是否已认证
    if (!payload.email_verified) {
      throw new HttpError(400, 'Google email not verified');
    }

    return {
      sub: payload.sub,              // Google User ID
      email: payload.email!,
      email_verified: true,
      name: payload.name,
      picture: payload.picture,       // 头像 URL
    };
  }
}
```

#### 2. AuthService - 账号合并逻辑

**文件**: `packages/backend/src/services/AuthService.ts`

```typescript
async googleOAuthLogin(idToken: string): Promise<string> {
  // 1. 验证 Google token
  const googleUser = await oauthService.verifyGoogleToken(idToken);

  // 2. 查找是否已有该 Google 账号
  let user = await prisma.user.findUnique({
    where: { oauthProviderId: googleUser.sub },
  });

  if (user) {
    // 已有账号，直接登录
    return generateToken(user.id);
  }

  // 3. 检查邮箱是否已注册（账号合并）
  user = await prisma.user.findUnique({
    where: { email: googleUser.email },
  });

  if (user) {
    // 邮箱已存在，绑定 Google 到现有账号
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        authProvider: 'google',
        oauthProviderId: googleUser.sub,
        emailVerified: true,
        avatarUrl: googleUser.picture,
      },
    });
    return generateToken(user.id);
  }

  // 4. 创建新账号
  user = await prisma.user.create({
    data: {
      email: googleUser.email,
      password: null,
      authProvider: 'google',
      oauthProviderId: googleUser.sub,
      emailVerified: true,
      avatarUrl: googleUser.picture,
    },
  });
  return generateToken(user.id);
}
```

#### 3. tRPC 路由

**文件**: `packages/backend/src/trpc/routers/auth.ts`

```typescript
export const authRouter = t.router({
  // 仅保留 Google OAuth 登录
  googleOAuthLogin: publicProcedure
    .input(z.object({ idToken: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const token = await authService.googleOAuthLogin(input.idToken);
      return { token };
    }),

  // 其他路由：changeProfile, sendVerificationEmail, verifyEmail
});
```

### 前端实现

#### 1. OAuth Provider 配置

**文件**: `packages/frontend/src/lib/oauth-provider.tsx`

```typescript
'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

export function OAuthProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
```

在 `app/layout.tsx` 中集成：

```typescript
<AppTRPCProvider>
  <OAuthProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </OAuthProvider>
</AppTRPCProvider>
```

#### 2. AuthContext 简化

**文件**: `packages/frontend/src/lib/auth-context.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  googleLogin: (idToken: string) => Promise<void>;  // 仅保留 Google 登录
  logout: () => void;
  refreshUser: () => void;
}

const googleLogin = async (idToken: string) => {
  const result = await googleLoginMutation.mutateAsync({ idToken });
  setToken(result.token);
};
```

#### 3. Google 登录按钮

**文件**: `packages/frontend/src/components/GoogleLoginButton.tsx`

```typescript
export default function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const { googleLogin } = useAuth();

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        await googleLogin(credentialResponse.credential);  // ID token
        onSuccess?.();
      }}
      onError={() => onError?.('Google login failed')}
      theme="outline"
      size="large"
      text="continue_with"
    />
  );
}
```

#### 4. 简化的登录表单

**文件**: `packages/frontend/src/components/LoginForm.tsx`

```typescript
export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [error, setError] = useState('');

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2>Sign In</h2>
        <p>Sign in with your Google account to continue</p>

        <GoogleLoginButton
          onSuccess={onSuccess}
          onError={(err) => setError(err)}
        />

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
```

---

## 🧪 测试指南

### 测试场景

#### 1. 新用户 Google 登录
- **操作**: 使用从未注册过的 Google 账号登录
- **期望**: 自动创建新用户，直接登录成功
- **验证**:
  - 检查数据库是否创建新用户记录
  - `authProvider` = "google"
  - `oauthProviderId` = Google sub ID
  - `password` = null
  - `emailVerified` = true

#### 2. 已有 Google 用户再次登录
- **操作**: 使用已注册的 Google 账号再次登录
- **期望**: 直接登录成功，无需重复注册
- **验证**:
  - 生成新的 JWT token
  - 创建新的 UserSession 记录

#### 3. 邮箱用户使用 Google 登录（账号合并）
- **前提**: 数据库已存在某个邮箱的用户
- **操作**: 使用相同邮箱的 Google 账号登录
- **期望**: 自动绑定 Google 到现有账号
- **验证**:
  - `authProvider` 更新为 "google"
  - `oauthProviderId` 填充为 Google sub ID
  - `emailVerified` 更新为 true
  - `avatarUrl` 更新为 Google 头像

#### 4. Token 验证失败
- **操作**: 发送无效或过期的 Google ID token
- **期望**: 返回 400 错误，提示 "Invalid Google token"

### 手动测试步骤

1. **启动服务**
   ```bash
   # 终端 1: 后端
   pnpm dev:backend

   # 终端 2: 前端
   pnpm --filter frontend dev
   ```

2. **访问登录页面**
   - 打开浏览器访问 `http://localhost:3000/login`

3. **测试 Google 登录**
   - 点击 "Sign in with Google" 按钮
   - 选择 Google 账号并授权
   - 验证是否成功跳转并登录

4. **检查开发者工具**
   - Network 标签: 查看 tRPC 请求 `auth.googleOAuthLogin`
   - Application 标签: 检查 localStorage 是否存储 `auth-token`
   - Console: 确认无错误信息

5. **数据库验证**
   ```sql
   SELECT id, email, authProvider, oauthProviderId, emailVerified
   FROM users
   WHERE email = 'test@gmail.com';
   ```

---

## 🔒 安全考虑

### 已实现的安全措施

1. **Token 验证**
   - 使用官方 `google-auth-library` 验证 ID token
   - 验证 `audience` 匹配自己的 Client ID
   - 确保 `email_verified` 为 true

2. **CSRF 防护**
   - tRPC 使用 POST 请求
   - JWT token 在 Authorization header 传递，不使用 cookie

3. **账号合并安全**
   - 只有已验证邮箱的 Google 账号才能合并
   - 合并时保留原用户数据

4. **传输安全**
   - 生产环境强制使用 HTTPS
   - ID token 仅传输一次，不存储在客户端

### 安全最佳实践

- ✅ 不在 URL 中传递 token
- ✅ 不在日志中记录敏感信息
- ✅ 定期清理过期的 UserSession
- ✅ 限制 OAuth 登录频率（可选：添加 rate limiting）

---

## 🚀 部署清单

### 生产环境部署步骤

1. **配置环境变量**
   ```bash
   # 后端 .env
   GOOGLE_OAUTH_CLIENT_ID="your-production-client-id"
   GOOGLE_OAUTH_CLIENT_SECRET="your-production-client-secret"

   # 前端 .env
   NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID="your-production-client-id"
   ```

2. **更新 Google OAuth 配置**
   - 在 Google Cloud Console 添加生产域名
   - JavaScript origins: `https://www.qrent.rent`
   - Redirect URIs: `https://api.qrent.rent/oauth2/callback`

3. **数据库迁移**
   ```bash
   pnpm --filter @qrent/shared db:push
   ```

4. **重启服务**
   ```bash
   # 重启后端
   pm2 restart qrent-backend

   # 重启前端
   pm2 restart qrent-frontend
   ```

5. **验证部署**
   - 测试 Google 登录流程
   - 检查错误日志
   - 监控登录成功率

---

## 🔮 后续扩展

### 计划中的功能

1. **微信 OAuth 登录**
   - 实现 `OAuthService.verifyWeChatToken()`
   - 添加 `AuthService.wechatOAuthLogin()`
   - 前端添加微信登录按钮

2. **账号解绑功能**
   - 允许用户解绑 OAuth 登录方式
   - 前提：用户已设置密码

3. **多 OAuth 账号绑定**
   - 支持同一用户绑定多个 OAuth 提供商
   - 需要新表 `OAuthConnection`

### 扩展示例

添加微信登录（预留代码）：

```typescript
// 后端
async wechatOAuthLogin(code: string): Promise<string> {
  const wechatUser = await oauthService.verifyWeChatToken(code);
  // ... 类似 Google 的逻辑
}

// 前端
<WeChatLoginButton onSuccess={onSuccess} />
```

---

## 📝 变更记录

### v1.0.0 (2025-01-XX)

**移除的功能**:
- ❌ 邮箱密码注册
- ❌ 邮箱密码登录
- ❌ 密码修改功能
- ❌ 密码验证逻辑

**新增的功能**:
- ✅ Google OAuth 登录
- ✅ 自动账号合并
- ✅ Google 头像同步
- ✅ 邮箱自动验证

**修改的功能**:
- 🔄 User 模型：添加 OAuth 字段
- 🔄 changeProfile：移除密码参数
- 🔄 登录/注册表单：简化为纯 Google 登录

---

## 🆘 常见问题

### Q: 为什么只支持 Google 登录？

A: 为了简化用户体验和降低安全风险，我们选择使用可信的 OAuth 提供商进行认证，避免管理和存储密码。

### Q: 如果用户没有 Google 账号怎么办？

A: 用户可以免费创建 Google 账号。未来我们计划支持微信等其他 OAuth 提供商。

### Q: 旧用户的密码账号会怎样？

A: 当旧用户使用相同邮箱的 Google 账号登录时，系统会自动合并账号，保留所有数据。

### Q: 如何处理邮箱变更？

A: Google 账号的邮箱由 Google 管理。如果用户需要更换邮箱，需要联系管理员手动处理。

### Q: Token 过期后会怎样？

A: JWT token 有 90 天有效期。过期后用户需要重新使用 Google 登录。

---

## 📚 参考资料

- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [google-auth-library 官方文档](https://github.com/googleapis/google-auth-library-nodejs)
- [@react-oauth/google 文档](https://www.npmjs.com/package/@react-oauth/google)
- [tRPC 官方文档](https://trpc.io/)
- [Prisma ORM 文档](https://www.prisma.io/docs)

---

**文档维护**: 开发团队
**最后更新**: 2025-01-XX
**版本**: v1.0.0
