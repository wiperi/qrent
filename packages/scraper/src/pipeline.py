"""
爬虫 Pipeline
统一的数据处理流水线
"""
import os
import logging
from typing import List, Optional, Type
from datetime import datetime

import pandas as pd

from .scrapers import BaseScraper, DomainScraper, RealEstateScraper
from .services import DatabaseService, ScoringService, CommuteService
from .models import PropertyData, PropertySource
from .config import settings, TARGET_AREAS

logger = logging.getLogger(__name__)


class ScraperPipeline:
    """
    爬虫数据处理流水线
    
    完整流程:
    1. 爬取列表页 -> 获取基础房源信息
    2. 爬取详情页 -> 获取描述、可用日期等
    3. 评分 -> 使用 AI 对房源评分
    4. 计算通勤时间 -> 使用 Google Maps API
    5. 保存到数据库
    6. (可选) 导出 CSV
    """
    
    # 注册的爬虫类型
    SCRAPERS = {
        'domain': DomainScraper,
        'realestate': RealEstateScraper,
    }
    
    def __init__(
        self,
        scraper_types: List[str] = None,
        enable_scoring: bool = True,
        enable_commute: bool = True,
        enable_database: bool = True,
        output_dir: str = None
    ):
        """
        初始化 Pipeline
        
        Args:
            scraper_types: 要使用的爬虫类型列表，默认全部
            enable_scoring: 是否启用评分
            enable_commute: 是否启用通勤时间计算
            enable_database: 是否保存到数据库
            output_dir: CSV 输出目录
        """
        self.scraper_types = scraper_types or list(self.SCRAPERS.keys())
        self.enable_scoring = enable_scoring
        self.enable_commute = enable_commute
        self.enable_database = enable_database
        self.output_dir = output_dir or os.environ.get('OUTPUT_DIR', './output')
        
        # 确保输出目录存在
        os.makedirs(self.output_dir, exist_ok=True)
        
        # 初始化服务
        self.scoring_service = ScoringService() if enable_scoring else None
        self.commute_service = CommuteService() if enable_commute else None
        self.db_service = DatabaseService() if enable_database else None
        
        # 统计信息
        self.stats = {
            'total_scraped': 0,
            'total_with_details': 0,
            'total_scored': 0,
            'total_with_commute': 0,
            'total_saved': 0
        }
    
    def get_scraper(self, scraper_type: str) -> Optional[BaseScraper]:
        """获取爬虫实例"""
        scraper_class = self.SCRAPERS.get(scraper_type)
        if scraper_class:
            return scraper_class()
        logger.warning(f"未知爬虫类型: {scraper_type}")
        return None
    
    def run(
        self,
        university: str,
        scrape_details: bool = True,
        skip_existing: bool = True
    ) -> List[PropertyData]:
        """
        运行完整的爬虫流水线
        
        Args:
            university: 大学代码 (UNSW, USYD, UTS)
            scrape_details: 是否爬取详情页
            skip_existing: 是否跳过已有数据
            
        Returns:
            处理后的房产数据列表
        """
        logger.info("=" * 60)
        logger.info(f"开始 Pipeline: {university}")
        logger.info(f"爬虫类型: {self.scraper_types}")
        logger.info("=" * 60)
        
        all_properties = []
        
        # Step 1: 爬取各平台数据
        for scraper_type in self.scraper_types:
            logger.info(f"\n{'='*60}")
            logger.info(f"Step 1: 使用 {scraper_type.upper()} 爬虫爬取数据")
            logger.info(f"{'='*60}")
            
            scraper = self.get_scraper(scraper_type)
            if not scraper:
                continue
            
            properties = scraper.scrape_by_university(university)
            logger.info(f"{scraper_type.upper()} 爬取完成: {len(properties)} 个房源")
            
            # Step 2: 爬取详情页
            if scrape_details and properties:
                logger.info(f"\n{'='*60}")
                logger.info(f"Step 2: 爬取详情页")
                logger.info(f"{'='*60}")
                
                properties = scraper.scrape_property_details(
                    properties, 
                    skip_existing=skip_existing
                )
                self.stats['total_with_details'] += sum(
                    1 for p in properties if p.description_en
                )
            
            all_properties.extend(properties)
        
        self.stats['total_scraped'] = len(all_properties)
        logger.info(f"\n总共爬取: {len(all_properties)} 个房源")
        
        if not all_properties:
            logger.warning("没有爬取到任何数据")
            return []
        
        # Step 3: 评分
        if self.enable_scoring and self.scoring_service:
            logger.info(f"\n{'='*60}")
            logger.info("Step 3: 房产评分")
            logger.info(f"{'='*60}")
            
            all_properties = self.scoring_service.process_properties(
                all_properties,
                skip_existing=skip_existing
            )
            self.stats['total_scored'] = sum(
                1 for p in all_properties if p.average_score
            )
        
        # Step 4: 计算通勤时间
        if self.enable_commute and self.commute_service:
            logger.info(f"\n{'='*60}")
            logger.info("Step 4: 计算通勤时间")
            logger.info(f"{'='*60}")
            
            all_properties = self.commute_service.process_properties(
                all_properties,
                university=university,
                skip_existing=skip_existing
            )
            self.stats['total_with_commute'] = sum(
                1 for p in all_properties if p.commute_times.get(university)
            )
        
        # Step 5: 保存到数据库
        if self.enable_database and self.db_service:
            logger.info(f"\n{'='*60}")
            logger.info("Step 5: 保存到数据库")
            logger.info(f"{'='*60}")
            
            with self.db_service.session():
                save_stats = self.db_service.save_properties(
                    all_properties, 
                    university
                )
                self.stats['total_saved'] = (
                    save_stats['inserted'] + save_stats['updated']
                )
        
        # Step 6: 导出 CSV
        logger.info(f"\n{'='*60}")
        logger.info("Step 6: 导出 CSV")
        logger.info(f"{'='*60}")
        
        csv_file = self.export_to_csv(all_properties, university)
        
        # 打印统计信息
        self._print_stats(university, csv_file)
        
        return all_properties
    
    def export_to_csv(
        self, 
        properties: List[PropertyData], 
        university: str
    ) -> str:
        """
        导出数据到 CSV 文件
        
        Args:
            properties: 房产数据列表
            university: 大学代码
            
        Returns:
            CSV 文件路径
        """
        if not properties:
            return ""
        
        current_date = datetime.now().strftime('%y%m%d')
        filename = f"{university}_rentdata_{current_date}.csv"
        filepath = os.path.join(self.output_dir, filename)
        
        # 转换为 DataFrame
        data = []
        for prop in properties:
            row = {
                'pricePerWeek': prop.price_per_week,
                'addressLine1': prop.address_line1,
                'addressLine2': prop.address_line2,
                'bedroomCount': prop.bedroom_count,
                'bathroomCount': prop.bathroom_count,
                'parkingCount': prop.parking_count,
                'propertyType': prop.property_type,
                'houseId': prop.house_id,
                'url': prop.url,
                'description_en': prop.description_en,
                'description_cn': prop.description_cn,
                'keywords': prop.keywords,
                'average_score': prop.average_score,
                'available_date': prop.available_date,
                'published_at': prop.published_at,
                'thumbnail_url': prop.thumbnail_url,
                'source': prop.source.value,
            }
            
            # 添加通勤时间
            for uni, commute_time in prop.commute_times.items():
                row[f'commuteTime_{uni}'] = commute_time
            
            data.append(row)
        
        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
        logger.info(f"数据已导出到: {filepath}")
        
        return filepath
    
    def load_from_csv(self, filepath: str) -> List[PropertyData]:
        """
        从 CSV 文件加载数据
        
        Args:
            filepath: CSV 文件路径
            
        Returns:
            房产数据列表
        """
        if not os.path.exists(filepath):
            logger.error(f"文件不存在: {filepath}")
            return []
        
        df = pd.read_csv(filepath)
        properties = []
        
        for _, row in df.iterrows():
            # 确定数据来源
            source_str = row.get('source', 'domain')
            try:
                source = PropertySource(source_str)
            except:
                source = PropertySource.DOMAIN
            
            prop = PropertyData(
                house_id=str(row.get('houseId', '')),
                source=source,
                price_per_week=int(row.get('pricePerWeek', 0)),
                address_line1=str(row.get('addressLine1', '')),
                address_line2=str(row.get('addressLine2', '')),
                bedroom_count=int(row.get('bedroomCount', 0)),
                bathroom_count=int(row.get('bathroomCount', 0)),
                parking_count=int(row.get('parkingCount', 0)),
                property_type=int(row.get('propertyType', 1)),
                url=str(row.get('url', '')),
                description_en=str(row.get('description_en', '')) if pd.notna(row.get('description_en')) else None,
                description_cn=str(row.get('description_cn', '')) if pd.notna(row.get('description_cn')) else None,
                keywords=str(row.get('keywords', '')) if pd.notna(row.get('keywords')) else None,
                average_score=float(row.get('average_score', 0)) if pd.notna(row.get('average_score')) else None,
                thumbnail_url=str(row.get('thumbnail_url', '')) if pd.notna(row.get('thumbnail_url')) else None,
            )
            
            # 加载通勤时间
            for col in df.columns:
                if col.startswith('commuteTime_'):
                    uni = col.replace('commuteTime_', '')
                    value = row.get(col)
                    if pd.notna(value):
                        prop.commute_times[uni] = int(value)
            
            properties.append(prop)
        
        logger.info(f"从 CSV 加载 {len(properties)} 个房源")
        return properties
    
    def _print_stats(self, university: str, csv_file: str):
        """打印统计信息"""
        print("\n" + "=" * 60)
        print(f"Pipeline 完成: {university}")
        print("=" * 60)
        print(f"总爬取数量: {self.stats['total_scraped']}")
        print(f"有详情描述: {self.stats['total_with_details']}")
        print(f"已评分数量: {self.stats['total_scored']}")
        print(f"有通勤时间: {self.stats['total_with_commute']}")
        print(f"已保存数量: {self.stats['total_saved']}")
        print(f"CSV 文件: {csv_file}")
        print("=" * 60 + "\n")


