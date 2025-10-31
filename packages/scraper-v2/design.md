# Scraper V2 技术设计文档

## 📋 项目概述

基于 Playwright 的现代化 Python 爬虫系统，支持 Docker 容器化部署，实现多站点并行爬取、数据处理和可观测性监控。

---

## 🎯 核心需求

- **运行环境**: Linux Docker 容器 + 无头浏览器
- **爬虫框架**: Playwright (主框架)
- **任务调度**: 每日定时执行 + 多用户并行爬取
- **数据处理**: 清洗 → 去重 → 转换 → 存储
- **可观测性**: 日志记录 + 指标监控

---

## 🏗️ 技术架构

### 1. 技术栈选型

| 组件 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| **运行环境** | Python | 3.11+ | 官方推荐版本 |
| **爬虫引擎** | Playwright | 1.40+ | 支持 Chromium/Firefox/WebKit |
| **任务调度** | APScheduler | 3.10+ | 轻量级定时任务 |
| **并发控制** | asyncio + aiohttp | - | 异步并发处理 |
| **数据验证** | Pydantic | 2.5+ | 数据模型和验证 |
| **数据存储** | PostgreSQL | 14+ | 主数据库 (复用现有) |
| **缓存去重** | Redis | 7+ | URL去重 + 数据缓存 |
| **数据备份** | JSON Files | - | 爬虫原始数据持久化 |
| **云存储** | AWS S3 | - | 云端备份 ⭐NEW |
| **对象存储SDK** | boto3 | 1.34+ | AWS SDK for Python ⭐NEW |
| **日志系统** | Loguru | 0.7+ | 结构化日志 |
| **监控指标** | Prometheus Client | 0.19+ | 性能指标收集 |
| **容器化** | Docker + Docker Compose | - | 服务编排 |

### 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Container                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Scheduler (APScheduler)                  │    │
│  │         每天 01:00 AM 触发爬取任务                  │    │
│  └───────────────────┬────────────────────────────────┘    │
│                      │                                       │
│                      ▼                                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Task Coordinator (异步任务协调器)          │    │
│  │  • 读取爬虫配置 (网站列表、用户配置)                │    │
│  │  • 创建浏览器上下文 (多用户模拟)                    │    │
│  │  • 分发并行任务                                     │    │
│  └───────────────────┬────────────────────────────────┘    │
│                      │                                       │
│         ┌────────────┼────────────┐                         │
│         ▼            ▼            ▼                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ Worker 1 │ │ Worker 2 │ │ Worker N │  (并行爬虫实例)   │
│  │          │ │          │ │          │                    │
│  │ Context1 │ │ Context2 │ │ ContextN │  (独立浏览器上下文)│
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                   │
│       │            │            │                          │
│       └────────────┼────────────┘                          │
│                    ▼                                        │
│  ┌────────────────────────────────────────────────────┐   │
│  │            Playwright Browser Pool                  │   │
│  │        (Chromium Headless - 共享浏览器进程)         │   │
│  └────────────────────────────────────────────────────┘   │
│                    │                                        │
│                    ▼                                        │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Data Pipeline                          │   │
│  │                                                      │   │
│  │  1. Raw Data Extractor    (原始数据提取)           │   │
│  │  2. Data Cleaner          (数据清洗)               │   │
│  │  3. Data Validator        (数据验证)               │   │
│  │  4. Duplicate Filter      (去重过滤)               │   │
│  │  5. Backup Writer         (备份原始数据) ⭐NEW     │   │
│  │  6. Data Transformer      (数据转换适配)           │   │
│  │  7. Database Writer       (数据库存储)             │   │
│  └────────────────────────────────────────────────────┘   │
│                    │                                        │
│                    ▼                                        │
│  ┌─────────────────────────────────────┐                   │
│  │    Observability Layer              │                   │
│  │  • Logger (Loguru)                  │                   │
│  │  • Metrics (Prometheus)             │                   │
│  │  • Health Check                     │                   │
│  └─────────────────────────────────────┘                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┼───────────┬──────────────┐
           ▼           ▼           ▼              ▼
    ┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
    │ PostgreSQL  │ │  Redis  │ │JSON Files│ │  Volumes │
    │ (业务数据)  │ │(URL去重)│ │(原始备份)│ │ (持久化) │
    └─────────────┘ └─────────┘ └──────────┘ └──────────┘
```

---

## 📁 项目结构

```
scraper-v2/
├── docker-compose.yml          # Docker 服务编排
├── Dockerfile                  # 爬虫服务镜像
├── requirements.txt            # Python 依赖
├── .env.example               # 环境变量模板
├── README.md                  # 项目说明
├── design.md                  # 本设计文档
│
├── config/                    # 配置文件
│   ├── scraper_config.yaml   # 爬虫配置 (网站列表、规则)
│   ├── user_agents.yaml      # User-Agent 池
│   └── logging_config.yaml   # 日志配置
│
├── data/                     # 数据目录 ⭐NEW
│   ├── raw/                  # 原始爬取数据备份
│   │   ├── 2025-11-01/      # 按日期组织
│   │   │   ├── realestate_au_properties.json
│   │   │   ├── domain_com_au_properties.json
│   │   │   └── metadata.json # 元数据信息
│   │   └── latest/          # 最新数据的软链接
│   ├── processed/           # 处理后的数据
│   └── archive/             # 历史数据归档
│
├── src/
│   ├── main.py               # 应用入口
│   ├── config.py             # 配置加载器
│   │
│   ├── scheduler/            # 任务调度模块
│   │   ├── __init__.py
│   │   └── task_scheduler.py # APScheduler 配置
│   │
│   ├── coordinator/          # 任务协调器
│   │   ├── __init__.py
│   │   └── task_coordinator.py  # 并行任务分发
│   │
│   ├── spiders/              # 爬虫实现
│   │   ├── __init__.py
│   │   ├── base_spider.py    # 爬虫基类
│   │   ├── realestate_spider.py   # 房产网站爬虫
│   │   └── domain_spider.py       # Domain.com.au 爬虫
│   │
│   ├── browser/              # 浏览器管理
│   │   ├── __init__.py
│   │   ├── browser_pool.py   # 浏览器实例池
│   │   └── context_manager.py # 浏览器上下文管理
│   │
│   ├── pipelines/            # 数据处理管道
│   │   ├── __init__.py
│   │   ├── pipeline_manager.py    # 管道管理器
│   │   ├── 01_extractor.py        # 数据提取
│   │   ├── 02_cleaner.py          # 数据清洗
│   │   ├── 03_validator.py        # 数据验证
│   │   ├── 04_deduplicator.py     # 去重处理
│   │   ├── 05_backup.py           # 原始数据备份 ⭐NEW
│   │   ├── 06_transformer.py      # 数据转换 (适配数据库)
│   │   └── 07_database.py         # 数据库存储
│   │
│   ├── storage/              # 数据持久化模块 ⭐NEW
│   │   ├── __init__.py
│   │   ├── backup_manager.py      # 备份管理器
│   │   ├── json_storage.py        # JSON 文件存储
│   │   ├── version_control.py     # 数据版本控制
│   │   └── s3_storage.py          # AWS S3 云存储 ⭐NEW
│   │
│   ├── models/               # 数据模型
│   │   ├── __init__.py
│   │   ├── property.py       # 房产数据模型 (Pydantic)
│   │   └── scrape_result.py  # 爬取结果模型
│   │
│   ├── utils/                # 工具函数
│   │   ├── __init__.py
│   │   ├── logger.py         # 日志工具
│   │   ├── metrics.py        # 指标收集
│   │   ├── redis_helper.py   # Redis 工具
│   │   ├── db_helper.py      # 数据库工具
│   │   └── retry.py          # 重试装饰器
│   │
│   └── monitoring/           # 可观测性
│       ├── __init__.py
│       ├── prometheus.py     # Prometheus 指标
│       └── health_check.py   # 健康检查
│
├── tests/                    # 测试
│   ├── __init__.py
│   ├── test_spiders.py
│   ├── test_pipelines.py
│   └── test_integration.py
│
└── logs/                     # 日志目录
    └── .gitkeep
