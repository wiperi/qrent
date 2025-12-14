#!/usr/bin/env python3
"""
QRent 爬虫快速运行脚本
简化版入口，直接运行完整流程
"""
import sys
import io
import os
import logging
from datetime import datetime

# 设置编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.pipeline import ScraperPipeline
from src.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f'logs/scraper_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


def run_scraper(
    universities: list = None,
    scrapers: list = None,
    enable_scoring: bool = True,
    enable_commute: bool = True,
    enable_database: bool = True,
    scrape_details: bool = True
):
    """
    运行爬虫
    
    Args:
        universities: 大学列表，默认 ['UNSW', 'USYD']
        scrapers: 爬虫列表，默认 ['domain', 'realestate']
        enable_scoring: 启用 AI 评分 (需要 DASHSCOPE_API_KEY)
        enable_commute: 启用通勤时间计算 (需要 GOOGLE_MAPS_API_KEY)
        enable_database: 保存到数据库
        scrape_details: 爬取详情页
    """
    universities = universities or ['UNSW', 'USYD']
    scrapers = scrapers or ['domain', 'realestate']
    
    # 确保日志目录存在
    os.makedirs('logs', exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("QRent Scraper Started")
    logger.info("=" * 60)
    logger.info(f"Universities: {universities}")
    logger.info(f"Scrapers: {scrapers}")
    logger.info(f"Scoring: {'ON' if enable_scoring else 'OFF'}")
    logger.info(f"Commute: {'ON' if enable_commute else 'OFF'}")
    logger.info(f"Database: {'ON' if enable_database else 'OFF'}")
    logger.info(f"Details: {'ON' if scrape_details else 'OFF'}")
    logger.info("=" * 60)
    
    pipeline = ScraperPipeline(
        scraper_types=scrapers,
        enable_scoring=enable_scoring,
        enable_commute=enable_commute,
        enable_database=enable_database
    )
    
    all_results = {}
    
    for university in universities:
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing: {university}")
            logger.info(f"{'='*60}")
            
            properties = pipeline.run(
                university=university,
                scrape_details=scrape_details
            )
            
            all_results[university] = len(properties)
            
        except Exception as e:
            logger.error(f"Failed to process {university}: {e}")
            import traceback
            traceback.print_exc()
    
    # 打印总结
    logger.info("\n" + "=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)
    for uni, count in all_results.items():
        logger.info(f"  {uni}: {count} properties")
    logger.info("=" * 60)
    
    return all_results


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='QRent Scraper')
    parser.add_argument('-u', '--universities', nargs='+', default=['UNSW', 'USYD'])
    parser.add_argument('-s', '--scrapers', nargs='+', default=['domain', 'realestate'])
    parser.add_argument('--no-scoring', action='store_true')
    parser.add_argument('--no-commute', action='store_true')
    parser.add_argument('--no-database', action='store_true')
    parser.add_argument('--no-details', action='store_true')
    
    args = parser.parse_args()
    
    run_scraper(
        universities=args.universities,
        scrapers=args.scrapers,
        enable_scoring=not args.no_scoring,
        enable_commute=not args.no_commute,
        enable_database=not args.no_database,
        scrape_details=not args.no_details
    )

