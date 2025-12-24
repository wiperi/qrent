"""
RealEstate.com.au 爬虫
使用 Playwright 持久化浏览器配置绕过 Kasada 反爬虫保护

使用方法:
1. 首次运行时，浏览器会打开并可能需要手动完成验证
2. 验证完成后，配置会保存，后续运行会自动使用

完整 Pipeline:
1. 爬取列表页 -> 爬取详情页 -> 计算通勤时间 -> AI 评分/关键词
"""
import re
import os
import logging
import time
import random
from typing import List, Optional, Any
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd
from tqdm import tqdm
from dotenv import load_dotenv

from .base import BaseScraper
from ..models import PropertyData, PropertySource
from ..config import PROPERTY_TYPE_MAPPING, ScraperConfig
from ..utils import (
    extract_price, extract_number, clean_address,
    parse_available_date, is_valid_image_url, generate_house_id
)
from ..utils.browser import BrowserManager, BrowserType

# 加载环境变量
load_dotenv('.env')
load_dotenv('../../.env')

logger = logging.getLogger(__name__)

# 配置
MAX_DESC_LENGTH = 1000  # 描述最大长度（字符）


class RealEstateScraper(BaseScraper):
    """
    RealEstate.com.au 爬虫实现
    使用 Playwright 持久化浏览器配置
    """
    
    SOURCE = PropertySource.REALESTATE
    BASE_URL = "https://www.realestate.com.au"
    
    def __init__(self, config: ScraperConfig = None, profile_dir: str = None):
        """
        初始化爬虫
        
        Args:
            config: 爬虫配置
            profile_dir: Playwright 浏览器配置目录（用于保存会话）
        """
        super().__init__(config)
        self.profile_dir = profile_dir or os.path.join(os.getcwd(), 'rea_profile')
        self.browser = None
        self.detail_count = 0  # 详情页计数器
    
    def _reset_profile(self):
        """
        重置浏览器 profile
        删除旧的 profile 目录，创建新的干净浏览器实例
        """
        import shutil
        
        # 先关闭现有浏览器
        if self.browser:
            try:
                self.browser.close()
            except:
                pass
            self.browser = None
        
        # 删除 profile 目录
        if os.path.exists(self.profile_dir):
            try:
                shutil.rmtree(self.profile_dir)
                logger.info(f"Profile 已重置: {self.profile_dir}")
            except Exception as e:
                logger.warning(f"删除 profile 失败: {e}")
        
        # 等待一下
        time.sleep(2)
    
    def get_search_url(self, area: str) -> str:
        """
        生成 RealEstate 租房搜索 URL
        
        正确格式: https://www.realestate.com.au/rent/in-{postcode}/list-1
        例如: https://www.realestate.com.au/rent/in-2033/list-1
        """
        postcode = self._extract_postcode(area)
        if postcode:
            return f"{self.BASE_URL}/rent/in-{postcode}/list-1"
        return f"{self.BASE_URL}/rent/in-{area}/list-1"
    
    def _extract_postcode(self, area: str) -> Optional[str]:
        """从区域字符串提取邮编"""
        match = re.search(r'(\d{4})', area)
        if match:
            return match.group(1)
        return None
    
    def get_detail_url(self, property_data: PropertyData) -> str:
        """获取房产详情页 URL"""
        return property_data.url or ""
    
    def _ensure_browser(self):
        """确保浏览器已启动，复用已有实例"""
        if not self.browser:
            self.browser = BrowserManager(
                browser_type=BrowserType.PLAYWRIGHT,
                profile_dir=self.profile_dir
            )
            self.browser.create_driver()
            logger.info("Playwright 浏览器已启动")
    
    def scrape_area(self, area: str) -> List[PropertyData]:
        """
        爬取指定区域
        使用 Playwright 持久化浏览器
        """
        from ..models import ScrapeResult
        
        properties = []
        url = self.get_search_url(area)
        logger.info(f"RealEstate 爬取: {url}")
        
        try:
            # 每个区域前重置 profile，避免被追踪
            logger.info("重置浏览器 profile...")
            self._reset_profile()
            self._ensure_browser()
            
            page = 1
            consecutive_failures = 0
            
            while page <= self.config.max_pages:
                page_url = url.replace('/list-1', f'/list-{page}')
                logger.info(f"爬取第 {page} 页: {page_url}")
                
                # 导航到页面 - 检查是否成功
                if not self.browser.navigate(page_url, wait_time=10.0):
                    consecutive_failures += 1
                    logger.warning(f"导航失败，连续失败 {consecutive_failures} 次")
                    
                    if consecutive_failures >= 3:
                        logger.error("连续失败 3 次，可能被封禁，停止该区域爬取")
                        break
                    
                    # 等待一段时间再继续
                    logger.info("等待 30 秒后继续...")
                    time.sleep(30)
                    page += 1
                    continue
                
                # 重置失败计数
                consecutive_failures = 0
                
                # 模拟用户行为
                try:
                    for _ in range(5):
                        self.browser.scroll_page(random.randint(200, 400))
                        self.browser.wait(random.uniform(1.0, 2.0))
                except Exception as e:
                    logger.warning(f"滚动页面失败: {e}")
                
                # 获取页面内容
                try:
                    html = self.browser.get_page_source()
                except Exception as e:
                    logger.error(f"获取页面内容失败: {e}")
                    page += 1
                    continue
                
                # 检查是否被拦截
                if 'KPSDK' in html and len(html) < 5000:
                    logger.warning("Kasada 保护活跃，等待更长时间...")
                    self.browser.wait(20.0)
                    
                    # 再次滚动
                    try:
                        for _ in range(3):
                            self.browser.scroll_page(200)
                            self.browser.wait(1.0)
                        html = self.browser.get_page_source()
                    except Exception as e:
                        logger.warning(f"Kasada 保护重试时滚动或获取页面内容失败: {e}")
                    
                    if len(html) < 10000:
                        logger.error("页面未能加载，可能需要手动验证")
                        logger.info(f"HTML 长度: {len(html)}")
                        break
                
                # 解析页面
                page_properties = self.parse_listing_page(html)
                
                if not page_properties:
                    logger.info(f"第 {page} 页没有找到房源，停止")
                    break
                
                properties.extend(page_properties)
                logger.info(f"第 {page} 页找到 {len(page_properties)} 个房源")
                
                # 检查是否有下一页
                if not self._has_next_page(html):
                    break
                
                page += 1
                # 增加随机延迟，避免被封禁
                delay = self.config.request_delay + random.uniform(2, 5)
                logger.debug(f"等待 {delay:.1f} 秒...")
                time.sleep(delay)
            
        except Exception as e:
            logger.error(f"RealEstate 爬取失败: {e}")
            import traceback
            traceback.print_exc()
        # 注意：不要在这里关闭浏览器，让它保持打开状态用于详情页爬取
        
        return properties
    
    def scrape_areas(self, areas: List[str]) -> List[PropertyData]:
        """爬取多个区域"""
        all_properties = []
        
        try:
            for i, area in enumerate(areas):
                logger.info(f"\n{'='*40}")
                logger.info(f"区域 {i+1}/{len(areas)}: {area}")
                logger.info(f"{'='*40}")
                
                properties = self.scrape_area(area)
                all_properties.extend(properties)
                
                # 短暂等待后继续下一个区域（profile 会在下个区域开始时重置）
                if i < len(areas) - 1:
                    time.sleep(3)
        finally:
            # 所有区域爬完后关闭浏览器
            if self.browser:
                try:
                    self.browser.close()
                except Exception as e:
                    logger.debug("关闭浏览器时出错（已忽略）：%s", e)
                self.browser = None
        
        logger.info(f"\n所有区域爬取完成，共 {len(all_properties)} 个房源")
        return all_properties
    
    def _has_next_page(self, html: str) -> bool:
        """检查是否有下一页"""
        soup = BeautifulSoup(html, 'html.parser')
        next_link = soup.find('a', rel='next') or soup.find('a', class_=lambda c: c and 'next' in str(c).lower())
        return next_link is not None
    
    def parse_listing_page(self, html: str) -> List[PropertyData]:
        """解析 RealEstate 列表页面"""
        soup = BeautifulSoup(html, "html.parser")
        properties = []
        
        # 查找房源卡片
        listings = self._find_listings(soup)
        logger.debug(f"找到 {len(listings)} 个房源卡片")
        
        for listing in listings:
            try:
                prop = self._parse_listing_item(listing)
                if prop:
                    properties.append(prop)
            except Exception as e:
                logger.debug(f"解析房源失败: {e}")
        
        return properties
    
    def _find_listings(self, soup: BeautifulSoup) -> List:
        """查找所有房源卡片"""
        # RealEstate 2024 页面结构 - article 带 residential-card class
        listings = soup.find_all('article', class_=lambda c: c and 'residential-card' in str(c))
        
        if listings:
            logger.debug(f"Found {len(listings)} article.residential-card elements")
            return listings
        
        # 备用选择器
        listings = soup.find_all('article', attrs={'data-testid': 'ResidentialCard'})
        if listings:
            return listings
        
        return []
    
    def _looks_like_rental(self, element) -> bool:
        """检查元素是否看起来像租房卡片"""
        text = element.get_text().lower()
        return ('$' in text and ('week' in text or 'pw' in text))
    
    def _parse_listing_item(self, listing) -> Optional[PropertyData]:
        """解析单个房源"""
        # 价格
        price = self._extract_price(listing)
        if price == 0:
            return None
        
        # 地址
        address_info = self._extract_address(listing)
        if not address_info:
            return None
        
        address_line1, address_line2, suburb, state, postcode, detail_url = address_info
        
        # 特征
        bedroom_count, bathroom_count, parking_count = self._extract_features(listing)
        
        # 房产类型
        property_type, property_type_raw = self._extract_property_type(listing)
        
        # ID
        house_id = self._extract_house_id(listing, detail_url, address_line1, postcode)
        
        if not house_id:
            return None
        
        # 缩略图
        thumbnail_url = self._extract_thumbnail(listing)
        prop = PropertyData(
            house_id=house_id,
            source=self.SOURCE,
            price_per_week=price,
            address_line1=address_line1,
            address_line2=address_line2,
            suburb=suburb,
            state=state,
            postcode=postcode,
            bedroom_count=bedroom_count,
            bathroom_count=bathroom_count,
            parking_count=parking_count,
            property_type=property_type,
            property_type_raw=property_type_raw,
            url=detail_url,
            thumbnail_url=thumbnail_url,
            scraped_at=datetime.now()
        )
        # 实时输出每条列表级房源信息，便于监控
        try:
            logger.info(f"找到房源: id={prop.house_id} price={prop.price_per_week} beds={prop.bedroom_count} url={prop.url}")
        except Exception as e:
            logger.debug("Failed to log property info for id=%s: %s", getattr(prop, "house_id", "unknown"), e)

        return prop
    
    def _extract_price(self, listing) -> int:
        """提取价格"""
        # 直接从文本中搜索价格
        text = listing.get_text()
        
        # 匹配 $XXX per week 或 $XXX pw 格式
        patterns = [
            r'\$(\d{1,3}(?:,\d{3})?)\s*(?:per\s*week|pw|/week)',
            r'\$(\d{1,3}(?:,\d{3})?)\s*(?:p\.?w\.?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.I)
            if match:
                price_str = match.group(1).replace(',', '')
                return int(price_str)
        
        # 尝试查找价格元素
        price_selectors = [
            ('span', {'class': lambda c: c and 'price' in str(c).lower()}),
            ('p', {'class': lambda c: c and 'price' in str(c).lower()}),
        ]
        
        for tag, attrs in price_selectors:
            elem = listing.find(tag, attrs)
            if elem:
                price = extract_price(elem.get_text(strip=True))
                if price > 0:
                    return price
        
        return 0
    
    def _extract_address(self, listing) -> Optional[tuple]:
        """提取地址"""
        # 从 aria-label 获取地址（最可靠）
        aria_label = listing.get('aria-label', '')
        if aria_label and ',' in aria_label:
            # aria-label 格式: "504/93 Brompton Road, Kensington"
            # 查找详情链接
            detail_url = ""
            link = listing.find('a', href=lambda h: h and '/property-' in str(h))
            if link:
                detail_url = link.get('href', '')
            
            return self._parse_address(aria_label, detail_url)
        
        # 备用：从 span 或链接中获取
        addr_span = listing.find('span', class_=lambda c: c and 'address' in str(c).lower())
        if addr_span:
            address_text = addr_span.get_text(strip=True)
            link = listing.find('a', href=lambda h: h and '/property-' in str(h))
            detail_url = link.get('href', '') if link else ""
            return self._parse_address(address_text, detail_url)
        
        # 最后尝试：从链接获取
        links = listing.find_all('a', href=lambda h: h and '/property-' in str(h))
        for link in links:
            text = link.get_text(strip=True)
            if text and ',' in text:
                return self._parse_address(text, link.get('href', ''))
        
        return None
    
    def _parse_address(self, address_text: str, href: str) -> Optional[tuple]:
        """解析地址文本"""
        address_line1 = ""
        address_line2 = ""
        suburb = ""
        state = "NSW"
        postcode = ""
        detail_url = ""
        
        if href:
            detail_url = f"{self.BASE_URL}{href}" if href.startswith('/') else href
            
            # 从 URL 提取邮编
            # 格式: /property-unit-nsw-kensington-442963084
            url_match = re.search(r'-(\d{4})-(\d+)$', href)
            if url_match:
                postcode = url_match.group(1)
        
        try:
            # 格式: "504/93 Brompton Road, Kensington"
            if ',' in address_text:
                parts = [p.strip() for p in address_text.split(',')]
                address_line1 = parts[0]  # 保留原始格式
                
                if len(parts) > 1:
                    suburb = parts[-1].strip()
                    address_line2 = suburb.lower().replace(' ', '-')
                    
                    # 尝试解析带有 State 的格式
                    match = re.match(r'(.+?)\s+(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*(\d{4})?$', suburb, re.I)
                    if match:
                        suburb = match.group(1).strip()
                        state = match.group(2).upper()
                        if match.group(3):
                            postcode = match.group(3)
            else:
                address_line1 = address_text
        except Exception:
            pass
        
        return (address_line1, address_line2, suburb, state, postcode, detail_url) if address_line1 else None
    
    def _extract_features(self, listing) -> tuple:
        """提取房产特征（卧室、浴室、车位）"""
        bedroom_count = 0
        bathroom_count = 0
        parking_count = 0
        
        # 从 SVG 图标旁边获取数字
        # RealEstate 使用 SVG 图标，数字在父元素中
        svgs = listing.find_all('svg')
        numbers = []
        
        for svg in svgs:
            parent = svg.parent
            if parent:
                text = parent.get_text(strip=True)
                if text and text.isdigit():
                    numbers.append(int(text))
        
        # 通常顺序是：卧室、浴室、车位
        if len(numbers) >= 1:
            bedroom_count = numbers[0]
        if len(numbers) >= 2:
            bathroom_count = numbers[1]
        if len(numbers) >= 3:
            parking_count = numbers[2]
        
        # 如果 SVG 方法失败，尝试从文本匹配
        if bedroom_count == 0:
            text = listing.get_text()
            patterns = [
                (r'(\d+)\s*(?:bed|bedroom|Bed)', 'bed'),
                (r'(\d+)\s*(?:bath|bathroom|Bath)', 'bath'),
                (r'(\d+)\s*(?:car|parking|garage|Car)', 'park'),
            ]
            
            for pattern, target in patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    num = int(match.group(1))
                    if target == 'bed':
                        bedroom_count = num
                    elif target == 'bath':
                        bathroom_count = num
                    elif target == 'park':
                        parking_count = num
        
        return bedroom_count, bathroom_count, parking_count
    
    def _extract_property_type(self, listing) -> tuple:
        """提取房产类型"""
        text = listing.get_text().lower()
        
        type_keywords = {
            'apartment': 'Apartment',
            'unit': 'Unit',
            'house': 'House',
            'townhouse': 'Townhouse',
            'studio': 'Studio',
            'villa': 'Villa',
            'duplex': 'Duplex',
        }
        
        property_type_raw = ""
        for keyword, display in type_keywords.items():
            if keyword in text:
                property_type_raw = display
                break
        
        property_type = PROPERTY_TYPE_MAPPING.get(property_type_raw.lower(), 5)
        return property_type, property_type_raw
    
    def _extract_house_id(self, listing, detail_url: str, address: str, postcode: str) -> str:
        """提取房源 ID"""
        # 从 data 属性
        listing_id = listing.get('data-listing-id') or listing.get('id') or ''
        
        if listing_id:
            listing_id = re.sub(r'[^\d]', '', str(listing_id))
            if listing_id:
                return listing_id
        
        # 从 URL
        if detail_url:
            match = re.search(r'-(\d{7,})$', detail_url)
            if match:
                return match.group(1)
        
        # 生成 ID
        if address:
            return generate_house_id(address, postcode)
        
        return ""
    
    def _extract_thumbnail(self, listing) -> Optional[str]:
        """提取缩略图"""
        img = listing.find('img')
        if img:
            src = img.get('src') or img.get('data-src') or img.get('srcset', '').split()[0]
            if src and is_valid_image_url(src):
                return src
        return None
    
    def parse_detail_page(self, property_data: PropertyData, html: str) -> PropertyData:
        """解析详情页 - 提取完整描述和其他信息"""
        soup = BeautifulSoup(html, "html.parser")
        
        # 描述 - 尝试多种选择器
        description = ""
        desc_selectors = [
            ('div', {'data-testid': 'listing-details__description'}),
            ('div', {'class': lambda c: c and 'description' in str(c).lower()}),
            ('div', {'id': lambda i: i and 'description' in str(i).lower()}),
            ('p', {'class': lambda c: c and 'description' in str(c).lower()}),
        ]
        
        for tag, attrs in desc_selectors:
            elem = soup.find(tag, attrs)
            if elem:
                description = elem.get_text(separator=' ', strip=True)
                if len(description) > 50:  # 确保是有效描述
                    # 截断过长的描述
                    if len(description) > MAX_DESC_LENGTH:
                        description = description[:MAX_DESC_LENGTH] + '...'
                    break
        
        # 如果没找到，尝试从文章内容获取
        if not description or len(description) < 50:
            article = soup.find('article')
            if article:
                # 获取所有段落
                paragraphs = article.find_all('p')
                for p in paragraphs:
                    text = p.get_text(strip=True)
                    if len(text) > 100:  # 找到长段落
                        # 截断过长的描述
                        if len(text) > MAX_DESC_LENGTH:
                            text = text[:MAX_DESC_LENGTH] + '...'
                        description = text
                        break
        
        if description:
            property_data.description_en = description
        
        # 可用日期
        available_patterns = [
            r'available\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'available\s+from\s+(\d{1,2}\s+\w+\s+\d{4})',
            r'available\s+(now|immediately)',
            r'date\s+available[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        ]
        
        page_text = soup.get_text().lower()
        for pattern in available_patterns:
            match = re.search(pattern, page_text, re.I)
            if match:
                date_str = match.group(1)
                if date_str.lower() in ['now', 'immediately']:
                    property_data.available_date = datetime.now().strftime('%Y-%m-%d')
                else:
                    property_data.available_date = parse_available_date(date_str)
                break
        
        # 房源图片提取
        # 真正的房源图片格式: https://i2.au.reastatic.net/尺寸/hash/image.jpg
        property_image_pattern = re.compile(r'i2\.au\.reastatic\.net/\d+x\d+.*?/[a-f0-9]+/image\.jpg', re.I)
        exclude_keywords = ['logo', 'agent', 'agency', 'brand', 'profile', 'avatar', 'icon', 'branding']
        
        all_urls = []
        
        # 从 source 标签的 srcset 获取
        for source in soup.find_all('source', srcset=True):
            srcset = source.get('srcset', '')
            for part in srcset.split(','):
                url = part.strip().split()[0] if part.strip() else ''
                if url:
                    all_urls.append(url)
        
        # 从 img 标签获取
        for img in soup.find_all('img'):
            for attr in ['src', 'data-src', 'data-lazy-src']:
                url = img.get(attr, '')
                if url:
                    all_urls.append(url)
        
        # 优先查找符合房源图片格式的 URL
        for url in all_urls:
            if property_image_pattern.search(url):
                if not any(kw in url.lower() for kw in exclude_keywords):
                    property_data.thumbnail_url = url
                    break
        
        # 备用：查找 i2.au.reastatic.net 的大图
        if not property_data.thumbnail_url:
            for url in all_urls:
                if 'i2.au.reastatic.net' in url:
                    if not any(kw in url.lower() for kw in exclude_keywords):
                        if re.search(r'\d+x\d+', url):
                            property_data.thumbnail_url = url
                            break
        
        property_data.published_at = datetime.now()
        
        return property_data
    
    def scrape_property_details(
        self, 
        properties: List[PropertyData],
        skip_existing: bool = True
    ) -> List[PropertyData]:
        """
        爬取房产详情页 - 使用 Playwright
        
        Args:
            properties: 房产列表
            skip_existing: 是否跳过已有详情的房产
            
        Returns:
            更新后的房产列表
        """
        to_scrape = [p for p in properties if not (skip_existing and p.description_en)]
        logger.info(f"需要爬取详情页的房源数量: {len(to_scrape)}")

        if not to_scrape:
            logger.info("没有需要爬取详情的房产")
            return properties
        
        logger.info(f"开始爬取 {len(to_scrape)} 个房产的详情页")
        
        success_count = 0
        fail_count = 0
        
        try:
            # 使用已有的浏览器或创建新的
            self._ensure_browser()
            
            for i, prop in enumerate(to_scrape):
                try:
                    # 每 30 个房源重置一次 profile
                    if self.detail_count > 0 and self.detail_count % 30 == 0:
                        logger.info(f"已爬取 {self.detail_count} 个详情，重置浏览器 profile...")
                        self._reset_profile()
                        self._ensure_browser()
                        time.sleep(3)
                    
                    url = prop.url
                    if not url:
                        continue
                    
                    remaining = len(to_scrape) - i
                    logger.info(f"[{i+1}/{len(to_scrape)}] 剩余 {remaining} | {url[:60]}...")
                    
                    # 导航（减少等待时间以提升速度）
                    if not self.browser.navigate(url, wait_time=3.0):
                        logger.info(f"  -> 导航失败")
                        fail_count += 1
                        continue
                    
                    # 快速滚动
                    self.browser.scroll_page(500)
                    self.browser.wait(1.0)
                    self.browser.scroll_page(500)
                    self.browser.wait(0.5)
                    
                    html = self.browser.get_page_source()
                    
                    # 检查是否被拦截
                    if len(html) < 10000:
                        logger.warning(f"  -> 页面可能被拦截 (HTML: {len(html)} bytes)")
                        fail_count += 1
                        continue
                    
                    self.parse_detail_page(prop, html)
                    self.detail_count += 1  # 计数器增加
                    if prop.description_en:
                        success_count += 1
                        logger.info(f"  -> 成功")
                    else:
                        logger.info(f"  -> 未获取到描述")
                    
                    # 短暂延迟
                    time.sleep(random.uniform(1, 2))
                    
                except Exception as e:
                    fail_count += 1
                    logger.error(f"爬取详情失败 ({prop.house_id}): {e}")
            
        except Exception as e:
            logger.error(f"详情爬取失败: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.browser:
                self.browser.close()
                self.browser = None
        
        logger.info(f"详情爬取完成: 成功 {success_count}, 失败 {fail_count}")
        return properties
    
    def find_next_button(self, soup: BeautifulSoup) -> Optional[Any]:
        """查找下一页按钮（用于浏览器模式）"""
        return soup.find('a', rel='next')


# ============================================================================
# Pipeline 功能 - 通勤时间、AI 评分、关键词提取
# ============================================================================

# 学校坐标
SCHOOL_COORDINATES = {
    'UNSW': "University of New South Wales, Kensington NSW 2052, Australia",
    'USYD': "University of Sydney, Camperdown NSW 2006, Australia",
    'UTS': "University of Technology Sydney, Ultimo NSW 2007, Australia"
}

# AI 评分配置
NUM_CALLS = 2
SCORES_PER_CALL = 4
TOTAL_SCORES = NUM_CALLS * SCORES_PER_CALL

SYSTEM_PROMPT_SCORING = """你是一位专业的房屋居住质量评估员，需要对房屋进行"分项打分"和"总评分"，标准如下：
1. 房屋质量 (0~10 分)：
   - 如果房屋缺少翻新、老旧或有明显缺陷，可给 3 分以下。
   - 普通装修或信息不足，可给 4~6 分。
   - 有翻新、材料优质或描述明确，可给 7~9 分。
   - 高端精装修或全新房，给 10 分。
2. 居住体验 (0~10 分)：
   - 噪音、空间狭小、采光差，可给 3 分以下。
   - 一般居住条件或描述不清，可给 4~6 分。
   - 宽敞、通风良好、配有空调等，可给 7~9 分。
   - 特别舒适、配置高级，可给 10 分。
3. 房屋内部配套设施 (0~10 分)：
   - 若只具备基本设施或缺少描述，可给 3~5 分。
   - 普通现代设施（空调、洗衣机、厨房电器等）可给 6~8 分。
   - 特别齐全、高端智能家居，可给 9~10 分。

总评分 (0~20)：
   = (房屋质量 + 居住体验 + 房屋内部配套设施) / 30 * 20

请一次性给出4组【独立的】打分结果，每组包括：
   房屋质量:X, 居住体验:Y, 房屋内配套:Z, 总评分:W
仅输出以上格式，每组一行，不可包含除数字、小数点、逗号、冒号、换行以外的文本。
示例：
房屋质量:6.5, 居住体验:7, 房屋内配套:5, 总评分:12.3
房屋质量:3, 居住体验:4, 房屋内配套:2.5, 总评分:6.3
房屋质量:9.5, 居住体验:8.5, 房屋内配套:9, 总评分:18
房屋质量:2, 居住体验:2.5, 房屋内配套:3, 总评分:5.5
"""


class CommuteCalculator:
    """通勤时间计算器"""
    
    def __init__(self, api_key: str):
        import googlemaps
        if not api_key:
            raise ValueError("Google Maps API Key is required")
        self.gmaps = googlemaps.Client(key=api_key)
    
    def get_property_address(self, row: pd.Series) -> str:
        address_line1 = ""
        address_line2 = ""
        
        if 'addressLine1' in row.index and pd.notna(row['addressLine1']):
            address_line1 = str(row['addressLine1']).strip()
        if 'addressLine2' in row.index and pd.notna(row['addressLine2']):
            address_line2 = str(row['addressLine2']).strip()
        
        if address_line1 and address_line2:
            return f"{address_line1}, {address_line2}, Australia"
        elif address_line2:
            return f"{address_line2}, Australia"
        elif address_line1:
            return f"{address_line1}, NSW, Australia"
        return ""
    
    def calculate_transit_time(self, origin: str, destination: str) -> int:
        try:
            tomorrow_morning = datetime.now().replace(hour=8, minute=30, second=0, microsecond=0) + timedelta(days=1)
            result = self.gmaps.directions(
                origin=origin, destination=destination,
                mode="transit", departure_time=tomorrow_morning, alternatives=False
            )
            if result and len(result) > 0:
                duration_minutes = result[0]['legs'][0]['duration']['value'] / 60
                logger.info(f"from {origin[:30]}... to {destination[:20]}... bus time: {duration_minutes:.1f} min")
                return int(round(duration_minutes))
            return 0
        except Exception as e:
            logger.error(f"Transit time error: {e}")
            return 0
    
    def calculate_driving_time_as_backup(self, origin: str, destination: str) -> int:
        try:
            tomorrow_morning = datetime.now().replace(hour=8, minute=30, second=0, microsecond=0) + timedelta(days=1)
            result = self.gmaps.distance_matrix(
                origins=[origin], destinations=[destination],
                mode="driving", departure_time=tomorrow_morning, traffic_model="best_guess"
            )
            if result['status'] == 'OK' and result['rows'][0]['elements'][0]['status'] == 'OK':
                duration_minutes = result['rows'][0]['elements'][0]['duration']['value'] / 60
                logger.info(f"car time: {duration_minutes:.1f} min")
                return int(round(duration_minutes))
            return 0
        except Exception as e:
            logger.error(f"Driving time error: {e}")
            return 0


class AIScorer:
    """AI 评分和关键词提取"""
    
    def __init__(self, api_key: str, model_name: str = "qwen-plus-1220"):
        import dashscope
        self.dashscope = dashscope
        self.api_key = api_key
        self.model_name = model_name
    
    def _build_user_prompt(self, description: str) -> str:
        return (
            "根据以下房源描述，对房屋质量、居住体验、房屋内部配套设施三个维度分别打 0~10 分，并给出总评分（0~20分）。\n"
            "请参考系统提示中的具体扣分/加分建议。\n"
            f"房源描述：{description}\n"
            "请严格按系统提示输出 4 组打分，每组一行，不要输出任何多余的文字。"
        )
    
    def _parse_four_sets_of_scores(self, text: str) -> list:
        lines = text.strip().split("\n")
        if len(lines) != 4:
            return [0, 0, 0, 0]
        results = []
        for line in lines:
            match = re.search(r"总评分\s*:\s*(\d+(\.\d+)?)", line)
            if not match:
                results.append(0)
                continue
            try:
                score_val = float(match.group(1))
                results.append(score_val if 0 <= score_val <= 20 else 0)
            except:
                results.append(0)
        return results
    
    def call_model_for_scores(self, description: str) -> list:
        all_scores = []
        for _ in range(NUM_CALLS):
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT_SCORING},
                {"role": "user", "content": self._build_user_prompt(description)},
            ]
            try:
                response = self.dashscope.Generation.call(
                    api_key=self.api_key, model=self.model_name,
                    messages=messages, result_format='message',
                    parameters={"temperature": 0.7, "max_tokens": 150, "top_p": 0.9}
                )
                if response and response.output and response.output.get("choices"):
                    assistant_msg = response.output["choices"][0]["message"]["content"]
                    scores_4 = self._parse_four_sets_of_scores(assistant_msg)
                else:
                    scores_4 = [0, 0, 0, 0]
            except Exception as e:
                logger.error(f"Scoring failed: {e}")
                scores_4 = [0, 0, 0, 0]
            all_scores.extend(scores_4)
        return all_scores
    
    def call_model_for_keywords(self, description: str) -> str:
        messages = [
            {
                'role': 'system',
                'content': (
                    "从房源描述中提取简洁的关键词，包括以下10个维度：\n"
                    "1.安全性：门禁系统、安保设施等\n"
                    "2.重要家电：空调、烘干机等配置\n"
                    "3.厨房：有无灶台，灶台大小/类型，有无洗碗机、微波炉、烤箱等\n"
                    "4.装修状况：是否带家具，装修风格\n"
                    "5.储物空间：衣柜、储藏室，可容纳床尺寸评估等\n"
                    "6.洗手间：是否干湿分离、配备浴缸等\n"
                    "7.社区配套：健身房、游泳池等公共设施\n"
                    "8.购物：周边有无较大的买菜市场、药店等\n"
                    "9.户外空间：采光状态、景观特色，庭院或阳台私密性评估等\n"
                    "10.地理位置：临近商店、公园、餐厅等\n\n"
                    "用英文输出，描述中未提及的维度不要输出，关键词数量≤11个，不包含额外文字。"
                )
            },
            {'role': 'user', 'content': description}
        ]
        try:
            response = self.dashscope.Generation.call(
                api_key=self.api_key, model=self.model_name,
                messages=messages, result_format='message',
                parameters={"temperature": 0.7, "max_tokens": 150, "top_p": 0.9}
            )
            if response and response.output and response.output.get("choices"):
                return response.output["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"Keyword extraction failed: {e}")
        return "N/A"
    
    def call_model_for_keywords_cn(self, description: str) -> str:
        messages = [
            {
                'role': 'system',
                'content': "从给定的房屋描述中提取关键词，关键词请用中文输出。要求关键词应包含房屋的位置、特征和可用设施。只输出关键词，用逗号分隔，不要包含其他文字。"
            },
            {'role': 'user', 'content': description}
        ]
        try:
            response = self.dashscope.Generation.call(
                api_key=self.api_key, model=self.model_name,
                messages=messages, result_format='message',
                parameters={"temperature": 0.7, "max_tokens": 150, "top_p": 0.9}
            )
            if response and response.output and response.output.get("choices"):
                return response.output["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"Chinese keyword extraction failed: {e}")
        return "N/A"


def update_commute_time(df: pd.DataFrame, university: str) -> pd.DataFrame:
    """更新通勤时间"""
    google_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not google_api_key:
        logger.error("未设置 GOOGLE_MAPS_API_KEY")
        return df
    
    if university not in SCHOOL_COORDINATES:
        logger.error(f"不支持的学校: {university}")
        return df
    
    calculator = CommuteCalculator(google_api_key)
    current_commute_col = f'commuteTime_{university}'
    
    if current_commute_col not in df.columns:
        df[current_commute_col] = None
    
    # 尝试从昨天的数据复用
    today = datetime.now().strftime('%y%m%d')
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%y%m%d')
    yesterday_file = f"output/{university}_rentdata_{yesterday}.csv"
    
    if os.path.exists(yesterday_file):
        logger.info(f"发现昨天的数据: {yesterday_file}")
        try:
            yesterday_data = pd.read_csv(yesterday_file)
            if current_commute_col in yesterday_data.columns and 'houseId' in df.columns:
                yesterday_unique = yesterday_data.drop_duplicates(subset=['houseId'], keep='first')
                df[current_commute_col] = df['houseId'].map(
                    yesterday_unique.set_index('houseId')[current_commute_col]
                )
                logger.info("已从昨天数据复用通勤时间")
        except Exception as e:
            logger.warning(f"读取昨天数据失败: {e}")
    
    # 查找需要计算的（NaN 或 0）
    missing_indices = df[(df[current_commute_col].isna()) | (df[current_commute_col] == 0)].index
    
    if len(missing_indices) == 0:
        logger.info(f"所有房源都已有 {current_commute_col}")
        return df
    
    logger.info(f"需要计算通勤时间: {len(missing_indices)} 个")
    destination = SCHOOL_COORDINATES[university]
    
    success_count = 0
    for index in tqdm(missing_indices, desc=f"计算 {university} 通勤时间"):
        row = df.loc[index]
        origin = calculator.get_property_address(row)
        
        if not origin:
            df.loc[index, current_commute_col] = 0
            continue
        
        transit_time = calculator.calculate_transit_time(origin, destination)
        
        if transit_time > 0:
            df.loc[index, current_commute_col] = transit_time
            success_count += 1
        else:
            driving_time = calculator.calculate_driving_time_as_backup(origin, destination)
            if driving_time > 0:
                df.loc[index, current_commute_col] = int(driving_time * 1.5)
                success_count += 1
            else:
                df.loc[index, current_commute_col] = 0
        
        time.sleep(1.1)  # API 限制
    
    logger.info(f"通勤时间计算完成: 成功 {success_count}/{len(missing_indices)}")
    return df


def score_properties_parallel(df: pd.DataFrame, max_workers: int = 2) -> pd.DataFrame:
    """并行评分"""
    api_key = os.getenv('PROPERTY_RATING_API_KEY')
    if not api_key:
        logger.error("未设置 PROPERTY_RATING_API_KEY")
        return df
    
    scorer = AIScorer(api_key)
    
    for i in range(1, TOTAL_SCORES + 1):
        if f"Score_{i}" not in df.columns:
            df[f"Score_{i}"] = None
    if 'average_score' not in df.columns:
        df['average_score'] = None
    
    to_score = df[
        (df['description_en'].notna()) & (df['description_en'] != '') &
        ((df['average_score'].isna()) | (df['average_score'] == 0))
    ]
    logger.info(f"需要评分的房源: {len(to_score)}")
    
    if len(to_score) == 0:
        return df
    
    def process_row(idx, row):
        desc = row.get('description_en', '')
        if pd.isna(desc) or not desc.strip():
            return (idx, [0] * TOTAL_SCORES, 0)
        scores = scorer.call_model_for_scores(desc)
        avg_score = sum(scores) / len(scores) if scores else 0
        return (idx, scores, avg_score)
    
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(process_row, idx, row) for idx, row in to_score.iterrows()]
        for f in tqdm(as_completed(futures), total=len(futures), desc="AI 评分"):
            results.append(f.result())
    
    for (idx, scores, avg_score) in results:
        for i, score_val in enumerate(scores, 1):
            if i <= TOTAL_SCORES:
                df.at[idx, f"Score_{i}"] = score_val
        df.at[idx, 'average_score'] = avg_score
    
    return df


def extract_keywords_parallel(df: pd.DataFrame, max_workers: int = 2) -> pd.DataFrame:
    """并行提取关键词（英文 + 中文）"""
    api_key = os.getenv('PROPERTY_RATING_API_KEY')
    if not api_key:
        logger.error("未设置 PROPERTY_RATING_API_KEY")
        return df
    
    scorer = AIScorer(api_key)
    
    if 'keywords' not in df.columns:
        df['keywords'] = pd.Series(dtype="string")
    if 'description_cn' not in df.columns:
        df['description_cn'] = pd.Series(dtype="string")
    
    to_extract = df[
        (df['description_en'].notna()) & (df['description_en'] != '') &
        ((df['keywords'].isna()) | (df['keywords'] == 'N/A') | (df['keywords'] == ''))
    ]
    logger.info(f"需要提取关键词的房源: {len(to_extract)}")
    
    if len(to_extract) == 0:
        return df
    
    def process_row(idx, row):
        desc = row.get('description_en', '')
        if pd.isna(desc) or not desc.strip():
            return (idx, "N/A", "N/A")
        kw_en = scorer.call_model_for_keywords(desc)
        kw_cn = scorer.call_model_for_keywords_cn(desc)
        return (idx, kw_en, kw_cn)
    
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(process_row, idx, row) for idx, row in to_extract.iterrows()]
        for f in tqdm(as_completed(futures), total=len(futures), desc="提取关键词"):
            results.append(f.result())
    
    for (idx, kw_en, kw_cn) in results:
        df.at[idx, 'keywords'] = str(kw_en)
        df.at[idx, 'description_cn'] = str(kw_cn)
    
    return df


def run_full_pipeline(university: str, areas: List[str], output_dir: str = "output"):
    """
    运行完整的爬虫 Pipeline
    
    Args:
        university: 学校名称 (UNSW/USYD)
        areas: 要爬取的区域列表（邮编）
        output_dir: 输出目录
    
    Pipeline 步骤:
    1. 爬取列表页
    2. 爬取详情页
    3. 保存到 CSV
    4. 计算通勤时间
    5. AI 评分和关键词提取
    """
    os.makedirs(output_dir, exist_ok=True)
    today = datetime.now().strftime('%y%m%d')
    output_file = f"{output_dir}/{university}_rentdata_{today}.csv"
    
    logger.info("=" * 60)
    logger.info(f"开始 {university} 完整 Pipeline")
    logger.info(f"区域: {areas}")
    logger.info(f"输出文件: {output_file}")
    logger.info("=" * 60)
    
    # Step 1 & 2: 爬取
    logger.info("\n--- Step 1: 爬取列表页 ---")
    scraper = RealEstateScraper()
    properties = scraper.scrape_areas(areas)
    logger.info(f"列表页爬取完成，共 {len(properties)} 个房源")
    
    if not properties:
        logger.error("没有爬取到任何房源，退出")
        return
    
    logger.info("\n--- Step 2: 爬取详情页 ---")
    scraper = RealEstateScraper()
    properties = scraper.scrape_property_details(properties)
    
    # Step 3: 保存到 CSV
    logger.info("\n--- Step 3: 保存 CSV ---")
    df = pd.DataFrame([p.__dict__ for p in properties])
    
    # 重命名列以匹配预期格式
    column_mapping = {
        'house_id': 'houseId',
        'price_per_week': 'pricePerWeek',
        'address_line1': 'addressLine1',
        'address_line2': 'addressLine2',
        'bedroom_count': 'bedroomCount',
        'bathroom_count': 'bathroomCount',
        'parking_count': 'parkingCount',
        'property_type': 'propertyType',
        'property_type_raw': 'propertyTypeRaw',
        'thumbnail_url': 'thumbnail_url',
        'description_en': 'description_en',
        'available_date': 'available_date',
        'scraped_at': 'scraped_at',
        'published_at': 'published_at',
    }
    df.rename(columns=column_mapping, inplace=True)
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    logger.info(f"已保存: {output_file}")
    
    # Step 4: 通勤时间
    logger.info("\n--- Step 4: 计算通勤时间 ---")
    df = pd.read_csv(output_file, encoding='utf-8-sig')
    df = update_commute_time(df, university)
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    logger.info(f"通勤时间已更新: {output_file}")
    
    # Step 5: AI 评分和关键词
    logger.info("\n--- Step 5: AI 评分和关键词 ---")
    df = pd.read_csv(output_file, encoding='utf-8-sig')
    df = score_properties_parallel(df, max_workers=2)
    df = extract_keywords_parallel(df, max_workers=2)
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    logger.info("=" * 60)
    logger.info(f"Pipeline 完成! 输出: {output_file}")
    logger.info("=" * 60)


# UNSW 和 USYD 的区域配置
UNSW_AREAS = [
    "2033",  # Kensington
    "2032",  # Kingsford, Daceyville
    "2031",  # Randwick, Clovelly
    "2034",  # Coogee
    "2035",  # Maroubra
    "2036",  # Matraville, Phillip Bay
    "2020",  # Mascot
    "2018",  # Rosebery
    "2017",  # Zetland, Waterloo
]

USYD_AREAS = [
    "2050",  # Camperdown
    "2006",  # Sydney University
    "2042",  # Newtown, Enmore
    "2043",  # Erskineville
    "2008",  # Darlington, Chippendale
    "2007",  # Ultimo, Broadway
    "2016",  # Redfern
    "2010",  # Surry Hills
    "2015",  # Eveleigh, Alexandria
    "2044",  # St Peters, Sydenham
]


if __name__ == "__main__":
    import argparse
    import sys
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(f'logs/pipeline_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log', encoding='utf-8')
        ]
    )
    
    parser = argparse.ArgumentParser(description='RealEstate Pipeline')
    parser.add_argument('-u', '--university', type=str, choices=['UNSW', 'USYD', 'ALL'], 
                        default='ALL', help='学校 (UNSW/USYD/ALL)')
    parser.add_argument('--step', type=str, choices=['all', 'scrape', 'commute', 'ai'],
                        default='all', help='运行哪个步骤')
    args = parser.parse_args()
    
    os.makedirs('logs', exist_ok=True)
    os.makedirs('output', exist_ok=True)
    
    if args.step == 'all':
        if args.university in ['UNSW', 'ALL']:
            run_full_pipeline('UNSW', UNSW_AREAS)
        if args.university in ['USYD', 'ALL']:
            run_full_pipeline('USYD', USYD_AREAS)
    
    elif args.step == 'scrape':
        # 只爬取
        if args.university in ['UNSW', 'ALL']:
            scraper = RealEstateScraper()
            props = scraper.scrape_areas(UNSW_AREAS)
            scraper = RealEstateScraper()
            props = scraper.scrape_property_details(props)
            df = pd.DataFrame([p.__dict__ for p in props])
            df.to_csv(f"output/UNSW_rentdata_{datetime.now().strftime('%y%m%d')}.csv", 
                      index=False, encoding='utf-8-sig')
        if args.university in ['USYD', 'ALL']:
            scraper = RealEstateScraper()
            props = scraper.scrape_areas(USYD_AREAS)
            scraper = RealEstateScraper()
            props = scraper.scrape_property_details(props)
            df = pd.DataFrame([p.__dict__ for p in props])
            df.to_csv(f"output/USYD_rentdata_{datetime.now().strftime('%y%m%d')}.csv", 
                      index=False, encoding='utf-8-sig')
    
    elif args.step == 'commute':
        # 只计算通勤时间
        today = datetime.now().strftime('%y%m%d')
        if args.university in ['UNSW', 'ALL']:
            f = f"output/UNSW_rentdata_{today}.csv"
            if os.path.exists(f):
                df = pd.read_csv(f, encoding='utf-8-sig')
                df = update_commute_time(df, 'UNSW')
                df.to_csv(f, index=False, encoding='utf-8-sig')
        if args.university in ['USYD', 'ALL']:
            f = f"output/USYD_rentdata_{today}.csv"
            if os.path.exists(f):
                df = pd.read_csv(f, encoding='utf-8-sig')
                df = update_commute_time(df, 'USYD')
                df.to_csv(f, index=False, encoding='utf-8-sig')
    
    elif args.step == 'ai':
        # 只 AI 评分
        today = datetime.now().strftime('%y%m%d')
        if args.university in ['UNSW', 'ALL']:
            f = f"output/UNSW_rentdata_{today}.csv"
            if os.path.exists(f):
                df = pd.read_csv(f, encoding='utf-8-sig')
                df = score_properties_parallel(df)
                df = extract_keywords_parallel(df)
                df.to_csv(f, index=False, encoding='utf-8-sig')
        if args.university in ['USYD', 'ALL']:
            f = f"output/USYD_rentdata_{today}.csv"
            if os.path.exists(f):
                df = pd.read_csv(f, encoding='utf-8-sig')
                df = score_properties_parallel(df)
                df = extract_keywords_parallel(df)
                df.to_csv(f, index=False, encoding='utf-8-sig')
