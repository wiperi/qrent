"""
QRent Scraper - 工业化爬虫框架

这是一个模块化、可扩展的房产爬虫框架，支持多个房源网站。

使用示例:

1. 使用 Pipeline 运行完整流程:
    from src.pipeline import ScraperPipeline
    
    pipeline = ScraperPipeline(scraper_types=['domain', 'realestate'])
    properties = pipeline.run('UNSW')

2. 单独使用某个爬虫:
    from src.scrapers import DomainScraper
    
    scraper = DomainScraper()
    properties = scraper.scrape_by_university('UNSW')

3. 扩展新的爬虫:
    from src.scrapers.base import BaseScraper
    from src.models import PropertySource
    
    class NewScraper(BaseScraper):
        SOURCE = PropertySource.NEW_SOURCE
        BASE_URL = "https://example.com"
        
        def get_search_url(self, area: str) -> str:
            ...
        
        def parse_listing_page(self, html: str) -> List[PropertyData]:
            ...
        
        # 实现其他抽象方法...
"""

from .models import PropertyData, PropertySource, ScrapeResult
from .scrapers import BaseScraper, DomainScraper, RealEstateScraper
from .services import DatabaseService, ScoringService, CommuteService
from .pipeline import ScraperPipeline, run_full_pipeline
from .config import settings

__version__ = "2.0.0"

__all__ = [
    # 模型
    'PropertyData',
    'PropertySource', 
    'ScrapeResult',
    
    # 爬虫
    'BaseScraper',
    'DomainScraper',
    'RealEstateScraper',
    
    # 服务
    'DatabaseService',
    'ScoringService',
    'CommuteService',
    
    # Pipeline
    'ScraperPipeline',
    'run_full_pipeline',
    
    # 配置
    'settings',
]