def run_full_pipeline(
    universities: List[str] = None,
    scraper_types: List[str] = None,
    enable_scoring: bool = True,
    enable_commute: bool = True,
    enable_database: bool = True
):
    """
    运行完整的爬虫流水线
    
    Args:
        universities: 大学列表，默认 ['UNSW', 'USYD']
        scraper_types: 爬虫类型，默认全部
        enable_scoring: 是否评分
        enable_commute: 是否计算通勤时间
        enable_database: 是否保存数据库
    """
    if universities is None:
        universities = ['UNSW', 'USYD']
    
    pipeline = ScraperPipeline(
        scraper_types=scraper_types,
        enable_scoring=enable_scoring,
        enable_commute=enable_commute,
        enable_database=enable_database
    )
    
    for university in universities:
        try:
            pipeline.run(university)
        except Exception as e:
            logger.error(f"处理 {university} 失败: {e}")
    
    # 处理 UTS (复制 USYD 数据)
    if 'USYD' in universities and 'UTS' not in universities:
        logger.info("\n处理 UTS (基于 USYD 数据)")
        
        current_date = datetime.now().strftime('%y%m%d')
        usyd_file = f"USYD_rentdata_{current_date}.csv"
        uts_file = f"UTS_rentdata_{current_date}.csv"
        
        if os.path.exists(usyd_file):
            # 加载 USYD 数据
            properties = pipeline.load_from_csv(usyd_file)
            
            # 计算 UTS 通勤时间
            if pipeline.enable_commute and pipeline.commute_service:
                properties = pipeline.commute_service.process_properties(
                    properties,
                    university='UTS',
                    skip_existing=False
                )
            
            # 保存 UTS 数据
            if pipeline.enable_database and pipeline.db_service:
                with pipeline.db_service.session():
                    pipeline.db_service.save_properties(properties, 'UTS')
            
            # 导出 CSV
            pipeline.export_to_csv(properties, 'UTS')

