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
│  │  5. Data Transformer      (数据转换)               │   │
│  │  6. Storage Writer        (数据存储)               │   │
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
           ┌───────────┴───────────┐
           ▼                       ▼
    ┌─────────────┐         ┌─────────────┐
    │ PostgreSQL  │         │   Redis     │
    │  (数据存储)  │         │ (URL去重)   │
    └─────────────┘         └─────────────┘
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
│   │   ├── 05_transformer.py      # 数据转换
│   │   └── 06_storage.py          # 数据存储
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
Raw Data → Extractor → Cleaner → Validator → Deduplicator → Transformer → Storage
   ↓          ↓          ↓          ↓            ↓              ↓            ↓
原始数据   提取字段   清洗数据   验证格式      去重检查      数据转换     保存数据
```

**实现方案**:
```python
class PipelineManager:
    def __init__(self):
        self.pipelines = [
            ExtractorPipeline(),
            CleanerPipeline(),
            ValidatorPipeline(),
            DeduplicatorPipeline(),
            TransformerPipeline(),
            StoragePipeline(),
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


class StoragePipeline:
    """存储管道 - 保存到 PostgreSQL"""
    def __init__(self):
        self.db = DatabaseHelper()
    
    async def process(self, items: List[Dict]) -> List[Dict]:
        if not items:
            return items
        
        # 批量插入
        try:
            await self.db.bulk_insert('properties', items)
            logger.info(f"成功保存 {len(items)} 条数据")
        except Exception as e:
            logger.error(f"数据保存失败: {e}")
            raise
        
        return items
```

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

### 7. 可观测性 (Observability)

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
      - ./logs:/app/logs
      - ./config:/app/config:ro
    depends_on:
      - redis
      - postgres
    networks:
      - scraper-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

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
```

### 3. 监控告警

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

---

## 📝 待实现功能

### V2.1 (近期)
- [ ] 代理池管理
- [ ] 验证码识别 (OCR)
- [ ] 增量爬取 (只爬取新增/更新数据)
- [ ] Grafana 可视化面板

### V2.2 (中期)
- [ ] 分布式爬取 (Celery)
- [ ] 智能调度 (根据网站负载动态调整)
- [ ] 数据质量评分系统
- [ ] 自动化测试覆盖

### V3.0 (长期)
- [ ] AI 辅助数据提取 (LLM)
- [ ] 自适应反爬虫策略
- [ ] 多地域部署支持
- [ ] WebSocket 实时推送

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

**文档版本**: v1.0  
**最后更新**: 2025-10-25  
**维护者**: wiperi
