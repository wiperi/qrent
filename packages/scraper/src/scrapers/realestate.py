"""
RealEstate.com.au 爬虫
使用 Playwright 持久化浏览器配置绕过 Kasada 反爬虫保护

使用方法:
1. 首次运行时，浏览器会打开并可能需要手动完成验证
2. 验证完成后，配置会保存，后续运行会自动使用
"""
import re
import os
import logging
import time
from typing import List, Optional, Any
from datetime import datetime
from bs4 import BeautifulSoup

from .base import BaseScraper
from ..models import PropertyData, PropertySource
from ..config import PROPERTY_TYPE_MAPPING, ScraperConfig
from ..utils import (
    extract_price, extract_number, clean_address,
    parse_available_date, is_valid_image_url, generate_house_id
)
from ..utils.browser import BrowserManager, BrowserType

logger = logging.getLogger(__name__)


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
            # 使用 Playwright 持久化模式
            self.browser = BrowserManager(
                browser_type=BrowserType.PLAYWRIGHT,
                profile_dir=self.profile_dir
            )
            self.browser.create_driver()
            
            page = 1
            while page <= self.config.max_pages:
                page_url = url.replace('/list-1', f'/list-{page}')
                logger.info(f"爬取第 {page} 页: {page_url}")
                
                # 导航到页面
                self.browser.navigate(page_url, wait_time=10.0)
                
                # 模拟用户行为
                for _ in range(5):
                    self.browser.scroll_page(300)
                    self.browser.wait(1.5)
                
                # 获取页面内容
                html = self.browser.get_page_source()
                
                # 检查是否被拦截
                if 'KPSDK' in html and len(html) < 5000:
                    logger.warning("Kasada 保护活跃，等待更长时间...")
                    self.browser.wait(20.0)
                    
                    # 再次滚动
                    for _ in range(3):
                        self.browser.scroll_page(200)
                        self.browser.wait(1.0)
                    
                    html = self.browser.get_page_source()
                    
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
                time.sleep(self.config.request_delay)
            
        except Exception as e:
            logger.error(f"RealEstate 爬取失败: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.browser:
                self.browser.close()
        
        return properties
    
    def scrape_areas(self, areas: List[str]) -> List[PropertyData]:
        """爬取多个区域"""
        all_properties = []
        
        for area in areas:
            properties = self.scrape_area(area)
            all_properties.extend(properties)
            time.sleep(self.config.request_delay)
        
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
        
        return PropertyData(
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
        
        # 更多图片 URL
        images = soup.find_all('img', src=lambda s: s and 'reastatic.net' in str(s))
        for img in images[:1]:  # 只取第一张高清图
            src = img.get('src', '')
            if src and 'thumbnail' not in src.lower():
                property_data.thumbnail_url = src
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
        
        if not to_scrape:
            logger.info("没有需要爬取详情的房产")
            return properties
        
        logger.info(f"开始爬取 {len(to_scrape)} 个房产的详情页")
        
        try:
            # 使用已有的浏览器或创建新的
            if not self.browser:
                self.browser = BrowserManager(
                    browser_type=BrowserType.PLAYWRIGHT,
                    profile_dir=self.profile_dir
                )
                self.browser.create_driver()
            
            for i, prop in enumerate(to_scrape):
                try:
                    url = prop.url
                    if not url:
                        continue
                    
                    logger.debug(f"爬取详情 ({i+1}/{len(to_scrape)}): {url}")
                    
                    self.browser.navigate(url, wait_time=5.0)
                    
                    # 滚动加载完整内容
                    for _ in range(3):
                        self.browser.scroll_page(500)
                        self.browser.wait(0.5)
                    
                    html = self.browser.get_page_source()
                    
                    # 检查是否被拦截
                    if 'KPSDK' in html and len(html) < 5000:
                        logger.warning("详情页被 Kasada 拦截，等待...")
                        self.browser.wait(10.0)
                        html = self.browser.get_page_source()
                    
                    if len(html) > 10000:
                        self.parse_detail_page(prop, html)
                        logger.debug(f"详情获取成功: {prop.address_line1}")
                    
                    # 进度日志
                    if (i + 1) % 10 == 0:
                        logger.info(f"详情爬取进度: {i + 1}/{len(to_scrape)}")
                    
                    # 请求间隔
                    time.sleep(self.config.request_delay)
                    
                except Exception as e:
                    logger.error(f"爬取详情失败 ({prop.house_id}): {e}")
            
        except Exception as e:
            logger.error(f"详情爬取失败: {e}")
        finally:
            if self.browser:
                self.browser.close()
                self.browser = None
        
        return properties
    
    def find_next_button(self, soup: BeautifulSoup) -> Optional[Any]:
        """查找下一页按钮（用于浏览器模式）"""
        return soup.find('a', rel='next')
