# QRent Scraper v2.0

工业化、模块化的房产爬虫框架，支持多个房源网站。

## 📊 支持的数据源

| 网站 | 状态 | 说明 |
|------|------|------|
| **Domain.com.au** | ✅ 完全可用 | Selenium 爬取 |
| **RealEstate.com.au** | ✅ 完全可用 | Playwright 持久化浏览器 |

## 🚀 快速开始

### 1. 安装依赖

```bash
cd packages/scraper
pip install -r requirements.txt

# 安装 Playwright 浏览器
python -m playwright install chromium
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 数据库
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=qrent

# AI 评分 (可选)
DASHSCOPE_API_KEY=your_dashscope_key

# 通勤时间 (可选)
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 3. 运行爬虫

```bash
# 完整流程 (Domain + RealEstate + 评分 + 通勤)
python main.py run --universities UNSW USYD

# 只用 Domain
python main.py run --scrapers domain --universities UNSW

# 只用 RealEstate
python main.py run --scrapers realestate --universities UNSW

# 跳过评分和通勤 (不需要 API)
python main.py run --no-scoring --no-commute --no-database
```

## 📁 项目结构

```
packages/scraper/
├── main.py              # 主入口
├── run_scraper.py       # 简化运行脚本
├── deploy.sh            # 服务器部署脚本
├── requirements.txt     # Python 依赖
├── .env                 # 环境变量 (需创建)
│
├── src/
│   ├── scrapers/
│   │   ├── base.py          # 爬虫基类
│   │   ├── domain.py        # Domain 爬虫
│   │   └── realestate.py    # RealEstate 爬虫
│   │
│   ├── services/
│   │   ├── database.py      # 数据库服务
│   │   ├── scoring.py       # AI 评分服务
│   │   └── commute.py       # 通勤时间服务
│   │
│   ├── models/
│   │   └── property.py      # 数据模型
│   │
│   ├── utils/
│   │   ├── browser.py       # 浏览器管理
│   │   ├── helpers.py       # 辅助函数
│   │   └── logger.py        # 日志配置
│   │
│   ├── config/
│   │   └── settings.py      # 配置管理
│   │
│   └── pipeline.py          # 数据处理流水线
│
├── rea_profile/             # RealEstate 浏览器配置 (自动创建)
├── logs/                    # 日志目录
└── output/                  # CSV 输出目录
```

## 🔧 完整流程

```
1. 爬取列表页 → 获取基础房源信息 (地址、价格、卧室等)
      ↓
2. 爬取详情页 → 获取描述、可用日期等
      ↓
3. AI 评分 → 使用 DashScope 对房源评分 (0-20分)
      ↓
4. 通勤时间 → 使用 Google Maps 计算到大学的公交时间
      ↓
5. 保存数据库 → MySQL 持久化存储
      ↓
6. 导出 CSV → 生成 {University}_rentdata_YYMMDD.csv
```

## 🖥️ 服务器部署

```bash
# 上传到服务器
scp -r packages/scraper user@server:/path/to/qrent/

# SSH 登录
ssh user@server

# 运行部署脚本
cd /path/to/qrent/scraper
chmod +x deploy.sh
./deploy.sh

# 激活虚拟环境
source venv/bin/activate

# 运行爬虫
python main.py run --universities UNSW USYD
```

## ⚠️ RealEstate 注意事项

RealEstate.com.au 使用 **Kasada** 反爬虫保护：

1. **首次运行**：浏览器会弹出，可能需要等待 Kasada 验证完成
2. **持久化配置**：验证后配置保存在 `rea_profile/` 目录
3. **后续运行**：自动使用已验证的配置

如果遇到持续拦截：
- 删除 `rea_profile/` 目录重新验证
- 确保使用非 headless 模式

## 📝 Python 使用示例

```python
from src.scrapers import DomainScraper, RealEstateScraper
from src.services import ScoringService, CommuteService
from src.config import ScraperConfig

# 爬取 Domain
domain = DomainScraper(ScraperConfig(max_pages=3))
properties = domain.scrape_by_university('UNSW')
properties = domain.scrape_property_details(properties)

# 爬取 RealEstate
rea = RealEstateScraper(ScraperConfig(max_pages=3))
properties = rea.scrape_by_university('USYD')
properties = rea.scrape_property_details(properties)

# AI 评分
scoring = ScoringService()
properties = scoring.process_properties(properties)

# 通勤时间
commute = CommuteService()
properties = commute.process_properties(properties, university='UNSW')
```

## 🔄 添加新数据源

1. 创建新爬虫类继承 `BaseScraper`
2. 实现必要的抽象方法
3. 注册到 `ScraperPipeline.SCRAPERS`

```python
from src.scrapers.base import BaseScraper

class NewScraper(BaseScraper):
    SOURCE = PropertySource.NEW_SOURCE
    BASE_URL = "https://new-site.com.au"
    
    def get_search_url(self, area: str) -> str:
        return f"{self.BASE_URL}/rent/{area}"
    
    def parse_listing_page(self, html: str) -> List[PropertyData]:
        # 实现解析逻辑
        pass
    
    def parse_detail_page(self, prop: PropertyData, html: str) -> PropertyData:
        # 实现详情解析
        pass
```
