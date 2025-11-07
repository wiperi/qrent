#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flatmates.com.au 房源爬虫 - 大学周边租房数据采集

功能：
- 从 Flatmates.com.au 抓取 UNSW、USYD、UTS 三所大学周边的房源信息
- 自动解析房源基本信息（价格、地址、房型、可用日期等）
- 将数据存入 MySQL 数据库，支持增量更新
- 自动创建 Region 记录和 Property-School 关联

注意：
- 详情页受 Kasada 反爬虫保护，description_en 字段暂时为 NULL
- 列表页数据抓取正常，包含所有关键信息
"""

import os
import re
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeout

# 加载环境变量（数据库配置等）
load_dotenv('.env')

# 配置日志系统
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('flatmates_scraper.log'),  # 输出到文件
        logging.StreamHandler()  # 同时输出到控制台
    ]
)
logger = logging.getLogger(__name__)


class FlatmatesScraper:
    """
    Flatmates.com.au 房源爬虫类
    
    负责从 Flatmates 网站抓取大学周边房源信息并存入数据库
    """
    
    # Flatmates 网站基础 URL
    BASE_URL = "https://flatmates.com.au"
    
    # 支持的学校映射（URL slug -> 数据库中的学校名称）
    SCHOOLS = {
        'unsw': 'UNSW',
        'usyd': 'USYD',
        'uts': 'UTS'
    }
    
    # 房型映射（Flatmates 文本 -> 数据库 property_type 枚举值）
    PROPERTY_TYPE_MAP = {
        'studio': 3,        # 单间公寓
        'flatshare': 2,     # 合租公寓
        'apartment': 2,     # 公寓
        'share house': 1,   # 合租房屋
        'whole property': 1,# 整租
        'default': 5        # 默认类型
    }
    
    def __init__(self):
        """初始化爬虫，配置数据库连接参数"""
        self.db_config = {
            'host': os.getenv('DB_HOST'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'database': os.getenv('DB_DATABASE'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_unicode_ci'
        }
        self.connection = None
        self.school_id_cache = {}  # 缓存学校 ID，避免重复查询
    
    def connect_db(self):
        """连接到 MySQL 数据库"""
        try:
            self.connection = mysql.connector.connect(**self.db_config)
            logger.info("✅ Database connected successfully")
        except Error as e:
            logger.error(f"❌ Database connection failed: {e}")
            raise
    
    def disconnect_db(self):
        """断开数据库连接"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            logger.info("Database connection closed")
    
    def get_school_id(self, school_name: str) -> Optional[int]:
        """
        从数据库获取学校 ID（带缓存）
        
        Args:
            school_name: 学校全称（如 'University of New South Wales'）
            
        Returns:
            学校 ID，如果不存在返回 None
        """
        if school_name in self.school_id_cache:
            return self.school_id_cache[school_name]
        
        cursor = self.connection.cursor()
        cursor.execute("SELECT id FROM schools WHERE name = %s", (school_name,))
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            school_id = result[0]
            self.school_id_cache[school_name] = school_id
            return school_id
        
        logger.warning(f"⚠️  School not found: {school_name}")
        return None
    
    def get_or_create_region(self, suburb: str, state: str, postcode: int) -> int:
        """
        获取或创建 Region 记录
        
        如果 Region 不存在，自动创建新记录
        
        Args:
            suburb: 郊区名称（如 'Kensington'）
            state: 州名（如 'NSW'）
            postcode: 邮编（如 2033）
            
        Returns:
            Region ID
        """
        cursor = self.connection.cursor()
        
        # 标准化郊区名称（转小写、去空格）
        suburb_normalized = suburb.lower().strip()
        
        # 尝试查找现有 region
        cursor.execute(
            "SELECT id FROM regions WHERE name = %s AND state = %s AND postcode = %s",
            (suburb_normalized, state, postcode)
        )
        result = cursor.fetchone()
        
        if result:
            cursor.close()
            return result[0]
        
        # 创建新 region
        cursor.execute(
            "INSERT INTO regions (name, state, postcode) VALUES (%s, %s, %s)",
            (suburb_normalized, state, postcode)
        )
        self.connection.commit()
        region_id = cursor.lastrowid
        cursor.close()
        
        logger.info(f"✨ Created region: {suburb_normalized}, {state} {postcode} (ID: {region_id})")
        return region_id
    
    def upsert_property(self, property_data: Dict) -> int:
        """Insert or update property record"""
        cursor = self.connection.cursor()
        
        # Check if property exists
        cursor.execute("SELECT id FROM properties WHERE house_id = %s", (property_data['house_id'],))
        existing = cursor.fetchone()
        
        if existing:
            property_id = existing[0]
            # Update existing property
            update_query = """
            UPDATE properties SET 
                price = %s, available_date = %s, thumbnail_url = %s,
                bedroom_count = %s, bathroom_count = %s, keywords = %s,
                description_en = %s, url = %s
            WHERE house_id = %s
            """
            cursor.execute(update_query, (
                property_data['price'],
                property_data['available_date'],
                property_data['thumbnail_url'],
                property_data['bedroom_count'],
                property_data['bathroom_count'],
                property_data['keywords'],
                property_data['description_en'],
                property_data['url'],
                property_data['house_id']
            ))
            self.connection.commit()
            logger.info(f"🔄 Updated property {property_data['house_id']} (ID: {property_id})")
        else:
            # Insert new property
            insert_query = """
            INSERT INTO properties (
                house_id, price, address, region_id, bedroom_count, bathroom_count,
                parking_count, property_type, keywords, available_date, average_score,
                description_en, description_cn, url, thumbnail_url, published_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(insert_query, (
                property_data['house_id'],
                property_data['price'],
                property_data['address'],
                property_data['region_id'],
                property_data['bedroom_count'],
                property_data['bathroom_count'],
                property_data['parking_count'],
                property_data['property_type'],
                property_data['keywords'],
                property_data['available_date'],
                property_data['average_score'],
                property_data['description_en'],
                property_data['description_cn'],
                property_data['url'],
                property_data['thumbnail_url'],
                property_data['published_at']
            ))
            self.connection.commit()
            property_id = cursor.lastrowid
            logger.info(f"✨ Inserted property {property_data['house_id']} (ID: {property_id})")
        
        cursor.close()
        return property_id
    
    def create_property_school_relation(self, property_id: int, school_id: int):
        """Create Property-School many-to-many relation (if not exists)"""
        cursor = self.connection.cursor()
        
        # Check if relation exists
        cursor.execute(
            "SELECT 1 FROM property_school WHERE property_id = %s AND school_id = %s",
            (property_id, school_id)
        )
        
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO property_school (property_id, school_id, commute_time) VALUES (%s, %s, NULL)",
                (property_id, school_id)
            )
            self.connection.commit()
            logger.debug(f"🔗 Linked property {property_id} to school {school_id}")
        
        cursor.close()
    
    def scrape_listings(self, school_slug: str, max_pages: int = None) -> List[Dict]:
        """
        抓取房源列表页
        
        Args:
            school_slug: 学校标识（如 'unsw'）
            max_pages: 最大页数限制（None 表示不限制，抓取所有页面）
        """
        logger.info(f"🎯 Starting scrape for {school_slug.upper()}...")
        if max_pages:
            logger.info(f"📌 Limiting to {max_pages} pages for quick test")
        
        all_properties = []
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page_num = 1
            
            while True:
                # 如果设置了最大页数限制，检查是否超过
                if max_pages and page_num > max_pages:
                    logger.info(f"✅ Reached max pages limit ({max_pages}), stopping.")
                    break
                url = f"{self.BASE_URL}/{school_slug}?page={page_num}"
                logger.info(f"📄 Fetching page {page_num}: {url}")
                
                try:
                    response = page.goto(url, timeout=60000, wait_until='domcontentloaded')
                    
                    # 检查页面是否被重定向（如果重定向到首页或页码变小，说明页码无效）
                    current_url = page.url
                    if 'page=' not in current_url:
                        logger.info(f"✅ Page redirected to {current_url} (no page param), stopping.")
                        break
                    # 提取当前URL中的页码
                    current_page_match = re.search(r'page=(\d+)', current_url)
                    if current_page_match:
                        current_page_num = int(current_page_match.group(1))
                        # 如果当前页码小于请求的页码，说明被重定向到前面的页面了
                        if current_page_num < page_num:
                            logger.info(f"✅ Page redirected from page {page_num} to page {current_page_num}, stopping.")
                            break
                    
                    # 检查HTTP状态码
                    if response and response.status >= 400:
                        logger.info(f"✅ HTTP {response.status} on page {page_num}, stopping.")
                        break
                    
                    time.sleep(2)  # Wait for JS rendering
                    
                    # Wait for listings to load
                    try:
                        page.wait_for_selector('.styles__listingTileBox___2r9Cb', timeout=15000)
                    except PlaywrightTimeout:
                        # 如果找不到列表元素，说明页面无效
                        logger.info(f"✅ No listing elements found on page {page_num}, stopping.")
                        break
                    
                    # Get all property cards
                    cards = page.query_selector_all('.styles__listingTileBox___2r9Cb')
                    
                    if not cards:
                        logger.info(f"✅ No more listings on page {page_num}, stopping.")
                        break
                    
                    logger.info(f"📦 Found {len(cards)} listings on page {page_num}")
                    
                    # 解析本页的有效房源数量
                    valid_properties_count = 0
                    for idx, card in enumerate(cards, 1):
                        try:
                            property_data = self.parse_property_card(card, school_slug)
                            if property_data:
                                all_properties.append(property_data)
                                valid_properties_count += 1
                        except Exception as e:
                            logger.warning(f"⚠️  Failed to parse card {idx}: {e}")
                            continue
                    
                    # 如果一页中所有卡片都解析失败（有效房源为0），说明已到最后一页
                    if valid_properties_count == 0:
                        logger.info(f"✅ No valid properties found on page {page_num}, stopping.")
                        break
                    
                    page_num += 1
                    time.sleep(1)  # Polite delay
                    
                except PlaywrightTimeout:
                    logger.warning(f"⏱️  Timeout on page {page_num}, stopping.")
                    break
                except Exception as e:
                    logger.error(f"❌ Error on page {page_num}: {e}")
                    break
            
            browser.close()
        
        logger.info(f"✅ Scraped {len(all_properties)} properties for {school_slug.upper()}")
        return all_properties
    
    def parse_property_card(self, card, school_slug: str) -> Optional[Dict]:
        """Parse a single property card element"""
        try:
            # Detail page link & house_id
            link_elem = card.query_selector('a[href*="P"]')
            if not link_elem:
                return None
            
            href = link_elem.get_attribute('href')
            match = re.search(r'-P(\d+)', href)
            if not match:
                logger.warning(f"⚠️  Could not extract house_id from: {href}")
                return None
            
            house_id = int(match.group(1))
            
            # Extract postcode from URL (e.g., kensington-2033-P1838590)
            postcode_match = re.search(r'-(\d{4})-P\d+', href)
            postcode = int(postcode_match.group(1)) if postcode_match else None
            
            # Price
            price_elem = card.query_selector('span.styles__amount___36MUR')
            if not price_elem:
                return None
            
            price_text = price_elem.inner_text()
            price_match = re.search(r'(\d+)', price_text)
            price = int(price_match.group(1)) if price_match else 0
            
            # Address (suburb)
            address_elem = card.query_selector('span.styles__address___28Scu')
            if not address_elem:
                return None
            
            address_text = address_elem.inner_text()
            suburb = address_text.split(',')[0].strip()
            
            # Property features (bedrooms, bathrooms)
            feature_elems = card.query_selector_all('.styles__propertyFeature___uH480 p')
            bedroom_count = int(feature_elems[0].inner_text()) if len(feature_elems) > 0 else 1
            bathroom_count = int(feature_elems[1].inner_text()) if len(feature_elems) > 1 else 1
            
            # Room info (keywords)
            room_info_elem = card.query_selector('span.styles__summary___3_wnb')
            keywords = room_info_elem.inner_text() if room_info_elem else ''
            
            # Property type mapping
            property_type = self.map_property_type(keywords)
            
            # Available date
            availability_elem = card.query_selector('p.styles__availability___UzGsZ')
            availability_text = availability_elem.inner_text() if availability_elem else ''
            available_date = self.parse_available_date(availability_text)
            
            # Thumbnail image
            img_elem = card.query_selector('picture img')
            thumbnail_url = img_elem.get_attribute('src') if img_elem else ''
            
            return {
                'house_id': house_id,
                'url': f"{self.BASE_URL}{href}",
                'detail_url': f"{self.BASE_URL}{href}",  # For later detail scraping
                'price': price,
                'address': address_text[:60],
                'suburb': suburb,
                'state': 'NSW',
                'postcode': postcode,
                'bedroom_count': bedroom_count,
                'bathroom_count': bathroom_count,
                'parking_count': 0,  # Flatmates doesn't provide parking info
                'property_type': property_type,
                'keywords': keywords,
                'available_date': available_date,
                'average_score': 0.0,
                'description_en': None,  # Will be filled in detail scraping
                'description_cn': None,
                'thumbnail_url': thumbnail_url,
                'published_at': datetime.now(),
                'school_slug': school_slug
            }
        
        except Exception as e:
            logger.error(f"❌ Error parsing card: {e}")
            return None
    
    def map_property_type(self, keywords: str) -> int:
        """Map Flatmates property type text to database enum"""
        keywords_lower = keywords.lower()
        
        for key, value in self.PROPERTY_TYPE_MAP.items():
            if key in keywords_lower:
                return value
        
        return self.PROPERTY_TYPE_MAP['default']
    
    def parse_available_date(self, availability_text: str) -> Optional[datetime]:
        """Parse availability text to datetime"""
        if not availability_text:
            return None
        
        if 'now' in availability_text.lower():
            return datetime.now()
        
        # Parse "Available 10 November 2025"
        match = re.search(r'(\d+)\s+(\w+)\s+(\d{4})', availability_text)
        if match:
            try:
                date_str = f"{match.group(1)} {match.group(2)} {match.group(3)}"
                return datetime.strptime(date_str, '%d %B %Y')
            except ValueError:
                pass
        
        return None
    
    def scrape_property_details(self, properties: List[Dict]) -> List[Dict]:
        """
        抓取房源详情页信息（主要是 description）
        
        ⚠️ 注意：此功能已禁用
        原因：Flatmates.com.au 详情页使用 Kasada 反爬虫保护，无法通过常规方式抓取
        
        解决方案：
        1. 使用 playwright-stealth 等反检测库（成功率不保证）
        2. 使用住宅代理 + IP 轮换（成本高）
        3. 寻找 Flatmates API（如果有）
        4. 接受 description_en 为 NULL（推荐）
        
        Args:
            properties: 房源列表（包含基本信息）
            
        Returns:
            原样返回房源列表（description_en 保持 NULL）
        """
        logger.warning("⚠️  详情页抓取已禁用（Kasada 反爬虫保护）")
        logger.info(f"⏭️  跳过 {len(properties)} 个房源的详情页抓取")
        logger.info(f"💡 description_en 字段将保持 NULL")
        
        # 直接返回，不抓取详情
        # 如需启用，请取消下方代码注释并测试反爬虫绕过方案
        
        # ===== 详情页抓取代码（已禁用）=====
        # with sync_playwright() as p:
        #     browser = p.chromium.launch(
        #         headless=True,
        #         args=['--disable-blink-features=AutomationControlled']
        #     )
        #     context = browser.new_context(
        #         viewport={'width': 1920, 'height': 1080},
        #         user_agent='Mozilla/5.0 ...',
        #         locale='en-AU'
        #     )
        #     page = context.new_page()
        #     
        #     # 访问首页建立 session
        #     page.goto('https://flatmates.com.au/', timeout=60000)
        #     time.sleep(2)
        #     
        #     # 遍历每个房源
        #     for prop in properties:
        #         page.goto(prop['detail_url'], timeout=60000)
        #         time.sleep(3)
        #         desc_wrapper = page.query_selector('.styles__description__wrapper___1LKEI')
        #         if desc_wrapper:
        #             # 提取 description...
        #             pass
        #     
        #     browser.close()
        # =====================================
        
        return properties
    
    def process_school(self, school_slug: str):
        """Process all properties for a single school"""
        school_name = self.SCHOOLS[school_slug]
        logger.info(f"\n{'='*60}")
        logger.info(f"🎓 Processing {school_name} ({school_slug.upper()})")
        logger.info(f"{'='*60}\n")
        
        # Get school ID
        school_id = self.get_school_id(school_name)
        if not school_id:
            logger.error(f"❌ School not found in database: {school_name}")
            return
        
        # Step 1: Scrape listings
        properties = self.scrape_listings(school_slug)
        
        if not properties:
            logger.warning(f"⚠️  No properties found for {school_slug}")
            return
        
        # Step 2: Scrape details (descriptions)
        properties = self.scrape_property_details(properties)
        
        # Step 3: Save to database
        logger.info(f"💾 Saving {len(properties)} properties to database...")
        
        inserted_count = 0
        updated_count = 0
        error_count = 0
        
        for prop in properties:
            try:
                # Get or create region
                if not prop['postcode']:
                    logger.warning(f"⚠️  Skipping property {prop['house_id']} - no postcode")
                    error_count += 1
                    continue
                
                region_id = self.get_or_create_region(
                    prop['suburb'],
                    prop['state'],
                    prop['postcode']
                )
                prop['region_id'] = region_id
                
                # Upsert property
                property_id = self.upsert_property(prop)
                
                # Create school relation
                self.create_property_school_relation(property_id, school_id)
                
                inserted_count += 1
                
            except Exception as e:
                logger.error(f" Failed to save property {prop.get('house_id')}: {e}")
                error_count += 1
        
        logger.info(f"\n{'='*60}")
        logger.info(f" Summary for {school_name}:")
        logger.info(f"   Processed: {inserted_count}")
        logger.info(f"   Errors: {error_count}")
        logger.info(f"{'='*60}\n")
    
    def run(self):
        """Main execution method"""
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 Flatmates Scraper Started")
        logger.info(f"{'='*60}\n")
        
        start_time = time.time()
        
        try:
            self.connect_db()
            
            for school_slug in self.SCHOOLS.keys():
                self.process_school(school_slug)
            
            elapsed = time.time() - start_time
            logger.info(f"\n{'='*60}")
            logger.info(f"Scraping completed in {elapsed:.2f} seconds")
            logger.info(f"{'='*60}\n")
            
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            raise
        finally:
            self.disconnect_db()


def main():
    """Entry point"""
    scraper = FlatmatesScraper()
    scraper.run()


if __name__ == "__main__":
    main()