```

---

## 🔧 核心模块设计

### 1. 任务调度器 (Scheduler)

**职责**: 定时触发每日爬取任务

**实现方案**:
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

class TaskScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        
    def start(self):
        # 每天凌晨 1:00 执行
        self.scheduler.add_job(
            self.run_daily_scrape,
            trigger=CronTrigger(hour=1, minute=0),
            id='daily_scrape',
            max_instances=1  # 防止重复运行
        )
        self.scheduler.start()
        
    async def run_daily_scrape(self):
        logger.info("开始每日爬取任务")
        coordinator = TaskCoordinator()
        await coordinator.run_all_tasks()
```

**配置项**:
- 执行时间: 01:00 AM (可配置)
- 超时时间: 6 小时
- 失败重试: 3 次，间隔 30 分钟

---

### 2. 任务协调器 (Task Coordinator)

**职责**: 
- 加载爬虫配置
- 创建多个浏览器上下文 (模拟不同用户)
- 并行分发爬取任务

**实现方案**:
```python
import asyncio
from typing import List

class TaskCoordinator:
    def __init__(self, config_path: str):
        self.config = load_scraper_config(config_path)
        self.browser_pool = BrowserPool()
        
    async def run_all_tasks(self):
        """并行运行所有爬虫任务"""
        async with self.browser_pool:
            tasks = []
            
            # 为每个网站创建爬取任务
            for site_config in self.config.sites:
                # 创建独立的浏览器上下文 (模拟不同用户)
                context = await self.browser_pool.create_context(
                    user_agent=site_config.user_agent,
                    viewport=site_config.viewport,
                    locale=site_config.locale
                )
                
                # 创建爬虫实例
                spider = self._get_spider(site_config.spider_class)
                
                # 添加到任务队列
                tasks.append(
                    self._run_spider(spider, context, site_config)
                )
            
            # 并行执行所有任务
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 处理结果
            self._handle_results(results)
    
    async def _run_spider(self, spider, context, config):
        """运行单个爬虫"""
        try:
            return await spider.scrape(context, config)
        except Exception as e:
            logger.error(f"爬虫 {config.name} 执行失败: {e}")
            return None
```

**并发策略**:
- 最大并发数: 5 个浏览器上下文
- 每个上下文独立的 User-Agent、Cookie
- 请求间隔: 随机 2-5 秒

---

### 3. 浏览器管理 (Browser Pool)

**职责**: 
- 管理 Playwright 浏览器实例
- 创建和复用浏览器上下文
- 资源清理

**实现方案**:
```python
from playwright.async_api import async_playwright, Browser, BrowserContext

class BrowserPool:
    def __init__(self, max_contexts: int = 5):
        self.max_contexts = max_contexts
        self.playwright = None
        self.browser: Browser = None
        self.contexts: List[BrowserContext] = []
        
    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
            ]
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # 清理所有上下文
        for context in self.contexts:
            await context.close()
        await self.browser.close()
        await self.playwright.stop()
    
    async def create_context(self, **kwargs) -> BrowserContext:
        """创建新的浏览器上下文 (模拟独立用户)"""
        context = await self.browser.new_context(
            user_agent=kwargs.get('user_agent'),
            viewport=kwargs.get('viewport', {'width': 1920, 'height': 1080}),
            locale=kwargs.get('locale', 'en-AU'),
            timezone_id='Australia/Sydney',
            # 反爬虫设置
            extra_http_headers={
                'Accept-Language': 'en-AU,en;q=0.9',
            }
        )
        
        # 注入反检测脚本
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)
        
        self.contexts.append(context)
        return context
```

**浏览器配置**:
- 引擎: Chromium (headless)
- 反爬虫对策: 移除 webdriver 特征
- 资源优化: 禁用图片/CSS (可选)

---

### 4. 爬虫基类 (Base Spider)

**职责**: 
- 提供通用爬取逻辑
- 错误处理和重试
- 数据提取接口

**实现方案**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseSpider(ABC):
    def __init__(self):
        self.pipeline = PipelineManager()
        self.metrics = MetricsCollector()
        
    async def scrape(self, context: BrowserContext, config: Dict) -> List[Dict]:
        """主爬取流程"""
        logger.info(f"开始爬取: {config['name']}")
        self.metrics.increment('scrape_started')
        
        try:
            # 1. 获取所有待爬取的 URL
            urls = await self.get_urls(context, config)
            logger.info(f"发现 {len(urls)} 个待爬取页面")
            
            # 2. 并发爬取详情页
            items = []
            for url in urls:
                try:
                    item = await self.scrape_detail(context, url)
                    if item:
                        items.append(item)
                except Exception as e:
                    logger.error(f"爬取 {url} 失败: {e}")
                    
                # 随机延迟，避免触发反爬虫
                await asyncio.sleep(random.uniform(2, 5))
            
            # 3. 数据处理管道
            processed_items = await self.pipeline.process(items)
            
            self.metrics.increment('scrape_completed')
            logger.info(f"爬取完成，获得 {len(processed_items)} 条有效数据")
            
            return processed_items
            
        except Exception as e:
            self.metrics.increment('scrape_failed')
            logger.error(f"爬取失败: {e}")
            raise
    
    @abstractmethod
    async def get_urls(self, context: BrowserContext, config: Dict) -> List[str]:
        """获取待爬取的 URL 列表 (列表页)"""
        pass
    
    @abstractmethod
    async def scrape_detail(self, context: BrowserContext, url: str) -> Dict:
        """爬取详情页数据"""
        pass
    
    @abstractmethod
    def parse_item(self, page) -> Dict:
        """解析页面数据"""
        pass
```

---

### 5. 数据处理管道 (Pipeline)

**职责**: 
- 按顺序处理数据
- 每个阶段独立可测试
- 支持管道扩展

**管道流程**:

```
                            数据处理管道 (新架构)
                            
Raw Data → Extractor → Cleaner → Validator → Deduplicator 
   ↓          ↓          ↓          ↓            ↓        
原始数据   提取字段   清洗数据   验证格式      去重检查   
                                                ↓
                                          Backup Writer ⭐
                                          (JSON 持久化)
                                                ↓
                                          Transformer
                                          (适配 DB Schema)
                                                ↓
                                          Database Writer
                                          (PostgreSQL)
                                                
核心理念: 爬虫维护完整的房源列表 (JSON)，与数据库 Schema 解耦
```

**架构优势**:
1. ✅ **数据安全**: 原始数据永久备份，不依赖数据库
2. ✅ **松耦合**: 数据库 Schema 变更不影响爬虫
3. ✅ **可追溯**: 每日数据快照，便于历史分析
4. ✅ **灵活性**: 可随时从备份重建数据库
5. ✅ **可移植**: 数据格式标准化，易于迁移

**实现方案**:
```python
class PipelineManager:
    def __init__(self):
        self.pipelines = [
            ExtractorPipeline(),
            CleanerPipeline(),
            ValidatorPipeline(),
            DeduplicatorPipeline(),
            BackupPipeline(),        # ⭐ 新增: 备份原始数据
            TransformerPipeline(),   # ⭐ 修改: 转换为数据库格式
            DatabasePipeline(),      # ⭐ 修改: 存储到数据库
        ]
    
    async def process(self, items: List[Dict]) -> List[Dict]:
        """依次通过所有管道处理数据"""
        processed_items = items
        
        for pipeline in self.pipelines:
            processed_items = await pipeline.process(processed_items)
            logger.debug(f"{pipeline.__class__.__name__}: {len(processed_items)} 条")
        
        return processed_items


# 各管道实现示例

class CleanerPipeline:
    """数据清洗管道"""
    async def process(self, items: List[Dict]) -> List[Dict]:
        cleaned = []
        for item in items:
            # 去除空格
            item['title'] = item.get('title', '').strip()
            item['address'] = item.get('address', '').strip()
            
            # 标准化价格
            item['price'] = self._clean_price(item.get('price'))
            
            # 统一日期格式
            item['available_date'] = self._parse_date(item.get('available_date'))
            
            cleaned.append(item)
        return cleaned
    
    def _clean_price(self, price_str: str) -> int:
        """清洗价格字符串: '$450 per week' -> 450"""
        if not price_str:
            return None
        # 移除非数字字符
        digits = re.sub(r'[^\d]', '', price_str)
        return int(digits) if digits else None


