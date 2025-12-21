在 **TS 全栈项目（pnpm monorepo）** 中，**数据库密钥**、**API Key** 这些敏感信息的存储通常有以下最佳实践：  

---

## **✅ 最佳存储位置**
### **1️⃣ `.env` 文件（推荐）**
- **适用于**：开发环境、本地运行
- **存储方式**：
  ```ini
  DATABASE_URL=postgresql://user:password@localhost:5432/mydb
  JWT_SECRET=supersecretkey
  ```
- **在后端（Express）中加载**：
  ```ts
  import dotenv from "dotenv";
  dotenv.config(); // 确保 .env 被正确加载

  export const CONFIG = {
    databaseUrl: process.env.DATABASE_URL || "",
    jwtSecret: process.env.JWT_SECRET || "",
  };
  ```
- **在 Jest 测试中加载（如果 Jest 不能自动读取 `.env`）**：
  ```ts
  import dotenv from "dotenv";
  dotenv.config({ path: "../../.env" }); // 确保 Jest 也能正确加载
  ```

✅ **优点**：
- **最常见方式**，便于本地开发
- **避免硬编码在代码里**
- **可以在 `.gitignore` 里忽略 `.env`**，防止泄露

⚠ **注意**：
- **不要把 `.env` 提交到 Git**
- **部署时，需要把 `.env` 变量注入环境，而不是上传 `.env` 文件**

---

### **2️⃣ 使用 `.env` + `config.ts` 共享配置**
如果你不想在每个文件都 `import dotenv`，可以**在 `shared` 包里定义 `config.ts`**，然后让 `backend` 和 `frontend` 共享：
```ts
// packages/shared/config.ts
import dotenv from "dotenv";

dotenv.config();

export const CONFIG = {
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
};
```
然后在 `backend` 直接使用：
```ts
import { CONFIG } from "shared/config";
console.log(CONFIG.databaseUrl);
```
✅ **这样就不用在每个文件都 `import dotenv`，只要 `import CONFIG` 即可**。

---

### **3️⃣ 在 `process.env` 中注入（生产环境）**
在 **生产环境（如 Vercel, AWS, Docker, Kubernetes）**，推荐**不使用 `.env` 文件，而是直接把环境变量注入 `process.env`**：
```sh
export DATABASE_URL="postgresql://user:password@prod-db:5432/proddb"
export JWT_SECRET="production_super_secret"
pnpm start
```
这样后端代码中可以直接访问：
```ts
console.log(process.env.DATABASE_URL);
```
✅ **优点**：
- **更安全，不需要上传 `.env`**
- **更适合云端部署**
- **可以在 Docker 或 Kubernetes 环境变量里管理**

---

### **4️⃣ 在 `.env.production` / `.env.development` 区分环境**
如果你有多个环境（**开发 / 生产**），可以使用多个 `.env`：
```
.env
.env.local
.env.development
.env.production
```
然后让 `dotenv` 只加载相应的 `.env`：
```ts
import dotenv from "dotenv";

const env = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${env}` });

console.log(`Loaded env: .env.${env}`);
```
✅ **这样你就可以在不同环境下自动加载不同的 `.env` 文件**。

---

## **🚀 总结**
| 方式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **`.env` 文件** | 本地开发 | 易用，常见 | 需要 `dotenv.config()` |
| **`config.ts` 统一管理** | Monorepo | 共享 `process.env` 变量 | 仍然依赖 `.env` |
| **环境变量 (`process.env`)** | 生产环境 | 无需 `.env`，更安全 | 需要云端配置 |
| **`.env.production` / `.env.development`** | 多环境管理 | 适用于不同环境 | 需要手动切换 |

### **💡 最推荐的方式**
1. **本地**：用 `.env`，但用 `shared/config.ts` 统一管理
2. **生产**：用 `process.env`，不要上传 `.env`

这样可以兼顾安全性和易用性 🚀！