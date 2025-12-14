#!/usr/bin/env python3
"""
QRent 爬虫主入口

用法:
    # 运行完整流水线 (Domain + RealEstate)
    python main.py run --universities UNSW USYD
    
    # 只使用 Domain 爬虫
    python main.py run --scrapers domain --universities UNSW
    
    # 只使用 RealEstate 爬虫
    python main.py run --scrapers realestate --universities USYD
    
    # 跳过某些步骤
    python main.py run --no-scoring --no-commute --universities UNSW
    
    # 处理已有 CSV 文件
    python main.py process-csv UNSW_rentdata_241214.csv --university UNSW
"""

import argparse
import sys
import logging
from datetime import datetime

# 添加 src 目录到路径
sys.path.insert(0, '.')

from src.pipeline import ScraperPipeline, run_full_pipeline
from src.utils.logger import setup_logger

logger = setup_logger("main")


def cmd_run(args):
    """运行爬虫流水线"""
    universities = args.universities or ['UNSW', 'USYD']
    scrapers = args.scrapers or ['domain', 'realestate']
    
    logger.info(f"开始爬虫任务")
    logger.info(f"  大学: {universities}")
    logger.info(f"  爬虫: {scrapers}")
    logger.info(f"  评分: {'启用' if not args.no_scoring else '禁用'}")
    logger.info(f"  通勤: {'启用' if not args.no_commute else '禁用'}")
    logger.info(f"  数据库: {'启用' if not args.no_database else '禁用'}")
    
    pipeline = ScraperPipeline(
        scraper_types=scrapers,
        enable_scoring=not args.no_scoring,
        enable_commute=not args.no_commute,
        enable_database=not args.no_database
    )
    
    for university in universities:
        try:
            logger.info(f"\n{'='*60}")
            logger.info(f"处理 {university}")
            logger.info(f"{'='*60}")
            
            pipeline.run(university)
            
        except Exception as e:
            logger.error(f"处理 {university} 失败: {e}")
            if args.debug:
                raise
    
    # 处理 UTS
    if 'USYD' in universities and 'UTS' not in universities:
        try:
            logger.info(f"\n{'='*60}")
            logger.info("处理 UTS (基于 USYD 数据)")
            logger.info(f"{'='*60}")
            
            current_date = datetime.now().strftime('%y%m%d')
            usyd_file = f"USYD_rentdata_{current_date}.csv"
            
            properties = pipeline.load_from_csv(usyd_file)
            
            if properties and pipeline.commute_service:
                properties = pipeline.commute_service.process_properties(
                    properties,
                    university='UTS',
                    skip_existing=False
                )
            
            if properties and pipeline.enable_database and pipeline.db_service:
                with pipeline.db_service.session():
                    pipeline.db_service.save_properties(properties, 'UTS')
            
            if properties:
                pipeline.export_to_csv(properties, 'UTS')
                
        except Exception as e:
            logger.error(f"处理 UTS 失败: {e}")
    
    logger.info("\n爬虫任务完成!")


def cmd_process_csv(args):
    """处理已有 CSV 文件"""
    filepath = args.csv_file
    university = args.university
    
    logger.info(f"处理 CSV 文件: {filepath}")
    logger.info(f"大学: {university}")
    
    pipeline = ScraperPipeline(
        enable_scoring=not args.no_scoring,
        enable_commute=not args.no_commute,
        enable_database=not args.no_database
    )
    
    # 加载数据
    properties = pipeline.load_from_csv(filepath)
    
    if not properties:
        logger.error("没有加载到任何数据")
        return
    
    # 评分
    if pipeline.scoring_service:
        properties = pipeline.scoring_service.process_properties(properties)
    
    # 通勤时间
    if pipeline.commute_service:
        properties = pipeline.commute_service.process_properties(
            properties,
            university=university
        )
    
    # 保存数据库
    if pipeline.enable_database and pipeline.db_service:
        with pipeline.db_service.session():
            pipeline.db_service.save_properties(properties, university)
    
    # 导出 CSV
    pipeline.export_to_csv(properties, university)
    
    logger.info("处理完成!")


def cmd_scrape_only(args):
    """只爬取数据，不处理"""
    from src.scrapers import DomainScraper, RealEstateScraper
    
    university = args.university
    scraper_type = args.scraper
    
    logger.info(f"爬取 {university} 使用 {scraper_type}")
    
    if scraper_type == 'domain':
        scraper = DomainScraper()
    elif scraper_type == 'realestate':
        scraper = RealEstateScraper()
    else:
        logger.error(f"未知爬虫类型: {scraper_type}")
        return
    
    properties = scraper.scrape_by_university(university)
    
    if args.details:
        properties = scraper.scrape_property_details(properties)
    
    # 导出
    pipeline = ScraperPipeline()
    pipeline.export_to_csv(properties, university)
    
    logger.info(f"爬取完成: {len(properties)} 个房源")


def main():
    parser = argparse.ArgumentParser(
        description='QRent 房产爬虫',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument('--debug', action='store_true', help='调试模式')
    
    subparsers = parser.add_subparsers(dest='command', help='子命令')
    
    # run 命令
    run_parser = subparsers.add_parser('run', help='运行完整流水线')
    run_parser.add_argument(
        '--universities', '-u', 
        nargs='+', 
        default=['UNSW', 'USYD'],
        help='大学列表 (默认: UNSW USYD)'
    )
    run_parser.add_argument(
        '--scrapers', '-s',
        nargs='+',
        default=['domain', 'realestate'],
        choices=['domain', 'realestate'],
        help='爬虫类型 (默认: domain realestate)'
    )
    run_parser.add_argument('--no-scoring', action='store_true', help='禁用评分')
    run_parser.add_argument('--no-commute', action='store_true', help='禁用通勤计算')
    run_parser.add_argument('--no-database', action='store_true', help='禁用数据库保存')
    run_parser.set_defaults(func=cmd_run)
    
    # process-csv 命令
    csv_parser = subparsers.add_parser('process-csv', help='处理已有 CSV 文件')
    csv_parser.add_argument('csv_file', help='CSV 文件路径')
    csv_parser.add_argument('--university', '-u', required=True, help='大学代码')
    csv_parser.add_argument('--no-scoring', action='store_true', help='禁用评分')
    csv_parser.add_argument('--no-commute', action='store_true', help='禁用通勤计算')
    csv_parser.add_argument('--no-database', action='store_true', help='禁用数据库保存')
    csv_parser.set_defaults(func=cmd_process_csv)
    
    # scrape-only 命令
    scrape_parser = subparsers.add_parser('scrape-only', help='只爬取数据')
    scrape_parser.add_argument('--university', '-u', required=True, help='大学代码')
    scrape_parser.add_argument(
        '--scraper', '-s',
        required=True,
        choices=['domain', 'realestate'],
        help='爬虫类型'
    )
    scrape_parser.add_argument('--details', action='store_true', help='爬取详情页')
    scrape_parser.set_defaults(func=cmd_scrape_only)
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    if args.command:
        args.func(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

