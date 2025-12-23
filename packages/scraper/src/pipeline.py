"""
爬虫 Pipeline
统一的数据处理流水线
"""
import os
import glob
import logging
from typing import List, Optional, Type, Dict
from datetime import datetime, timedelta

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
        output_dir: str = None,
        chunk_save_size: int = 100,
        auto_save_list: bool = True,
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
        self.chunk_save_size = chunk_save_size
        self.auto_save_list = auto_save_list
        
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

        # list export stats
        self.stats['list_parts_saved'] = 0
        self.stats['copied_from_history'] = 0
        
        # 历史数据缓存 (house_id -> PropertyData-like dict)
        self._history_cache: Dict[str, dict] = {}
    
    def _load_history_csv(self, university: str) -> Dict[str, dict]:
        """
        加载历史 CSV 数据（最近7天内的完整数据文件）
        返回 house_id -> {description_en, keywords, average_score, ...} 的映射
        用于复用已有的详情/评分/通勤数据，避免重复爬取
        """
        cache = {}
        
        # 查找最近的完整 CSV 文件（不是 list 分段文件）
        pattern = os.path.join(self.output_dir, f"{university}_rentdata_*.csv")
        csv_files = glob.glob(pattern)
        
        # 过滤掉 list 分段文件
        csv_files = [f for f in csv_files if '_list_' not in f]
        
        if not csv_files:
            logger.info(f"未找到 {university} 的历史 CSV 文件")
            return cache
        
        # 按修改时间排序，取最新的
        csv_files.sort(key=os.path.getmtime, reverse=True)
        latest_file = csv_files[0]
        
        # 检查文件是否在7天内
        file_mtime = datetime.fromtimestamp(os.path.getmtime(latest_file))
        if datetime.now() - file_mtime > timedelta(days=7):
            logger.info(f"历史 CSV 文件超过7天，不使用: {latest_file}")
            return cache
        
        logger.info(f"加载历史数据: {latest_file}")
        
        try:
            df = pd.read_csv(latest_file)
            loaded_count = 0
            
            for _, row in df.iterrows():
                house_id = str(row.get('houseId', ''))
                if not house_id:
                    continue
                
                # 只缓存有详情数据的记录
                desc = row.get('description_en')
                if pd.isna(desc) or not str(desc).strip():
                    continue
                
                cache[house_id] = {
                    'description_en': str(desc) if pd.notna(desc) else None,
                    'description_cn': str(row.get('description_cn', '')) if pd.notna(row.get('description_cn')) else None,
                    'keywords': str(row.get('keywords', '')) if pd.notna(row.get('keywords')) else None,
                    'average_score': float(row.get('average_score', 0)) if pd.notna(row.get('average_score')) else None,
                    'available_date': str(row.get('available_date', '')) if pd.notna(row.get('available_date')) else None,
                    'thumbnail_url': str(row.get('thumbnail_url', '')) if pd.notna(row.get('thumbnail_url')) else None,
                    'commute_times': {}  # 初始化通勤时间字典
                }
                
                # 加载通勤时间到 commute_times 字典
                for col in df.columns:
                    if col.startswith('commuteTime_'):
                        uni = col.replace('commuteTime_', '')
                        val = row.get(col)
                        if pd.notna(val) and val != '' and val != 0:
                            try:
                                cache[house_id]['commute_times'][uni] = int(val)
                            except (ValueError, TypeError):
                                pass
                
                loaded_count += 1
            
            logger.info(f"从历史 CSV 加载了 {loaded_count} 条有详情的记录")
            
        except Exception as e:
            logger.error(f"加载历史 CSV 失败: {e}")
        
        return cache
    
    def _apply_history_data(self, properties: List[PropertyData], university: str) -> dict:
        """
        将历史数据应用到当前房源列表
        复用详情、评分、通勤时间
        
        Returns:
            统计信息字典 {'details': N, 'scores': N, 'commute': N}
        """
        stats = {'details': 0, 'scores': 0, 'commute': 0}
        
        if not self._history_cache:
            self._history_cache = self._load_history_csv(university)
        
        if not self._history_cache:
            return stats
        
        for prop in properties:
            house_id_str = str(prop.house_id)
            if house_id_str in self._history_cache:
                hist = self._history_cache[house_id_str]
                
                # 复用详情数据
                if not prop.description_en and hist.get('description_en'):
                    prop.description_en = hist['description_en']
                    prop.description_cn = hist.get('description_cn')
                    prop.keywords = hist.get('keywords')
                    prop.available_date = hist.get('available_date')
                    if hist.get('thumbnail_url'):
                        prop.thumbnail_url = hist['thumbnail_url']
                    stats['details'] += 1
                    logger.debug(f"复用历史详情: {prop.house_id}")
                
                # 复用评分（即使已有详情，评分也可能需要复用）
                if (not prop.average_score or prop.average_score == 0) and hist.get('average_score'):
                    prop.average_score = hist['average_score']
                    stats['scores'] += 1
                    logger.debug(f"复用历史评分: {prop.house_id} = {prop.average_score}")
                
                # 复用关键词
                if not prop.keywords and hist.get('keywords'):
                    prop.keywords = hist['keywords']
                
                # 复用通勤时间（从 commute_times 字典）
                hist_commute = hist.get('commute_times', {})
                for uni, commute_time in hist_commute.items():
                    if uni not in prop.commute_times or not prop.commute_times.get(uni):
                        prop.commute_times[uni] = commute_time
                        stats['commute'] += 1
                        logger.debug(f"复用历史通勤: {prop.house_id} -> {uni} = {commute_time}min")
        
        if any(stats.values()):
            logger.info(f"📦 历史数据复用统计:")
            logger.info(f"   详情: {stats['details']} 条")
            logger.info(f"   评分: {stats['scores']} 条")
            logger.info(f"   通勤: {stats['commute']} 条")
        
        return stats
    
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

            # 导出列表级 CSV（仅列表信息），按 chunk 保存以便确认进度
            if self.auto_save_list and properties:
                parts = self._save_list_chunks(properties, university, scraper_type)
                logger.info(f"已保存列表 CSV 分段: {parts} 个 (each {self.chunk_save_size})")
                self.stats['list_parts_saved'] += parts
            
            # Step 1.5: 保存合并的列表 CSV 并与历史对比
            logger.info(f"\n{'='*60}")
            logger.info(f"Step 1.5: 保存完整列表并对比历史数据")
            logger.info(f"{'='*60}")
            
            # 保存合并的列表 CSV
            merged_list_file = self._save_merged_list_csv(properties, university, scraper_type)
            logger.info(f"完整列表已保存: {merged_list_file}")
            
            # 从历史 CSV 复用已有的详情/评分/通勤数据
            reuse_stats = self._apply_history_data(properties, university)
            self.stats['copied_from_history'] += reuse_stats['details']
            self.stats['copied_scores'] = self.stats.get('copied_scores', 0) + reuse_stats['scores']
            self.stats['copied_commute'] = self.stats.get('copied_commute', 0) + reuse_stats['commute']

            # 统计需要处理的数量
            need_details = sum(1 for p in properties if not p.description_en)
            have_details = sum(1 for p in properties if p.description_en)
            need_scores = sum(1 for p in properties if p.description_en and (not p.average_score or p.average_score == 0))
            need_commute = sum(1 for p in properties if university not in p.commute_times)
            
            logger.info(f"\n📊 列表与历史对比结果:")
            logger.info(f"   总房源数: {len(properties)}")
            logger.info(f"   已有详情: {have_details} (复用: {reuse_stats['details']})")
            logger.info(f"   需要爬取详情: {need_details}")
            logger.info(f"   需要评分: {need_scores} (已复用: {reuse_stats['scores']})")
            logger.info(f"   需要通勤计算: {need_commute} (已复用: {reuse_stats['commute']})")
            
            # Step 2: 爬取详情页
            if scrape_details and properties:
                logger.info(f"\n{'='*60}")
                logger.info(f"Step 2: 爬取详情页 (仅爬取 {need_details} 个新房源)")
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

    def _save_list_chunks(self, properties: List[PropertyData], university: str, scraper_type: str) -> int:
        """
        将列表爬取结果按 chunk 保存为 CSV（不包含评分/通勤信息），便于查看进度
        返回保存的分段数量
        """
        if not properties:
            return 0

        os.makedirs(self.output_dir, exist_ok=True)
        total = len(properties)
        chunk = self.chunk_save_size or total
        parts = 0
        for i in range(0, total, chunk):
            part_props = properties[i:i+chunk]
            current_date = datetime.now().strftime('%y%m%d')
            filename = f"{university}_rentdata_list_{scraper_type}_{current_date}_part{parts+1}.csv"
            filepath = os.path.join(self.output_dir, filename)

            # reuse export logic but avoid adding commute/scores that aren't present yet
            data = []
            for prop in part_props:
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
                    'thumbnail_url': prop.thumbnail_url,
                    'source': prop.source.value,
                }
                data.append(row)

            df = pd.DataFrame(data)
            df.to_csv(filepath, index=False, encoding='utf-8-sig')
            logger.info(f"列表分段已导出: {filepath} (items: {len(part_props)})")
            parts += 1

        return parts
    
    def _save_merged_list_csv(self, properties: List[PropertyData], university: str, scraper_type: str) -> str:
        """
        保存合并的完整列表 CSV（所有区域的房源汇总）
        用于与历史 CSV 对比
        
        Args:
            properties: 房产列表
            university: 大学代码
            scraper_type: 爬虫类型
            
        Returns:
            保存的文件路径
        """
        if not properties:
            return ""
        
        os.makedirs(self.output_dir, exist_ok=True)
        current_date = datetime.now().strftime('%y%m%d')
        current_time = datetime.now().strftime('%H%M')
        filename = f"{university}_list_merged_{scraper_type}_{current_date}_{current_time}.csv"
        filepath = os.path.join(self.output_dir, filename)
        
        data = []
        for prop in properties:
            row = {
                'houseId': prop.house_id,
                'pricePerWeek': prop.price_per_week,
                'addressLine1': prop.address_line1,
                'addressLine2': prop.address_line2,
                'bedroomCount': prop.bedroom_count,
                'bathroomCount': prop.bathroom_count,
                'parkingCount': prop.parking_count,
                'propertyType': prop.property_type,
                'url': prop.url,
                'thumbnail_url': prop.thumbnail_url,
                'source': prop.source.value,
                'has_history_detail': 'Yes' if prop.description_en else 'No',
            }
            data.append(row)
        
        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
        
        # 统计对比结果
        has_detail = sum(1 for p in properties if p.description_en)
        no_detail = len(properties) - has_detail
        
        logger.info(f"📋 合并列表已保存: {filepath}")
        logger.info(f"   - 总数: {len(properties)}")
        logger.info(f"   - 已有详情(可复用): {has_detail}")
        logger.info(f"   - 需要爬取详情: {no_detail}")
        
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
        print(f"📦 历史复用统计:")
        print(f"   详情复用: {self.stats.get('copied_from_history', 0)}")
        print(f"   评分复用: {self.stats.get('copied_scores', 0)}")
        print(f"   通勤复用: {self.stats.get('copied_commute', 0)}")
        print(f"有详情描述: {self.stats['total_with_details']}")
        print(f"已评分数量: {self.stats['total_scored']}")
        print(f"有通勤时间: {self.stats['total_with_commute']}")
        print(f"已保存数量: {self.stats['total_saved']}")
        print(f"列表分段数: {self.stats.get('list_parts_saved', 0)}")
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
    
    # 处理 UTS (复制 USYD 数据并计算通勤时间)
    if 'USYD' in universities and 'UTS' not in universities:
        logger.info("\n" + "=" * 60)
        logger.info("处理 UTS (基于 USYD 数据)")
        logger.info("=" * 60)
        
        current_date = datetime.now().strftime('%y%m%d')
        usyd_file = os.path.join(pipeline.output_dir, f"USYD_rentdata_{current_date}.csv")
        uts_file = os.path.join(pipeline.output_dir, f"UTS_rentdata_{current_date}.csv")
        
        if os.path.exists(usyd_file):
            logger.info(f"从 USYD 数据复制: {usyd_file}")
            
            # 加载 USYD 数据
            properties = pipeline.load_from_csv(usyd_file)
            logger.info(f"加载了 {len(properties)} 个房源")
            
            # 从历史 UTS CSV 复用已有的通勤时间
            logger.info("\n从历史 UTS 数据复用通勤时间...")
            history_cache = pipeline._load_history_csv('UTS')
            
            reused_count = 0
            for prop in properties:
                if prop.house_id and str(prop.house_id) in history_cache:
                    hist = history_cache[str(prop.house_id)]
                    # 复用 UTS 通勤时间
                    if 'UTS' in hist.get('commute_times', {}):
                        prop.commute_times['UTS'] = hist['commute_times']['UTS']
                        reused_count += 1
            
            logger.info(f"复用了 {reused_count} 个房源的 UTS 通勤时间")
            
            # 统计需要计算通勤时间的房源
            need_commute = sum(1 for p in properties if 'UTS' not in p.commute_times)
            have_commute = len(properties) - need_commute
            
            logger.info(f"\n📊 UTS 通勤时间状态:")
            logger.info(f"   总房源数: {len(properties)}")
            logger.info(f"   已有通勤时间: {have_commute} (复用: {reused_count})")
            logger.info(f"   需要计算: {need_commute}")
            
            # 只计算缺少 UTS 通勤时间的房源
            if need_commute > 0 and pipeline.enable_commute and pipeline.commute_service:
                logger.info(f"\n计算 {need_commute} 个房源的 UTS 通勤时间...")
                properties = pipeline.commute_service.process_properties(
                    properties,
                    university='UTS',
                    skip_existing=True  # 跳过已有通勤时间的
                )
                
                # 统计计算后的结果
                final_with_commute = sum(1 for p in properties if 'UTS' in p.commute_times)
                logger.info(f"计算完成，现在有 {final_with_commute} 个房源有 UTS 通勤时间")
            else:
                logger.info("所有房源都已有 UTS 通勤时间，跳过计算")
            
            # 保存到数据库
            if pipeline.enable_database and pipeline.db_service:
                logger.info("\n保存到数据库...")
                with pipeline.db_service.session():
                    pipeline.db_service.save_properties(properties, 'UTS')
            
            # 导出 CSV
            logger.info(f"\n导出 UTS 数据到: {uts_file}")
            pipeline.export_to_csv(properties, 'UTS')
            logger.info(f"✅ UTS 数据处理完成")
        else:
            logger.warning(f"未找到 USYD 数据文件: {usyd_file}")
            logger.warning("无法生成 UTS 数据")