class DeduplicatorPipeline:
    """去重管道 - 基于 Redis"""
    def __init__(self):
        self.redis = RedisHelper()
        self.cache_key_prefix = "scraper:seen:"
        self.cache_ttl = 7 * 24 * 3600  # 7 天
    
    async def process(self, items: List[Dict]) -> List[Dict]:
        unique_items = []
        
        for item in items:
            # 生成唯一标识 (例如: URL 或 ID)
            item_id = item.get('url') or item.get('id')
            cache_key = f"{self.cache_key_prefix}{item_id}"
            
            # 检查是否已存在
            if not await self.redis.exists(cache_key):
                # 标记为已见
                await self.redis.setex(cache_key, self.cache_ttl, "1")
                unique_items.append(item)
            else:
                logger.debug(f"跳过重复数据: {item_id}")
        
        logger.info(f"去重: {len(items)} -> {len(unique_items)}")
        return unique_items


class ValidatorPipeline:
    """数据验证管道 - 使用 Pydantic"""
    async def process(self, items: List[Dict]) -> List[Dict]:
        validated = []
        
        for item in items:
            try:
                # 使用 Pydantic 模型验证
                property_model = PropertyModel(**item)
                validated.append(property_model.model_dump())
            except ValidationError as e:
                logger.warning(f"数据验证失败: {e}")
                # 记录无效数据
                self._log_invalid_item(item, e)
        
        return validated


class BackupPipeline:
    """数据备份管道 - 持久化原始爬取数据 ⭐NEW"""
    def __init__(self):
        self.backup_manager = BackupManager()
    
    async def process(self, items: List[Dict]) -> List[Dict]:
        """备份原始数据到 JSON 文件"""
        if not items:
            return items
        
        try:
            # 生成备份文件名 (按日期和来源)
            timestamp = datetime.now()
            source = items[0].get('source', 'unknown')
            
            backup_result = await self.backup_manager.save_daily_backup(
                data=items,
                source=source,
                timestamp=timestamp
            )
            
            logger.info(f"数据备份成功: {backup_result['file_path']}")
            logger.info(f"备份记录数: {backup_result['count']}, 文件大小: {backup_result['size_mb']:.2f} MB")
            
        except Exception as e:
            logger.error(f"数据备份失败: {e}")
            # 备份失败不影响后续流程
        
        return items


class TransformerPipeline:
    """数据转换管道 - 将原始格式转换为数据库 Schema ⭐UPDATED"""
    
    def __init__(self):
        self.schema_mapper = SchemaMapper()
    
    async def process(self, items: List[Dict]) -> List[Dict]:
        """
        将爬虫原始数据格式转换为数据库 Schema
        实现松耦合: 爬虫数据模型 → 数据库模型
        """
        transformed = []
        
        for item in items:
            try:
                # 映射字段到数据库 Schema
                db_item = self.schema_mapper.transform(item)
                transformed.append(db_item)
            except Exception as e:
                logger.warning(f"数据转换失败: {e}, 原始数据: {item.get('url')}")
        
        logger.info(f"数据转换完成: {len(items)} -> {len(transformed)}")
        return transformed
    

class DatabasePipeline:
    """数据库存储管道 - 保存到 PostgreSQL ⭐UPDATED"""
    def __init__(self):
        self.db = DatabaseHelper()
    
    async def process(self, items: List[Dict]) -> List[Dict]:
        """将转换后的数据存储到数据库"""
        if not items:
            return items
        
        # 批量插入/更新
        try:
            result = await self.db.upsert_properties(items)
            logger.info(f"数据库更新成功: 新增 {result['inserted']}, 更新 {result['updated']}")
        except Exception as e:
            logger.error(f"数据库存储失败: {e}")
            raise
        
        return items


# ============ 备份管理器实现 ============

