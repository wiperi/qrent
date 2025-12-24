#!/usr/bin/env python3
"""
单独处理 USYD 数据
- 使用已有的列表 CSV（不重新爬取列表页）
- 从历史数据复用详情/评分/通勤
- 只爬取缺失的详情页
- 只评分缺失的房源
- 只计算缺失的通勤时间
"""
import os
import sys
import logging
import pandas as pd
from datetime import datetime

# 设置路径
sys.path.insert(0, '.')
os.environ['PYTHONUNBUFFERED'] = '1'

from src.pipeline import ScraperPipeline
from src.services import ScoringService, CommuteService, DatabaseService
from src.models import PropertyData, PropertySource
from src.utils.logger import setup_logger

logger = setup_logger("process_usyd")

def load_list_csv(filepath: str) -> list:
    """从列表 CSV 加载房源数据"""
    if not os.path.exists(filepath):
        logger.error(f"文件不存在: {filepath}")
        return []
    
    df = pd.read_csv(filepath)
    properties = []
    
    for _, row in df.iterrows():
        source_str = row.get('source', 'realestate')
        try:
            source = PropertySource(source_str)
        except:
            source = PropertySource.REALESTATE
        
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
            thumbnail_url=str(row.get('thumbnail_url', '')) if pd.notna(row.get('thumbnail_url')) else None,
        )
        properties.append(prop)
    
    logger.info(f"从列表 CSV 加载了 {len(properties)} 个房源")
    return properties


def main():
    university = 'USYD'
    
    # 使用今天的合并列表文件
    list_file = './output/USYD_list_merged_realestate_251222_0418.csv'
    
    print("=" * 60)
    print(f"单独处理 {university} 数据")
    print(f"列表文件: {list_file}")
    print("=" * 60)
    
    # 创建 Pipeline（不启用爬虫，只用服务）
    pipeline = ScraperPipeline(
        scraper_types=[],  # 不使用爬虫
        enable_scoring=True,
        enable_commute=True,
        enable_database=True,
        output_dir='./output'
    )
    
    # Step 1: 加载列表数据
    logger.info(f"\n{'='*60}")
    logger.info("Step 1: 加载已有列表数据")
    logger.info(f"{'='*60}")
    
    properties = load_list_csv(list_file)
    if not properties:
        logger.error("没有加载到任何数据")
        return
    
    # Step 2: 从历史数据复用详情/评分/通勤
    logger.info(f"\n{'='*60}")
    logger.info("Step 2: 从历史数据复用详情/评分/通勤")
    logger.info(f"{'='*60}")
    
    reuse_stats = pipeline._apply_history_data(properties, university)
    
    # 统计
    need_details = sum(1 for p in properties if not p.description_en)
    have_details = sum(1 for p in properties if p.description_en)
    need_scores = sum(1 for p in properties if p.description_en and (not p.average_score or p.average_score == 0))
    need_commute = sum(1 for p in properties if university not in p.commute_times)
    
    logger.info(f"\n📊 数据状态:")
    logger.info(f"   总房源数: {len(properties)}")
    logger.info(f"   已有详情: {have_details} (复用: {reuse_stats['details']})")
    logger.info(f"   缺少详情: {need_details}")
    logger.info(f"   需要评分: {need_scores} (已复用: {reuse_stats['scores']})")
    logger.info(f"   需要通勤: {need_commute} (已复用: {reuse_stats['commute']})")
    
    # Step 3: 爬取缺少详情的房源
    logger.info(f"\n{'='*60}")
    logger.info(f"Step 3: 爬取详情页 (需要爬取: {need_details})")
    logger.info(f"{'='*60}")
    
    if need_details > 0:
        # 使用 pipeline 的方式获取正确配置的爬虫（包含反爬虫设置）
        scraper = pipeline.get_scraper('realestate')
        
        if scraper:
            # 先重置 profile，确保干净的浏览器状态
            logger.info("重置浏览器 profile...")
            scraper._reset_profile()
            
            # 只爬取缺少详情的房源
            properties = scraper.scrape_property_details(
                properties,
                skip_existing=True  # 跳过已有详情的
            )
            
            # 更新统计
            have_details_after = sum(1 for p in properties if p.description_en)
            logger.info(f"详情爬取后: {have_details_after} 个有详情 (新增: {have_details_after - have_details})")
        else:
            logger.error("无法获取 RealEstate 爬虫实例")
    else:
        logger.info("所有房源都已有详情，跳过爬取")
    
    # 只保留有详情的房源进行后续处理
    properties_with_details = [p for p in properties if p.description_en]
    logger.info(f"将处理 {len(properties_with_details)} 个有详情的房源")
    
    # Step 4: 评分
    if pipeline.scoring_service:
        logger.info(f"\n{'='*60}")
        logger.info(f"Step 4: 房产评分 (需要评分: {need_scores})")
        logger.info(f"{'='*60}")
        
        properties_with_details = pipeline.scoring_service.process_properties(
            properties_with_details,
            skip_existing=True
        )
    
    # Step 5: 计算通勤时间
    if pipeline.commute_service:
        logger.info(f"\n{'='*60}")
        logger.info(f"Step 5: 计算通勤时间 (需要计算: {need_commute})")
        logger.info(f"{'='*60}")
        
        properties_with_details = pipeline.commute_service.process_properties(
            properties_with_details,
            university=university,
            skip_existing=True
        )
    
    # Step 6: 保存到数据库
    if pipeline.db_service:
        logger.info(f"\n{'='*60}")
        logger.info("Step 6: 保存到数据库")
        logger.info(f"{'='*60}")
        
        try:
            with pipeline.db_service.session():
                save_stats = pipeline.db_service.save_properties(properties_with_details, university)
                logger.info(f"保存完成: 新增 {save_stats['inserted']}, 更新 {save_stats['updated']}")
        except Exception as e:
            logger.error(f"保存数据库失败: {e}")
    
    # Step 7: 导出 CSV
    logger.info(f"\n{'='*60}")
    logger.info("Step 7: 导出 CSV")
    logger.info(f"{'='*60}")
    
    csv_file = pipeline.export_to_csv(properties_with_details, university)
    
    # 打印统计
    print("\n" + "=" * 60)
    print(f"处理完成: {university}")
    print("=" * 60)
    print(f"总房源数: {len(properties)}")
    print(f"有详情的: {len(properties_with_details)}")
    print(f"已评分: {sum(1 for p in properties_with_details if p.average_score)}")
    print(f"有通勤时间: {sum(1 for p in properties_with_details if p.commute_times.get(university))}")
    print(f"CSV 文件: {csv_file}")
    print("=" * 60)


if __name__ == '__main__':
    main()
