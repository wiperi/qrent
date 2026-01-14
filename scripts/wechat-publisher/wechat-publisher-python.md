# 微信群聊房源推送设计文档

## 1. 概述

本功能实现向微信群聊推送符合用户偏好的房源信息。采用独立 Python 脚本实现，通过 JSON 配置文件定义所有输入参数，从 MySQL 数据库读取房源数据，通过企业微信群机器人 Webhook 推送到指定群聊。

## 2. 系统架构

脚本作为独立组件运行，与现有后端服务解耦。数据流向为：JSON 配置 → Python 脚本 → MySQL 查询 → 微信 Webhook 推送。

脚本仅执行数据库读取操作，不进行任何写入，确保对现有系统零侵入。

> **参考代码**
> - `packages/scraper/main.py` — 爬虫主入口，展示了 Python 脚本的命令行参数解析和流程编排模式
> - `packages/scraper/src/pipeline.py` — 流水线设计，可参考其模块化组织方式

## 3. 配置文件设计

所有配置通过单一 JSON 文件管理，包含以下部分：

### 3.1 数据库连接

定义 MySQL 连接信息：主机地址、端口、数据库名、用户名、密码。

> **参考代码**
> - `packages/scraper/src/config/settings.py` — `DatabaseConfig` 类定义了数据库配置的数据结构（host、user、password、database、port 等字段）

### 3.2 推送任务列表

每个推送任务包含：
- 任务标识符（用于日志追踪）
- 微信群机器人 Webhook URL
- 房源筛选偏好设置

### 3.3 筛选偏好

每个任务可独立配置以下筛选条件：
- 价格区间（最低价、最高价，单位：澳元/周）
- 目标区域列表
- 卧室数量范围
- 卫生间数量范围
- 目标学校名称
- 最大通勤时间（分钟）
- 房源类型（公寓/联排/独栋等）
- 最低评分要求

> **参考代码**
> - `packages/shared/prisma/schema.prisma` — `Preference` 模型定义了用户偏好的完整字段（minPrice、maxPrice、minBedrooms、maxBedrooms、targetSchool、maxCommuteTime 等）

### 3.4 推送设置

- 每次推送的最大房源数量
- 房源排序方式（发布时间/价格/评分）
- 是否启用去重（记录已推送房源，避免重复）
- 去重记录文件路径

## 4. 功能模块

### 4.1 配置加载

读取并验证 JSON 配置文件，检查必填字段完整性，为可选字段提供默认值。

> **参考代码**
> - `packages/scraper/src/config/settings.py` — 展示了使用 dataclass 定义配置类和从环境变量加载默认值的模式

### 4.2 数据库查询

根据偏好条件构建 SQL 查询，涉及的表包括：
- Property（房源主表）
- Region（区域表）
- PropertySchool（房源-学校关联表，含通勤时间）
- School（学校表）

查询结果包含：房源ID、标题、价格、地址、房型、评分、图片链接、详情链接、通勤时间等。

> **参考代码**
> - `packages/shared/prisma/schema.prisma` — 定义了所有表结构和字段，包括 Property、Region、School、PropertySchool 及其关联关系
> - `packages/scraper/src/services/database.py` — `DatabaseService` 类展示了 MySQL 连接管理、上下文管理器使用、SQL 查询执行的完整实现

### 4.3 去重处理

维护本地 JSON 文件记录已推送房源 ID，每次推送前过滤已推送项，推送成功后更新记录。

### 4.4 消息格式化

将房源数据转换为企业微信支持的 Markdown 格式消息，包含：
- 推送标题
- 房源列表（每条含价格、地址、房型、评分、通勤时间、链接）

> **参考代码**
> - `packages/scraper/src/models/property.py` — `PropertyData` 数据类定义了房源的完整字段结构，可参考其字段命名和类型定义

### 4.5 Webhook 推送

调用企业微信群机器人 API 发送消息，处理响应状态，记录推送结果。

> **参考代码**
> - `packages/scraper/requirements.txt` — 包含 `requests` 库依赖，用于 HTTP 请求

## 5. 执行流程

1. 加载并验证配置文件
2. 建立数据库连接
3. 遍历每个推送任务
4. 根据任务偏好查询符合条件的房源
5. 执行去重过滤
6. 格式化消息内容
7. 调用 Webhook 推送
8. 更新去重记录
9. 输出执行日志

> **参考代码**
> - `packages/scraper/main.py` — `cmd_run` 函数展示了完整的流程编排，包括参数解析、日志输出、异常处理
> - `packages/scraper/src/services/database.py` — `session()` 上下文管理器展示了数据库连接的生命周期管理

## 6. 消息格式

推送消息采用 Markdown 格式，示例结构：

标题行显示推送主题和房源数量。每条房源信息包含：地址、周租金、房型配置、评分、到目标学校的通勤时间、详情链接。

## 7. 错误处理

- 配置文件缺失或格式错误：终止执行，输出明确错误信息
- 数据库连接失败：支持重试机制，超过重试次数后记录错误并跳过
- 无符合条件房源：跳过该任务，记录日志
- Webhook 调用失败：记录错误详情，继续处理其他任务

> **参考代码**
> - `packages/scraper/src/services/database.py` — `connect()` 方法展示了数据库连接错误捕获和日志记录
> - `packages/scraper/src/utils/logger.py` — 日志配置模块，展示了统一的日志格式和输出方式

## 8. 运行方式

### 手动执行

通过命令行运行脚本，指定配置文件路径作为参数。

### 定时执行

通过 Linux cron 定时调度，或使用 systemd timer 管理。

### 容器化部署

可打包为 Docker 镜像，便于在现有基础设施中部署和调度。

> **参考代码**
> - `packages/scraper/Dockerfile.backup` — Docker 镜像构建配置，展示了 Python 环境和依赖安装
> - `packages/scraper/docker-compose.yml` — Docker Compose 编排配置

## 9. 文件结构

脚本目录包含：
- 主执行脚本
- 配置文件模板
- 去重记录文件（自动生成）
- 依赖声明文件（requirements.txt）

> **参考代码**
> - `packages/scraper/` — 整体目录结构可作为参考，包含 src/、requirements.txt、main.py 等标准布局

## 10. 依赖

- Python 3.8+
- MySQL 连接库（pymysql 或 mysql-connector-python）
- HTTP 请求库（requests）

> **参考代码**
> - `packages/scraper/requirements.txt` — 完整的依赖列表，其中 `mysql-connector-python==8.2.0` 和 `requests==2.31.0` 可直接复用

## 11. 安全考虑

- Webhook URL 属于敏感信息，配置文件应限制访问权限
- 数据库密码建议通过环境变量注入，而非明文存储
- 脚本仅需数据库只读权限

> **参考代码**
> - `packages/scraper/src/config/settings.py` — 展示了通过 `os.getenv()` 从环境变量读取敏感信息的模式

## 12. 配置示例结构

配置文件顶层包含 database（数据库配置）、tasks（任务列表）、settings（全局设置）三个部分。

每个 task 包含 id、webhook_url、preferences 三个字段。preferences 下包含所有筛选条件。

settings 包含 max_items、sort_by、enable_dedup、dedup_file 等全局参数。

## 13. 扩展方向

- 支持多消息平台（钉钉、飞书、Telegram）
- 增加房源图片卡片消息格式
- 支持用户订阅自助管理
- 集成到后端服务作为定时任务模块