class BackupManager:
    """数据备份管理器 - 管理原始数据的持久化"""
    
    def __init__(self, base_dir: str = "/data/raw"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
    
    async def save_daily_backup(
        self, 
        data: List[Dict], 
        source: str,
        timestamp: datetime
    ) -> Dict:
        """
        保存每日备份
        
        文件结构:
        /data/raw/
          └── 2025-11-01/
              ├── realestate_au_properties.json
              ├── domain_com_au_properties.json
              └── metadata.json
        """
        # 创建日期目录
        date_dir = self.base_dir / timestamp.strftime("%Y-%m-%d")
        date_dir.mkdir(parents=True, exist_ok=True)
        
        # 生成文件名
        filename = f"{source}_properties.json"
        file_path = date_dir / filename
        
        # 准备备份数据
        backup_data = {
            "metadata": {
                "source": source,
                "scraped_at": timestamp.isoformat(),
                "count": len(data),
                "version": "2.0"
            },
            "properties": data
        }
        
        # 写入 JSON 文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2)
        
        # 更新 latest 软链接
        await self._update_latest_link(source, file_path)
        
        # 写入元数据
        await self._save_metadata(date_dir, source, data, timestamp)
        
        # 返回备份信息
        file_size = file_path.stat().st_size / (1024 * 1024)  # MB
        return {
            "file_path": str(file_path),
            "count": len(data),
            "size_mb": file_size
        }
    
    async def _update_latest_link(self, source: str, file_path: Path):
        """更新 latest 目录的软链接"""
        latest_dir = self.base_dir / "latest"
        latest_dir.mkdir(exist_ok=True)
        
        link_path = latest_dir / f"{source}_properties.json"
        
        # 删除旧链接
        if link_path.exists() or link_path.is_symlink():
            link_path.unlink()
        
        # 创建新链接
        link_path.symlink_to(file_path)
    
    async def _save_metadata(
        self, 
        date_dir: Path, 
        source: str, 
        data: List[Dict],
        timestamp: datetime
    ):
        """保存元数据信息"""
        metadata_file = date_dir / "metadata.json"
        
        # 读取现有元数据
        if metadata_file.exists():
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        else:
            metadata = {
                "date": timestamp.strftime("%Y-%m-%d"),
                "sources": {}
            }
        
        # 更新元数据
        metadata["sources"][source] = {
            "count": len(data),
            "scraped_at": timestamp.isoformat(),
            "file": f"{source}_properties.json"
        }
        
        # 写入元数据
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    async def load_backup(self, date: str, source: str) -> Dict:
        """加载指定日期的备份数据"""
        file_path = self.base_dir / date / f"{source}_properties.json"
        
        if not file_path.exists():
            raise FileNotFoundError(f"备份文件不存在: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    async def get_latest_backup(self, source: str) -> Dict:
        """获取最新备份"""
        latest_file = self.base_dir / "latest" / f"{source}_properties.json"
        
        if not latest_file.exists():
            raise FileNotFoundError(f"未找到最新备份: {source}")
        
        with open(latest_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    async def list_backups(self, source: Optional[str] = None) -> List[Dict]:
        """列出所有备份"""
        backups = []
        
        for date_dir in sorted(self.base_dir.iterdir()):
            if not date_dir.is_dir() or date_dir.name == "latest":
                continue
            
            metadata_file = date_dir / "metadata.json"
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                if source:
                    if source in metadata.get("sources", {}):
                        backups.append({
                            "date": metadata["date"],
                            "source": source,
                            **metadata["sources"][source]
                        })
                else:
                    backups.append(metadata)
        
        return backups


# ============ Schema 映射器实现 ============

class SchemaMapper:
    """Schema 映射器 - 实现爬虫数据到数据库的转换"""
    
    def transform(self, raw_item: Dict) -> Dict:
        """
        将爬虫原始数据转换为数据库 Schema
        
        爬虫格式 (独立维护):
        {
            "url": "...",
            "title": "...",
            "raw_price": "$450 per week",
            "scraped_fields": {...}
        }
        
        数据库格式:
        {
            "house_id": "...",
            "description_en": "...",
            "weekly_rent": 450,
            ...
        }
        """
        return {
            # 基础字段映射
            "house_id": self._generate_house_id(raw_item.get("url")),
            "url": raw_item.get("url"),
            "description_en": raw_item.get("title"),
            
            # 价格转换
            "weekly_rent": self._parse_price(raw_item.get("raw_price")),
            
            # 房屋信息
            "bedrooms": raw_item.get("bedrooms"),
            "bathrooms": raw_item.get("bathrooms"),
            "parking_spaces": raw_item.get("parking"),
            "property_type": raw_item.get("property_type"),
            
            # 地址信息
            "address": raw_item.get("address"),
            "suburb": raw_item.get("suburb"),
            "postcode": raw_item.get("postcode"),
            "state": raw_item.get("state"),
            
            # 位置坐标
            "latitude": raw_item.get("latitude"),
            "longitude": raw_item.get("longitude"),
            
            # 日期
            "available_date": self._parse_date(raw_item.get("available_date")),
            "published_at": raw_item.get("published_at"),
            
            # 其他
            "thumbnail_url": raw_item.get("images", [None])[0] if raw_item.get("images") else None,
            "scraped_at": datetime.now(),
        }
    
    def _generate_house_id(self, url: str) -> str:
        """从 URL 生成唯一 ID"""
        import hashlib
        return hashlib.md5(url.encode()).hexdigest()[:16]
    
    def _parse_price(self, price_str: str) -> Optional[int]:
        """解析价格字符串"""
        if not price_str:
            return None
        digits = re.sub(r'[^\d]', '', str(price_str))
        return int(digits) if digits else None
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """解析日期字符串"""
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str)
        except:
            return None




---

### 6. 数据模型 (Pydantic Models)

**职责**: 
- 定义数据结构
- 自动验证数据类型
- 序列化/反序列化

**实现方案**:
```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class PropertyModel(BaseModel):
    """房产数据模型"""
    
    # 基本信息
    id: Optional[str] = None
    url: str = Field(..., description="房源链接")
    title: str = Field(..., min_length=1, description="房源标题")
    address: str = Field(..., description="地址")
    
    # 房屋详情
    bedrooms: Optional[int] = Field(None, ge=0, description="卧室数")
    bathrooms: Optional[int] = Field(None, ge=0, description="浴室数")
    parking: Optional[int] = Field(None, ge=0, description="停车位")
    property_type: Optional[str] = Field(None, description="房屋类型")
    
    # 价格信息
    price: int = Field(..., gt=0, description="租金 (每周)")
    bond: Optional[int] = Field(None, ge=0, description="押金")
    
    # 日期
    available_date: Optional[datetime] = None
    scraped_at: datetime = Field(default_factory=datetime.now)
    
    # 位置信息
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    
    # 其他
    description: Optional[str] = None
    features: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)
    
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        """验证价格合理性"""
        if v < 100 or v > 5000:
            raise ValueError(f"价格异常: {v}")
        return v
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        """验证 URL 格式"""
        if not v.startswith('http'):
            raise ValueError(f"无效的 URL: {v}")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.com/property/123",
                "title": "Modern 2BR Apartment",
                "address": "123 George St, Sydney NSW 2000",
                "bedrooms": 2,
                "bathrooms": 1,
                "parking": 1,
                "price": 650,
                "property_type": "Apartment"
            }
        }
```

---

### 7. 数据备份与版本控制策略 ⭐NEW

#### A. 备份策略设计

**核心理念**:
- 爬虫维护完整、独立的房源数据备份 (JSON 格式)
- 与数据库 Schema 完全解耦
- 支持历史数据追溯和分析

**文件组织结构**:
```
/data/raw/
├── 2025-11-01/                    # 每日备份
│   ├── realestate_au_properties.json
│   ├── domain_com_au_properties.json
│   ├── rent_com_au_properties.json
│   └── metadata.json              # 元数据信息
├── 2025-11-02/
│   ├── realestate_au_properties.json
│   └── metadata.json
├── latest/                        # 最新数据软链接
│   ├── realestate_au_properties.json -> ../2025-11-02/realestate_au_properties.json
│   └── domain_com_au_properties.json -> ../2025-11-01/domain_com_au_properties.json
└── archive/                       # 历史归档 (可选)
    └── 2025-10/
        └── 2025-10-01_to_31.tar.gz
```

**JSON 数据格式**:
```json
{
  "metadata": {
    "source": "realestate_au",
    "scraped_at": "2025-11-01T01:30:00+11:00",
    "count": 1250,
    "version": "2.0",
    "scraper_config": {
      "search_areas": ["Sydney", "Melbourne"],
      "max_price": 1000
    }
  },
  "properties": [
    {
      "url": "https://www.realestate.com.au/property-123",
      "title": "Modern 2BR Apartment in CBD",
      "address": "123 George St, Sydney NSW 2000",
      "suburb": "Sydney",
      "postcode": "2000",
      "state": "NSW",
      "bedrooms": 2,
      "bathrooms": 1,
      "parking": 1,
      "property_type": "Apartment",
      "raw_price": "$650 per week",
      "bond": "$2600",
      "available_date": "2025-11-15",
      "published_at": "2025-10-28T10:30:00+11:00",
      "latitude": -33.8688,
      "longitude": 151.2093,
      "description": "Stunning apartment with...",
      "features": ["Air Conditioning", "Dishwasher", "Built-in Wardrobes"],
      "images": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "scraped_at": "2025-11-01T01:35:22+11:00"
    }
  ]
}
```

#### B. 数据流转过程

```
1. 爬虫爬取原始数据
   └─> PropertyModel (Pydantic 验证)

2. BackupPipeline 备份
   └─> /data/raw/YYYY-MM-DD/{source}_properties.json
   └─> 更新 /data/raw/latest/ 软链接

3. TransformerPipeline 转换
   └─> SchemaMapper.transform()
   └─> 适配数据库 Schema

4. DatabasePipeline 存储
   └─> PostgreSQL UPSERT
   └─> 基于 house_id 去重更新
```

#### C. 松耦合优势

| 场景 | 传统方案 | 新方案 (备份优先) |
|------|----------|------------------|
| 数据库 Schema 变更 | 需要重新爬取 | 从备份重新导入即可 |
| 数据分析 | 依赖数据库查询 | 直接读取 JSON 文件 |
| 数据迁移 | 复杂的数据库迁移 | 复制 JSON 文件即可 |
| 历史数据追溯 | 依赖数据库备份 | 每日独立快照 |
| 错误恢复 | 数据库回滚复杂 | 重新导入备份文件 |

#### D. 备份管理工具

**查看备份列表**:
```bash
# 列出所有备份
python -m src.storage.backup_manager list

# 列出特定来源的备份
python -m src.storage.backup_manager list --source realestate_au

# 输出示例:
# Date       | Source          | Count | Size    | File
# -----------|-----------------|-------|---------|------------------------
# 2025-11-01 | realestate_au   | 1250  | 2.3 MB  | realestate_au_properties.json
# 2025-11-01 | domain_com_au   | 980   | 1.8 MB  | domain_com_au_properties.json
```

**恢复备份到数据库**:
```bash
# 从最新备份恢复
python -m src.storage.backup_manager restore --source realestate_au --latest

# 从指定日期恢复
python -m src.storage.backup_manager restore --date 2025-11-01 --source domain_com_au

# 恢复所有来源
python -m src.storage.backup_manager restore-all --date 2025-11-01
```

**数据对比分析**:
```bash
# 对比两个日期的数据差异
python -m src.storage.backup_manager diff --date1 2025-11-01 --date2 2025-11-02

# 输出示例:
# Source: realestate_au
# - New properties: 45
# - Removed properties: 12
# - Price changes: 23
# - Total: 1250 -> 1283
```

#### E. 数据归档策略

**自动归档规则**:
```python
class ArchivePolicy:
    """数据归档策略"""
    
    # 保留策略
    RETENTION_RULES = {
        "daily": 7,      # 保留最近 7 天的每日备份
        "weekly": 4,     # 保留最近 4 周的每周备份
        "monthly": 12,   # 保留最近 12 个月的每月备份
    }
    
    async def archive_old_backups(self):
        """归档旧备份"""
        # 每日备份保留 7 天
        # 7 天前的数据合并为周备份
        # 4 周前的数据合并为月备份
        # 12 个月前的数据压缩存档
```

**Docker Volume 配置**:
```yaml
services:
  scraper:
    volumes:
      - scraper_data:/data/raw      # 原始数据持久化
      - scraper_logs:/app/logs       # 日志持久化

volumes:
  scraper_data:
    driver: local
  scraper_logs:
    driver: local
```

#### F. AWS S3 云端备份方案 ⭐NEW

**需求分析**:
- 数据规模: 每日 2-5 MB JSON 文件
- 备份频率: 每日一次
- 访问频率: 低频读取，偶尔恢复
- 可靠性要求: 99.999999999% 持久性

**为什么选择 AWS S3**:

1. ✅ **行业标准** - 最成熟的对象存储服务
2. ✅ **高可靠性** - 99.999999999% (11个9) 数据持久性
3. ✅ **全球覆盖** - 多区域部署，就近访问
4. ✅ **成熟生态** - boto3 SDK 完善，社区支持好
5. ✅ **灵活存储类** - 支持标准、低频、归档等多种存储类型
6. ✅ **安全性高** - 加密、访问控制、审计日志完善

**成本估算** (基于澳洲 ap-southeast-2 区域):

| 存储类型 | 存储成本/GB/月 | 适用场景 | 推荐 |
|---------|--------------|----------|------|
| **S3 Standard** | $0.025 | 频繁访问 | ⭐⭐⭐ |
| **S3 Standard-IA** | $0.0138 | 低频访问 (>30天) | ⭐⭐⭐⭐⭐ |
| **S3 Glacier Instant** | $0.005 | 归档 (即时检索) | ⭐⭐⭐⭐ |
| **S3 Glacier Deep** | $0.002 | 长期归档 (12小时检索) | ⭐⭐⭐ |

```
每日备份: 3 MB
月度数据: 3 MB × 30 = 90 MB
年度数据: 90 MB × 12 = 1.08 GB

使用 S3 Standard-IA (推荐):
月度成本: 0.09 GB × $0.0138 = $0.00124/月
年度成本: 1.08 GB × $0.0138 × 12 = $0.18/年 ≈ ￥1.3/年

数据检索费用: $0.01/GB (偶尔恢复，成本很低)
```

**实现示例**:

```python
import boto3
from botocore.exceptions import ClientError
from pathlib import Path
from datetime import datetime
import os

class S3Storage:
    """AWS S3 云存储"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            region_name=os.getenv('AWS_REGION', 'ap-southeast-2'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'qrent-scraper-backup')
        self._ensure_bucket()
    
    def _ensure_bucket(self):
        """确保 S3 bucket 存在"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"S3 bucket 已存在: {self.bucket_name}")
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                # 创建 bucket
                self.s3_client.create_bucket(
                    Bucket=self.bucket_name,
                    CreateBucketConfiguration={
                        'LocationConstraint': os.getenv('AWS_REGION', 'ap-southeast-2')
                    }
                )
                logger.info(f"创建 S3 bucket: {self.bucket_name}")
                
                # 启用版本控制
                self.s3_client.put_bucket_versioning(
                    Bucket=self.bucket_name,
                    VersioningConfiguration={'Status': 'Enabled'}
                )
                
                # 配置生命周期策略
                self._configure_lifecycle()
            else:
                raise
    
    def _configure_lifecycle(self):
        """配置生命周期策略 - 自动转换存储类"""
        lifecycle_policy = {
            'Rules': [
                {
                    'Id': 'TransitionToIA',
                    'Status': 'Enabled',
                    'Prefix': 'backups/',
                    'Transitions': [
                        {
                            'Days': 30,
                            'StorageClass': 'STANDARD_IA'  # 30天后转低频访问
                        },
                        {
                            'Days': 90,
                            'StorageClass': 'GLACIER_IR'   # 90天后转归档
                        }
                    ],
                    'NoncurrentVersionTransitions': [
                        {
                            'NoncurrentDays': 30,
                            'StorageClass': 'GLACIER_IR'
                        }
                    ],
                    'Expiration': {
                        'Days': 365  # 1年后删除
                    }
                }
            ]
        }
        
        self.s3_client.put_bucket_lifecycle_configuration(
            Bucket=self.bucket_name,
            LifecycleConfiguration=lifecycle_policy
        )
        logger.info("S3 生命周期策略配置完成")
    
    async def upload_backup(self, file_path: Path, remote_key: str):
        """
        上传备份到 S3
        
        Args:
            file_path: 本地文件路径
            remote_key: S3 对象键，如 'backups/2025/11/01/realestate_au_properties.json'
        """
        try:
            # 上传文件
            self.s3_client.upload_file(
                str(file_path),
                self.bucket_name,
                remote_key,
                ExtraArgs={
                    'ContentType': 'application/json',
                    'StorageClass': 'STANDARD',  # 初始使用标准存储
                    'ServerSideEncryption': 'AES256',  # 启用加密
                    'Metadata': {
                        'scraped-at': datetime.now().isoformat(),
                        'source': 'scraper-v2',
                        'file-size': str(file_path.stat().st_size)
                    },
                    'Tagging': 'Environment=production&Project=qrent&Type=backup'
                }
            )
            
            # 获取上传后的文件信息
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            logger.info(f"S3 备份成功: {remote_key} ({file_size_mb:.2f} MB)")
            
            return True
            
        except ClientError as e:
            logger.error(f"S3 备份失败: {e}")
            return False
    
    async def download_backup(self, remote_key: str, local_path: Path):
        """从 S3 下载备份"""
        try:
            self.s3_client.download_file(
                self.bucket_name,
                remote_key,
                str(local_path)
            )
            logger.info(f"S3 下载成功: {remote_key} -> {local_path}")
            return True
        except ClientError as e:
            logger.error(f"S3 下载失败: {e}")
            return False
    
    async def list_backups(self, prefix: str = 'backups/'):
        """列出所有备份"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            backups = []
            for obj in response.get('Contents', []):
                backups.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                    'storage_class': obj.get('StorageClass', 'STANDARD')
                })
            
            return backups
            
        except ClientError as e:
            logger.error(f"S3 列表查询失败: {e}")
            return []
    
    async def delete_backup(self, remote_key: str):
        """删除备份"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=remote_key
            )
            logger.info(f"S3 删除成功: {remote_key}")
            return True
        except ClientError as e:
            logger.error(f"S3 删除失败: {e}")
            return False
    
    async def get_backup_metadata(self, remote_key: str):
        """获取备份元数据"""
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=remote_key
            )
            return {
                'size': response['ContentLength'],
                'last_modified': response['LastModified'],
                'storage_class': response.get('StorageClass', 'STANDARD'),
                'metadata': response.get('Metadata', {})
            }
        except ClientError as e:
            logger.error(f"获取元数据失败: {e}")
            return None
```

**环境变量配置**:
```bash
# AWS S3 配置
AWS_REGION=ap-southeast-2              # 澳洲悉尼区域
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=qrent-scraper-backup
CLOUD_BACKUP_ENABLED=true
```

**S3 备份管理器**:

```python
class S3BackupManager:
    """S3 云备份管理器"""
    
    def __init__(self):
        self.s3_storage = S3Storage()
    
    async def backup_to_cloud(self, local_file: Path, date: str, source: str):
        """
        备份到 S3
        
        文件组织结构:
        s3://qrent-scraper-backup/
          └── backups/
              └── 2025/
                  └── 11/
                      └── 01/
                          ├── realestate_au_properties.json
                          ├── domain_com_au_properties.json
                          └── metadata.json
        """
        # 生成 S3 对象键
        year, month, day = date.split('-')
        s3_key = f"backups/{year}/{month}/{day}/{source}_properties.json"
        
        # 上传到 S3
        success = await self.s3_storage.upload_backup(local_file, s3_key)
        
        if success:
            logger.info(f"S3 云端备份成功: {s3_key}")
            # 上传元数据
            await self._upload_metadata(date, source, local_file)
        
        return success
    
    async def _upload_metadata(self, date: str, source: str, data_file: Path):
        """上传备份元数据"""
        year, month, day = date.split('-')
        metadata_key = f"backups/{year}/{month}/{day}/metadata.json"
        
        # 生成元数据
        metadata = {
            "date": date,
            "sources": {
                source: {
                    "file": f"{source}_properties.json",
                    "size": data_file.stat().st_size,
                    "uploaded_at": datetime.now().isoformat()
                }
            }
        }
        
        # 写入临时文件并上传
        temp_file = Path(f"/tmp/metadata_{date}.json")
        with open(temp_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        await self.s3_storage.upload_backup(temp_file, metadata_key)
        temp_file.unlink()
    
    async def restore_from_cloud(self, date: str, source: str, local_dir: Path):
        """从 S3 恢复备份"""
        year, month, day = date.split('-')
        s3_key = f"backups/{year}/{month}/{day}/{source}_properties.json"
        local_path = local_dir / f"{source}_properties.json"
        
        success = await self.s3_storage.download_backup(s3_key, local_path)
        if success:
            logger.info(f"S3 恢复成功: {local_path}")
        
        return local_path if success else None
    
    async def list_cloud_backups(self, prefix: str = 'backups/'):
        """列出所有云端备份"""
        return await self.s3_storage.list_backups(prefix)
    
    async def get_backup_stats(self):
        """获取备份统计信息"""
        backups = await self.list_cloud_backups()
        
        total_size = sum(b['size'] for b in backups)
        total_count = len(backups)
        
        return {
            'total_backups': total_count,
            'total_size_mb': total_size / (1024 * 1024),
            'oldest_backup': min(b['last_modified'] for b in backups) if backups else None,
            'newest_backup': max(b['last_modified'] for b in backups) if backups else None
        }
```

---

#### 📋 备份策略建议

**推荐备份方案**:
```
├─ 本地备份 (Docker Volume)
│   ├─ 最近 7 天: 每日完整备份
│   └─ 快速访问，用于日常恢复
│
└─ AWS S3 云端备份
    ├─ 前 30 天: STANDARD 存储类 (快速检索)
    ├─ 30-90 天: STANDARD_IA 存储类 (低频访问)
    ├─ 90+ 天: GLACIER_IR 归档 (长期保存)
    └─ 1 年后: 自动删除 (生命周期策略)
```

**备份时间表**:
```python
class BackupSchedule:
    """备份调度策略"""
    
    async def daily_backup_routine(self):
        """每日备份流程"""
        # 1. 本地备份 (立即)
        await local_backup_manager.save_daily_backup(data)
        
        # 2. S3 云端备份 (30分钟后，避免高峰)
        await asyncio.sleep(1800)
        await s3_backup_manager.backup_to_cloud(local_file, date, source)
        
        # 3. 清理旧本地备份 (保留最近7天)
        await self.cleanup_old_local_backups(days=7)
```

**S3 生命周期自动管理**:
```
Day 0:    上传 → STANDARD 存储类
Day 30:   自动转换 → STANDARD_IA (节省 45% 成本)
Day 90:   自动转换 → GLACIER_IR (节省 80% 成本)
Day 365:  自动删除 (可选)

---

### 8. 可观测性 (Observability)

#### A. 日志系统 (Loguru)

**配置**:
```python
from loguru import logger
import sys

def setup_logger():
    # 移除默认处理器
    logger.remove()
    
    # 控制台输出 (带颜色)
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
        level="INFO",
        colorize=True
    )
    
    # 文件输出 (JSON 格式，便于分析)
    logger.add(
        "logs/scraper_{time:YYYY-MM-DD}.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} - {message}",
        level="DEBUG",
        rotation="00:00",  # 每天轮转
        retention="30 days",  # 保留 30 天
        compression="zip",  # 压缩旧日志
        serialize=True  # JSON 格式
    )
    
    # 错误日志单独记录
    logger.add(
        "logs/errors_{time:YYYY-MM-DD}.log",
        level="ERROR",
        rotation="00:00",
        retention="90 days"
    )
```

**使用示例**:
```python
logger.info("开始爬取任务")
logger.debug(f"配置: {config}")
logger.warning("URL 解析失败，使用默认值")
logger.error(f"数据库连接失败: {error}")
logger.exception("未处理的异常")  # 自动记录堆栈
```

#### B. 指标监控 (Prometheus)

**指标定义**:
```python
from prometheus_client import Counter, Histogram, Gauge, Summary

class MetricsCollector:
    def __init__(self):
        # 计数器
        self.scrape_total = Counter(
            'scraper_scrape_total',
            'Total scrape tasks',
            ['spider', 'status']  # 标签: 爬虫名, 状态
        )
        
        self.items_scraped = Counter(
            'scraper_items_total',
            'Total items scraped',
            ['spider']
        )
        
        # 直方图 (耗时分布)
        self.scrape_duration = Histogram(
            'scraper_duration_seconds',
            'Scrape duration in seconds',
            ['spider'],
            buckets=[1, 5, 10, 30, 60, 120, 300, 600]
        )
        
        # 仪表盘 (当前值)
        self.active_spiders = Gauge(
            'scraper_active_spiders',
            'Number of active spiders'
        )
        
        # 摘要统计
        self.page_load_time = Summary(
            'scraper_page_load_seconds',
            'Page load time in seconds'
        )
    
    def record_scrape(self, spider_name: str, duration: float, status: str, items_count: int):
        """记录一次爬取任务"""
        self.scrape_total.labels(spider=spider_name, status=status).inc()
        self.scrape_duration.labels(spider=spider_name).observe(duration)
        self.items_scraped.labels(spider=spider_name).inc(items_count)
```

**暴露指标端点**:
```python
from prometheus_client import start_http_server

# 在 9090 端口暴露指标
start_http_server(9090)
```

**Prometheus 配置** (`prometheus.yml`):
```yaml
scrape_configs:
  - job_name: 'scraper'
    static_configs:
      - targets: ['scraper:9090']
    scrape_interval: 15s
```

#### C. 健康检查

**实现**:
```python
from datetime import datetime, timedelta

class HealthCheck:
    def __init__(self):
        self.last_scrape_time = None
        self.last_error = None
        
    def is_healthy(self) -> bool:
        """检查服务是否健康"""
        # 检查 1: 最近是否成功爬取
        if self.last_scrape_time:
            time_since_last = datetime.now() - self.last_scrape_time
            if time_since_last > timedelta(hours=25):  # 超过 25 小时未爬取
                return False
        
        # 检查 2: 数据库连接
        if not self._check_database():
            return False
        
        # 检查 3: Redis 连接
        if not self._check_redis():
            return False
        
        return True
    
    def get_status(self) -> dict:
        """获取详细状态"""
        return {
            "healthy": self.is_healthy(),
            "last_scrape": self.last_scrape_time.isoformat() if self.last_scrape_time else None,
            "last_error": self.last_error,
            "timestamp": datetime.now().isoformat()
        }
```

**HTTP 健康检查端点** (供 Docker 使用):
```python
from aiohttp import web

async def health_handler(request):
    health = HealthCheck()
    status = health.get_status()
    
    return web.json_response(
        status,
        status=200 if status['healthy'] else 503
    )

app = web.Application()
app.router.add_get('/health', health_handler)
web.run_app(app, port=8080)
```

---

## 🐳 Docker 部署

### Dockerfile

```dockerfile
FROM python:3.11-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 安装 Playwright 浏览器
RUN playwright install chromium
RUN playwright install-deps chromium

# 复制项目文件
COPY . .

# 创建日志目录
RUN mkdir -p logs

# 暴露端口 (健康检查 + Prometheus)
EXPOSE 8080 9090

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 启动命令
CMD ["python", "src/main.py"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  scraper:
    build: .
    container_name: scraper-v2
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "8080:8080"  # 健康检查
      - "9090:9090"  # Prometheus 指标
    volumes:
      - ./logs:/app/logs                    # 日志持久化
      - ./config:/app/config:ro             # 配置文件 (只读)
      - scraper-data:/data/raw              # ⭐ 原始数据备份
    depends_on:
      - redis
      - postgres
    networks:
      - scraper-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1.5G                      # ⭐ 调整内存限制
        reservations:
          cpus: '1'
          memory: 800M

  redis:
    image: redis:7-alpine
    container_name: scraper-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - scraper-network
    command: redis-server --appendonly yes

  postgres:
    image: postgres:14-alpine
    container_name: scraper-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - scraper-network

  # Prometheus (可选 - 用于监控)
  prometheus:
    image: prom/prometheus:latest
    container_name: scraper-prometheus
    restart: unless-stopped
    ports:
      - "9091:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - scraper-network
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

volumes:
  redis-data:
  postgres-data:
  prometheus-data:
  scraper-data:         # ⭐ 新增: 爬虫数据备份卷

networks:
  scraper-network:
    driver: bridge
```

### 环境变量 (.env.example)

```bash
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=scraper
DB_USER=scraper
DB_PASSWORD=your_password_here

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# 爬虫配置
SCRAPER_SCHEDULE_TIME=01:00
SCRAPER_MAX_WORKERS=5
SCRAPER_REQUEST_DELAY=2-5
SCRAPER_TIMEOUT=30

# 数据备份配置 ⭐NEW
BACKUP_ENABLED=true
BACKUP_BASE_DIR=/data/raw
BACKUP_RETENTION_DAYS=90
BACKUP_ARCHIVE_ENABLED=true
BACKUP_ARCHIVE_DAYS=7

# 云端备份配置 ⭐NEW
CLOUD_BACKUP_ENABLED=true
CLOUD_BACKUP_DELAY=1800    # 延迟30分钟备份，避免高峰

# AWS S3 配置
AWS_REGION=ap-southeast-2                  # 澳洲悉尼区域
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=qrent-scraper-backup

# 日志配置
LOG_LEVEL=INFO
LOG_RETENTION_DAYS=30

# 监控配置
PROMETHEUS_PORT=9090
HEALTH_CHECK_PORT=8080
```

---

## 📊 配置文件示例

### scraper_config.yaml

```yaml
# 爬虫配置文件
version: "2.0"

# 全局配置
global:
  max_concurrent_spiders: 5
  request_timeout: 30
  retry_times: 3
  retry_delay: 10

# 网站列表
sites:
  - name: "RealEstate.com.au"
    enabled: true
    spider_class: "RealEstateSpider"
    base_url: "https://www.realestate.com.au"
    
    # 浏览器配置
    browser:
      user_agent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      viewport:
        width: 1920
        height: 1080
      locale: "en-AU"
    
    # 爬取参数
    params:
      locations:
        - "zetland-nsw-2017"
        - "waterloo-nsw-2017"
        - "rosebery-nsw-2018"
      max_pages: 10
      min_price: 300
      max_price: 1500
    
    # 请求配置
    request:
      delay: [2, 5]  # 随机延迟 2-5 秒
      headers:
        Accept-Language: "en-AU,en;q=0.9"
  
  - name: "Domain.com.au"
    enabled: true
    spider_class: "DomainSpider"
    base_url: "https://www.domain.com.au"
    
    browser:
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      viewport:
        width: 1440
        height: 900
      locale: "en-AU"
    
    params:
      locations:
        - "sydney-nsw"
      property_types:
        - "apartment"
        - "house"
      max_pages: 20
```

### requirements.txt ⭐NEW

```txt
# 核心依赖
playwright==1.40.0
pydantic==2.5.0
apscheduler==3.10.4
loguru==0.7.2
python-dotenv==1.0.0

# 数据库和缓存
asyncpg==0.29.0
psycopg2-binary==2.9.9
redis==5.0.1
aioredis==2.0.1

# AWS S3 云存储
boto3==1.34.0
botocore==1.34.0

# 监控和日志
prometheus-client==0.19.0
aiohttp==3.9.1

# 工具类
pyyaml==6.0.1
beautifulsoup4==4.12.2
lxml==4.9.3
python-dateutil==2.8.2

# 开发和测试
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
black==23.12.0
flake8==6.1.0
mypy==1.7.1
```

**安装说明**:
```bash
# 完整安装
pip install -r requirements.txt

# 最小安装 (仅本地备份，不含S3)
pip install playwright pydantic apscheduler loguru asyncpg redis prometheus-client

# 添加 S3 云备份支持
pip install boto3
```

---

## 🚀 运行流程

### 1. 部署流程

```bash
# 1. 克隆项目
cd packages/scraper-v2

# 2. 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 3. 构建镜像
docker-compose build

# 4. 启动服务
docker-compose up -d

# 5. 查看日志
docker-compose logs -f scraper

# 6. 健康检查
curl http://localhost:8080/health

# 7. 查看指标
curl http://localhost:9090/metrics
```

### 2. 日常运维

```bash
# 查看状态
docker-compose ps

# 重启服务
docker-compose restart scraper

# 手动触发爬取
docker-compose exec scraper python src/main.py --run-now

# 查看实时日志
docker-compose logs -f --tail=100 scraper

# 进入容器调试
docker-compose exec scraper bash

# 查看备份文件
docker-compose exec scraper ls -lh /data/raw/

# 手动触发 S3 云端备份 ⭐NEW
docker-compose exec scraper python -m src.storage.s3_storage upload --date 2025-11-01

# 从 S3 恢复备份 ⭐NEW
docker-compose exec scraper python -m src.storage.s3_storage restore --date 2025-11-01 --source realestate_au

# 列出 S3 云端备份 ⭐NEW
docker-compose exec scraper python -m src.storage.s3_storage list

# 查看 S3 备份统计 ⭐NEW
docker-compose exec scraper python -m src.storage.s3_storage stats
```

### 3. 备份管理 ⭐NEW

```bash
# 查看本地备份
docker-compose exec scraper python -m src.storage.backup_manager list

# 对比两个日期的数据
docker-compose exec scraper python -m src.storage.backup_manager diff \
  --date1 2025-11-01 --date2 2025-11-02

# 从备份恢复到数据库
docker-compose exec scraper python -m src.storage.backup_manager restore \
  --date 2025-11-01 --source realestate_au

# 清理旧备份
docker-compose exec scraper python -m src.storage.backup_manager cleanup \
  --older-than 90

# 验证备份完整性
docker-compose exec scraper python -m src.storage.backup_manager verify \
  --date 2025-11-01
```

### 4. AWS S3 云端备份配置 ⭐NEW

**步骤 1: 创建 IAM 用户**:
```bash
# 1. 登录 AWS Console
# https://console.aws.amazon.com/iam/

# 2. 创建 IAM 用户
# IAM → Users → Add users
# 用户名: qrent-scraper-backup
# 访问类型: Access key - Programmatic access

# 3. 创建访问密钥
# 下载 access_key_id 和 secret_access_key (仅显示一次!)
```

**步骤 2: 配置 S3 权限策略**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "QRentScraperBackupPolicy",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject",
        "s3:PutLifecycleConfiguration"
      ],
      "Resource": [
        "arn:aws:s3:::qrent-scraper-backup",
        "arn:aws:s3:::qrent-scraper-backup/*"
      ]
    }
  ]
}
```

**步骤 3: 创建 S3 Bucket** (可选 - 代码会自动创建):
```bash
# 使用 AWS CLI 创建 bucket
aws s3api create-bucket \
  --bucket qrent-scraper-backup \
  --region ap-southeast-2 \
  --create-bucket-configuration LocationConstraint=ap-southeast-2

# 启用版本控制
aws s3api put-bucket-versioning \
  --bucket qrent-scraper-backup \
  --versioning-configuration Status=Enabled

# 启用服务器端加密
aws s3api put-bucket-encryption \
  --bucket qrent-scraper-backup \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# 配置公共访问阻止 (安全)
aws s3api put-public-access-block \
  --bucket qrent-scraper-backup \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

**步骤 4: 配置环境变量**:
```bash
# 编辑 .env 文件
echo "AWS_REGION=ap-southeast-2" >> .env
echo "AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX" >> .env
echo "AWS_SECRET_ACCESS_KEY=your_secret_access_key_here" >> .env
echo "S3_BUCKET_NAME=qrent-scraper-backup" >> .env
echo "CLOUD_BACKUP_ENABLED=true" >> .env

# 重启服务
docker-compose restart scraper
```

**步骤 5: 验证配置**:
```bash
# 测试 S3 连接
docker-compose exec scraper python -m src.storage.s3_storage test

# 查看 S3 bucket 信息
aws s3 ls s3://qrent-scraper-backup/

# 查看生命周期策略
aws s3api get-bucket-lifecycle-configuration --bucket qrent-scraper-backup
```

### 5. 监控告警

**Prometheus 查询示例**:
```promql
# 爬取成功率
rate(scraper_scrape_total{status="success"}[5m]) /
rate(scraper_scrape_total[5m])

# 平均爬取耗时
rate(scraper_duration_seconds_sum[5m]) /
rate(scraper_duration_seconds_count[5m])

# 每小时爬取数量
increase(scraper_items_total[1h])
```

---

## 🔒 安全考虑

### 1. 反爬虫对策

- ✅ 随机 User-Agent
- ✅ 随机请求延迟 (2-5 秒)
- ✅ 移除 Playwright 指纹特征
- ✅ 模拟真实用户行为 (滚动、鼠标移动)
- ✅ IP 轮换 (可选，使用代理池)
- ✅ Cookie 管理和会话保持

### 2. 数据安全

- ✅ 敏感信息使用环境变量
- ✅ 数据库密码加密
- ✅ 日志脱敏 (不记录敏感字段)
- ✅ 网络隔离 (Docker 私有网络)
- ✅ 数据备份加密存储 (可选) ⭐NEW

### 3. 数据备份安全 ⭐NEW

- ✅ 备份文件权限控制 (仅爬虫用户可访问)
- ✅ 定期备份完整性校验 (MD5/SHA256)
- ✅ 异地备份支持 (S3/MinIO)
- ✅ 备份数据加密存储

---

## 📈 性能优化

### 1. 并发优化

- 最大 5 个浏览器上下文并行
- 每个上下文独立 Cookie/Session
- 使用 asyncio 异步处理

### 2. 资源优化

- 禁用不必要的资源加载 (图片、字体)
- 浏览器实例复用
- 连接池复用 (数据库、Redis)

### 3. 存储优化

- 批量插入数据 (减少数据库操作)
- Redis 去重 (避免重复爬取)
- 定期清理过期数据
- JSON 备份压缩存储 ⭐NEW
- 增量备份策略 (仅备份变更数据) ⭐NEW

---

## 📝 待实现功能

### V2.1 (近期)
- [x] 原始数据备份系统 ⭐DONE
- [x] 数据库松耦合架构 ⭐DONE
- [x] 云端备份方案设计 (AWS S3) ⭐DONE
- [ ] AWS S3 云端备份实现
- [ ] 备份恢复工具 (CLI)
- [ ] 数据对比分析工具
- [ ] 代理池管理
- [ ] 验证码识别 (OCR)
- [ ] 增量爬取 (只爬取新增/更新数据)
- [ ] Grafana 可视化面板

### V2.2 (中期)
- [ ] 备份数据加密 (S3 客户端加密)
- [ ] 备份完整性校验 (MD5/SHA256)
- [ ] S3 跨区域复制 (灾备)
- [ ] 数据版本控制系统
- [ ] 分布式爬取 (Celery)
- [ ] 智能调度 (根据网站负载动态调整)
- [ ] 数据质量评分系统
- [ ] 自动化测试覆盖

### V3.0 (长期)
- [ ] AI 辅助数据提取 (LLM)
- [ ] 自适应反爬虫策略
- [ ] 多地域部署支持
- [ ] WebSocket 实时推送
- [ ] 时间序列数据分析 (基于备份数据)

---

## 🔗 相关资源

- [Playwright 文档](https://playwright.dev/python/)
- [APScheduler 文档](https://apscheduler.readthedocs.io/)
- [Pydantic 文档](https://docs.pydantic.dev/)
- [Loguru 文档](https://loguru.readthedocs.io/)
- [Prometheus Python Client](https://github.com/prometheus/client_python)

---

## 📞 联系方式

- 项目仓库: [github.com/wiperi/qrent](https://github.com/wiperi/qrent)
- 技术支持: 创建 Issue

---

## 🎯 核心设计亮点总结

### 1. 数据备份优先架构 ⭐

**传统方案的问题**:
- 爬虫直接写入数据库，数据格式耦合
- 数据库 Schema 变更需要重新爬取
- 缺少原始数据备份，难以追溯

**新方案的优势**:
```
爬虫 → JSON 备份 (源数据) → Schema 转换 → 数据库 (业务数据)
  ↓         ↓                    ↓              ↓
独立维护  完整保留            灵活适配       随时可重建
```

### 2. 松耦合设计

| 层级 | 职责 | 数据格式 | 变更影响 |
|------|------|----------|----------|
| **爬虫层** | 数据采集 | PropertyModel (Pydantic) | 只影响备份格式 |
| **备份层** | 原始数据持久化 | JSON Files | 独立存在，不受数据库影响 |
| **转换层** | Schema 适配 | SchemaMapper | 适配变更，不影响原始数据 |
| **存储层** | 业务数据库 | PostgreSQL | 可随时从备份重建 |

### 3. 可追溯性

- ✅ 每日数据快照 (支持历史回溯)
- ✅ 元数据记录 (爬取时间、数量、来源)
- ✅ 数据对比分析 (价格变化、房源增减)
- ✅ 错误恢复 (从备份重新导入)

### 4. 云端备份策略 (AWS S3) ⭐NEW

**备份架构**:
```
本地备份 (7天)  →  AWS S3 (永久)
    ↓                    ↓
  快速访问           异地容灾
  即时恢复           自动归档
```

**AWS S3 优势**:
- ✅ **高可靠性** - 99.999999999% (11个9) 数据持久性
- ✅ **全球覆盖** - 多区域部署，就近访问
- ✅ **自动归档** - 生命周期策略自动转换存储类
- ✅ **成熟生态** - boto3 SDK 完善，社区支持好
- ✅ **年度成本** - 约 **$0.18/年 ≈ ￥1.3/年** (基于每日3MB备份)

**S3 存储类成本对比** (ap-southeast-2 区域):
| 存储类型 | 成本/GB/月 | 检索费用 | 适用场景 |
|---------|-----------|---------|---------|
| Standard | $0.025 | 免费 | 频繁访问 (0-30天) |
| Standard-IA | $0.0138 | $0.01/GB | 低频访问 (30-90天) ⭐ |
| Glacier IR | $0.005 | $0.03/GB | 归档 (90天+) |

**生命周期自动管理**:
```
Day 0:    上传 → STANDARD 存储类
Day 30:   自动转换 → STANDARD_IA (节省 45% 成本)
Day 90:   自动转换 → GLACIER_IR (节省 80% 成本)
Day 365:  自动删除 (可选)

### 5. 内存优化估算

**单个爬虫实例** (推荐配置):
- 基础组件: 200 MB
- 5个并发上下文: 350 MB
- 浏览器进程: 180 MB
- 数据处理: 50 MB
- 备份缓冲: 20 MB
- **总计: ~800 MB**
- **推荐限制: 1.5 GB** (含安全余量)

---

**文档版本**: v2.1  
**最后更新**: 2025-11-01  
**维护者**: wiperi  
**重大变更**: 
- v2.0: 添加数据备份系统和松耦合架构
- v2.1: 添加 AWS S3 云端备份方案
